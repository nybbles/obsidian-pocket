import update from "immutability-helper";
import { MultiWordTagConversion } from "./Tags";
import { CallbackId, CallbackRegistry } from "./Types";
import { getUniqueId } from "./utils";

export interface PocketSettings {
  "item-note-template"?: string;
  "item-notes-folder"?: string;
  "multi-word-tag-converter"?: MultiWordTagConversion;
  "pocket-sync-tag"?: string;
}

const DEFAULT_POCKET_SETTINGS: PocketSettings = {
  "multi-word-tag-converter": "snake-case",
};

export type OnSettingsChangeCallback = () => Promise<void>;

export type LoadPocketSettingsFn = () => Promise<PocketSettings>;
export type SavePocketSettingsFn = (settings: PocketSettings) => Promise<void>;

export interface SettingsManagerParams {
  loadSettings: LoadPocketSettingsFn;
  saveSettings: SavePocketSettingsFn;
}

export class SettingsManager {
  private settings: PocketSettings;
  private loadSettings: LoadPocketSettingsFn;
  private saveSettings: SavePocketSettingsFn;

  private onSettingsChangeCallbacks: Map<
    keyof PocketSettings,
    CallbackRegistry<OnSettingsChangeCallback>
  >;

  constructor({ loadSettings, saveSettings }: SettingsManagerParams) {
    this.loadSettings = loadSettings;
    this.saveSettings = saveSettings;

    this.onSettingsChangeCallbacks = new Map();
  }

  async load() {
    this.settings = await this.loadSettings();
  }

  async save(newSettings: PocketSettings) {
    this.settings = newSettings;
    await this.saveSettings(this.settings);
  }

  getSetting(key: keyof PocketSettings) {
    return this.settings[key] ?? DEFAULT_POCKET_SETTINGS[key];
  }

  async updateSetting(key: keyof PocketSettings, newValue: any) {
    this.settings = update(this.settings, { [key]: { $set: newValue } });
    await Promise.all([
      this.save(this.settings),
      this.handleOnSettingsChange(key),
    ]);
  }

  subscribeOnSettingsChange(
    key: keyof PocketSettings,
    callback: OnSettingsChangeCallback
  ): CallbackId {
    const callbackId = getUniqueId();
    const callbackRegistry =
      this.onSettingsChangeCallbacks.get(key) ?? new Map();
    callbackRegistry.set(callbackId, callback);
    this.onSettingsChangeCallbacks.set(key, callbackRegistry);
    return callbackId;
  }

  unsubscribeOnSettingsChange(key: keyof PocketSettings, cbId: CallbackId) {
    const callbackRegistry = this.onSettingsChangeCallbacks.get(key);
    callbackRegistry.delete(cbId);
  }

  private async handleOnSettingsChange(key: keyof PocketSettings) {
    const callbackRegistry =
      this.onSettingsChangeCallbacks.get(key) ?? new Map();
    const cbExecs = Array.from(callbackRegistry.values()).map((cb) => cb());
    await Promise.all(cbExecs);
  }
}
