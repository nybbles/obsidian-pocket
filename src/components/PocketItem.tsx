import React from "react";
import { SavedPocketItem } from "../PocketAPITypes";

export type PocketItemProps = {
  item: SavedPocketItem;
};

export const PocketItem = ({ item }: PocketItemProps) => {
  const displayText =
    item.resolved_title.length !== 0 ? item.resolved_title : item.resolved_url;
  return <li>{displayText}</li>;
};
