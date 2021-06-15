import { ItemView, WorkspaceLeaf } from "obsidian";
import React from "react";

export const POCKET_ITEM_LIST_VIEW_TYPE = "pocket_item_list";

export class PocketItemListView extends ItemView {
  constructor(leaf: WorkspaceLeaf) {
    // TODO: Get the username in here
    super(leaf);
  }

  getViewType = (): string => {
    return POCKET_ITEM_LIST_VIEW_TYPE;
  };
  getDisplayText = (): string => {
    return "Pocket username goes here";
  };

  onClose = async () => {
    // TODO: Remove view
  };

  getPortal = () => {
    // TODO: Implement this
    return <></>;
  };
}
