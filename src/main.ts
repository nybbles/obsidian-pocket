import { Notice, Plugin } from "obsidian";
import {
  buildPocketAPI,
  PocketAPI,
  Username as PocketUsername,
} from "./PocketAPI";
import { AccessInfo } from "./PocketAuth";
import { PocketSettings, PocketSettingTab } from "./Settings";

const doPocketSync = async (plugin: PocketSync, accessInfo: AccessInfo) => {};

const POCKET_ITEM_LIST_VIEW_TYPE = "foo";

export default class PocketSync extends Plugin {
  appEl: HTMLDivElement;
  pocketUsername: PocketUsername | null;
  pocketAuthenticated: boolean;
  settings: PocketSettings;
  pocketAPI: PocketAPI;
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
    console.error("test");

    const defaultLogLevel = process.env.BUILD === "prod" ? "info" : "debug";

    this.pendingSync = null;

    this.pocketAPI = buildPocketAPI();

    // Set up Pocket item store

    this.addCommands();
    this.addSettingTab(
      new PocketSettingTab(this.app, this, async (newSettings) => {
        this.settings = newSettings;
        await this.saveSettings();
      })
    );

    (async () => {
      console.log("foo");
    })();

    /*
    this.registerObsidianProtocolHandler(
      OBSIDIAN_AUTH_PROTOCOL_ACTION,
      async (params) => {
        const accessInfo = await this.pocketAPI.getAccessToken();
        if (!accessInfo.username) {
          throw new Error("Unexpected null username from Pocket auth");
        }

        this.pocketAuthenticated = true;
        this.pocketUsername = accessInfo.username;
        new Notice(`Logged in to Pocket as ${this.pocketUsername}`);
      }
    );
    */

    // Set up React-based Pocket item list view
    this.mount();
  }

  // Mount React app
  mount = () => {
    console.debug("Mounting React components");
    /*
    ReactDOM.render(
      createReactApp(this.viewManager),
      this.appEl ?? (this.appEl = document.body.createDiv())
    );
    */
    console.debug("Done mounting React components");
  };

  async onunload() {
    this.killAllViews();

    if (this.appEl) {
      // ReactDOM.unmountComponentAtNode(this.appEl);
      this.appEl.detach();
    }

    this.pocketAPI = null;
  }

  killAllViews = () => {
    this.app.workspace
      .getLeavesOfType(POCKET_ITEM_LIST_VIEW_TYPE)
      .forEach((leaf) => leaf.detach());
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
