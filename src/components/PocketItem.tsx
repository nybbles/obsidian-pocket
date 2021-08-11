import { stylesheet } from "astroturf";
import React, { MouseEvent } from "react";
import {
  CreateOrOpenItemNoteFn,
  DoesItemNoteExistFn,
  linkpathForSavedPocketItem,
} from "src/ItemNote";
import { openBrowserWindow } from "src/utils";
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
    color: var(--text-normal);
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
      href={linkpath}
      data-href={linkpath}
      className={`internal-link ${linkpathExists ? "" : "is-unresolved"}`}
      target="blank"
      rel="noopener"
      onClick={onClick}
    >
      {linkpath}
    </a>
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
    return event.metaKey
      ? PocketItemClickAction.NavigateToPocketURL
      : PocketItemClickAction.CreateOrOpenItemNote;
  };

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
              default:
                throw new Error(`Unknown PocketItemClickAction ${clickAction}`);
            }
          }}
        />
      </span>
      {item.excerpt && (
        <span className={styles.itemExcerpt}>{item.excerpt}</span>
      )}
    </div>
  );
};
