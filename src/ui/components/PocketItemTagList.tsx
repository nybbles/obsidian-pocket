import { stylesheet } from "astroturf";
import React from "react";
import { PocketTag } from "src/pocket_api/PocketAPITypes";
import { OpenSearchForTagFn, TagNormalizationFn } from "src/Tags";

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
  tagNormalizer: TagNormalizationFn;
  openSearchForTag: OpenSearchForTagFn;
};

export const PocketItemTagList = ({
  tags,
  tagNormalizer,
  openSearchForTag,
}: PocketItemTagListProps) => {
  return (
    <ul className={styles.itemTagList}>
      {tags.map((x) => {
        const tag = tagNormalizer(x);
        return (
          <li key={tag}>
            <a
              href={tag}
              className={"tag"}
              target="_blank"
              rel="noopener"
              onClick={() => {
                openSearchForTag(tag);
              }}
            >
              {tag}
            </a>
          </li>
        );
      })}
    </ul>
  );
};
