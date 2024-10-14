import { JSONPath, JSONPathOptions } from "./deps.ts";
import { ERROR_CODE, MuseError } from "./errors.ts";
import { get_option } from "./setup.ts";

type JSON = string | number | boolean | object | any[] | null;

/**
 * Wait a given number of milliseconds, then resolve
 */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Logs debug messages to the console
 */
export const debug = (...args: unknown[]) => {
  if (get_option("debug")) console.debug(...args);
};

export const jom = (
  json: unknown,
  path: string,
  resultType?: JSONPathOptions["resultType"],
): any => {
  const result = JSONPath({ path, json: json as JSON, resultType });
  return result.length ? result : null;
};
export const jo = (
  json: unknown,
  path: string,
  ...others: string[]
): any => {
  const result = JSONPath({
    path: [path, ...others].join("."),
    json: json as JSON,
  });
  return result.length ? result[0] : null;
};
export const j = (json: unknown, path: string, ...others: string[]) => {
  const result = jo(json, path, ...others);

  if (result == null) {
    throw new MuseError(
      ERROR_CODE.PARSING_INVALID_JSON,
      `JSONPath expression "${[path, ...others]}" returned nothing`,
    );
  }

  return result;
};

export function sum_total_duration(item: any) {
  if (!("tracks" in item)) {
    return 0;
  } else {
    return item.tracks.reduce(
      (acc: number, track: any) => acc + track.duration_seconds || 0,
      0,
    );
  }
}
