import { stylesheet } from "astroturf";
import log from "loglevel";
import { Platform } from "obsidian";
import React, { MouseEvent, useState } from "react";
import {
  CreateOrOpenItemNoteFn,
  GetItemNoteFn,
  linkpathForSavedPocketItem,
} from "src/ItemNote";
import { OpenSearchForTagFn, TagNormalizationFn } from "src/Tags";
import { PocketItemTagList } from "src/ui/components/PocketItemTagList";
import { getPlatform, openBrowserWindow } from "src/utils";
import {
  PocketTag,
  pocketTagsToPocketTagList,
  SavedPocketItem,
} from "../../pocket_api/PocketAPITypes";

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
    color: var(--text-normal);
  }
`;

type NoteLinkProps = {
  title: string;
  noteExists: boolean;
  onClick: (event: MouseEvent) => Promise<void>;
};

const PocketItemNoteLink = ({ title, noteExists, onClick }: NoteLinkProps) => {
  return (
    <a
      className={`internal-link ${noteExists ? "" : "is-unresolved"}`}
      onClick={onClick}
    >
      {title}
    </a>
  );
};

export type PocketItemProps = {
  item: SavedPocketItem;
  itemNoteExistsInitial: boolean;
  getItemNote: GetItemNoteFn;
  tagNormalizer: TagNormalizationFn;
  createOrOpenItemNote: CreateOrOpenItemNoteFn;
  openSearchForTag: OpenSearchForTagFn;
};

enum PocketItemClickAction {
  NavigateToPocketURL,
  CreateOrOpenItemNote,
  Noop,
}

export const PocketItem = ({
  item,
  itemNoteExistsInitial,
  getItemNote,
  tagNormalizer,
  createOrOpenItemNote,
  openSearchForTag,
}: PocketItemProps) => {
  const [itemNoteExists, setItemNoteExists] = useState<boolean>(
    itemNoteExistsInitial
  );

  // TODO: Remove this and subscribe only on subsequent updates
  /*
  useEffect(() => {
    var subscribed = true;
    const fetch = async () => {
      const result = await getItemNote(item);
      subscribed && setItemNoteExists(!!result);
    };
    fetch();

    return () => {
      subscribed = false;
    };
  }, []);
  */

  // TODO: Subscribe to updates to URL to item note index after initial render
  /*
  useEffect(() => {
    const cbId = itemStore.subscribeOnChange(async () => {
      const updatedItems = await itemStore.getAllItemsByTimeUpdated();
      setItems(updatedItems);
    });
    return () => {
      itemStore.unsubscribeOnChange(cbId);
    };
  }, [itemStore]);
  */

  const title = linkpathForSavedPocketItem(item);

  const navigateToPocketURL = () => {
    openBrowserWindow(item.resolved_url);
  };

  const getPocketItemClickAction = (event: MouseEvent) => {
    if (Platform.isDesktopApp) {
      const navigateModifierPressed =
        getPlatform() === "windows" ? event.altKey : event.metaKey;
      const noModifiedsPressed =
        !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey;

      if (navigateModifierPressed) {
        return PocketItemClickAction.NavigateToPocketURL;
      } else if (noModifiedsPressed) {
        return PocketItemClickAction.CreateOrOpenItemNote;
      } else {
        return PocketItemClickAction.Noop;
      }
    } else {
      // Mobile does not have any keyboard modifiers
      return PocketItemClickAction.CreateOrOpenItemNote;
    }
  };

  const pocketTags: PocketTag[] =
    item.tags && pocketTagsToPocketTagList(item.tags);

  return (
    <div className={styles.item}>
      <span className={styles.itemTitle}>
        <PocketItemNoteLink
          title={title}
          noteExists={itemNoteExists}
          onClick={async (event) => {
            const start = performance.now();
            const clickAction = getPocketItemClickAction(event);
            log.warn(
              `getPocketItemClickAction took ${performance.now() - start} ms`
            );
            switch (clickAction) {
              case PocketItemClickAction.NavigateToPocketURL:
                navigateToPocketURL();
                break;
              case PocketItemClickAction.CreateOrOpenItemNote:
                const createOrOpenStart = performance.now();
                await createOrOpenItemNote(item);
                log.warn(
                  `createOrOpenItemNote took ${
                    performance.now() - createOrOpenStart
                  } ms`
                );

                break;
              case PocketItemClickAction.Noop:
                break;
              default:
                throw new Error(`Unknown PocketItemClickAction ${clickAction}`);
            }
            const duration = performance.now() - start;
            log.warn(`item note onClick took ${duration} ms`);
          }}
        />
      </span>
      {item.excerpt && (
        <span className={styles.itemExcerpt}>{item.excerpt}</span>
      )}
      {pocketTags && (
        <PocketItemTagList
          tags={pocketTags}
          tagNormalizer={tagNormalizer}
          openSearchForTag={openSearchForTag}
        />
      )}
    </div>
  );
};
