import { Client } from "../client.ts";
import { DenoFileStore } from "../store.ts";

export type { Client };

export * from "../deps_test.ts";

export const setup = async (client: Client) => {
  const css = {
    normal: "font-weight: normal",
    bold: "font-weight: bold",
    underline: "text-decoration: underline",
  };

  if (client.auth.requires_login()) {
    console.log("Getting login code...");

    const loginCode = await client.auth.get_login_code();

    console.log(
      `Go to %c${loginCode.verification_url}%c and enter the code %c${loginCode.user_code}`,
      css.underline,
      css.normal,
      css.bold,
    );

    confirm("Press enter when you have logged in");

    console.log("Loading token...");

    await client.auth.load_token_with_code(
      loginCode.device_code,
      loginCode.interval,
    );

    console.log("Logged in!", client.auth._token);
  }
};

export const init_client = () => {
  const client = new Client({
    store: new DenoFileStore("store/muse-store.json"),
  });

  setup(client);

  return client;
};
