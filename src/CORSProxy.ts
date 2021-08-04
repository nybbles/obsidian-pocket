import * as cors_proxy from "cors-anywhere";
import log from "loglevel";
import * as qs from "qs";

export const DEFAULT_CORS_PROXY_PORT = 10101;

export type ResponseBody = string;

export type DoHTTPRequest = (
  url: string,
  body: Record<string, string>
) => Promise<ResponseBody>;

export class CORSProxy {
  proxyServer: any; // need to do this because cors-anywhere has no typedefs
  port: number;
  host: string = "0.0.0.0";

  constructor(port?: number) {
    this.port = port ? port : DEFAULT_CORS_PROXY_PORT;
  }

  setup(): any {
    if (!!this.proxyServer) {
      throw new Error("Tried to set up already-running CORS proxy");
    }

    this.proxyServer = cors_proxy
      .createServer({})
      .listen(this.port, this.host, () => {
        log.info("Running CORS Anywhere on " + this.host + ":" + this.port);
      });
  }

  // See https://www.npmjs.com/package/http-proxy#shutdown
  shutdown() {
    if (!this.proxyServer) {
      throw new Error("Tried to shut down CORS proxy, when none is running");
    }

    log.info("Shutting down CORS Anywhere");
    this.proxyServer.close();
    this.proxyServer = null;
  }

  doCORSProxiedRequest: DoHTTPRequest = async (url, body) => {
    const proxiedURL = `http://localhost:${this.port}/${url}`;
    const response = await fetch(proxiedURL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: qs.stringify(body),
    });

    return response.text();
  };
}
