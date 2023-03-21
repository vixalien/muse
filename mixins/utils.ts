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
    throw new Error("Please provide authentication before using this function");
  }
}

export function html_to_text(html: string) {
  return html.replace(/<[^>]*>?/gm, "");
}

export const order_params = new Map(
  [
    ["a_to_z", "ggMGKgQIARAA"],
    ["z_to_a", "ggMGKgQIARAB"],
    ["recently_added", "ggMGKgQIABAB"],
  ] as const,
);

export const orders = [...order_params.keys()] as const;

export type Order = typeof orders[number];

export function validate_order_parameter(order?: Order) {
  if (order && !orders.includes(order)) {
    throw new Error(
      `Invalid orderprovided. Please use one of the following: ${
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
