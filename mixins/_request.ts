import CONSTANTS2 from "../constants-ng.json" assert { type: "json" };

import { get_option } from "../setup.ts";

import { RequestInit } from "../request.ts";

export function get_auth_headers() {
  return get_option("auth").get_headers();
}

export async function request(endpoint: string, options: RequestInit) {
  const auth_headers = await get_auth_headers();

  return get_option("client").request(
    endpoint.startsWith("http")
      ? endpoint
      : `${CONSTANTS2.API_URL}/${endpoint}`,
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
