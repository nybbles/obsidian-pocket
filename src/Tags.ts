import { App } from "obsidian";

export type OpenSearchForTagFn = (tag: string) => void;

export const openSearchForTag =
  (app: App): OpenSearchForTagFn =>
  (tag: string) => {
    // @ts-ignore
    const globalSearch = app.internalPlugins.plugins["global-search"].instance;
    globalSearch.openGlobalSearch(`tag:${tag}`);
  };

export type MultiWordTagConversion = "snake-case" | "camel-case" | "do-nothing";

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
