import log from "loglevel";
import {
  MetadataCache,
  normalizePath,
  Notice,
  TFile,
  Vault,
  Workspace,
} from "obsidian";
import PocketSync from "./main";
import { SavedPocketItem } from "./PocketAPITypes";
import { ensureFolderExists } from "./utils";

const getArticleNotesFolder = (plugin: PocketSync) =>
  plugin.settings["article-notes-folder"] ?? "/";

export const displayTextForSavedPocketItem = (item: SavedPocketItem) =>
  item.resolved_title.length !== 0 ? item.resolved_title : item.resolved_url;

const sanitizeTitle = (title: String) => title.replace(/[\\/:"*?<>|]+/g, " ");

export const linkpathForSavedPocketItem = (item: SavedPocketItem) =>
  sanitizeTitle(displayTextForSavedPocketItem(item));

export type GetArticleNoteFn = (item: SavedPocketItem) => TFile | null;

const getArticleNote =
  (metadataCache: MetadataCache, plugin: PocketSync): GetArticleNoteFn =>
  (item) => {
    const articleNotesFolder = getArticleNotesFolder(plugin);
    const linkpath = linkpathForSavedPocketItem(item);
    return metadataCache.getFirstLinkpathDest(linkpath, articleNotesFolder);
  };

export type DoesArticleNoteExistFnFactory = (
  metadataCache: MetadataCache,
  plugin: PocketSync
) => DoesArticleNoteExistFn;
export type DoesArticleNoteExistFn = (item: SavedPocketItem) => boolean;

export const doesArticleNoteExist: DoesArticleNoteExistFnFactory =
  (metadataCache, plugin) => (item: SavedPocketItem) =>
    !!getArticleNote(metadataCache, plugin)(item);

type TemplateContents = string | null;

const loadTemplate =
  (vault: Vault, metadataCache: MetadataCache) =>
  async (templatePath: string): Promise<TemplateContents> => {
    const normalizedTemplatePath = normalizePath(templatePath);
    try {
      const templateFile = metadataCache.getFirstLinkpathDest(
        normalizedTemplatePath,
        ""
      );
      const templateContents = vault.cachedRead(templateFile);
      return templateContents;
    } catch (err) {
      log.error(`Failed to load template from ${normalizedTemplatePath}`, err);
      new Notice("Failed to load Pocket article note template");
      return null;
    }
  };

type SubstitutionFn = (item: SavedPocketItem) => string;

const substitutions: Map<string, SubstitutionFn> = new Map([
  ["title", (item) => item.resolved_title ?? "Untitled"],
  ["url", (item) => item.resolved_url],
  ["excerpt", (item) => item.excerpt],
]);

const generateInitialArticleNoteContents = (
  templateContents: TemplateContents,
  pocketItem: SavedPocketItem
): string => {
  return Array.from(substitutions.entries()).reduce((acc, currentValue) => {
    const [variableName, substitutionFn] = currentValue;
    const regex = new RegExp(`{{${variableName}}}`, "gi");
    return acc.replace(regex, substitutionFn(pocketItem));
  }, templateContents);
};

export type CreateOrOpenArticleNoteFn = (
  pocketItem: SavedPocketItem
) => Promise<void>;

const fullpathForPocketItem = (
  plugin: PocketSync,
  pocketItem: SavedPocketItem
) => {
  const articleNotesFolder = getArticleNotesFolder(plugin);
  const linkpath = linkpathForSavedPocketItem(pocketItem);
  const fullpath = `${articleNotesFolder}/${linkpath}.md`;
  return fullpath;
};

const openArticleNote = async (
  workspace: Workspace,
  existingArticleNote: TFile
) => {
  await workspace.activeLeaf.openFile(existingArticleNote);
};

export const createOrOpenArticleNote =
  (
    plugin: PocketSync,
    workspace: Workspace,
    vault: Vault,
    metadataCache: MetadataCache
  ): CreateOrOpenArticleNoteFn =>
  async (pocketItem) => {
    const articleNote = getArticleNote(metadataCache, plugin)(pocketItem);
    const articleNoteExists = !!articleNote;

    if (articleNoteExists) {
      await openArticleNote(workspace, articleNote);
    } else {
      try {
        // If there is a template specified, load the template and apply it.
        const templateSetting = plugin.settings["article-note-template"];
        const templateContents = templateSetting
          ? await loadTemplate(vault, metadataCache)(templateSetting)
          : null;
        const fullpath = fullpathForPocketItem(plugin, pocketItem);

        ensureFolderExists(vault, getArticleNotesFolder(plugin));

        const newArticleNote = await vault.create(
          fullpath,
          generateInitialArticleNoteContents(templateContents, pocketItem)
        );

        log.debug("Opening article note now");
        await openArticleNote(workspace, newArticleNote);
      } catch (err) {
        const fullpath = fullpathForPocketItem(plugin, pocketItem);
        const errMsg = `Failed to create file for ${fullpath}`;
        log.error(errMsg, err);
        new Notice(errMsg);
        return;
      }
    }
  };
