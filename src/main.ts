import log from "loglevel";
import { Notice, Plugin } from "obsidian";
import ReactDOM from "react-dom";
import {
  buildPocketAPI,
  PocketAPI,
  Username as PocketUsername,
} from "./PocketAPI";
import {
  loadPocketAccessInfo,
  OBSIDIAN_AUTH_PROTOCOL_ACTION,
  storePocketAccessInfo,
} from "./PocketAuth";
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
  pocketUsername: PocketUsername | null;
  pocketAuthenticated: boolean;
  settings: PocketSettings;
  pocketAPI: PocketAPI;

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

    this.pocketAPI = buildPocketAPI();

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

    const accessInfo = await loadPocketAccessInfo(this);
    if (!accessInfo) {
      console.info(`Not authenticated to Pocket`);
    }

    this.registerObsidianProtocolHandler(
      OBSIDIAN_AUTH_PROTOCOL_ACTION,
      async (params) => {
        const accessInfo = await this.pocketAPI.getAccessToken();
        if (!accessInfo.username) {
          throw new Error("Unexpected null username from Pocket auth");
        }

        storePocketAccessInfo(this, accessInfo);
        this.pocketAuthenticated = true;
        this.pocketUsername = accessInfo.username;
        new Notice(`Logged in to Pocket as ${this.pocketUsername}`);
      }
    );

    this.pocketAuthenticated = !!accessInfo;
    this.pocketUsername = accessInfo?.username;

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

    this.pocketAPI = null;
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
  };
}
