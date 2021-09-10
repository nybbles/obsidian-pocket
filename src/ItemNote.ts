import log from "loglevel";
import {
  MetadataCache,
  normalizePath,
  Notice,
  TFile,
  Vault,
  Workspace,
} from "obsidian";
import {
  PocketTags,
  pocketTagsToPocketTagList,
  SavedPocketItem,
} from "./pocket_api/PocketAPITypes";
import { SettingsManager } from "./SettingsManager";
import {
  getTagNormalizer,
  MultiWordTagConversion,
  TagNormalizationFn,
} from "./Tags";
import { ensureFolderExists } from "./utils";

const getItemNotesFolder = (settingsManager: SettingsManager) =>
  settingsManager.getSetting("item-notes-folder") ?? "/";

export const displayTextForSavedPocketItem = (item: SavedPocketItem) => {
  if (!item.resolved_title && !item.resolved_url) {
    log.error(`Found Pocket item ${item.item_id} without title or URL`);
    return `Untitled ${item.item_id}`;
  }

  return item.resolved_title && item.resolved_title.length !== 0
    ? item.resolved_title
    : item.resolved_url;
};
const sanitizeTitle = (title: String) => title.replace(/[\\/:"*?<>|]+/g, " ");

export const linkpathForSavedPocketItem = (item: SavedPocketItem) =>
  sanitizeTitle(displayTextForSavedPocketItem(item));

export type GetItemNoteFn = (item: SavedPocketItem) => TFile | null;

const getItemNote =
  (
    metadataCache: MetadataCache,
    settingsManager: SettingsManager
  ): GetItemNoteFn =>
  (item) => {
    const itemNotesFolder = getItemNotesFolder(settingsManager);
    const linkpath = linkpathForSavedPocketItem(item);
    return metadataCache.getFirstLinkpathDest(linkpath, itemNotesFolder);
  };

export type DoesItemNoteExistFnFactory = (
  metadataCache: MetadataCache,
  settingsManager: SettingsManager
) => DoesItemNoteExistFn;
export type DoesItemNoteExistFn = (item: SavedPocketItem) => boolean;

export const doesItemNoteExist: DoesItemNoteExistFnFactory =
  (metadataCache, settingsManager) => (item: SavedPocketItem) =>
    !!getItemNote(metadataCache, settingsManager)(item);

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

      if (!templateFile) {
        const errMsg = `Unable to find template file at ${normalizedTemplatePath}`;
        log.warn(errMsg);
        new Notice(errMsg);
        return null;
      }

      const templateContents = vault.cachedRead(templateFile);
      return templateContents;
    } catch (err) {
      log.error(`Failed to load template from ${normalizedTemplatePath}`, err);
      new Notice("Failed to load Pocket item note template");
      return null;
    }
  };

const TAG_NOTE_CONTENT_SEPARATOR = ", ";

const tagsToNoteContent = (
  tagNormalizer: TagNormalizationFn,
  tags: PocketTags
) => {
  if (!tags) {
    return "";
  }

  const tagList = pocketTagsToPocketTagList(tags);
  return tagList.map(tagNormalizer).join(TAG_NOTE_CONTENT_SEPARATOR);
};

const generateInitialItemNoteContents = (
  templateContents: TemplateContents,
  pocketItem: SavedPocketItem,
  settingsManager: SettingsManager
): string => {
  type SubstitutionFn = (item: SavedPocketItem) => string;

  const tagNormalizer = getTagNormalizer({
    multiWordTagConversion: settingsManager.getSetting(
      "multi-word-tag-converter"
    ) as MultiWordTagConversion,
  });

  const substitutions: Map<string, SubstitutionFn> = new Map([
    ["title", (item) => item.resolved_title ?? "Untitled"],
    ["url", (item) => item.resolved_url ?? "Missing URL"],
    ["excerpt", (item) => item.excerpt ?? "Empty excerpt"],
    ["tags", (item) => tagsToNoteContent(tagNormalizer, item.tags)],
  ]);

  return Array.from(substitutions.entries()).reduce((acc, currentValue) => {
    const [variableName, substitutionFn] = currentValue;
    const regex = new RegExp(`{{${variableName}}}`, "gi");
    return acc.replace(regex, substitutionFn(pocketItem));
  }, templateContents);
};

export type CreateOrOpenItemNoteFn = (
  pocketItem: SavedPocketItem
) => Promise<void>;

const fullpathForPocketItem = (
  settingsManager: SettingsManager,
  pocketItem: SavedPocketItem
) => {
  const itemNotesFolder = getItemNotesFolder(settingsManager);
  const linkpath = linkpathForSavedPocketItem(pocketItem);
  const fullpath = `${itemNotesFolder}/${linkpath}.md`;
  return fullpath;
};

const openItemNote = async (workspace: Workspace, existingItemNote: TFile) => {
  await workspace.activeLeaf.openFile(existingItemNote);
};

export const createOrOpenItemNote =
  (
    settingsManager: SettingsManager,
    workspace: Workspace,
    vault: Vault,
    metadataCache: MetadataCache
  ): CreateOrOpenItemNoteFn =>
  async (pocketItem) => {
    const itemNote = getItemNote(metadataCache, settingsManager)(pocketItem);
    const itemNoteExists = !!itemNote;

    if (itemNoteExists) {
      await openItemNote(workspace, itemNote);
    } else {
      try {
        // If there is a template specified, load the template and apply it.
        const templateSetting =
          settingsManager.getSetting("item-note-template");
        const templateContents = templateSetting
          ? await loadTemplate(vault, metadataCache)(templateSetting)
          : "";
        const fullpath = fullpathForPocketItem(settingsManager, pocketItem);

        ensureFolderExists(vault, getItemNotesFolder(settingsManager));

        const newItemNote = await vault.create(
          fullpath,
          generateInitialItemNoteContents(
            templateContents,
            pocketItem,
            settingsManager
          )
        );

        log.debug("Opening item note now");
        await openItemNote(workspace, newItemNote);
      } catch (err) {
        const fullpath = fullpathForPocketItem(settingsManager, pocketItem);
        const errMsg = `Failed to create file for ${fullpath}`;
        log.error(errMsg, err);
        new Notice(errMsg);
        return;
      }
    }
  };
