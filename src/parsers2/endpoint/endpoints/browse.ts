import { RawJSON } from "../../types.d.ts";

import { EndpointType } from "../mod.ts";
import { BaseEndpoint } from "../types.d.ts";

/**
 * An endpoint the user can navigate to
 */
export interface BrowseEndpoint extends BaseEndpoint {
  type: EndpointType.BROWSE;
  /**
   * The ID to use while navigating
   */
  id: string;
  /**
   * Optional params, usually used to get more data of a specific kind
   */
  params?: string;
  /**
   * The type of this item
   */
  pageType?: string;
}

/**
 * Parses a browse endpoint
 * @param content JSON
 * @returns
 */
export function parse_browse_endpoint(content: RawJSON): BrowseEndpoint {
  return {
    type: EndpointType.BROWSE,
    id: content.browseId,
    params: content.params,
    pageType: content.browseEndpointContextSupportedConfigs
      ?.browseEndpointContextMusicConfig.pageType,
  };
}
