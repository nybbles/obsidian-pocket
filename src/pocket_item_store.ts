import { IDBPDatabase, openDB } from "idb";

type PocketItemId = string;
type PocketItem = void;

const DATABASE_NAME = "pocket_item_db";

export interface PocketItemStore {
  db: IDBPDatabase;
}

export const openPocketItemStore = async (): Promise<PocketItemStore> => {
  const db = await openDB(DATABASE_NAME);
  return { db: db };
};

/*
abstract class PocketItemStore {
  abstract addItems: () => Promise<void>;
  abstract deleteItems: (itemIds: PocketItemId[]) => Promise<void>;

  abstract getItem: (itemId: PocketItemId) => Promise<PocketItem>;

  abstract syncToDisk: () => Promise<void>;
}
*/
