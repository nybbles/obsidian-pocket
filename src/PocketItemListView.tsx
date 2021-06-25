import { ItemView, WorkspaceLeaf } from "obsidian";
import React from "react";
import { PocketItemList } from "./components/PocketItemList";
import PocketSync from "./main";

export const POCKET_ITEM_LIST_VIEW_TYPE = "pocket_item_list";

export class PocketItemListView extends ItemView {
  plugin: PocketSync;
  id: string = (this.leaf as any).id;

  constructor(leaf: WorkspaceLeaf, plugin: PocketSync) {
    super(leaf);
    this.plugin = plugin;
    this.plugin.viewManager.addView(this.id, this);
  }

  getViewType(): string {
    return POCKET_ITEM_LIST_VIEW_TYPE;
  }

  getDisplayText(): string {
    return `Pocket list`;
  }

  async onClose() {
    console.log("onClose");
    this.plugin.viewManager.removeView(this.id);
  }

  getPortal() {
    return (
      <div className={"markdown-preview-view"}>
        <PocketItemList
          itemStore={this.plugin.itemStore}
          metadataCache={this.app.metadataCache}
          workspace={this.app.workspace}
        />
      </div>
    );
  }
}
