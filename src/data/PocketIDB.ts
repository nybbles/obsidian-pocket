import { IDBPDatabase, IDBPTransaction, openDB } from "idb";
import log from "loglevel";

const POCKET_IDB_DATABASE_NAME = "pocket_db";
const POCKET_IDB_VERISION = 4;

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

export const closePocketIDB = (pocketIDB: IDBPDatabase) => {
  pocketIDB.close();
};
