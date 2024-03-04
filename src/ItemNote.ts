import log from "loglevel";
import {
  MetadataCache,
  normalizePath,
  Notice,
  TFile,
  TFolder,
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
import { ensureFolderExists, getPocketItemPocketURL } from "./utils";

const DEFAULT_ITEM_NOTES_FOLDER = "/";

// Various OS and contexts allow at-most 255 characters for the file name (incl. extension).
// Since Obsidian is often used on multiple platforms simultaneously, we restrict the filename length.
// Those file names would be too long to be readable anyways, hence this restriction is acceptable.
// We reduce this threshold by 8 to make space for the file extension ".md" and
// the de-duplication suffix " XYZ".
const MAXIMUM_TITLE_LENGTH = 255 - 8;

const getItemNotesFolder = (settingsManager: SettingsManager) =>
  settingsManager.getSetting("item-notes-folder").replace(/\/+$/, "") ??
  DEFAULT_ITEM_NOTES_FOLDER;

export const displayTextForSavedPocketItem = (item: SavedPocketItem) => {
  if (!item.resolved_title && !item.resolved_url) {
    log.error(`Found Pocket item ${item.item_id} without title or URL`);
    return `Untitled ${item.item_id}`;
  }

  return item.resolved_title && item.resolved_title.length !== 0
    ? item.resolved_title
    : item.resolved_url;
};
const sanitizeTitle = (title: String) =>
  title.replace(/[\\/:"*?<>|]+/g, " ").substring(0, MAXIMUM_TITLE_LENGTH);

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
      result.push({ item: item, itemNote: resolveItemNote(item, entry) });
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
  (vault: Vault): ResolveItemNoteFn =>
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
      } else if (file instanceof TFolder) {
        log.warn(
          `URL to Pocket item note index inconsistent: got folder instead of
          file at path ${urlToPocketItemNoteEntry.file_path} for URL
          ${item.resolved_url}. Was the Pocket item note moved while
          obsidian-pocket was inactive?`
        );
      } else if (file === null) {
        log.warn(
          `URL to Pocket item note index inconsistent: could not find any file
          at path ${urlToPocketItemNoteEntry.file_path} for URL
          ${item.resolved_url}. Was the Pocket item note moved while
          obsidian-pocket was inactive?`
        );
      } else {
        log.error(file);
        throw new Error(
          `got non-file result from vault for URL ${item.resolved_url}`
        );
      }
    }
    return;
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

// Ensure that "---" in title or excerpt, double-quotes in title and newlines in
// excerpt do not mess up front matter
const normalizeTitle = (excerpt: String) =>
  excerpt.replace(/---./g, "").replace(/"/g, "'");
const normalizeExcerpt = (excerpt: String) =>
  `${excerpt.replace(/---./g, "")}`.replace(/\r?\n|\r/g, "\n    ");

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
    ["title", (item) => normalizeTitle(item.resolved_title) ?? "Untitled"],
    ["url", (item) => item.resolved_url ?? "Missing URL"],
    ["excerpt", (item) => normalizeExcerpt(item.excerpt) ?? "Empty excerpt"],
    ["tags", (item) => hashtagSubstitutor(true)(item.tags)],
    ["tags-no-hash", (item) => hashtagSubstitutor(false)(item.tags)],
    ["pocket-url", (item) => getPocketItemPocketURL(item)],
    [
      "image",
      (item) => {
        const image_src = item.image?.src;
        return image_src ? `![image](${image_src})` : "";
      },
    ],
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

const findPathForNewPocketItem = (
  settingsManager: SettingsManager,
  vault: Vault,
  pocketItem: SavedPocketItem
) => {
  const itemNotesFolder = getItemNotesFolder(settingsManager);
  const linkpath = linkpathForSavedPocketItem(pocketItem);

  const candidatePath = `${itemNotesFolder}/${linkpath}.md`;
  if (vault.getAbstractFileByPath(candidatePath) === null) {
    return candidatePath;
  }

  const DUP_LIMIT = 1000;
  let dupIdx = 1;
  while (true) {
    ++dupIdx;
    const candidatePath = `${itemNotesFolder}/${linkpath} ${dupIdx}.md`;
    if (vault.getAbstractFileByPath(candidatePath) === null) {
      return candidatePath;
    }

    if (dupIdx > DUP_LIMIT) {
      throw new Error("Could not find path for new pocket item");
    }
  }
};

const openItemNote = async (workspace: Workspace, existingItemNote: TFile) => {
  await workspace.activeLeaf.openFile(existingItemNote);
};

const DEFAULT_TEMPLATE = `---
Title: "{{title}}"
URL: {{url}}
Pocket URL: {{pocket-url}}
Tags: [pocket, {{tags-no-hash}}]
Excerpt: >
    {{excerpt}}
---
{{tags}}
{{image}}
`;

const loadTemplateContents = async (
  settingsManager: SettingsManager,
  vault: Vault,
  metadataCache: MetadataCache
) => {
  const templateSetting = settingsManager.getSetting("item-note-template");
  return templateSetting
    ? await loadTemplate(vault, metadataCache)(templateSetting)
    : DEFAULT_TEMPLATE;
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
      resolveItemNote(vault)
    )(pocketItem);
    const itemNoteExists = !!itemNote;

    if (itemNoteExists) {
      await openItemNote(workspace, itemNote);
    } else {
      try {
        ensureFolderExists(vault, getItemNotesFolder(settingsManager));

        // If there is a template specified, load the template and apply it.
        const templateContents = await loadTemplateContents(
          settingsManager,
          vault,
          metadataCache
        );

        const fullpath = findPathForNewPocketItem(
          settingsManager,
          vault,
          pocketItem
        );
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
        const errMsg = `Failed to create file for ${linkpathForSavedPocketItem(
          pocketItem
        )}`;
        log.error(errMsg, err);
        new Notice(errMsg);
        return;
      }
    }
  };

export const bulkCreateItemNotes = async (
  settingsManager: SettingsManager,
  vault: Vault,
  metadataCache: MetadataCache,
  pocketItems: SavedPocketItem[]
) => {
  const MANY_ITEMS_THRESHOLD = 10;

  ensureFolderExists(vault, getItemNotesFolder(settingsManager));

  const templateContents = await loadTemplateContents(
    settingsManager,
    vault,
    metadataCache
  );

  let partialCreationNotice: Notice | null = null;
  const newPocketItemNotes = [];
  for (const [index, pocketItem] of pocketItems.entries()) {
    const fullpath = findPathForNewPocketItem(
      settingsManager,
      vault,
      pocketItem
    );
    try {
      const result = await vault.create(
        fullpath,
        generateInitialItemNoteContents(
          templateContents,
          pocketItem,
          settingsManager
        )
      );
      newPocketItemNotes.push(result);

      if (
        pocketItems.length >= MANY_ITEMS_THRESHOLD &&
        (index + 1) % MANY_ITEMS_THRESHOLD === 0
      ) {
        partialCreationNotice && partialCreationNotice.hide();
        partialCreationNotice = new Notice(
          `Created ${index + 1}/${pocketItems.length} Pocket item notes`,
          0
        );
      }
    } catch (err) {
      partialCreationNotice && partialCreationNotice.hide();
      const errMsg = `Failed to create file for ${linkpathForSavedPocketItem(
        pocketItem
      )}`;
      log.error(errMsg, err);
      new Notice(errMsg);
    }
  }
  partialCreationNotice && partialCreationNotice.hide();
  return Promise.all(newPocketItemNotes);
};
