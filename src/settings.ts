import { stylesheet } from "astroturf";
import log from "loglevel";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import PocketSync from "./main";
import { DEFAULT_CORS_PROXY_PORT, getPocketItems } from "./PocketAPI";
import {
  AccessInfo,
  clearPocketAccessInfo,
  loadPocketAccessInfo,
  pocketAccessInfoExists,
  setupAuth,
} from "./PocketAuth";

const styles = stylesheet`
  .error {
    border-color: var(--background-modifier-error-hover) !important;
  }
`;

const CONNECT_POCKET_CTA = "Connect your Pocket account";
const SYNC_POCKET_CTA = "Sync Pocket items";
const LOG_OUT_OF_POCKET_CTA = "Disconnect your Pocket account";
const CLEAR_LOCAL_POCKET_DATA_CTA = "Clear locally-stored Pocket data";
const SET_CORS_PROXY_PORT_CTA = "Set CORS proxy port";

export interface PocketSettings {
  "cors-proxy-port"?: number;
}

const addAuthButton = (containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName("Pocket authorization")
    .setDesc(CONNECT_POCKET_CTA)
    .addButton((button) => {
      button.setButtonText(CONNECT_POCKET_CTA);
      button.onClick(setupAuth);
    });

const doPocketSync = async (plugin: PocketSync, accessInfo: AccessInfo) => {
  const lastUpdateTimestamp = await plugin.itemStore.getLastUpdateTimestamp();

  new Notice(`Fetching Pocket updates for ${accessInfo.username}`);

  const getPocketItemsResponse = await getPocketItems(
    accessInfo.accessToken,
    lastUpdateTimestamp
  );

  new Notice(
    `Fetched ${
      Object.keys(getPocketItemsResponse.response.list).length
    } updates from Pocket`
  );

  const storageNotice = new Notice(`Storing updates from Pocket...`, 0);

  await plugin.itemStore.mergeUpdates(
    getPocketItemsResponse.timestamp,
    getPocketItemsResponse.response.list
  );

  storageNotice.hide();
  new Notice(`Done storing updates from Pocket`);
};

var pendingSync: Promise<void> | null = null;

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

        if (!!pendingSync) {
          new Notice("Sync already in progress, skipping");
          return;
        }

        pendingSync = doPocketSync(plugin, accessInfo);
        try {
          await pendingSync;
        } finally {
          pendingSync = null;
        }
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
          log.debug("Disconnecting from Pocket by clearing Pocket access info");
          clearPocketAccessInfo(plugin);
          new Notice("Disconnected from Pocket");
        } else {
          new Notice("Already logged out of Pocket, skipping");
        }
      });

      plugin.pocketAuthenticated = false;
      plugin.pocketUsername = null;
    });
};

const addClearLocalPocketDataButton = (
  plugin: PocketSync,
  containerEl: HTMLElement
) => {
  new Setting(containerEl)
    .setName(CLEAR_LOCAL_POCKET_DATA_CTA)
    .setDesc("Clears Pocket data stored locally by Pocket-obsidian plugin")
    .addButton((button) => {
      button.setButtonText(CLEAR_LOCAL_POCKET_DATA_CTA);
      button.onClick(async () => {
        await plugin.itemStore.clearDatabase();
        new Notice("Cleared locally-stored Pocket data");
      });
    });
};

const addCORSProxyPortSetting = (
  plugin: PocketSync,
  containerEl: HTMLElement,
  onSettingsChange: OnSettingsChange
) => {
  new Setting(containerEl)
    .setName(SET_CORS_PROXY_PORT_CTA)
    .setDesc("Sets port used for local CORS proxy")
    .addText((text) => {
      const value = plugin.settings["cors-proxy-port"];

      text.inputEl.setAttr("type", "number");
      text.inputEl.placeholder = `${DEFAULT_CORS_PROXY_PORT} (default)`;
      text.inputEl.value = value ? value.toString() : "";

      text.onChange((newValue) => {
        if (!newValue) {
          text.inputEl.removeClass(styles.error);
          plugin.settings["cors-proxy-port"] = null;
          onSettingsChange(plugin.settings);
          return;
        }

        const MIN_PORT_NUMBER = 0;
        const MAX_PORT_NUMBER = 65535;
        const parsed = parseInt(newValue);

        if (
          parsed === NaN ||
          parsed > MAX_PORT_NUMBER ||
          parsed < MIN_PORT_NUMBER
        ) {
          text.inputEl.addClass(styles.error);
          log.info(`Invalid port number: ${parsed}`);
          plugin.settings["cors-proxy-port"] = null;
          onSettingsChange(plugin.settings);
          return;
        }

        text.inputEl.removeClass(styles.error);
        plugin.settings["cors-proxy-port"] = parsed;
        onSettingsChange(plugin.settings);
      });
    });
};

export type OnSettingsChange = (newSettings: PocketSettings) => Promise<void>;

export class PocketSettingTab extends PluginSettingTab {
  plugin: PocketSync;
  onSettingsChange: OnSettingsChange;

  constructor(
    app: App,
    plugin: PocketSync,
    onSettingsChange: OnSettingsChange
  ) {
    super(app, plugin);
    this.plugin = plugin;
    this.onSettingsChange = onSettingsChange;
  }

  display(): void {
    let { containerEl } = this;
    containerEl.empty();
    addAuthButton(containerEl);
    addSyncButton(this.plugin, containerEl);
    addLogoutButton(this.plugin, containerEl);
    addClearLocalPocketDataButton(this.plugin, containerEl);
    addCORSProxyPortSetting(this.plugin, containerEl, this.onSettingsChange);
  }
}
