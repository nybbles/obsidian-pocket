import { Notice } from "obsidian";
import { PocketAPI } from "../pocket_api/PocketAPI";
import { AccessInfo } from "../pocket_api/PocketAuth";
import { PocketItemStore } from "./PocketItemStore";

export const doPocketSync = async (
  itemStore: PocketItemStore,
  pocketAPI: PocketAPI,
  accessInfo: AccessInfo
) => {
  const lastUpdateTimestamp = await itemStore.getLastUpdateTimestamp();

  new Notice(`Fetching Pocket updates for ${accessInfo.username}`);

  const getPocketItemsResponse = await pocketAPI.getPocketItems(
    accessInfo.accessToken,
    lastUpdateTimestamp
  );

  new Notice(
    `Fetched ${
      Object.keys(getPocketItemsResponse.response.list).length
    } updates from Pocket`
  );

  const storageNotice = new Notice(`Storing updates from Pocket...`, 0);

  await itemStore.mergeUpdates(
    getPocketItemsResponse.timestamp,
    getPocketItemsResponse.response.list
  );

  storageNotice.hide();
  new Notice(`Done storing updates from Pocket`);
};
