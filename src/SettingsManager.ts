export interface PocketSettings {
  "item-note-template"?: string;
  "item-notes-folder"?: string;
  "multi-word-tag-converter"?: string;
}

export type LoadPocketSettingsFn = () => Promise<PocketSettings>;
export type SavePocketSettingsFn = (settings: PocketSettings) => Promise<void>;

export interface SettingsManagerParams {
  loadSettings: LoadPocketSettingsFn;
  saveSettings: SavePocketSettingsFn;
}

export class SettingsManager {
  settings: PocketSettings;
  loadSettings: LoadPocketSettingsFn;
  saveSettings: SavePocketSettingsFn;

  constructor({ loadSettings, saveSettings }: SettingsManagerParams) {
    this.loadSettings = loadSettings;
    this.saveSettings = saveSettings;
  }

  async load() {
    this.settings = await this.loadSettings();
  }

  async save(newSettings: PocketSettings) {
    this.settings = newSettings;
    await this.saveSettings(this.settings);
  }

  async onSettingsChange(newSettings: PocketSettings) {
    this.save(newSettings);
    // TODO: let subscribers know that settings changed
  }

  // TODO: Allow for subscription to changes, just like in PocketItemStore
}
