import { RawJSON } from "../../types.d.ts";

import { EndpointType } from "../mod.ts";
import { BrowseEndpoint, parse_browse_endpoint } from "./browse.ts";

export interface NavigationEndpoint extends Omit<BrowseEndpoint, "type"> {
  type: EndpointType.NAVIGATION;
}

export function parse_navigation_endpoint(
  content: RawJSON,
): NavigationEndpoint {
  return {
    ...parse_browse_endpoint(content.browseEndpoint),
    type: EndpointType.NAVIGATION,
  };
}
