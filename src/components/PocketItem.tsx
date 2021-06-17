import { stylesheet } from "astroturf";
import React from "react";
import { SavedPocketItem } from "../PocketAPITypes";

const styles = stylesheet`
  .item {
    color: black;
    border: 1px solid black;
    display: block;
  }
`;

export type PocketItemProps = {
  item: SavedPocketItem;
};

export const PocketItem = ({ item }: PocketItemProps) => {
  const displayText =
    item.resolved_title.length !== 0 ? item.resolved_title : item.resolved_url;
  return (
    <div className={styles.item}>
      <span>{displayText}</span>
      {item.excerpt && <span>{item.excerpt}</span>}
    </div>
  );
};
