import * as cors_proxy from "cors-anywhere";
import { App, Modal, Notice, Plugin } from "obsidian";
import { openPocketItemStore, PocketItemStore } from "./pocket_item_store";
import { PocketSettingTab } from "./settings";

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

  async onload() {
    console.log("loading plugin");
    await this.loadSettings();

    console.log("setting up CORS proxy");
    setupCORSProxy();

    console.log("opening Pocket item store");
    this.itemStore = await openPocketItemStore();

    this.addRibbonIcon("dice", "Sample Plugin", () => {
      new Notice("This is a notice!");
    });

    this.addStatusBarItem().setText("Status Bar Text");

    this.addCommand({
      id: "open-sample-modal",
      name: "Open Sample Modal",
      // callback: () => {
      // 	console.log('Simple Callback');
      // },
      checkCallback: (checking: boolean) => {
        let leaf = this.app.workspace.activeLeaf;
        if (leaf) {
          if (!checking) {
            new SampleModal(this.app).open();
          }
          return true;
        }
        return false;
      },
    });

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
  }

  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
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
