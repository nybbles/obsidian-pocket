import { IDBPDatabase, openDB } from "idb";
import { UpdateTimestamp } from "./PocketAPI";
import {
  isDeletedPocketItem,
  isSavedPocketItem,
  PocketItemId,
  PocketItemRecord,
  SavedPocketItem,
} from "./PocketAPITypes";

const DATABASE_NAME = "pocket_db";
const ITEM_STORE_NAME = "items";

const METADATA_STORE_NAME = "metadata";
const LAST_UPDATED_TIMESTAMP_KEY = "last_updated_timestamp";

export class PocketItemStore {
  db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  mergeUpdates = async (
    lastUpdateTimestamp: UpdateTimestamp,
    items: PocketItemRecord
  ): Promise<void> => {
    const updates = [];

    for (const key in items) {
      const item = items[key];
      if (isDeletedPocketItem(item)) {
        updates.push(this.deleteItem(item.item_id));
      } else if (isSavedPocketItem(item)) {
        updates.push(this.putItem(item));
      } else {
        throw new Error("unexpected");
      }
    }

    this.setLastUpdateTimestamp(lastUpdateTimestamp);

    // get Unix timestamp and write it
    await Promise.all(updates);
  };

  addItem = async (item: SavedPocketItem): Promise<void> => {
    this.db.add(ITEM_STORE_NAME, item);
  };

  putItem = async (item: SavedPocketItem): Promise<void> => {
    this.db.put(ITEM_STORE_NAME, item);
  };

  getItem = async (itemId: PocketItemId): Promise<SavedPocketItem | null> => {
    return this.db.get(ITEM_STORE_NAME, itemId);
  };

  deleteItem = async (itemId: PocketItemId): Promise<void> => {
    this.db.delete(ITEM_STORE_NAME, itemId);
  };

  // This Unix timestamp is the last time that the Pocket item store was synced
  // via the Pocket API. It is used in subsequent requests to only get updates
  // since the timestamp. If the timestamp is null, it means that no requests
  // have been done so far.

  setLastUpdateTimestamp = async (
    timestamp: UpdateTimestamp
  ): Promise<void> => {
    this.db.put(METADATA_STORE_NAME, timestamp, LAST_UPDATED_TIMESTAMP_KEY);
  };

  getLastUpdateTimestamp = async (): Promise<UpdateTimestamp | null> => {
    return this.db.get(METADATA_STORE_NAME, LAST_UPDATED_TIMESTAMP_KEY);
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
