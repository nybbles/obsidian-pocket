import { IDBPDatabase, IDBPObjectStore, openDB } from "idb";
import log from "loglevel";
import { Notice } from "obsidian";
import { CallbackId, CallbackRegistry } from "src/Types";
import { UpdateTimestamp } from "../pocket_api/PocketAPI";
import {
  isDeletedPocketItem,
  isSavedPocketItem,
  PocketItemId,
  PocketItemRecord,
  SavedPocketItem,
} from "../pocket_api/PocketAPITypes";
import { getUniqueId } from "../utils";

const DATABASE_NAME = "pocket_db";
const ITEM_STORE_NAME = "items";

const METADATA_STORE_NAME = "metadata";
const LAST_UPDATED_TIMESTAMP_KEY = "last_updated_timestamp";

export type OnChangeCallback = () => Promise<void>;

type IDBPPocketItemStoreRW = IDBPObjectStore<
  unknown,
  ["items"],
  "items",
  "readwrite"
>;

export class PocketItemStore {
  db: IDBPDatabase;
  onChangeCallbacks: CallbackRegistry<OnChangeCallback>;

  static isItemValid = (item: SavedPocketItem) =>
    !item.resolved_title && !item.resolved_url;

  constructor(db: IDBPDatabase) {
    this.db = db;
    this.onChangeCallbacks = new Map();
  }

  mergeUpdates = async (
    lastUpdateTimestamp: UpdateTimestamp,
    items: PocketItemRecord
  ): Promise<void> => {
    log.debug("Applying updates to Pocket item store");

    const tx = this.db.transaction(ITEM_STORE_NAME, "readwrite");

    for (const key in items) {
      const item = items[key];
      if (isDeletedPocketItem(item)) {
        this.deleteItem(tx.store, item.item_id, false);
      } else if (isSavedPocketItem(item)) {
        this.putItem(tx.store, item, false);
      } else {
        throw new Error("unexpected");
      }
    }

    await tx.done;

    // Wait on all changes, update timestamp, then trigger registered onChange handlers
    log.debug("Updates applied to Pocket item store");
    this.setLastUpdateTimestamp(lastUpdateTimestamp);
    log.debug("Running Pocket item store onChange handlers");
    await this.handleOnChange();
  };

  putItem = async (
    store: IDBPPocketItemStoreRW,
    item: SavedPocketItem,
    triggerOnChangeHandlers?: boolean
  ) => {
    if (PocketItemStore.isItemValid(item)) {
      log.warn(
        `Item ${item.item_id} is invalid, not adding to Pocket item store`
      );
      return;
    }
    await store.put(item);
    triggerOnChangeHandlers && (await this.handleOnChange());
  };

  getItem = async (itemId: PocketItemId): Promise<SavedPocketItem | null> => {
    return this.db.get(ITEM_STORE_NAME, itemId);
  };

  getAllItems = async (): Promise<SavedPocketItem[]> => {
    return this.db.getAll(ITEM_STORE_NAME);
  };

  getAllItemsBySortId = async (): Promise<SavedPocketItem[]> => {
    return this.db.getAllFromIndex(ITEM_STORE_NAME, "sort_id");
  };

  deleteItem = async (
    store: IDBPPocketItemStoreRW,
    itemId: PocketItemId,
    triggerOnChangeHandlers?: boolean
  ) => {
    await store.delete(itemId);
    triggerOnChangeHandlers && (await this.handleOnChange());
  };

  // This Unix timestamp is the last time that the Pocket item store was synced
  // via the Pocket API. It is used in subsequent requests to only get updates
  // since the timestamp. If the timestamp is null, it means that no requests
  // have been done so far.

  setLastUpdateTimestamp = async (
    timestamp: UpdateTimestamp,
    triggerOnChangeHandlers?: boolean
  ): Promise<void> => {
    log.debug("Updating update timestamp in Pocket item store");
    await this.db.put(
      METADATA_STORE_NAME,
      timestamp,
      LAST_UPDATED_TIMESTAMP_KEY
    );
    triggerOnChangeHandlers && (await this.handleOnChange());
  };

  getLastUpdateTimestamp = async (): Promise<UpdateTimestamp | null> => {
    return this.db.get(METADATA_STORE_NAME, LAST_UPDATED_TIMESTAMP_KEY);
  };

  subscribeOnChange = (cb: OnChangeCallback): CallbackId => {
    const callbackId = getUniqueId();
    this.onChangeCallbacks.set(callbackId, cb);
    return callbackId;
  };

  unsubscribeOnChange = (cbId: CallbackId): void => {
    this.onChangeCallbacks.delete(cbId);
  };

  private handleOnChange = async () => {
    const cbExecs = Array.from(this.onChangeCallbacks.values()).map((cb) =>
      cb()
    );
    await Promise.all(cbExecs);
  };

  clearDatabase = async () => {
    await this.db.clear(ITEM_STORE_NAME);
    await this.db.clear(METADATA_STORE_NAME);
    await this.handleOnChange();
  };
}

export const openPocketItemStore = async (): Promise<PocketItemStore> => {
  const dbVersion = 3;
  const db = await openDB(DATABASE_NAME, dbVersion, {
    upgrade: async (db, oldVersion, newVersion, tx) => {
      if (oldVersion !== newVersion) {
        log.info(
          `Upgrading Pocket item store to version ${newVersion} from version ${oldVersion}`
        );
      }

      switch (oldVersion) {
        case 0:
          const itemStore = db.createObjectStore(ITEM_STORE_NAME, {
            keyPath: "item_id",
          });
          const metadataStore = db.createObjectStore(METADATA_STORE_NAME);
        case 1:
          itemStore.createIndex("sort_id", "sort_id", { unique: false });
        case 2:
          const itemsExist =
            (await tx.objectStore(ITEM_STORE_NAME).count()) !== 0;
          const databaseBeingCreated = oldVersion === 0;
          const resetFetchTimestamp = itemsExist && !databaseBeingCreated;

          if (resetFetchTimestamp) {
            await tx.objectStore(METADATA_STORE_NAME).clear();
            new Notice(
              "Next Pocket sync will fetch full details of Pocket items, including tags",
              0
            );
          }
      }
    },
  });
  return new PocketItemStore(db);
};

export const closePocketItemStore = (pocketItemStore: PocketItemStore) =>
  pocketItemStore.db.close();
