import { IDBPObjectStore } from "idb";
import log from "loglevel";
import { EventRef, MetadataCache, Vault } from "obsidian";
import {
  PocketIDB,
  PocketIDBUpgradeFn,
  URL_TO_ITEM_NOTE_STORE_NAME,
} from "./PocketIDB";

type URLToPocketItemNoteEntry = {
  url: string;
  file_path: string;
};

type IDBPURLToPocketItemNoteIndexRW = IDBPObjectStore<
  unknown,
  ["url_to_item_notes"],
  "url_to_item_notes",
  "readwrite"
>;

const URL_FRONT_MATTER_KEY = "URL";
const KEY_PATH = "url";
const FILE_PATH_INDEX_PATH = "file_path";

export class URLToPocketItemNoteIndex {
  db: PocketIDB;
  metadataCache: MetadataCache;
  vault: Vault;

  constructor(db: PocketIDB, metadataCache: MetadataCache, vault: Vault) {
    this.db = db;
    this.metadataCache = metadataCache;
    this.vault = vault;
  }

  attachFileChangeListeners = (): EventRef[] => {
    return [
      this.metadataCache.on("changed", async (file) => {
        log.debug(`Handling change event for ${file.path}`);
        const tx = this.db.transaction(
          URL_TO_ITEM_NOTE_STORE_NAME,
          "readwrite"
        );
        await this.removeEntriesForFilePath(tx.store, file.path);
        await this.indexURLForFilePath(tx.store, file.path);
        await tx.done;
      }),
      this.vault.on("rename", async (file, oldPath) => {
        log.debug(`Handling rename event ${oldPath} --> ${file.path}`);
        const tx = this.db.transaction(
          URL_TO_ITEM_NOTE_STORE_NAME,
          "readwrite"
        );
        await this.removeEntriesForFilePath(tx.store, oldPath);
        await this.indexURLForFilePath(tx.store, file.path);
        await tx.done;
      }),
      this.vault.on("delete", async (file) => {
        log.debug(`Handling delete event ${file.path}`);
        const tx = this.db.transaction(
          URL_TO_ITEM_NOTE_STORE_NAME,
          "readwrite"
        );
        await this.removeEntriesForFilePath(tx.store, file.path);
        await tx.done;
      }),
    ];
  };

  addEntry = async (
    store: IDBPURLToPocketItemNoteIndexRW,
    url: string,
    filePath: string
  ): Promise<void> => {
    await store.put({ url: url, file_path: filePath });
  };

  indexURLForFilePath = async (
    store: IDBPURLToPocketItemNoteIndexRW,
    filePath: string
  ): Promise<void> => {
    const fileURL =
      this.metadataCache.getCache(filePath).frontmatter?.[URL_FRONT_MATTER_KEY];
    if (!fileURL) {
      log.debug(`No URL found for ${filePath}, skipping indexing`);
      return;
    }
    log.debug(`Indexing URL ${fileURL} for ${filePath}`);
    this.addEntry(store, fileURL, filePath);
  };

  removeEntriesForFilePath = async (
    store: IDBPURLToPocketItemNoteIndexRW,
    filePath: string
  ): Promise<void> => {
    log.debug(`Removing URLToPocketItemNote index entries for ${filePath}`);

    let entriesForFilePath = await store
      .index(FILE_PATH_INDEX_PATH)
      .openCursor(filePath);

    const deletes = [];

    while (entriesForFilePath) {
      deletes.push(entriesForFilePath.delete());
      entriesForFilePath = await entriesForFilePath.continue();
    }

    await Promise.all(deletes);
  };

  lookupItemNoteForURL = async (
    url: string
  ): Promise<URLToPocketItemNoteEntry | undefined> => {
    return this.db.get(URL_TO_ITEM_NOTE_STORE_NAME, url);
  };

  clearDatabase = async () => {
    this.db.clear(URL_TO_ITEM_NOTE_STORE_NAME);
  };

  static upgradeDatabase: PocketIDBUpgradeFn = async (
    db,
    oldVersion,
    newVersion,
    tx
  ) => {
    switch (oldVersion) {
      case 4:
        db.createObjectStore(URL_TO_ITEM_NOTE_STORE_NAME, {
          keyPath: KEY_PATH,
        });
        tx.objectStore(URL_TO_ITEM_NOTE_STORE_NAME).createIndex(
          FILE_PATH_INDEX_PATH,
          FILE_PATH_INDEX_PATH,
          {
            unique: false,
          }
        );
    }
  };
}

export const openURLToPocketItemNoteIndex = async (
  db: PocketIDB,
  metadataCache: MetadataCache,
  vault: Vault
): Promise<[URLToPocketItemNoteIndex, EventRef[]]> => {
  const urlToPocketItemNoteIndex = new URLToPocketItemNoteIndex(
    db,
    metadataCache,
    vault
  );
  const eventRefs = urlToPocketItemNoteIndex.attachFileChangeListeners();
  return [urlToPocketItemNoteIndex, eventRefs];
};
