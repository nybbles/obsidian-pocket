import { stylesheet } from "astroturf";
import { MetadataCache } from "obsidian";
import React, { useEffect, useState } from "react";
import { PocketItemStore } from "src/data/PocketItemStore";
import { URLToPocketItemNoteIndex } from "src/data/URLToPocketItemNoteIndex";
import {
  createOrOpenItemNote,
  getAllItemNotes,
  getItemNote,
  resolveItemNote as resolveItemNoteFactory,
} from "src/ItemNote";
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
  urlToPocketItemNoteIndex: URLToPocketItemNoteIndex;
  plugin: PocketSync;
};

export const PocketItemList = ({
  itemStore,
  metadataCache,
  urlToPocketItemNoteIndex,
  plugin,
}: PocketItemListProps) => {
  const settingsManager = plugin.settingsManager;

  const resolveItemNote = resolveItemNoteFactory(
    plugin.app.vault,
    metadataCache,
    settingsManager
  );

  const [items, setItems] = useState<SavedPocketItem[]>([]);
  const [itemNotesExist, setItemNotesExist] = useState<boolean[]>([]);

  const [multiWordTagConversion, setMultiWordTagConversion] =
    useState<MultiWordTagConversion>(
      settingsManager.getSetting(
        "multi-word-tag-converter"
      ) as MultiWordTagConversion
    );

  // Load all items and item notes on initial render
  useEffect(() => {
    var subscribed = true;
    const fetch = async () => {
      const allItems = await itemStore.getAllItemsByTimeUpdated();
      const allItemNotesExist = (
        await getAllItemNotes(
          urlToPocketItemNoteIndex,
          resolveItemNote
        )(allItems)
      ).map((x) => !!x);

      if (!subscribed) {
        return;
      }

      setItemNotesExist(allItemNotesExist);
      setItems(allItems);
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
      plugin.app.metadataCache,
      plugin.urlToItemNoteIndex
    );

    return (
      <ul className={styles.list}>
        {items.map((item, idx) => {
          return (
            <li key={item.item_id} className={styles.item}>
              <PocketItem
                item={item}
                itemNoteExistsInitial={!!itemNotesExist[idx]}
                urlToPocketItemNoteIndex={urlToPocketItemNoteIndex}
                getItemNote={getItemNote(
                  urlToPocketItemNoteIndex,
                  resolveItemNote
                )}
                tagNormalizer={getTagNormalizer({
                  multiWordTagConversion: multiWordTagConversion,
                  addHashtag: true,
                })}
                createOrOpenItemNote={createOrOpen}
                openSearchForTag={openSearchForTag(plugin.app)}
              />
            </li>
          );
        })}
      </ul>
    );
  }
};
