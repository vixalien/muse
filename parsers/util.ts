import {
  find_objects_by_key,
  MENU_ITEMS,
  NAVIGATION_BROWSE_ID,
} from "../nav.ts";
import { j } from "../util.ts";

export function parse_menu_playlists(data: any, results: any) {
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
      j(item, "navigationEndpoint.watchPlaylistEndpoint.playlistId") ??
        j(item, "navigationEndpoint.watchEndpoint.playlistId");

    if (watch_id) {
      results[watch_key] = watch_id;
    }
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
    ("runs" in
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

export function get_browse_id(item: any, index: number) {
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
