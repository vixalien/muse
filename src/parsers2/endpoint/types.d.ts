import type { Parser } from "../types.d.ts";
import { _endpointMap } from "./parse.ts";

import { EndpointType } from "./mod.ts";
import type { BrowseEndpoint } from "./endpoints/browse.ts";

type EndpointMap = typeof _endpointMap;

export type KnownEndpointName = keyof EndpointMap;

export type BaseEndpointMap = Record<string, Parser<KnownEndpoint>>;

export type KnownEndpoint = BrowseEndpoint;

export interface BaseEndpoint {
  type: EndpointType;
}
