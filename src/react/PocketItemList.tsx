import React, { useEffect, useState } from "react";
import { SavedPocketItem } from "src/PocketAPITypes";
import { PocketItemStore } from "src/PocketItemStore";

export type PocketItemListProps = {
  itemStore: PocketItemStore;
};

export const PocketItemList = ({ itemStore }: PocketItemListProps) => {
  const [items, setItems] = useState<SavedPocketItem[]>([]);

  useEffect(() => {
    var subscribed = true;
    const fetch = async () => {
      const allItems = await itemStore.getAllItems();
      subscribed && setItems(allItems);
    };
    fetch();

    return () => {
      subscribed = false;
    };
  }, []);

  useEffect(() => {
    const cbId = itemStore.subscribeOnChange(async () => {
      const updatedItems = await itemStore.getAllItems();
      setItems(updatedItems);
    });
    return () => {
      itemStore.unsubscribeOnChange(cbId);
    };
  }, [itemStore]);

  return <>{items.length}</>;
};
