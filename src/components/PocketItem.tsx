import { stylesheet } from "astroturf";
import React from "react";
import { DoesLinkpathExistFn, OpenLinktextFn } from "src/Types";
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

const sanitizeTitle = (title: String) => title.replace(/[\\/:"*?<>|]+/g, " ");

type NoteLinkProps = {
  displayText: string;
  openLinktext: OpenLinktextFn;
  doesLinkpathExist: DoesLinkpathExistFn;
};

const PocketItemNoteLink = ({
  displayText,
  openLinktext,
  doesLinkpathExist,
}: NoteLinkProps) => {
  const sanitizedTitle = sanitizeTitle(displayText);
  const linkpathExists = doesLinkpathExist(sanitizedTitle);

  return (
    <a
      href={sanitizedTitle}
      data-href={sanitizedTitle}
      className={`internal-link ${linkpathExists ? "" : "is-unresolved"}`}
      target="blank"
      rel="noopener"
      onClick={() => openLinktext(sanitizedTitle)}
    >
      {sanitizedTitle}
    </a>
  );
};

export type PocketItemProps = {
  item: SavedPocketItem;
  openLinktext: OpenLinktextFn;
  doesLinkpathExist: DoesLinkpathExistFn;
};

export const PocketItem = ({
  item,
  openLinktext,
  doesLinkpathExist,
}: PocketItemProps) => {
  const displayText =
    item.resolved_title.length !== 0 ? item.resolved_title : item.resolved_url;

  const navigateToPocketURL = () => {
    openBrowserWindow(item.resolved_url);
  };

  return (
    <div
      className={styles.item}
      onClick={(event) => {
        if (event.metaKey) {
          navigateToPocketURL();
        }
      }}
    >
      <span className={styles.itemTitle}>
        <PocketItemNoteLink
          displayText={displayText}
          openLinktext={openLinktext}
          doesLinkpathExist={doesLinkpathExist}
        />
      </span>
      {item.excerpt && (
        <span className={styles.itemExcerpt}>{item.excerpt}</span>
      )}
    </div>
  );
};
