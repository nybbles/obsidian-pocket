import { IDBPDatabase } from "idb";
import log from "loglevel";
import { EventRef, MetadataCache, Vault } from "obsidian";
import {
  PocketIDB,
  PocketIDBUpgradeFn,
  URL_TO_ITEM_NOTE_STORE_NAME,
} from "./PocketIDB";

type URLToPocketItemNoteEntry = {
  url: string;
  pocket_item_note_path: string;
};

const URL_FRONT_MATTER_KEY = "URL";

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
        await this.removeEntriesForFilePath(file.path);
        await this.indexURLForFilePath(file.path);
      }),
      this.vault.on("rename", async (file, oldPath) => {
        await this.removeEntriesForFilePath(oldPath);
        await this.indexURLForFilePath(file.path);
      }),
      this.vault.on("delete", async (file) => {
        await this.removeEntriesForFilePath(file.path);
      }),
    ];
  };

  addEntry = async (
    url: string,
    pocket_item_note_path: string
  ): Promise<void> => {
    // TODO: Implement
  };

  indexURLForFilePath = async (filePath: string): Promise<void> => {
    const fileURL =
      this.metadataCache.getCache(filePath).frontmatter?.[URL_FRONT_MATTER_KEY];
    if (!fileURL) {
      return;
    }
    this.addEntry(fileURL, filePath);
  };
  removeEntriesForFilePath = async (filePath: string): Promise<void> => {
    // TODO: Implement
  };

  lookupItemNoteForURL = async (
    url: string
  ): Promise<URLToPocketItemNoteEntry | undefined> => {
    // TODO: Implement
    return undefined;
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
          keyPath: "url",
        });
        tx.objectStore(URL_TO_ITEM_NOTE_STORE_NAME).createIndex(
          "file_path",
          "file_path",
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
