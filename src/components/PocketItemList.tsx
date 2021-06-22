import { stylesheet } from "astroturf";
import { MetadataCache, Workspace } from "obsidian";
import React, { useEffect, useState } from "react";
import { SavedPocketItem } from "src/PocketAPITypes";
import { PocketItemStore } from "src/PocketItemStore";
import { doesLinkpathExist, openLinktext } from "src/utils";
import { PocketItem } from "./PocketItem";

const styles = stylesheet`
  .list {
    list-style-type: none;
  }

  .item {
    margin: 8px;
  }
`;

export type PocketItemListProps = {
  itemStore: PocketItemStore;
  metadataCache: MetadataCache;
  workspace: Workspace;
};

export const PocketItemList = ({
  itemStore,
  metadataCache,
  workspace,
}: PocketItemListProps) => {
  const [items, setItems] = useState<SavedPocketItem[]>([]);

  useEffect(() => {
    var subscribed = true;
    const fetch = async () => {
      const allItems = await itemStore.getAllItemsBySortId();
      subscribed && setItems(allItems);
    };
    fetch();

    return () => {
      subscribed = false;
    };
  }, []);

  useEffect(() => {
    const cbId = itemStore.subscribeOnChange(async () => {
      const updatedItems = await itemStore.getAllItemsBySortId();
      setItems(updatedItems);
    });
    return () => {
      itemStore.unsubscribeOnChange(cbId);
    };
  }, [itemStore]);

  if (items.length === 0) {
    return <>No items synced!</>;
  } else {
    return (
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.item_id} className={styles.item}>
            <PocketItem
              item={item}
              openLinktext={openLinktext(workspace)}
              doesLinkpathExist={doesLinkpathExist(metadataCache)}
            />
          </li>
        ))}
      </ul>
    );
  }
};
