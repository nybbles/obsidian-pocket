import { IDBPObjectStore } from "idb";
import log from "loglevel";
import { EventRef, MetadataCache, Vault } from "obsidian";
import { CallbackId, CallbackRegistry } from "src/CallbackRegistry";
import { getUniqueId } from "src/utils";
import {
  PocketIDB,
  PocketIDBUpgradeFn,
  URL_TO_ITEM_NOTE_STORE_NAME,
} from "./PocketIDB";

export type URLToPocketItemNoteEntry = {
  url: string;
  file_path: string;
};

export type OnChangeCallback = () => Promise<void>;

type IDBPURLToPocketItemNoteIndexRW = IDBPObjectStore<
  unknown,
  ["url_to_item_notes"],
  "url_to_item_notes",
  "readwrite"
>;

export type URL = string;

const URL_FRONT_MATTER_KEY = "URL";
const KEY_PATH = "url";
const FILE_PATH_INDEX_PATH = "file_path";

export class URLToPocketItemNoteIndex {
  db: PocketIDB;
  metadataCache: MetadataCache;
  vault: Vault;
  onChangeCallbacks: CallbackRegistry<
    URL,
    CallbackRegistry<CallbackId, OnChangeCallback>
  >;

  constructor(db: PocketIDB, metadataCache: MetadataCache, vault: Vault) {
    this.db = db;
    this.metadataCache = metadataCache;
    this.vault = vault;
    this.onChangeCallbacks = new Map();
  }

  attachFileChangeListeners = (): EventRef[] => {
    return [
      this.metadataCache.on("changed", async (file) => {
        log.debug(`Handling change event for ${file.path}`);
        const tx = this.db.transaction(
          URL_TO_ITEM_NOTE_STORE_NAME,
          "readwrite"
        );
        const updatedURLs = await this.removeEntriesForFilePath(
          tx.store,
          file.path
        );
        updatedURLs.add(await this.indexURLForFilePath(tx.store, file.path));
        await tx.done;
        await Promise.all(
          Array.from(updatedURLs.values()).map((url) =>
            this.handleOnChange(url)
          )
        );
      }),
      this.vault.on("rename", async (file, oldPath) => {
        log.debug(`Handling rename event ${oldPath} --> ${file.path}`);
        const tx = this.db.transaction(
          URL_TO_ITEM_NOTE_STORE_NAME,
          "readwrite"
        );
        const updatedURLs = await this.removeEntriesForFilePath(
          tx.store,
          file.path
        );
        updatedURLs.add(await this.indexURLForFilePath(tx.store, file.path));
        await tx.done;
        await Promise.all(
          Array.from(updatedURLs.values()).map((url) =>
            this.handleOnChange(url)
          )
        );
      }),
      this.vault.on("delete", async (file) => {
        log.debug(`Handling delete event ${file.path}`);
        const tx = this.db.transaction(
          URL_TO_ITEM_NOTE_STORE_NAME,
          "readwrite"
        );
        const updatedURLs = await this.removeEntriesForFilePath(
          tx.store,
          file.path
        );
        await tx.done;
        await Promise.all(
          Array.from(updatedURLs.values()).map((url) =>
            this.handleOnChange(url)
          )
        );
      }),
    ];
  };

  addEntry = async (
    store: IDBPURLToPocketItemNoteIndexRW,
    url: URL,
    filePath: string
  ): Promise<void> => {
    await store.put({ url: url, file_path: filePath });
  };

  private indexURLForFilePath = async (
    store: IDBPURLToPocketItemNoteIndexRW,
    filePath: string
  ): Promise<URL> => {
    const fileURL =
      this.metadataCache.getCache(filePath).frontmatter?.[URL_FRONT_MATTER_KEY];
    if (!fileURL) {
      log.debug(`No URL found for ${filePath}, skipping indexing`);
      return;
    }
    log.debug(`Indexing URL ${fileURL} for ${filePath}`);
    this.addEntry(store, fileURL, filePath);
    return fileURL;
  };

  private removeEntriesForFilePath = async (
    store: IDBPURLToPocketItemNoteIndexRW,
    filePath: string
  ): Promise<Set<URL>> => {
    log.debug(`Removing URLToPocketItemNote index entries for ${filePath}`);

    let entriesForFilePath = await store
      .index(FILE_PATH_INDEX_PATH)
      .openCursor(filePath);

    const deletes = [];
    const updatedURLs: Set<URL> = new Set();

    while (entriesForFilePath) {
      updatedURLs.add(entriesForFilePath.value.url);
      deletes.push(entriesForFilePath.delete());
      entriesForFilePath = await entriesForFilePath.continue();
    }

    await Promise.all(deletes);
    return updatedURLs;
  };

  lookupItemNoteForURL = async (
    url: URL
  ): Promise<URLToPocketItemNoteEntry | null> => {
    const start = performance.now();
    const result = this.db.get(URL_TO_ITEM_NOTE_STORE_NAME, url);
    log.warn(
      `urlToPocketItemNoteIndex.lookupItemNoteForURL took ${
        performance.now() - start
      } ms`
    );

    return result;
  };

  getAllIndexEntries = async (): Promise<URLToPocketItemNoteEntry[]> => {
    return this.db.getAll(URL_TO_ITEM_NOTE_STORE_NAME);
  };

  subscribeOnChange = (url: URL, cb: OnChangeCallback) => {
    const callbackId = getUniqueId();
    if (!this.onChangeCallbacks.has(url)) {
      this.onChangeCallbacks.set(url, new Map());
    }
    const callbackRegistry = this.onChangeCallbacks.get(url);
    callbackRegistry.set(callbackId, cb);
    return callbackId;
  };

  unsubscribeOnChange = (url: URL, cbId: CallbackId) => {
    if (!this.onChangeCallbacks.has(url)) {
      return;
    }
    const callbackRegistry = this.onChangeCallbacks.get(url);
    callbackRegistry.delete(cbId);
    if (callbackRegistry.size == 0) {
      this.onChangeCallbacks.delete(url);
    }
  };

  private handleOnChange = async (url: URL) => {
    const callbacks = this.onChangeCallbacks.get(url)?.values();
    if (!callbacks) {
      return;
    }

    const cbExecs = Array.from(callbacks).map((cb) => cb());
    await Promise.all(cbExecs);
  };

  clearDatabase = async () => {
    await this.db.clear(URL_TO_ITEM_NOTE_STORE_NAME);
    await Promise.all(
      Array.from(this.onChangeCallbacks.keys()).map((url) =>
        this.handleOnChange(url)
      )
    );
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
