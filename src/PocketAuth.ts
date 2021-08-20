import { Plugin } from "obsidian";

type RequestToken = string;
type AccessToken = string;
type Username = string;
type AccessTokenResponse = {
  accessToken: AccessToken;
  username: Username;
};

export type AccessInfo = AccessTokenResponse;

const OBSIDIAN_PROTOCOL = "obsidian://";
export const OBSIDIAN_AUTH_PROTOCOL_ACTION = "pocket-auth";
const AUTH_REDIRECT_URI = `${OBSIDIAN_PROTOCOL}${OBSIDIAN_AUTH_PROTOCOL_ACTION}`;

const accessInfoPath = (plugin: Plugin) =>
  `${plugin.manifest.dir}/.__pocket_access_info__`;

const redirectUserToPocketAuth = async (requestToken: RequestToken) => {};

export const setupAuth = () => async () => {};
