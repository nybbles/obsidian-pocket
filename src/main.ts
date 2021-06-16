import * as cors_proxy from "cors-anywhere";
import { App, Modal, Notice, Plugin } from "obsidian";
import ReactDOM from "react-dom";
import {
  PocketItemListView,
  POCKET_ITEM_LIST_VIEW_TYPE,
} from "./PocketItemListView";
import { openPocketItemStore, PocketItemStore } from "./pocket_item_store";
import { createReactApp } from "./ReactApp";
import { PocketSettingTab } from "./settings";
import { ViewManager } from "./ViewManager";

interface PocketSyncSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: PocketSyncSettings = {
  mySetting: "default",
};

const setupCORSProxy = () => {
  // TODO: This code does not handle the setting where the CORS proxy has
  // already been set up.

  const host = "0.0.0.0";
  const port = 9090;
  cors_proxy.createServer({}).listen(port, host, () => {
    console.log("Running CORS Anywhere on " + host + ":" + port);
  });
};

export default class PocketSync extends Plugin {
  settings: PocketSyncSettings;
  itemStore: PocketItemStore;
  appEl: HTMLDivElement;
  viewManager: ViewManager;

  async onload() {
    console.log("loading plugin");
    await this.loadSettings();

    // Set up CORS proxy for Pocket API calls
    console.log("setting up CORS proxy");
    setupCORSProxy();

    // Set up Pocket item store
    console.log("opening Pocket item store");
    this.itemStore = await openPocketItemStore();

    this.addRibbonIcon("dice", "Sample Plugin", () => {
      new Notice("This is a notice!");
    });

    this.addCommands();

    this.addStatusBarItem().setText("Status Bar Text");

    this.addSettingTab(new PocketSettingTab(this.app, this));

    this.registerCodeMirror((cm: CodeMirror.Editor) => {
      console.log("codemirror", cm);
    });

    this.registerDomEvent(document, "click", (evt: MouseEvent) => {
      console.log("click", evt);
    });

    this.registerInterval(
      window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
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
    console.log("mounting React components");
    ReactDOM.render(
      createReactApp(this.viewManager),
      this.appEl ?? (this.appEl = document.body.createDiv())
    );
    console.log("done mounting React components");
  };

  onunload() {
    console.log("unloading plugin");

    this.viewManager.clearViews();
    this.viewManager = null;
    if (this.appEl) {
      ReactDOM.unmountComponentAtNode(this.appEl);
      this.appEl.detach();
    }
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  openPocketList = async () => {
    await this.app.workspace.activeLeaf.setViewState({
      type: POCKET_ITEM_LIST_VIEW_TYPE,
    });
  };

  addCommands = () => {
    this.addCommand({
      id: "open-pocket-list",
      name: "Open Pocket list",
      // callback: () => {
      // 	console.log('Simple Callback');
      // },
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            this.openPocketList();
          }
          return true;
        }
        return false;
      },
    });
  };
}

class SampleModal extends Modal {
  constructor(app: App) {
    super(app);
  }

  onOpen() {
    let { contentEl } = this;
    contentEl.setText("Woah!");
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}
