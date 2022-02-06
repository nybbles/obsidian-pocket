import log from "loglevel";
import { Notice } from "obsidian";
import { UpdateTimestamp } from "src/pocket_api/PocketAPI";
import {
  ITEM_STORE_NAME,
  METADATA_STORE_NAME,
  PocketIDB,
  PocketIDBUpgradeFn,
} from "./PocketIDB";

const LAST_UPDATED_TIMESTAMP_KEY = "last_updated_timestamp";

export class MetadataStore {
  db: PocketIDB;

  constructor(db: PocketIDB) {
    this.db = db;
  }

  // This Unix timestamp is the last time that the Pocket item store was synced
  // via the Pocket API. It is used in subsequent requests to only get updates
  // since the timestamp. If the timestamp is null, it means that no requests
  // have been done so far.

  setLastUpdateTimestamp = async (
    timestamp: UpdateTimestamp
  ): Promise<void> => {
    log.debug("Updating update timestamp in Pocket item store");
    await this.db.put(
      METADATA_STORE_NAME,
      timestamp,
      LAST_UPDATED_TIMESTAMP_KEY
    );
  };

  getLastUpdateTimestamp = async (): Promise<UpdateTimestamp | null> => {
    return this.db.get(METADATA_STORE_NAME, LAST_UPDATED_TIMESTAMP_KEY);
  };

  clearDatabase = async () => {
    await this.db.clear(METADATA_STORE_NAME);
  };

  static upgradeDatabase: PocketIDBUpgradeFn = async (
    db,
    oldVersion,
    newVersion,
    tx
  ) => {
    switch (oldVersion) {
      case 0:
        db.createObjectStore(METADATA_STORE_NAME);
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
  };
}
