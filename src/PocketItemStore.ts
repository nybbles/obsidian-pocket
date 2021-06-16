import { IDBPDatabase, openDB } from "idb";
import { v4 as uuidv4 } from "uuid";
import { UpdateTimestamp } from "./PocketAPI";
import {
  isDeletedPocketItem,
  isSavedPocketItem,
  PocketItemId,
  PocketItemRecord,
  SavedPocketItem,
} from "./PocketAPITypes";
import { ViewName } from "./ViewManager";

const DATABASE_NAME = "pocket_db";
const ITEM_STORE_NAME = "items";

const METADATA_STORE_NAME = "metadata";
const LAST_UPDATED_TIMESTAMP_KEY = "last_updated_timestamp";

export type OnChangeCallback = () => Promise<void>;
export type CallbackId = string;

export class PocketItemStore {
  db: IDBPDatabase;
  onChangeCallbacks: Map<ViewName, OnChangeCallback>;

  constructor(db: IDBPDatabase) {
    this.db = db;
    this.onChangeCallbacks = new Map();
  }

  mergeUpdates = async (
    lastUpdateTimestamp: UpdateTimestamp,
    items: PocketItemRecord
  ): Promise<void> => {
    const updates = [];

    for (const key in items) {
      const item = items[key];
      if (isDeletedPocketItem(item)) {
        updates.push(this.deleteItem(item.item_id, false));
      } else if (isSavedPocketItem(item)) {
        updates.push(this.putItem(item, false));
      } else {
        throw new Error("unexpected");
      }
    }

    // get Unix timestamp and write it
    this.setLastUpdateTimestamp(lastUpdateTimestamp);

    // Wait on all changes, then trigger registered onChange handlers
    await Promise.all(updates);
    await this.handleOnChange();
  };

  addItem = async (
    item: SavedPocketItem,
    triggerOnChangeHandlers = true
  ): Promise<void> => {
    this.db.add(ITEM_STORE_NAME, item);
    triggerOnChangeHandlers && (await this.handleOnChange());
  };

  putItem = async (
    item: SavedPocketItem,
    triggerOnChangeHandlers?: boolean
  ): Promise<void> => {
    this.db.put(ITEM_STORE_NAME, item);
    triggerOnChangeHandlers && (await this.handleOnChange());
  };

  getItem = async (itemId: PocketItemId): Promise<SavedPocketItem | null> => {
    return this.db.get(ITEM_STORE_NAME, itemId);
  };

  getAllItems = async (): Promise<SavedPocketItem[]> => {
    return this.db.getAll(ITEM_STORE_NAME);
  };

  deleteItem = async (
    itemId: PocketItemId,
    triggerOnChangeHandlers?: boolean
  ): Promise<void> => {
    this.db.delete(ITEM_STORE_NAME, itemId);
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
    this.db.put(METADATA_STORE_NAME, timestamp, LAST_UPDATED_TIMESTAMP_KEY);
  };

  getLastUpdateTimestamp = async (): Promise<UpdateTimestamp | null> => {
    return this.db.get(METADATA_STORE_NAME, LAST_UPDATED_TIMESTAMP_KEY);
  };

  subscribeOnChange = (cb: OnChangeCallback): CallbackId => {
    const callbackId = uuidv4();
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
}

export const openPocketItemStore = async (): Promise<PocketItemStore> => {
  const db = await openDB(DATABASE_NAME, 1, {
    upgrade: (db) => {
      const _itemStore = db.createObjectStore(ITEM_STORE_NAME, {
        keyPath: "item_id",
      });

      const _metadataStore = db.createObjectStore(METADATA_STORE_NAME);
    },
  });
  return new PocketItemStore(db);
};
