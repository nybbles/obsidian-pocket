import { Plugin } from "obsidian";
import {
  AccessTokenResponse,
  buildAuthorizationURL,
  getRequestToken,
  RequestToken,
} from "./PocketAPI";

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
  const storedPath = accessInfoPath(plugin);
  const accessInfoExists = await plugin.app.vault.adapter.exists(storedPath);

  if (!accessInfoExists) {
    return null;
  }

  return JSON.parse(await plugin.app.vault.adapter.read(storedPath));
};

const openBrowserWindow = (url: string) => window.location.assign(url);

const redirectUserToPocketAuth = async (requestToken: RequestToken) =>
  openBrowserWindow(buildAuthorizationURL(requestToken, AUTH_REDIRECT_URI));

export const setupAuth = async () => {
  const requestToken = await getRequestToken(AUTH_REDIRECT_URI);
  redirectUserToPocketAuth(requestToken);
};
