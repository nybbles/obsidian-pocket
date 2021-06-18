import { stylesheet } from "astroturf";
import React from "react";
import { SavedPocketItem } from "../PocketAPITypes";

const styles = stylesheet`
  .item {
    color: black;
    border: 1px solid black;
    display: block;

    padding: 4px 8px;
  }
  .item > span {
    display: block;
  }

  .itemTitle {
    font-weight: 600;
    flex-grow: 1;
    width: 100%;
  }

  .itemExcerpt {
    font-weight: 300;
    line-height: 1.5;
    flex-grow: 1;
    width: 100%;
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
      <span className={styles.itemTitle}>{displayText}</span>
      {item.excerpt && (
        <span className={styles.itemExcerpt}>{item.excerpt}</span>
      )}
    </div>
  );
};
