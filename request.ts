import { debug } from "./util.ts";

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
  // request but return json
  async request_json<T>(url: string, options: RequestInit) {
    const response = await this.request(url, options);
    const json = await response.json();
    return json as T;
  }
}

export class FetchClient extends RequestClient {
  constructor() {
    super();
  }

  async request(path: string, options: RequestInit) {
    console.debug(options.method, path);

    const hasData = options.data != null;

    const params = new URLSearchParams(options.params);

    const url = new URL(path + "?" + params.toString());

    const headers = new Headers(options.headers);

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

    return response;
  }
}
