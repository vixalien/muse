import { RequiresLoginEvent } from "./auth.ts";
import {
  auth,
  get_artist,
  get_artist_albums,
  get_library,
  get_user,
  init,
  search,
} from "./mod.ts";
import { DenoFileStore } from "./store.ts";

init({
  store: new DenoFileStore("store/muse-store.json"),
});

const css = {
  normal: "font-weight: normal",
  bold: "font-weight: bold",
  underline: "text-decoration: underline",
};

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

  await auth.load_token_with_code(
    loginCode.device_code,
    loginCode.interval,
  );

  console.log("Logged in!", auth._token);
};

auth.addEventListener("requires-login", (event) => {
  const resolve = (event as RequiresLoginEvent).detail;

  resolve(auth_flow);
});

// request("browse", {
//   data: {
//     browseId: "UC_x4LxqOApIT5QAi-m-oXJw",
//   },
// })
//   .then(async (data) => {
//     console.log(await data.text());
//   });

get_user(
  "UCSdIilrkpBqG01hzOU6pOTg",
)
  .then((data) => {
    Deno.writeTextFile(
      "store/rickroll.json",
      JSON.stringify(data, null, 2),
    );
  });
