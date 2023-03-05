import { debug } from "./util.ts";
import { parse, serialize } from "./deps.ts";
import { Store } from "./store.ts";

type OrLowercase<T extends string> = T | Lowercase<T>;

/**
 * Request options
 */
export interface RequestInit {
  method?: OrLowercase<
    "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE"
  >;
  headers?: Record<string, string>;
  data?: Record<string, unknown>;
  params?: Record<string, string>;
}

export type RequestFunction = (
  url: string,
  options: RequestInit,
) => Promise<Response>;

export abstract class RequestClient {
  abstract request(url: string, options: RequestInit): Promise<Response>;
  auth_header: string | null = null;
  abstract cookies: Record<string, string>;
  // request but return json
  async request_json<T>(url: string, options: RequestInit) {
    const response = await this.request(url, options);
    const json = await response.json();
    return json as T;
  }
}

export class FetchClient extends RequestClient {
  cookies: Record<string, string> = {};

  constructor(public cookies_store: Store) {
    super();
    this.cookies = cookies_store.get("cookies") ?? {};
  }

  async request(path: string, options: RequestInit) {
    console.debug(options.method, path);

    const hasData = options.data != null;

    const params = new URLSearchParams(options.params);

    const url = new URL(path + "?" + params.toString());

    const headers = new Headers({
      "Cookie": Object.entries(this.cookies)
        .map(([key, value]) => serialize(key, value))
        .join("; "),
      ...options.headers,
    });

    if (this.auth_header) headers.set("Authorization", this.auth_header);

    debug(`Requesting ${options.method} with ${JSON.stringify(options)}`);

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: hasData ? JSON.stringify(options.data) : undefined,
    });

    console.debug("DONE", options.method, path);

    // if (!response.ok) {
    //   const text = await response.text();
    //   throw new Error(text);
    // }

    const cookies = response.headers.get("set-cookie");

    if (cookies) {
      const parsed = parse(cookies, { map: true });

      for (const [key, _value] of Object.entries(parsed)) {
        const value = _value.value;

        if (key === "CONSENT") {
          this.set_cookie(
            key,
            `YES+cb.${
              new Date().toISOString().split("T")[0].replace(/-/g, "")
            }-17-p0.en+FX+${value.split("+")[1]}`,
          );
          // print date as 20210328
          debug(`Accepted consent cookie: ${key} = ${this.cookies[key]}`);

          continue;
        }

        debug(`Got cookie: ${key} = ${value}`);
        this.set_cookie(key, value);
      }
    }

    return response;
  }

  set_cookie(key: string, value: string) {
    this.cookies[key] = value;
    this.cookies_store.set("cookies", this.cookies);
  }
}
