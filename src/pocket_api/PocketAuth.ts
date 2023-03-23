import { Plugin } from "obsidian";
import {
  AccessTokenResponse,
  buildAuthorizationURL,
  PocketAPI,
  RequestToken,
} from "./PocketAPI";
import { openBrowserWindow } from "../Utils";

export type AccessInfo = AccessTokenResponse;

const OBSIDIAN_PROTOCOL = "obsidian://";
export const OBSIDIAN_AUTH_PROTOCOL_ACTION = "pocket-auth";

const AUTH_REDIRECT_URI = `${OBSIDIAN_PROTOCOL}${OBSIDIAN_AUTH_PROTOCOL_ACTION}`;

const accessInfoPath = (plugin: Plugin) =>
  `${plugin.manifest.dir}/.__pocket_access_info__`;

export const storePocketAccessInfo = async (
  plugin: Plugin,
  accessInfo: AccessInfo
) =>
  plugin.app.vault.adapter.write(
    accessInfoPath(plugin),
    JSON.stringify(accessInfo)
  );

export const loadPocketAccessInfo = async (
  plugin: Plugin
): Promise<AccessInfo | null> => {
  const accessInfoExists = await pocketAccessInfoExists(plugin);

  if (!accessInfoExists) {
    return null;
  }

  const storedPath = accessInfoPath(plugin);
  return JSON.parse(await plugin.app.vault.adapter.read(storedPath));
};

export const clearPocketAccessInfo = async (plugin: Plugin): Promise<void> => {
  const storedPath = accessInfoPath(plugin);
  await plugin.app.vault.adapter.remove(storedPath);
};

export const pocketAccessInfoExists = async (
  plugin: Plugin
): Promise<boolean> => {
  const storedPath = accessInfoPath(plugin);
  const accessInfoExists = await plugin.app.vault.adapter.exists(storedPath);
  return accessInfoExists;
};

const redirectUserToPocketAuth = async (requestToken: RequestToken) =>
  openBrowserWindow(buildAuthorizationURL(requestToken, AUTH_REDIRECT_URI));

export const setupAuth = (pocketAPI: PocketAPI) => async () => {
  const requestToken = await pocketAPI.getRequestToken(AUTH_REDIRECT_URI);
  redirectUserToPocketAuth(requestToken);
};
