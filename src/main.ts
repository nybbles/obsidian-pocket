import log from "loglevel";
import { Notice, Plugin } from "obsidian";
import ReactDOM from "react-dom";
import {
  PocketItemListView,
  POCKET_ITEM_LIST_VIEW_TYPE,
} from "./PocketItemListView";
import {
  closePocketItemStore,
  openPocketItemStore,
  PocketItemStore,
} from "./PocketItemStore";
import { createReactApp } from "./ReactApp";
import { PocketSettings, PocketSettingTab } from "./Settings";
import { ViewManager } from "./ViewManager";

export default class PocketSync extends Plugin {
  itemStore: PocketItemStore;
  appEl: HTMLDivElement;
  viewManager: ViewManager;
  pocketAuthenticated: boolean;
  settings: PocketSettings;
  pendingSync: Promise<void> | null = null;

  async syncPocketItems() {
    if (!!this.pendingSync) {
      new Notice("Sync already in progress, skipping");
      return;
    }

    try {
      await this.pendingSync;
    } finally {
      this.pendingSync = null;
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  async onload() {
    const defaultLogLevel = process.env.BUILD === "prod" ? "info" : "debug";
    log.setDefaultLevel(defaultLogLevel);

    log.info("Loading Pocket plugin");

    await this.loadSettings();

    this.pendingSync = null;

    // Set up Pocket item store
    log.debug("Opening Pocket item store");
    this.itemStore = await openPocketItemStore();

    this.addCommands();
    this.addSettingTab(
      new PocketSettingTab(this.app, this, async (newSettings) => {
        this.settings = newSettings;
        await this.saveSettings();
      })
    );

    // Set up React-based Pocket item list view
    this.viewManager = new ViewManager();
    this.mount();
    this.registerView(
      POCKET_ITEM_LIST_VIEW_TYPE,
      (leaf) => new PocketItemListView(leaf, this)
    );
  }

  // Mount React app
  mount = () => {
    console.debug("Mounting React components");
    ReactDOM.render(
      createReactApp(this.viewManager),
      this.appEl ?? (this.appEl = document.body.createDiv())
    );
    console.debug("Done mounting React components");
  };

  async onunload() {
    log.info("Unloading Pocket plugin");

    log.debug("Killing all views");
    this.killAllViews();
    this.viewManager = null;

    if (this.appEl) {
      ReactDOM.unmountComponentAtNode(this.appEl);
      this.appEl.detach();
    }

    log.debug("Closing Pocket item store");
    await closePocketItemStore(this.itemStore);
    this.itemStore = null;
  }

  killAllViews = () => {
    this.app.workspace
      .getLeavesOfType(POCKET_ITEM_LIST_VIEW_TYPE)
      .forEach((leaf) => leaf.detach());
    this.viewManager.views.forEach((view) => view.unload());
    this.viewManager.clearViews();
  };

  openPocketList = async () => {
    await this.app.workspace.activeLeaf.setViewState({
      type: POCKET_ITEM_LIST_VIEW_TYPE,
    });
  };

  addCommands = () => {
    this.addCommand({
      id: "open-pocket-list",
      name: "Open Pocket list",
      callback: () => {
        this.openPocketList();
      },
    });

    this.addCommand({
      id: "sync-pocket-list",
      name: "Sync Pocket list",
      callback: () => {
        this.syncPocketItems();
      },
    });
  };
}
