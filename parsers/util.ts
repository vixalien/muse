import {
  find_objects_by_key,
  MENU_ITEMS,
  NAVIGATION_BROWSE_ID,
} from "../nav.ts";
import { j, jo } from "../util.ts";

export interface Thumbnail {
  url: string;
  width: number;
  height: number;
}

export function get_menu_playlists(data: any) {
  const ids: Record<string, string> = {};

  const watch_menu = find_objects_by_key(
    j(data, MENU_ITEMS),
    "menuNavigationItemRenderer",
  ) as any;

  for (
    const item of watch_menu.map((menu: any) => menu.menuNavigationItemRenderer)
  ) {
    const icon = j(item, "icon.iconType");
    let watch_key;
    if (icon == "MUSIC_SHUFFLE") {
      watch_key = "shuffleId";
    } else if (icon == "MIX") {
      watch_key = "radioId";
    } else {
      continue;
    }

    const watch_id =
      jo(item, "navigationEndpoint.watchPlaylistEndpoint.playlistId") ??
        jo(item, "navigationEndpoint.watchEndpoint.playlistId");

    if (watch_id) {
      ids[watch_key] = watch_id;
    }
  }

  return ids;
}

export function parse_menu_playlists(data: any, results: any) {
  const ids = get_menu_playlists(data);

  for (const id in ids) {
    results[id] = ids[id];
  }
}

export function get_item_text(item: any, index: number, run_index = 0) {
  const column = get_flex_column_item(item, index);

  if (!column) return null;

  if (column.text.runs.length < run_index + 1) return null;

  return column.text.runs[run_index].text;
}

export function get_flex_column_item(item: any, index: number) {
  if (
    item.flexColumns.length <= index ||
    !("text" in
      item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer) ||
    !("runs" in
      item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer.text)
  ) {
    return null;
  }

  return item.flexColumns[index].musicResponsiveListItemFlexColumnRenderer;
}

export function get_fixed_column_item(item: any, index: number) {
  if (
    !("text" in
      item.fixedColumns[index].musicResponsiveListItemFixedColumnRenderer) ||
    !("runs" in
      item.fixedColumns[index].musicResponsiveListItemFixedColumnRenderer.text)
  ) {
    return null;
  }
  return item.fixedColumns[index].musicResponsiveListItemFixedColumnRenderer;
}

export function parse_duration(duration?: string) {
  if (duration == null) return null;
  const mappedIncrements = [
    ...zip([1, 60, 3600], duration.split(":").reverse()),
  ];
  const seconds = mappedIncrements.reduce(
    (acc, [multiplier, time]) => acc + (multiplier * parseInt(time)),
    0,
  );
  return seconds;
}

function zip(a: any[], b: any[]) {
  return Array.from(
    { length: Math.min(a.length, b.length) },
    (_, i) => [a[i], b[i]],
  );
}

export function get_browse_id(item: any, index: number): string | null {
  if (!("navigationEndpoint" in item.text.runs[index])) {
    return null;
  } else {
    return j(item, `text.runs[${index}].${NAVIGATION_BROWSE_ID}`);
  }
}

export function get_dot_separator_index(runs: any[]): number {
  const index = runs.findIndex((run) => run.text === " • ");
  return index < 0 ? runs.length : index;
}

export function color_to_hex(a: number) {
  const arr = [
    (a & 16711680) >>> 16,
    (a & 65280) >>> 8,
    a & 255,
    (a & 4278190080) >>> 24,
  ];

  const b = arr.every((c) => c == (c & 255));

  if (!b) throw Error('"(' + arr.join(",") + '") is not a valid RGBA color');

  return (
    "#" +
    arr
      .slice(0, 3)
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}
