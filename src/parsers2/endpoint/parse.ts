import { RawJSON } from "../types.d.ts";
import { BaseEndpointMap, KnownEndpointName } from "./types.d.ts";

import { parse_browse_endpoint } from "./endpoints/browse.ts";
import { KnownEndpoint } from "./types.d.ts";

export const _endpointMap = {
  "browse": parse_browse_endpoint,
} satisfies BaseEndpointMap;

export enum EndpointType {
  BROWSE,
  NAVIGATION,
}

type EndpointResult<T extends KnownEndpointName> = ReturnType<
  typeof _endpointMap[T]
>;

type ParsedEndpoints = {
  [endpoint in KnownEndpointName]: EndpointResult<"browse">;
};

export interface ParseEndpointResult {
  endpoints: Partial<ParsedEndpoints>;
}

export function parse_endpoint(content: RawJSON): ParseEndpointResult {
  const endpointEntries = Object.entries(_endpointMap)
    .map(([name, parser]) => {
      const endpoint = content[name + "Endpoint"];
      if (!endpoint) return [name, null] as const;
      return [name, parser(endpoint)] as const;
    })
    .filter(([, parsed]) => !!parsed);

  const endpoints = Object.fromEntries(endpointEntries) as Record<
    KnownEndpointName,
    KnownEndpoint
  >;

  return { endpoints };
}
