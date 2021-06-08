import * as qs from "qs";

export type RequestToken = string;
export type AccessToken = string;
export type Username = string;

export type AccessTokenResponse = {
  accessToken: AccessToken;
  username: Username;
};

var storedRequestToken: RequestToken | null = null;

// From https://getpocket.com/developer/apps/
const PLATFORM_CONSUMER_KEYS = {
  mac: "97653-12e003276f01f4288ac868c0",
};

const doCORSProxiedRequest = (
  url: string,
  body: Record<string, string>
): Promise<Response> => {
  const proxiedURL = `http://localhost:9090/${url}`;
  const response = fetch(proxiedURL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: qs.stringify(body),
  });

  return response;
};

export const buildAuthorizationURL = (
  requestToken: RequestToken,
  authRedirectURI: string
) =>
  `https://getpocket.com/auth/authorize?request_token=${requestToken}&redirect_uri=${authRedirectURI}`;

// TODO: Handle unsuccessful requests
export const getRequestToken = async (
  authRedirectURI: string
): Promise<RequestToken> => {
  if (storedRequestToken) {
    throw new Error("Found unexpected stored request token");
  }

  const REQUEST_TOKEN_URL = "https://getpocket.com/v3/oauth/request";

  const response = await doCORSProxiedRequest(REQUEST_TOKEN_URL, {
    consumer_key: PLATFORM_CONSUMER_KEYS["mac"],
    redirect_uri: authRedirectURI,
  });

  const formdata = await response.text();
  const parsed = qs.parse(formdata);

  const requestToken = parsed["code"] as RequestToken;
  storedRequestToken = requestToken;
  return requestToken;
};

// TODO: Handle unsuccessful requests
export const getAccessToken = async (): Promise<AccessTokenResponse> => {
  if (!storedRequestToken) {
    throw new Error("could not find stored request token");
  }

  const ACCESS_TOKEN_URL = "https://getpocket.com/v3/oauth/authorize";

  const response = await doCORSProxiedRequest(ACCESS_TOKEN_URL, {
    consumer_key: PLATFORM_CONSUMER_KEYS["mac"],
    code: storedRequestToken,
  });

  const formdata = await response.text();
  const parsed = qs.parse(formdata);

  storedRequestToken = null;

  return {
    accessToken: parsed["access_token"] as AccessToken,
    username: parsed["username"] as Username,
  };
};

export const getPocketItems = async (accessToken: AccessToken) => {
  const GET_ITEMS_URL = "https://getpocket.com/v3/get";

  const response = await doCORSProxiedRequest(GET_ITEMS_URL, {
    consumer_key: PLATFORM_CONSUMER_KEYS["mac"],
    access_token: accessToken,
    // count: new Number(10).toString(),
    since: new Number(1623177913).toString(),
  });

  return response.json();
};
