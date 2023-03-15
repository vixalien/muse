import { JSONPath } from "./deps.ts";

/**
 * Wait a given number of milliseconds, then resolve
 */
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export let ENABLE_DEBUG = false;

/**
 * Logs debug messages to the console
 */
export const debug = (...args: unknown[]) => {
  if (ENABLE_DEBUG) console.debug(...args);
};

export const set_debug = (value: boolean) => {
  ENABLE_DEBUG = value;
};

export const j = (json: unknown, path: string, ...others: string[]) => {
  const result = JSONPath({ path: [path, ...others].join("."), json });
  return result.length ? result[0] : null;
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
