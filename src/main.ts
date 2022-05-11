import log from "loglevel";
import { Notice, Plugin } from "obsidian";
import ReactDOM from "react-dom";
import { MetadataStore } from "./data/MetadataStore";
import { closePocketIDB, openPocketIDB, PocketIDB } from "./data/PocketIDB";
import { PocketItemStore } from "./data/PocketItemStore";
import { doPocketSync } from "./data/PocketSync";
import {
  openURLToPocketItemNoteIndex,
  URLToPocketItemNoteIndex,
} from "./data/URLToPocketItemNoteIndex";
import {
  bulkCreateItemNotes,
  getAllItemNotes,
  resolveItemNote,
  ResolveItemNoteFn,
} from "./ItemNote";
import {
  buildPocketAPI,
  PocketAPI,
  Username as PocketUsername,
} from "./pocket_api/PocketAPI";
import {
  loadPocketAccessInfo,
  OBSIDIAN_AUTH_PROTOCOL_ACTION,
  storePocketAccessInfo,
} from "./pocket_api/PocketAuth";
import { PocketSettings, SettingsManager } from "./SettingsManager";
import {
  PocketItemListView,
  POCKET_ITEM_LIST_VIEW_TYPE,
} from "./ui/PocketItemListView";
import { createReactApp } from "./ui/ReactApp";
import { PocketSettingTab } from "./ui/settings";
import { ViewManager } from "./ui/ViewManager";

const URL_INDEXING_DELAY_MS = 1000;

export default class PocketSync extends Plugin {
  pocketIDB: PocketIDB;
  itemStore: PocketItemStore;
  metadataStore: MetadataStore;
  urlToItemNoteIndex: URLToPocketItemNoteIndex;
  appEl: HTMLDivElement;
  viewManager: ViewManager;
  pocketUsername: PocketUsername | null;
  pocketAuthenticated: boolean;
  settingsManager: SettingsManager;
  pocketAPI: PocketAPI;
  pendingSync: Promise<void> | null = null;
  resolveItemNote: ResolveItemNoteFn;
  pendingBulkCreate: boolean;

  async syncPocketItems() {
    const accessInfo = await loadPocketAccessInfo(this);
    if (!accessInfo) {
      new Notice("Not logged into Pocket, skipping sync");
      return;
    }

    if (!!this.pendingSync) {
      new Notice("Sync already in progress, skipping");
      return;
    }

    const pocketSyncTag = this.settingsManager.getSetting("pocket-sync-tag");
    this.pendingSync = doPocketSync(
      this.itemStore,
      this.metadataStore,
      this.pocketAPI,
      accessInfo,
      pocketSyncTag
    );
    try {
      await this.pendingSync;
    } finally {
      this.pendingSync = null;
    }
  }

  async onload() {
    const defaultLogLevel = process.env.BUILD === "prod" ? "info" : "debug";
    log.setDefaultLevel(defaultLogLevel);

    log.info("Loading Pocket plugin");

    this.settingsManager = new SettingsManager({
      loadSettings: async () => {
        const settings: PocketSettings = Object.assign(
          {},
          await this.loadData()
        );
        return settings;
      },
      saveSettings: async (settings: PocketSettings) =>
        await this.saveData(settings),
    });
    await this.settingsManager.load();

    this.pendingSync = null;
    this.pendingBulkCreate = false;

    this.pocketAPI = buildPocketAPI();

    // Set up Pocket IDB and dependent stores
    log.debug("Opening Pocket IDB");
    this.pocketIDB = await openPocketIDB([
      PocketItemStore.upgradeDatabase,
      MetadataStore.upgradeDatabase,
      URLToPocketItemNoteIndex.upgradeDatabase,
    ]);
    log.debug("Pocket IDB opened");

    log.debug("Opening Pocket item store");
    this.itemStore = new PocketItemStore(this.pocketIDB);
    log.debug("Pocket item store opened");

    log.debug("Opening metadata store");
    this.metadataStore = new MetadataStore(this.pocketIDB);
    log.debug("metadata store opened");

    log.debug("Opening URL to Pocket item note index");
    let eventRefs = undefined;
    [this.urlToItemNoteIndex, eventRefs] = await openURLToPocketItemNoteIndex(
      this.pocketIDB,
      this.app.metadataCache,
      this.app.vault,
      this.settingsManager
    );

    for (let eventRef of eventRefs) {
      this.registerEvent(eventRef);
    }

    log.debug("URL to Pocket item note index opened");

    this.resolveItemNote = resolveItemNote(this.app.vault);

    this.addCommands();
    this.addSettingTab(
      new PocketSettingTab(this.app, this, this.settingsManager)
    );

    (async () => {
      const accessInfo = await loadPocketAccessInfo(this);
      if (!accessInfo) {
        log.info(`Not authenticated to Pocket`);
      }
      this.pocketAuthenticated = !!accessInfo;
      this.pocketUsername = accessInfo?.username;
    })();

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

    // Set up React-based Pocket item list view
    this.viewManager = new ViewManager();
    this.mount();
    this.registerView(
      POCKET_ITEM_LIST_VIEW_TYPE,
      (leaf) => new PocketItemListView(leaf, this)
    );

    // always index on startup, because it could be that Pocket item notes were
    // created on a different app, or indexing was never run. need to wait until
    // metadata cache is initialized.
    setTimeout(async () => {
      await this.urlToItemNoteIndex.indexURLsForAllFilePaths();
    }, URL_INDEXING_DELAY_MS);
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

    log.debug("Closing Pocket IDB");
    closePocketIDB(this.pocketIDB);
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
      callback: async () => {
        await this.openPocketList();
      },
    });

    this.addCommand({
      id: "sync-pocket-list",
      name: "Sync Pocket list",
      callback: async () => {
        await this.syncPocketItems();
      },
    });

    this.addCommand({
      id: "index-all-files-by-URL",
      name: "Index all files by URL",
      callback: async () => {
        const notice = new Notice("Indexing URLs for Pocket item notes");
        const nIndexedURLs =
          await this.urlToItemNoteIndex.indexURLsForAllFilePaths();
        notice.hide();
        new Notice(`Found ${nIndexedURLs} new URLs`);
      },
    });

    this.addCommand({
      id: "create-all-pocket-item-notes",
      name: "Create all Pocket item notes",
      callback: async () => {
        if (this.pendingBulkCreate) {
          new Notice(
            "Bulk creation of missing Pocket item notes already in progress"
          );
          return;
        }

        this.pendingBulkCreate = true;

        const allPocketItems = await this.itemStore.getAllItems();
        const pocketItemsWithoutNotes = (
          await getAllItemNotes(
            this.urlToItemNoteIndex,
            this.resolveItemNote
          )(allPocketItems)
        )
          .filter(({ itemNote }) => !itemNote)
          .map(({ item }) => item);

        new Notice(
          `Found ${pocketItemsWithoutNotes.length} Pocket items without notes`
        );
        const creationNotice = new Notice(
          `Creating all missing Pocket item notes...`,
          0
        );

        try {
          await bulkCreateItemNotes(
            this.settingsManager,
            this.app.vault,
            this.app.metadataCache,
            pocketItemsWithoutNotes
          );
          new Notice(`Done creating all missing Pocket item notes`);
        } catch (err) {
          new Notice("Failed to create all missing Pocket item notes");
        } finally {
          creationNotice.hide();
          this.pendingBulkCreate = false;
        }
      },
    });
  };
}
