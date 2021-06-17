import { App, PluginSettingTab, Setting } from "obsidian";
import {
  loadPocketAccessInfo,
  OBSIDIAN_AUTH_PROTOCOL_ACTION,
  setupAuth,
  storePocketAccessInfo,
} from "./PocketAuth";
import PocketSync from "./main";
import { getAccessToken, getPocketItems } from "./PocketAPI";

const CONNECT_POCKET_CTA = "Connect your Pocket account";
const SYNC_POCKET_CTA = "Sync Pocket items";

export const addAuthSetting = (containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName("Pocket authorization")
    .setDesc(CONNECT_POCKET_CTA)
    .addButton((button) => {
      button.setButtonText(CONNECT_POCKET_CTA);
      button.onClick(setupAuth);
    });

const addTestAuthSetting = (plugin: PocketSync, containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName(SYNC_POCKET_CTA)
    .setDesc("Updates the Pocket items in Obsidian from Pocket")
    .addButton((button) => {
      button.setButtonText(SYNC_POCKET_CTA);
      button.onClick(async () => {
        const accessInfo = await loadPocketAccessInfo(plugin);
        if (!accessInfo) {
          console.log(`Not authenticated to Pocket, skipping`);
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
      }
    );

    let { containerEl } = this;
    containerEl.empty();
    addAuthSetting(containerEl);
    addTestAuthSetting(this.plugin, containerEl);
  }
}
