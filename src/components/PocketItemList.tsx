import React, { useEffect, useState } from "react";
import { SavedPocketItem } from "src/PocketAPITypes";
import { PocketItemStore } from "src/PocketItemStore";

import { PocketItem } from "./PocketItem";

export type PocketItemListProps = {
  itemStore: PocketItemStore;
};

export const PocketItemList = ({ itemStore }: PocketItemListProps) => {
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
      <ul>
        {items.map((item) => (
          <PocketItem key={item.item_id} item={item} />
        ))}
      </ul>
    );
  }
};
