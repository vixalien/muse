import { ERROR_CODE, MuseError } from "../errors.ts";
import { auth } from "../setup.ts";
export { auth };

/**
 * Get number of days since the unix epoch
 */
export function get_timestamp() {
  const one_day = 24 * 60 * 60 * 1000;

  return Math.round((new Date().getTime() - new Date(0).getTime()) / one_day) -
    7;
}

export async function check_auth() {
  if (await auth.requires_login()) {
    throw new MuseError(
      ERROR_CODE.AUTH_REQUIRED,
      "Please provide authentication before using this function",
    );
  }
}

export function html_to_text(html: string) {
  return html.replace(/<[^>]*>?/gm, "");
}

// determine order_params via `.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[1].itemSectionRenderer.header.itemSectionTabbedHeaderRenderer.endItems[1].dropdownRenderer.entries[].dropdownItemRenderer.onSelectCommand.browseEndpoint.params` of `/youtubei/v1/browse` response
export const order_params = new Map(
  [
    ["a_to_z", "ggMGKgQIARAA"],
    ["z_to_a", "ggMGKgQIARAB"],
    ["recently_added", "ggMGKgQIABAB"],
  ] as const,
);

export const orders = [...order_params.keys()];

export type Order = typeof orders[number];

export function validate_order_parameter(order?: Order) {
  if (order && !orders.includes(order)) {
    throw new Error(
      `Invalid order provided. Please use one of the following: ${
        orders.join(", ")
      }`,
    );
  }
}

export function prepare_order_params(order?: Order) {
  if (order) {
    return order_params.get(order);
  }
}

export const library_order_continuations = new Map(
  [
    [
      "recent_activity",
      "4qmFsgIrEhdGRW11c2ljX2xpYnJhcnlfbGFuZGluZxoQZ2dNR0tnUUlCaEFCb0FZQg%3D%3D",
    ],
    [
      "recently_added",
      "4qmFsgIrEhdGRW11c2ljX2xpYnJhcnlfbGFuZGluZxoQZ2dNR0tnUUlBQkFCb0FZQg%3D%3D",
    ],
    [
      "recently_played",
      "4qmFsgIrEhdGRW11c2ljX2xpYnJhcnlfbGFuZGluZxoQZ2dNR0tnUUlCUkFCb0FZQg%3D%3D",
    ],
  ] as const,
);

export const library_orders = [...library_order_continuations.keys()];

export type LibraryOrder = typeof library_orders[number];

export function validate_library_sort_parameter(
  sort?: LibraryOrder,
) {
  if (sort && !library_orders.includes(sort)) {
    throw new Error(
      `Invalid sort provided. Please use one of the following: ${
        library_orders.join(", ")
      }`,
    );
  }
}

export function prepare_library_sort_params(sort?: LibraryOrder) {
  if (sort) {
    return library_order_continuations.get(sort);
  }
}

const p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function randomString(len: number) {
  return [...Array(len)].reduce((a) => a + p[~~(Math.random() * p.length)], "");
}
