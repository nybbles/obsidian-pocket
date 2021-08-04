import log from "loglevel";
import * as qs from "qs";
import { CORSProxy, DoHTTPRequest } from "./CORSProxy";
import { PocketGetItemsResponse } from "./PocketAPITypes";

export type RequestToken = string;
export type AccessToken = string;
export type Username = string;

export type UpdateTimestamp = number;

export type AccessTokenResponse = {
  accessToken: AccessToken;
  username: Username;
};

var storedRequestToken: RequestToken | null = null;

type ConsumerKey = string;
type SupportedPlatform = "mac" | "windows" | "linux";

// From https://getpocket.com/developer/apps/
const PLATFORM_CONSUMER_KEYS: Record<SupportedPlatform, ConsumerKey> = {
  mac: "97653-12e003276f01f4288ac868c0",
  windows: "97653-541365a3736338ca19dae55a",
  linux: "97653-da7a5baf4f5172d3fce89c0a",
};

const nodePlatformToPlatform = (
  nodePlatform: NodeJS.Platform
): SupportedPlatform => {
  const supportedPlatforms: Record<string, SupportedPlatform> = {
    darwin: "mac",
    win32: "windows",
    linux: "linux",
  };

  const result = supportedPlatforms[nodePlatform as string];
  if (!result) {
    throw new Error("Invalid node platform");
  }
  return result;
};

const CONSUMER_KEY =
  PLATFORM_CONSUMER_KEYS[nodePlatformToPlatform(process.platform)];

export type GetRequestToken = (
  authRedirectURI: string
) => Promise<RequestToken>;
export type GetAccessToken = () => Promise<AccessTokenResponse>;
export type GetPocketItems = (
  accessToken: AccessToken,
  lastUpdateTimestamp?: UpdateTimestamp
) => Promise<TimestampedPocketGetItemsResponse>;

export interface PocketAPI {
  getRequestToken: GetRequestToken;
  getAccessToken: GetAccessToken;
  getPocketItems: GetPocketItems;
}

type CurriedBy<T, F> = (t: T) => F;
type CurriedByDoHTTPRequest<F> = CurriedBy<DoHTTPRequest, F>;

export const buildAuthorizationURL = (
  requestToken: RequestToken,
  authRedirectURI: string
) =>
  `https://getpocket.com/auth/authorize?request_token=${requestToken}&redirect_uri=${authRedirectURI}`;

// TODO: Handle unsuccessful requests
export const getRequestToken: CurriedByDoHTTPRequest<GetRequestToken> =
  (doRequest) => async (authRedirectURI) => {
    if (storedRequestToken) {
      throw new Error("Found unexpected stored request token");
    }

    const REQUEST_TOKEN_URL = "https://getpocket.com/v3/oauth/request";

    const responseBody = await doRequest(REQUEST_TOKEN_URL, {
      consumer_key: CONSUMER_KEY,
      redirect_uri: authRedirectURI,
    });

    const formdata = await responseBody;
    const parsed = qs.parse(formdata);

    const requestToken = parsed["code"] as RequestToken;
    storedRequestToken = requestToken;
    return requestToken;
  };

// TODO: Handle unsuccessful requests
export const getAccessToken: CurriedByDoHTTPRequest<GetAccessToken> =
  (doRequest) => async () => {
    if (!storedRequestToken) {
      throw new Error("could not find stored request token");
    }

    const ACCESS_TOKEN_URL = "https://getpocket.com/v3/oauth/authorize";

    const responseBody = await doRequest(ACCESS_TOKEN_URL, {
      consumer_key: CONSUMER_KEY,
      code: storedRequestToken,
    });

    const formdata = await responseBody;
    const parsed = qs.parse(formdata);

    storedRequestToken = null;

    return {
      accessToken: parsed["access_token"] as AccessToken,
      username: parsed["username"] as Username,
    };
  };

export type TimestampedPocketGetItemsResponse = {
  timestamp: UpdateTimestamp;
  response: PocketGetItemsResponse;
};

export const getPocketItems: CurriedByDoHTTPRequest<GetPocketItems> =
  (doRequest) => async (accessToken, lastUpdateTimestamp?) => {
    const GET_ITEMS_URL = "https://getpocket.com/v3/get";
    const nextTimestamp = Math.floor(Date.now() / 1000);

    const requestOptions = {
      consumer_key: CONSUMER_KEY,
      access_token: accessToken,
      since: !!lastUpdateTimestamp
        ? new Number(lastUpdateTimestamp).toString()
        : null,
    };

    if (!!lastUpdateTimestamp) {
      const humanReadable = new Date(
        lastUpdateTimestamp * 1000
      ).toLocaleString();
      log.info(`Fetching with Pocket item updates since ${humanReadable}`);
    } else {
      log.info(`Fetching all Pocket items`);
    }

    const responseBody = await doRequest(GET_ITEMS_URL, requestOptions);

    log.info(`Pocket items fetched.`);

    return {
      timestamp: nextTimestamp,
      response: JSON.parse(await responseBody),
    };
  };

export const buildPocketAPI = (corsProxy: CORSProxy): PocketAPI => {
  const doRequest: DoHTTPRequest = corsProxy.doCORSProxiedRequest;
  return {
    getRequestToken: getRequestToken(doRequest),
    getAccessToken: getAccessToken(doRequest),
    getPocketItems: getPocketItems(doRequest),
  };
};
