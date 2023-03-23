import { IDBPObjectStore } from "idb";
import log from "loglevel";
import { CallbackId, CallbackRegistry } from "src/CallbackRegistry";
import {
  isDeletedPocketItem,
  isSavedPocketItem,
  PocketItemId,
  PocketItemRecord,
  SavedPocketItem,
} from "../pocket_api/PocketAPITypes";
import { getUniqueId } from "../Utils";
import { ITEM_STORE_NAME, PocketIDB, PocketIDBUpgradeFn } from "./PocketIDB";

export type OnChangeCallback = () => Promise<void>;

type IDBPPocketItemStoreRW = IDBPObjectStore<
  unknown,
  ["items"],
  "items",
  "readwrite"
>;

export class PocketItemStore {
  db: PocketIDB;
  onChangeCallbacks: CallbackRegistry<CallbackId, OnChangeCallback>;

  static isItemValid = (item: SavedPocketItem) =>
    !item.resolved_title && !item.resolved_url;

  constructor(db: PocketIDB) {
    this.db = db;
    this.onChangeCallbacks = new Map();
  }

  mergeUpdates = async (items: PocketItemRecord): Promise<void> => {
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

  getAllItemsByTimeUpdated = async (): Promise<SavedPocketItem[]> => {
    return (
      await this.db.getAllFromIndex(ITEM_STORE_NAME, "time_updated")
    ).reverse();
  };

  deleteItem = async (
    store: IDBPPocketItemStoreRW,
    itemId: PocketItemId,
    triggerOnChangeHandlers?: boolean
  ) => {
    await store.delete(itemId);
    triggerOnChangeHandlers && (await this.handleOnChange());
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
    await this.handleOnChange();
  };

  static upgradeDatabase: PocketIDBUpgradeFn = async (
    db,
    oldVersion,
    newVersion,
    tx
  ) => {
    switch (oldVersion) {
      case 0:
        db.createObjectStore(ITEM_STORE_NAME, {
          keyPath: "item_id",
        });
      case 1:
        tx.objectStore(ITEM_STORE_NAME).createIndex("sort_id", "sort_id", {
          unique: false,
        });

      case 3:
        tx.objectStore(ITEM_STORE_NAME).createIndex(
          "time_updated",
          "time_updated",
          {
            unique: false,
          }
        );
    }
  };
}
