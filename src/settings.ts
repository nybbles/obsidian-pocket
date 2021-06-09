import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import {
  loadPocketAccessInfo,
  OBSIDIAN_AUTH_PROTOCOL_ACTION,
  setupAuth,
  storePocketAccessInfo,
} from "./auth";
import PocketSync from "./main";
import { getAccessToken, getPocketItems } from "./pocket_api";

const CONNECT_POCKET_CTA = "Connect your Pocket account";

export const addAuthSetting = (containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName("Pocket authorization")
    .setDesc(CONNECT_POCKET_CTA)
    .addButton((button) => {
      button.setButtonText(CONNECT_POCKET_CTA);
      button.onClick(setupAuth);
    });

const addTestAuthSetting = (plugin: Plugin, containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName("Test Pocket get")
    .setDesc("Click here to check that Pocket works")
    .addButton((button) => {
      button.setButtonText("Test Pocket get");
      button.onClick(async () => {
        const accessInfo = await loadPocketAccessInfo(plugin);
        if (!accessInfo) {
          console.log(`Not authenticated to Pocket, skipping`);
        }

        console.log(
          `Fetching pocket items for username: ${accessInfo.username}`
        );
        const pocketItems = await getPocketItems(accessInfo.accessToken);
        console.log(pocketItems);
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
