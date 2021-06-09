import { IDBPDatabase, openDB } from "idb";
import {
  isDeletedPocketItem,
  isSavedPocketItem,
  PocketItemId,
  PocketItemRecord,
  SavedPocketItem,
} from "./pocket_api_types";

const DATABASE_NAME = "pocket_db";
const STORE_NAME = "items";

export class PocketItemStore {
  db: IDBPDatabase;

  constructor(db: IDBPDatabase) {
    this.db = db;
  }

  mergeUpdates = async (items: PocketItemRecord): Promise<void> => {
    const updates = [];

    for (const key in items) {
      const item = items[key];
      if (isDeletedPocketItem(item)) {
        updates.push(this.deleteItem(item.item_id));
      } else if (isSavedPocketItem(item)) {
        updates.push(this.putItem(item.item_id, item));
      } else {
        throw new Error("unexpected");
      }
    }

    await Promise.all(updates);
  };

  addItem = async (item: SavedPocketItem): Promise<void> => {
    this.db.add(STORE_NAME, item);
  };

  putItem = async (
    itemId: PocketItemId,
    item: SavedPocketItem
  ): Promise<void> => {
    this.db.put(STORE_NAME, item);
  };

  getItem = async (itemId: PocketItemId): Promise<SavedPocketItem | null> => {
    return this.db.get(STORE_NAME, itemId);
  };

  deleteItem = async (itemId: PocketItemId): Promise<void> => {
    this.db.delete(STORE_NAME, itemId);
  };
}

export const openPocketItemStore = async (
  databaseName?: string,
  storeName?: string
): Promise<PocketItemStore> => {
  const db = await openDB(databaseName || DATABASE_NAME, 1, {
    upgrade: (db) => {
      const store = db.createObjectStore(storeName || STORE_NAME, {
        keyPath: "item_id",
      });
    },
  });
  return new PocketItemStore(db);
};
