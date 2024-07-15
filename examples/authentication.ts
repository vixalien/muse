import * as muse from "../mod.ts";
import { cache_fetch } from "../src/util/cache-fetch.ts";

muse.setup({
  store: new muse.DenoFileStore("store/muse-store.json"),
  fetch: cache_fetch,
  debug: true,
});

const css = {
  normal: "font-weight: normal",
  bold: "font-weight: bold",
  underline: "text-decoration: underline",
};

const auth = muse.get_option("auth");

const auth_flow = async () => {
  if (auth.has_token()) return;
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

  await auth.load_token_with_code(loginCode);

  console.log("Logged in!", auth._token);
};

auth.addEventListener("requires-login", (event) => {
  const resolve = event.detail;

  resolve(auth_flow);
});

muse.get_library()
  .then((data) => {
    return Deno.writeTextFile(
      "store/library.json",
      JSON.stringify(data, null, 2),
    );
  });
