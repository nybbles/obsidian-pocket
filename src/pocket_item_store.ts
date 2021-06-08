import * as sqlite3 from "sqlite3";
import * as sqlite from "sqlite";

type PocketItemId = string;
type PocketItem = void;

export interface PocketItemStore {
  // db: sqlite.Database;
}

export const openPocketItemStore = async (
  filename: string
): Promise<PocketItemStore> => {
  console.log("WTF");
  const db = await sqlite.open({
    filename: filename,
    driver: sqlite3.cached.Database,
  });
  console.log("FTW");
  // return { db: db };
  return {};
};

/*
abstract class PocketItemStore {
  abstract addItems: () => Promise<void>;
  abstract deleteItems: (itemIds: PocketItemId[]) => Promise<void>;

  abstract getItem: (itemId: PocketItemId) => Promise<PocketItem>;

  abstract syncToDisk: () => Promise<void>;
}
*/
