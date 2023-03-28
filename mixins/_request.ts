import CONSTANTS2 from "../constants-ng.json" assert { type: "json" };

import { get_option, set_option } from "../setup.ts";

import { RequestInit } from "../request.ts";
import { use_proxy } from "../util.ts";

export function get_auth_headers() {
  return get_option("auth").get_headers();
}

async function load_visitor_id() {
  if (!get_option("auth").has_token() && !get_option("visitor_id")) {
    const visitor_id = await get_option("client").request(
      `${CONSTANTS2.API_URL}/browse`,
      {
        method: "post",
        data: {
          ...CONSTANTS2.DATA,
        },
      },
    ).then((result) => result.json())
      .then((json) => json.responseContext.visitorData);

    get_option("store").set("visitor_id", visitor_id);
    set_option("visitor_id", visitor_id);
  }
}

export async function request(endpoint: string, options: RequestInit) {
  const auth_headers = await get_auth_headers();

  await load_visitor_id();

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${CONSTANTS2.API_URL}/${endpoint}`;

  return get_option("client").request(
    use_proxy(url),
    {
      method: options.method || "post",
      data: options.method === "get" ? undefined : {
        ...CONSTANTS2.DATA,
        ...options.data,
      },
      headers: {
        ...CONSTANTS2.HEADERS,
        ...auth_headers,
        "Content-Type": "application/json",
        "X-Goog-Request-Time": (new Date()).getTime().toString(),
        ...options.headers,
      },
      params: {
        ...options.params,
      },
    },
  );
}

export async function request_json(endpoint: string, options: RequestInit) {
  const response = await request(endpoint, options);

  const json = await response.json();

  return json;
}
