import { IDBPObjectStore } from "idb";
import log from "loglevel";
import { EventRef, MetadataCache, Vault } from "obsidian";
import { CallbackId, CallbackRegistry } from "src/CallbackRegistry";
import { SettingsManager } from "src/SettingsManager";
import { getUniqueId } from "src/Utils";
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

const KEY_PATH = "url";
const FILE_PATH_INDEX_PATH = "file_path";

export class URLToPocketItemNoteIndex {
  db: PocketIDB;
  metadataCache: MetadataCache;
  vault: Vault;
  settingsManager: SettingsManager;
  onChangeCallbacks: CallbackRegistry<
    URL,
    CallbackRegistry<CallbackId, OnChangeCallback>
  >;

  constructor(
    db: PocketIDB,
    metadataCache: MetadataCache,
    vault: Vault,
    settingsManager: SettingsManager
  ) {
    this.db = db;
    this.metadataCache = metadataCache;
    this.vault = vault;
    this.settingsManager = settingsManager;

    this.onChangeCallbacks = new Map();
  }

  private handleOnChangeForURLs = async (urls: Set<URL>) =>
    await Promise.all(
      Array.from(urls.values()).map((url) => this.handleOnChange(url))
    );

  attachFileChangeListeners = (): EventRef[] => {
    const removeEntriesAndIndexForFilePath = async (filePath: string) => {
      const tx = this.db.transaction(URL_TO_ITEM_NOTE_STORE_NAME, "readwrite");
      const updatedURLs = await this.removeEntriesForFilePath(
        tx.store,
        filePath
      );
      updatedURLs.add(await this.indexURLForFilePath(tx.store, filePath));
      await tx.done;
      await this.handleOnChangeForURLs(updatedURLs);
    };

    return [
      this.metadataCache.on("changed", async (file) => {
        log.debug(`Handling change event for ${file.path}`);
        await removeEntriesAndIndexForFilePath(file.path);
      }),
      this.vault.on("rename", async (file, oldPath) => {
        log.debug(`Handling rename event ${oldPath} --> ${file.path}`);
        await removeEntriesAndIndexForFilePath(file.path);
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
        await this.handleOnChangeForURLs(updatedURLs);
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
    const frontMatterURLKey = this.settingsManager.getSetting(
      "frontmatter-url-key"
    );
    const fileURL =
      this.metadataCache.getCache(filePath).frontmatter?.[frontMatterURLKey];
    if (!fileURL || typeof fileURL != "string") {
      log.debug(`No URL found for ${filePath}, skipping indexing`);
      return;
    }
    log.debug(`Indexing URL ${fileURL} for ${filePath}`);
    await this.addEntry(store, fileURL, filePath);
    return fileURL;
  };

  indexURLsForAllFilePaths = async (): Promise<number> => {
    const frontMatterURLKey = this.settingsManager.getSetting(
      "frontmatter-url-key"
    );
    const allFilesToURLs = this.vault
      .getMarkdownFiles()
      .map((file) => [
        file,
        this.metadataCache.getFileCache(file).frontmatter?.[frontMatterURLKey],
      ])
      .filter(([file, url]) => !!url && typeof url == "string");

    const indexedURLs: Set<URL> = new Set();
    const addedEntries = [];
    const tx = this.db.transaction(URL_TO_ITEM_NOTE_STORE_NAME, "readwrite");
    for (const [file, url] of allFilesToURLs) {
      const existingEntry = !!(await tx.store.get(url));
      if (existingEntry) {
        continue;
      } else {
        log.debug(`Indexing URL ${url} for ${file.path}`);
        addedEntries.push(this.addEntry(tx.store, url, file.path));
        indexedURLs.add(url);
      }
    }
    await Promise.all(addedEntries);
    await tx.done;

    await this.handleOnChangeForURLs(indexedURLs);
    return indexedURLs.size;
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
  ): Promise<URLToPocketItemNoteEntry | null> =>
    this.db.get(URL_TO_ITEM_NOTE_STORE_NAME, url);

  getAllIndexEntries = async (): Promise<URLToPocketItemNoteEntry[]> =>
    this.db.getAll(URL_TO_ITEM_NOTE_STORE_NAME);

  subscribeOnChange = (url: URL, cb: OnChangeCallback) => {
    if (!this.onChangeCallbacks.has(url)) {
      this.onChangeCallbacks.set(url, new Map());
    }
    const callbackRegistry = this.onChangeCallbacks.get(url);
    const callbackId = getUniqueId();
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
    if (
      oldVersion <= 5 &&
      !db.objectStoreNames.contains(URL_TO_ITEM_NOTE_STORE_NAME)
    ) {
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
  vault: Vault,
  settingsManager: SettingsManager
): Promise<[URLToPocketItemNoteIndex, EventRef[]]> => {
  const urlToPocketItemNoteIndex = new URLToPocketItemNoteIndex(
    db,
    metadataCache,
    vault,
    settingsManager
  );
  const eventRefs = urlToPocketItemNoteIndex.attachFileChangeListeners();
  return [urlToPocketItemNoteIndex, eventRefs];
};
