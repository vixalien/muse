import { get_option, setup } from "../mod.ts";
import { DenoFileStore } from "../store.ts";

export * from "./asserts.ts";
export * from "./deps.ts";
export * from "../mod.ts";

export const auth_flow = async () => {
  const auth = get_option("auth");

  const css = {
    normal: "font-weight: normal",
    bold: "font-weight: bold",
    underline: "text-decoration: underline",
  };

  if (await auth.requires_login()) {
    console.log("Getting login code...");

    const loginCode = await auth.get_login_code();

    console.log(
      `Go to %c${loginCode.verification_url}%c and enter the code %c${loginCode.user_code}`,
      css.underline,
      css.normal,
      css.bold,
    );

    confirm("Press enter when you have logged in");

    console.log("Loading token...");

    await auth.load_token_with_code(
      loginCode.device_code,
      loginCode.interval,
    );

    console.log("Logged in!", auth._token);
  }
};

export const init_client = () => {
  const client = setup({
    store: new DenoFileStore("store/muse-store.json"),
  });

  auth_flow();

  return client;
};
