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

    // TODO: Should all of this be happening in a transaction?
    console.log("Applying updates");
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

    // Wait on all changes, update timestamp, then trigger registered onChange handlers
    await Promise.all(updates);
    console.log("Updates applied");
    this.setLastUpdateTimestamp(lastUpdateTimestamp);
    console.log("Running onChange handlers");
    await this.handleOnChange();
  };

  addItem = async (item: SavedPocketItem, triggerOnChangeHandlers = true) => {
    await this.db.add(ITEM_STORE_NAME, item);
    triggerOnChangeHandlers && (await this.handleOnChange());
  };

  putItem = async (
    item: SavedPocketItem,
    triggerOnChangeHandlers?: boolean
  ) => {
    await this.db.put(ITEM_STORE_NAME, item);
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
    itemId: PocketItemId,
    triggerOnChangeHandlers?: boolean
  ) => {
    await this.db.delete(ITEM_STORE_NAME, itemId);
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
    console.log("Updating update timestamp");
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

  clearDatabase = async () => {
    await this.db.clear(ITEM_STORE_NAME);
    await this.db.clear(METADATA_STORE_NAME);
  };
}

export const openPocketItemStore = async (): Promise<PocketItemStore> => {
  const dbVersion = 2;
  const db = await openDB(DATABASE_NAME, dbVersion, {
    upgrade: (db, oldVersion, newVersion, tx) => {
      if (oldVersion !== newVersion) {
        console.log(
          `Upgrading pocket item store to version ${newVersion} from version ${oldVersion}`
        );
      }

      switch (oldVersion) {
        case 0:
          db.createObjectStore(ITEM_STORE_NAME, {
            keyPath: "item_id",
          });
          db.createObjectStore(METADATA_STORE_NAME);
        case 1:
          const itemStore = tx.objectStore(ITEM_STORE_NAME);
          itemStore.createIndex("sort_id", "sort_id", { unique: false });
      }
    },
  });
  return new PocketItemStore(db);
};
