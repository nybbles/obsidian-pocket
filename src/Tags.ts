import { App } from "obsidian";

export type OpenSearchForTagFn = (tag: string) => void;

export const openSearchForTag =
  (app: App): OpenSearchForTagFn =>
  (tag: string) => {
    // @ts-ignore
    const globalSearch = app.internalPlugins.plugins["global-search"].instance;
    globalSearch.openGlobalSearch(`tag:${tag}`);
  };

export type MultiWordTagConverters = "snake-case" | "camel-case" | "do-nothing";
