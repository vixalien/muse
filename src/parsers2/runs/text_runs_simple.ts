import { RawJSON } from "../types.d.ts";

/**
 * Parses text runs into a simple string
 * 
 * @example
 * 
 * ```ts
 * const text = parse_text_runs_simple({
 *  runs: [
 *    { text: "String" }
 *  ],
 * });
 * expect(text).toBe("String");
 * ```
 */
export function parse_text_runs_simple(content: RawJSON) {
  return content.runs[0].text;
}
