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
}

/**
 * Parses a browse endpoint
 * @param content JSON
 * @returns
 */
export function parseBrowseEndpoint(content: RawJSON): BrowseEndpoint {
  return {
    type: EndpointType.BROWSE,
    id: content.browseId,
  };
}
