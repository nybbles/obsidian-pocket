import { ItemView, WorkspaceLeaf } from "obsidian";
import React from "react";
import PocketSync from "./main";
import { PocketItemList } from "./components/PocketItemList";

export const POCKET_ITEM_LIST_VIEW_TYPE = "pocket_item_list";

export class PocketItemListView extends ItemView {
  plugin: PocketSync;
  id: string = (this.leaf as any).id;

  constructor(leaf: WorkspaceLeaf, plugin: PocketSync) {
    // TODO: Get the username in here
    super(leaf);
    this.plugin = plugin;
    this.plugin.viewManager.addView(this.id, this);
  }

  getViewType(): string {
    return POCKET_ITEM_LIST_VIEW_TYPE;
  }
  getDisplayText(): string {
    return "Pocket username goes here";
  }

  async onClose() {
    console.log("onClose");
    this.plugin.viewManager.removeView(this.id);
  }

  getPortal() {
    return <PocketItemList itemStore={this.plugin.itemStore} />;
  }
}
