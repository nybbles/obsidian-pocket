import { stylesheet } from "astroturf";
import { MetadataCache } from "obsidian";
import React, { useEffect, useState } from "react";
import { createOrOpenItemNote, doesItemNoteExist } from "src/ItemNote";
import PocketSync from "src/main";
import { SavedPocketItem } from "src/PocketAPITypes";
import { PocketItemStore } from "src/PocketItemStore";
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
  plugin: PocketSync;
};

export const PocketItemList = ({
  itemStore,
  metadataCache,
  plugin,
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
    const createOrOpen = createOrOpenItemNote(
      plugin,
      plugin.app.workspace,
      plugin.app.vault,
      plugin.app.metadataCache
    );
    return (
      <ul className={styles.list}>
        {items.map((item) => (
          <li key={item.item_id} className={styles.item}>
            <PocketItem
              item={item}
              doesItemNoteExist={doesItemNoteExist(metadataCache, plugin)}
              createOrOpenItemNote={createOrOpen}
            />
          </li>
        ))}
      </ul>
    );
  }
};
