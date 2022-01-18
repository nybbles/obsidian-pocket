import { IDBPDatabase } from "idb";
import log from "loglevel";
import { EventRef, MetadataCache, Vault } from "obsidian";

const URL_TO_ITEM_NOTE_STORE_NAME = "url_to_item_notes";

type URLToPocketItemNoteEntry = {
  url: string;
  pocket_item_note_path: string;
};

export class URLToPocketItemNoteIndex {
  // db: IDBPDatabase;
  metadataCache: MetadataCache;
  vault: Vault;

  constructor(metadataCache: MetadataCache, vault: Vault) {
    this.metadataCache = metadataCache;
    this.vault = vault;
  }

  // TODO: How to handle when a URL is removed from frontmatter? Need to remove
  // the entry from the index. How to detect that has happened?

  // TODO: How to handle a file rename? The file content is unchanged, but the
  // path should change now. Maybe it would get handled by default if we always
  // overwrite the index entry for a URL with the newest seen path.

  // TODO: Handle file delete by deleting the cache entry with matching path or
  // URL. If path, how to get the URL? Should we build an index by path?

  // TODO: Write a function that takes a TFile (or path? or TAbstractFile?) and
  // determines whether the file frontmatter contains a URL field, then add that
  // entry to the index.

  attachFileChangeListeners = (): EventRef[] => {
    const eventRefs = [];
    eventRefs.push(
      this.metadataCache.on("changed", (file) => {
        // Covers file creation, metadata changes, file content changes
        log.warn(`metadata cache/changed: ${file.path} --> ${file.name}`);

        // TODO: Need to cover: file deletion, file rename,
      })
    );

    return eventRefs;
  };

  detachFileChangeListeners = () => {
    this.metadataCache.off("changed", () => {});
  };

  addURLToItemNoteEntry = async (): Promise<void> => {};

  lookupItemNoteForURL = async (
    url: string
  ): Promise<URLToPocketItemNoteEntry | undefined> => {
    return undefined;
  };
}

export const openURLToPocketItemNoteIndex = async (
  metadataCache: MetadataCache,
  vault: Vault
): Promise<[URLToPocketItemNoteIndex, EventRef[]]> => {
  const urlToPocketItemNoteIndex = new URLToPocketItemNoteIndex(
    metadataCache,
    vault
  );
  const eventRefs = urlToPocketItemNoteIndex.attachFileChangeListeners();
  return [urlToPocketItemNoteIndex, eventRefs];
};

export const closeURLToPocketItemNoteIndex = (
  urlToPocketItemNoteIndex: URLToPocketItemNoteIndex
) => urlToPocketItemNoteIndex.detachFileChangeListeners();
