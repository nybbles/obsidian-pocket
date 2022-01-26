import { App } from "obsidian";
import { PocketTag } from "./pocket_api/PocketAPITypes";

export type OpenSearchForTagFn = (tag: string) => void;

export const openSearchForTag =
  (app: App): OpenSearchForTagFn =>
  (tag: string) => {
    // @ts-ignore
    const globalSearch = app.internalPlugins.plugins["global-search"].instance;
    globalSearch.openGlobalSearch(`tag:${tag}`);
  };

const multiWordTagConversionTypes = [
  "snake-case",
  "camel-case",
  "do-nothing",
] as const;
export type MultiWordTagConversion = typeof multiWordTagConversionTypes[number];

export type MultiWordTagConversionFn = (tag: string) => string;
export const multiWordTagConversions: Map<
  MultiWordTagConversion,
  MultiWordTagConversionFn
> = new Map([
  ["snake-case", (tag) => tag.replace(/ /g, "_")],
  [
    "camel-case",
    (tag) => {
      if (!tag.match(/ /)) {
        return tag;
      }

      return tag.replace(/(^| )(\w)/g, (match, p1, p2) => {
        return p2.toUpperCase();
      });
    },
  ],
  ["do-nothing", (tag) => tag],
]);

export type TagNormalizationFn = (tag: PocketTag) => string;

export interface TagNormalizationChoiceParams {
  multiWordTagConversion: MultiWordTagConversion;
  addHashtag: boolean;
}

export const getTagNormalizer = ({
  multiWordTagConversion,
  addHashtag,
}: TagNormalizationChoiceParams): TagNormalizationFn => {
  if (!multiWordTagConversionTypes.includes(multiWordTagConversion)) {
    throw new Error(
      `Invalid multi-word tag conversion type: ${multiWordTagConversion}`
    );
  }
  const multiWordTagConverter = multiWordTagConversions.get(
    multiWordTagConversion
  );
  return (tag) => `${addHashtag ? "#" : ""}${multiWordTagConverter(tag.tag)}`;
};
