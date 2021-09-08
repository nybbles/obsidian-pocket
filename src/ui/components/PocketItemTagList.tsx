import { stylesheet } from "astroturf";
import React from "react";
import { OpenSearchForTagFn } from "src/ItemNote";
import { PocketTag } from "../../pocket_api/PocketAPITypes";

const styles = stylesheet`
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

export type PocketItemTagListProps = {
  tags: PocketTag[];
  openSearchForTag: OpenSearchForTagFn;
};

export const PocketItemTagList = ({
  tags,
  openSearchForTag,
}: PocketItemTagListProps) => {
  return (
    <ul className={styles.itemTagList}>
      {tags.map((x) => (
        <li key={x.tag}>
          <a
            href={`#${x.tag}`}
            className={"tag"}
            target="_blank"
            rel="noopener"
            onClick={() => {
              openSearchForTag(`#${x.tag}`);
            }}
          >
            {`#${x.tag}`}
          </a>
        </li>
      ))}
    </ul>
  );
};
