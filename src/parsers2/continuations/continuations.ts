import { RawJSON } from "../types.d.ts";

export type ParseContinuationsResult = Record<string, string>;

/**
 * Parse an object with continuations
 */
export function parse_continuations(content: RawJSON): ParseContinuationsResult {
  const continuations: ParseContinuationsResult = {};

  for (const continuation of content.continuations) {
    /**
     * A continuation has the following syntax:
     *
     * {
     *   "nextContinuationData": {
     *     "continuation": "..."
     *   }
     * }
     */
    const name = Object.keys(continuation)[0];
    const value = continuation[name].continuation;

    if (!name.endsWith("Data")) continue;
    continuations[name.slice(undefined, -4)] = value;
  }

  return continuations;
}
