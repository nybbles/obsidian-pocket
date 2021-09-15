import { stylesheet } from "astroturf";
import { MetadataCache } from "obsidian";
import React, { useEffect, useState } from "react";
import { PocketItemStore } from "src/data/PocketItemStore";
import { createOrOpenItemNote, doesItemNoteExist } from "src/ItemNote";
import PocketSync from "src/main";
import { SavedPocketItem } from "src/pocket_api/PocketAPITypes";
import { PocketSettings } from "src/SettingsManager";
import {
  getTagNormalizer,
  MultiWordTagConversion,
  openSearchForTag,
} from "src/Tags";
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
  const settingsManager = plugin.settingsManager;

  const [items, setItems] = useState<SavedPocketItem[]>([]);
  const [multiWordTagConversion, setMultiWordTagConversion] =
    useState<MultiWordTagConversion>(
      settingsManager.getSetting(
        "multi-word-tag-converter"
      ) as MultiWordTagConversion
    );

  // Load all items on initial render
  useEffect(() => {
    var subscribed = true;
    const fetch = async () => {
      const allItems = await itemStore.getAllItemsByTimeUpdated();
      subscribed && setItems(allItems);
    };
    fetch();

    return () => {
      subscribed = false;
    };
  }, []);

  // Subscribe to updates to item store after initial render
  useEffect(() => {
    const cbId = itemStore.subscribeOnChange(async () => {
      const updatedItems = await itemStore.getAllItemsByTimeUpdated();
      setItems(updatedItems);
    });
    return () => {
      itemStore.unsubscribeOnChange(cbId);
    };
  }, [itemStore]);

  // Subscribe to updates to multi-word tag converter setting
  useEffect(() => {
    const setting: keyof PocketSettings = "multi-word-tag-converter";
    const cbId = settingsManager.subscribeOnSettingsChange(setting, async () =>
      setMultiWordTagConversion(
        settingsManager.getSetting(setting) as MultiWordTagConversion
      )
    );
    return () => settingsManager.unsubscribeOnSettingsChange(setting, cbId);
  }, [settingsManager]);

  if (items.length === 0) {
    return <>No items synced!</>;
  } else {
    const createOrOpen = createOrOpenItemNote(
      settingsManager,
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
              tagNormalizer={getTagNormalizer({
                multiWordTagConversion: multiWordTagConversion,
              })}
              doesItemNoteExist={doesItemNoteExist(
                metadataCache,
                settingsManager
              )}
              createOrOpenItemNote={createOrOpen}
              openSearchForTag={openSearchForTag(plugin.app)}
            />
          </li>
        ))}
      </ul>
    );
  }
};
