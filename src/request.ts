import { ERROR_CODE, MuseError } from "./errors.ts";
import LOCALES from "../locales/locales.json" assert { type: "json" };
import { get_option } from "./setup.ts";

import { debug } from "./util.ts";

type OrLowercase<T extends string> = T | Lowercase<T>;

/**
 * Request options
 */
export interface FetchData {
  method?: OrLowercase<
    "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "TRACE"
  >;
  headers?: Record<string, string>;
  data?: Record<string, any> | Uint8Array;
  params?: Record<string, string>;
  raw_data?: boolean;
  signal?: AbortSignal;
}

export type RequestFunction = (
  url: string,
  options: RequestInit,
) => Promise<Response>;

export abstract class RequestClient {
  abstract request(url: string, options: FetchData): Promise<Response>;
  auth_header: string | null = null;
  // request but return json
  async request_json<T>(url: string, options: FetchData) {
    const response = await this.request(url, options);
    const json = await response.json();
    return json as T;
  }
}

export class FetchClient extends RequestClient {
  constructor() {
    super();
  }

  private do_fetch(url: string, options: RequestInit) {
    return get_option("fetch")(url, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: options.signal,
    });
  }

  async request(path: string, options: FetchData) {
    debug(options.method, path);

    const url = new URL(path);

    (new URLSearchParams(options.params)).forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    const headers = new Headers(options.headers);

    const config: Record<string, any> = {};

    const lang = get_option("language");
    const location = get_option("location");

    // headers.set("X-Goog-Visitor-Id", get_option("visitor_id"));

    if (lang) {
      if (LOCALES.languages.findIndex((e) => e.value === lang) < 0) {
        throw new MuseError(
          ERROR_CODE.UNSUPPORTED_LANGUAGE,
          `Unsupported locale: ${lang}`,
        );
      }

      let lang_string = lang;
      if (lang.includes("-")) lang_string += "," + lang.split("-")[0];
      lang_string += ";q=0.5";

      headers.set("Accept-Language", lang_string);

      config.hl = lang;
    }

    if (location) {
      if (LOCALES.locations.findIndex((e) => e.value === location) < 0) {
        throw new MuseError(
          ERROR_CODE.UNSUPPORTED_LOCATION,
          `Unsupported location: ${location}`,
        );
      }

      config.gl = location;
    }

    const hasData = options.data != null;

    const visitor_id = get_option("visitor_id");

    if (visitor_id) headers.set("X-Goog-Visitor-Id", visitor_id);

    if (!options.raw_data && hasData && !(options.data instanceof Uint8Array)) {
      if (Object.keys(config).length > 0) {
        setNestedValue(options.data!, "context.client", {
          ...options.data!.context?.client,
          ...config,
        });
      }

      if (visitor_id) {
        setNestedValue(
          options.data!,
          "context.client.visitorData",
          visitor_id,
        );
      }
    }

    // if (this.auth_header) headers.set("Authorization", this.auth_header);

    // debug(`Requesting ${options.method} with ${JSON.stringify(options)}`);

    const response = await this.do_fetch(url.toString(), {
      method: options.method,
      headers,
      body: hasData
        ? (options.raw_data || options.data instanceof Uint8Array)
          ? options.data as Uint8Array
          : JSON.stringify(options.data)
        : undefined,
      signal: options.signal,
    });

    debug("DONE", options.method, path);

    // if (!response.ok) {
    //   const text = await response.text();
    //   throw new Error(text);
    // }

    return response;
  }
}

function setNestedValue(obj: Record<string, any>, path: string, value: any) {
  const keys = path.split(".");
  let currentObj = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (!Object.hasOwn(currentObj, key)) {
      currentObj[key] = {};
    }
    if (i === keys.length - 1) {
      currentObj[key] = value;
    } else {
      currentObj = currentObj[key];
    }
  }

  return obj;
}
