import { stylesheet } from "astroturf";
import log from "loglevel";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import PocketSync from "./main";

const styles = stylesheet`
  .error {
    border-color: var(--background-modifier-error-hover) !important;
  }
`;

const CONNECT_POCKET_CTA = "Connect your Pocket account";
const SYNC_POCKET_CTA = "Sync Pocket items";
const LOG_OUT_OF_POCKET_CTA = "Disconnect your Pocket account";
const CLEAR_LOCAL_POCKET_DATA_CTA = "Clear locally-stored Pocket data";
const SET_ITEM_NOTE_TEMPLATE_CTA = "Pocket item note template file location";
const SET_ITEM_NOTES_LOCATION_CTA = "Pocket item notes folder location";

export interface PocketSettings {
  "item-note-template"?: string;
  "item-notes-folder"?: string;
}

const addAuthButton = (plugin: PocketSync, containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName("Pocket authorization")
    .setDesc(CONNECT_POCKET_CTA)
    .addButton((button) => {
      button.setButtonText(CONNECT_POCKET_CTA);
    });

const addSyncButton = (plugin: PocketSync, containerEl: HTMLElement) =>
  new Setting(containerEl)
    .setName(SYNC_POCKET_CTA)
    .setDesc("Updates the Pocket items in Obsidian from Pocket")
    .addButton((button) => {
      button.setButtonText(SYNC_POCKET_CTA);
      button.onClick(async () => {
        plugin.syncPocketItems();
      });
    });

const addLogoutButton = (plugin: PocketSync, containerEl: HTMLElement) => {
  new Setting(containerEl)
    .setName(LOG_OUT_OF_POCKET_CTA)
    .setDesc("Disconnects Obsidian from Pocket")
    .addButton((button) => {
      button.setButtonText(LOG_OUT_OF_POCKET_CTA);
      button.onClick(async () => {});

      plugin.pocketAuthenticated = false;
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

const addItemNoteTemplateSetting = (
  plugin: PocketSync,
  containerEl: HTMLElement,
  onSettingsChange: OnSettingsChange
) => {
  new Setting(containerEl)
    .setName(SET_ITEM_NOTE_TEMPLATE_CTA)
    .setDesc(
      "Choose the file to use as a template when creating a new note from a Pocket item"
    )
    .addText((text) => {
      text.setPlaceholder("Example: Templates/Pocket item note");
      text.setValue(plugin.settings["item-note-template"]);
      text.onChange(async (newValue) => {
        plugin.settings["item-note-template"] = newValue;
        await onSettingsChange(plugin.settings);
      });
    });
};

const addItemNotesLocationSetting = (
  plugin: PocketSync,
  containerEl: HTMLElement,
  onSettingsChange: OnSettingsChange
) => {
  new Setting(containerEl)
    .setName(SET_ITEM_NOTES_LOCATION_CTA)
    .setDesc("Choose the folder for creating and finding Pocket item notes")
    .addText(async (text) => {
      text.setPlaceholder("Example: Pocket item notes/");
      text.setValue(plugin.settings["item-notes-folder"]);
      text.onChange(async (newValue) => {
        plugin.settings["item-notes-folder"] = newValue;
        await onSettingsChange(plugin.settings);
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
    addAuthButton(this.plugin, containerEl);
    addSyncButton(this.plugin, containerEl);
    addLogoutButton(this.plugin, containerEl);
    addClearLocalPocketDataButton(this.plugin, containerEl);
    addItemNoteTemplateSetting(this.plugin, containerEl, this.onSettingsChange);
    addItemNotesLocationSetting(
      this.plugin,
      containerEl,
      this.onSettingsChange
    );
  }
}
