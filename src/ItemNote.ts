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
  URLToPocketItemNoteEntry,
  URLToPocketItemNoteIndex,
} from "./data/URLToPocketItemNoteIndex";
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

export const getAllItemNotes =
  (
    urlToPocketItemNoteIndex: URLToPocketItemNoteIndex,
    resolveItemNote: ResolveItemNoteFn
  ) =>
  async (items: SavedPocketItem[]) => {
    const urlToItemNoteEntries =
      await urlToPocketItemNoteIndex.getAllIndexEntries();
    const urlToItemNoteLookup: { [url: string]: string } = {};

    for (const entry of urlToItemNoteEntries) {
      urlToItemNoteLookup[entry.url] = entry.file_path;
    }

    const result = [];
    for (const item of items) {
      const filePathByURL = urlToItemNoteLookup[item.resolved_url];
      const entry = !!filePathByURL
        ? { url: item.resolved_url, file_path: filePathByURL }
        : null;
      result.push(resolveItemNote(item, entry));
    }

    return result;
  };

export type GetItemNoteFn = (item: SavedPocketItem) => Promise<TFile | null>;
export const getItemNote =
  (
    urlToPocketItemNoteIndex: URLToPocketItemNoteIndex,
    resolveItemNote: ResolveItemNoteFn
  ): GetItemNoteFn =>
  async (item) => {
    const byURL = await urlToPocketItemNoteIndex.lookupItemNoteForURL(
      item.resolved_url
    );

    return resolveItemNote(item, byURL);
  };

export type ResolveItemNoteFn = (
  item: SavedPocketItem,
  urlToPocketItemNoteEntry?: URLToPocketItemNoteEntry
) => TFile | null;

export const resolveItemNote =
  (
    vault: Vault,
    metadataCache: MetadataCache,
    settingsManager: SettingsManager
  ): ResolveItemNoteFn =>
  (
    item: SavedPocketItem,
    urlToPocketItemNoteEntry?: URLToPocketItemNoteEntry
  ) => {
    // Try to resolve by URL
    if (!!urlToPocketItemNoteEntry) {
      const file = vault.getAbstractFileByPath(
        urlToPocketItemNoteEntry.file_path
      );
      if (file instanceof TFile) {
        return file;
      } else {
        throw new Error(
          `got non-file result from vault for URL ${item.resolved_url}`
        );
      }
    }

    // Fall back to resolving by title
    const itemNotesFolder = getItemNotesFolder(settingsManager);
    const linkpath = linkpathForSavedPocketItem(item);

    return metadataCache.getFirstLinkpathDest(linkpath, itemNotesFolder);
  };

export type DoesItemNoteExistFnFactory = (
  vault: Vault,
  metadataCache: MetadataCache,
  urlToPocketItemNoteIndex: URLToPocketItemNoteIndex,
  settingsManager: SettingsManager
) => DoesItemNoteExistFn;
export type DoesItemNoteExistFn = (item: SavedPocketItem) => Promise<boolean>;

export const doesItemNoteExist: DoesItemNoteExistFnFactory =
  (vault, metadataCache, urlToPocketItemNoteIndex, settingsManager) =>
  async (item: SavedPocketItem) => {
    const result = await getItemNote(
      urlToPocketItemNoteIndex,
      resolveItemNote(vault, metadataCache, settingsManager)
    )(item);
    return !!result;
  };

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

  const multiWordTagConversion = settingsManager.getSetting(
    "multi-word-tag-converter"
  ) as MultiWordTagConversion;

  const hashtagSubstitutor = (addHashtag: boolean) => (tags: PocketTags) =>
    tagsToNoteContent(
      getTagNormalizer({
        multiWordTagConversion: multiWordTagConversion,
        addHashtag: addHashtag,
      }),
      tags
    );

  const substitutions: Map<string, SubstitutionFn> = new Map([
    ["title", (item) => item.resolved_title ?? "Untitled"],
    ["url", (item) => item.resolved_url ?? "Missing URL"],
    ["excerpt", (item) => item.excerpt ?? "Empty excerpt"],
    ["tags", (item) => hashtagSubstitutor(true)(item.tags)],
    ["tags-no-hash", (item) => hashtagSubstitutor(false)(item.tags)],
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
    metadataCache: MetadataCache,
    urlToPocketItemNoteIndex: URLToPocketItemNoteIndex
  ): CreateOrOpenItemNoteFn =>
  async (pocketItem) => {
    const itemNote = await getItemNote(
      urlToPocketItemNoteIndex,
      resolveItemNote(vault, metadataCache, settingsManager)
    )(pocketItem);
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
