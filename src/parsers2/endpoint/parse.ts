import { RawJSON } from "../types.d.ts";
import { BaseEndpointMap, KnownEndpointName } from "./types.d.ts";

import { parseBrowseEndpoint } from "./endpoints/browse.ts";
import { KnownEndpoint } from "./types.d.ts";

export const _endpointMap = {
  "browse": parseBrowseEndpoint,
} satisfies BaseEndpointMap;

export enum EndpointType {
  BROWSE,
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

export function parseEndpoint(content: RawJSON): ParseEndpointResult {
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
