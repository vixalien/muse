import { auth } from "../setup.ts";

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

export { auth };
