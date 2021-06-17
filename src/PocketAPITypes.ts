export type PocketItemId = number;

enum PocketItemStatus {
  Unread,
  Archived,
  Deleted,
}

type PocketItemStatusType = keyof typeof PocketItemStatus;

export interface BasePocketItem {
  item_id: PocketItemId;
  status: PocketItemStatus;
}

export interface DeletedPocketItem extends BasePocketItem {
  status: PocketItemStatus.Deleted;
}

export interface SavedPocketItem extends BasePocketItem {
  status: PocketItemStatus.Unread | PocketItemStatus.Archived;
  resolved_title: string;
  resolved_url: string;
}

export type PocketItem = SavedPocketItem | DeletedPocketItem;

export const isDeletedPocketItem = (
  item: PocketItem
): item is DeletedPocketItem => {
  return item.status == PocketItemStatus.Deleted;
};

export const isSavedPocketItem = (
  item: PocketItem
): item is SavedPocketItem => {
  return !isDeletedPocketItem(item);
};

export type PocketItemRecord = Record<PocketItemId, PocketItem>;

export interface PocketGetItemsResponse {
  status: number;
  complete: number;
  list: PocketItemRecord;
}
