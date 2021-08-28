import { stylesheet } from "astroturf";
import { Platform } from "obsidian";
import React, { MouseEvent } from "react";
import {
  CreateOrOpenItemNoteFn,
  DoesItemNoteExistFn,
  linkpathForSavedPocketItem,
} from "src/ItemNote";
import { getPlatform, openBrowserWindow } from "src/utils";
import { PocketTag, SavedPocketItem } from "../PocketAPITypes";

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

  .itemTagList {
    list-style: none;
    padding-inline-start: 0px;
    margin-top: 4px;
  }
  .itemTagList > li {
    display: inline;
    color: var(--text-muted);
    background-color: var(--background-secondary);
    margin: 4px;
    padding: 2px;
    border-radius: 4px;
  }
`;

type NoteLinkProps = {
  linkpath: string;
  linkpathExists: boolean;
  onClick: (event: MouseEvent) => Promise<void>;
};

const PocketItemNoteLink = ({
  linkpath,
  linkpathExists,
  onClick,
}: NoteLinkProps) => {
  return (
    <a
      className={`internal-link ${linkpathExists ? "" : "is-unresolved"}`}
      onClick={onClick}
    >
      {linkpath}
    </a>
  );
};

type PocketItemTagListProps = {
  tags: PocketTag[];
};

const PocketItemTagList = ({ tags }: PocketItemTagListProps) => {
  return (
    <ul className={styles.itemTagList}>
      {tags.map((x) => (
        <li key={x.tag}>#{x.tag}</li>
      ))}
    </ul>
  );
};

export type PocketItemProps = {
  item: SavedPocketItem;
  doesItemNoteExist: DoesItemNoteExistFn;
  createOrOpenItemNote: CreateOrOpenItemNoteFn;
};

enum PocketItemClickAction {
  NavigateToPocketURL,
  CreateOrOpenItemNote,
  Noop,
}

export const PocketItem = ({
  item,
  doesItemNoteExist,
  createOrOpenItemNote,
}: PocketItemProps) => {
  const linkpath = linkpathForSavedPocketItem(item);
  const linkpathExists = doesItemNoteExist(item);

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
    item.tags && Object.entries(item.tags).map(([k, v]) => v);

  return (
    <div className={styles.item}>
      <span className={styles.itemTitle}>
        <PocketItemNoteLink
          linkpath={linkpath}
          linkpathExists={linkpathExists}
          onClick={async (event) => {
            const clickAction = getPocketItemClickAction(event);
            switch (clickAction) {
              case PocketItemClickAction.NavigateToPocketURL:
                navigateToPocketURL();
                break;
              case PocketItemClickAction.CreateOrOpenItemNote:
                await createOrOpenItemNote(item);
                break;
              case PocketItemClickAction.Noop:
                break;
              default:
                throw new Error(`Unknown PocketItemClickAction ${clickAction}`);
            }
          }}
        />
      </span>
      {item.excerpt && (
        <span className={styles.itemExcerpt}>{item.excerpt}</span>
      )}
      {pocketTags && <PocketItemTagList tags={pocketTags} />}
    </div>
  );
};
