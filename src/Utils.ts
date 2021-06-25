import log from "loglevel";
import { MetadataCache, Workspace } from "obsidian";
import { DoesLinkpathExistFn, OpenLinktextFn } from "./Types";

export const openBrowserWindow = (url: string) => window.location.assign(url);

// Always open notes relative to root.
// TODO: This should be configurable.
export const DEFAULT_SOURCE_PATH = "/";

export const openLinktext =
  (workspace: Workspace): OpenLinktextFn =>
  (linktext: string) => {
    log.debug(`Clicked. Going to ${linktext}`);
    workspace.openLinkText(linktext, DEFAULT_SOURCE_PATH, true);
  };

export const doesLinkpathExist =
  (metadataCache: MetadataCache): DoesLinkpathExistFn =>
  (linkpath: string) =>
    !!metadataCache.getFirstLinkpathDest(linkpath, DEFAULT_SOURCE_PATH);
