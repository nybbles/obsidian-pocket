import { IDBPDatabase, IDBPTransaction, openDB } from "idb";
import log from "loglevel";

const POCKET_IDB_DATABASE_NAME = "pocket_db";
const POCKET_IDB_VERISION = 6;

export const ITEM_STORE_NAME = "items";
export const METADATA_STORE_NAME = "metadata";
export const URL_TO_ITEM_NOTE_STORE_NAME = "url_to_item_notes";

export type PocketIDB = IDBPDatabase;

export type PocketIDBUpgradeFn = (
  db: IDBPDatabase,
  oldVersion: number,
  newVersion: number | null,
  tx: IDBPTransaction<unknown, string[], "versionchange">
) => Promise<void>;

export const openPocketIDB = async (
  upgradeFns: PocketIDBUpgradeFn[]
): Promise<IDBPDatabase> => {
  const db = await openDB(POCKET_IDB_DATABASE_NAME, POCKET_IDB_VERISION, {
    upgrade: async (db, oldVersion, newVersion, tx) => {
      if (oldVersion !== newVersion) {
        log.info(
          `Upgrading Pocket IDB to version ${newVersion} from version ${oldVersion}`
        );
      }

      for (const upgradeFn of upgradeFns) {
        await upgradeFn(db, oldVersion, newVersion, tx);
      }
    },
  });

  return db;
};

export const closePocketIDB = (pocketIDB: PocketIDB) => {
  pocketIDB.close();
};
