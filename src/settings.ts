import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import PocketSync from "./main";
import { getAccessToken, getPocketItems } from "./PocketAPI";
import {
  clearPocketAccessInfo,
  loadPocketAccessInfo,
  OBSIDIAN_AUTH_PROTOCOL_ACTION,
  pocketAccessInfoExists,
  setupAuth,
  storePocketAccessInfo,
} from "./PocketAuth";

const CONNECT_POCKET_CTA = "Connect your Pocket account";
const SYNC_POCKET_CTA = "Sync Pocket items";
const LOG_OUT_OF_POCKET_CTA = "Disconnect your Pocket account";

const addAuthButton = (containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName("Pocket authorization")
    .setDesc(CONNECT_POCKET_CTA)
    .addButton((button) => {
      button.setButtonText(CONNECT_POCKET_CTA);
      button.onClick(setupAuth);
    });

const addSyncButton = (plugin: PocketSync, containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName(SYNC_POCKET_CTA)
    .setDesc("Updates the Pocket items in Obsidian from Pocket")
    .addButton((button) => {
      button.setButtonText(SYNC_POCKET_CTA);
      button.onClick(async () => {
        const accessInfo = await loadPocketAccessInfo(plugin);
        if (!accessInfo) {
          new Notice("Not logged into Pocket, skipping sync");
          return;
        }

        console.log(
          `Fetching pocket items for username: ${accessInfo.username}`
        );

        const lastUpdateTimestamp =
          await plugin.itemStore.getLastUpdateTimestamp();

        const getPocketItemsResponse = await getPocketItems(
          accessInfo.accessToken,
          lastUpdateTimestamp
        );

        console.log(
          `Fetched ${
            Object.keys(getPocketItemsResponse.response.list).length
          } updates`
        );

        await plugin.itemStore.mergeUpdates(
          getPocketItemsResponse.timestamp,
          getPocketItemsResponse.response.list
        );
      });
    });

const addLogoutButton = (plugin: PocketSync, containerEl: HTMLElement) => {
  new Setting(containerEl)
    .setName(LOG_OUT_OF_POCKET_CTA)
    .setDesc("Disconnects Obsidian from Pocket")
    .addButton((button) => {
      button.setButtonText(LOG_OUT_OF_POCKET_CTA);
      button.onClick(async () => {
        if (await pocketAccessInfoExists(plugin)) {
          console.log(
            "Disconnecting from Pocket by clearing Pocket access info"
          );
          clearPocketAccessInfo(plugin);
        } else {
          new Notice("Already logged out of Pocket, skipping");
        }
      });

      plugin.pocketAuthenticated = false;
      plugin.pocketUsername = null;
    });
};

export class PocketSettingTab extends PluginSettingTab {
  plugin: PocketSync;

  constructor(app: App, plugin: PocketSync) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.plugin.registerObsidianProtocolHandler(
      OBSIDIAN_AUTH_PROTOCOL_ACTION,
      async (params) => {
        const accessInfo = await getAccessToken();
        storePocketAccessInfo(this.plugin, accessInfo);
        this.plugin.pocketAuthenticated = true;
        this.plugin.pocketUsername = accessInfo.username;
      }
    );

    let { containerEl } = this;
    containerEl.empty();
    addAuthButton(containerEl);
    addSyncButton(this.plugin, containerEl);
    addLogoutButton(this.plugin, containerEl);
  }
}
