import { get_explore, get_home, setup } from "./mod.ts";
import { get_option, set_option } from "./setup.ts";
import { DenoFileStore } from "./store.ts";
import { CacheFetch } from "./util/cache-fetch.ts";

setup({
  store: new DenoFileStore("store/muse-store.json"),
  client: new CacheFetch(true),
  debug: true,
});

const css = {
  normal: "font-weight: normal",
  bold: "font-weight: bold",
  underline: "text-decoration: underline",
};

const auth = get_option("auth");

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

// request("browse", {
//   data: {
//     browseId: "UC_x4LxqOApIT5QAi-m-oXJw",
//   },
// })
//   .then(async (data) => {
//     console.log(await data.text());
//   });

get_explore()
  // get_playlist("PLCwfwQhurMOukOqbFmYRidZ81ng_2iSUE")
  // .then((data) => {
  //   return get_queue(null, data.playlistId, { autoplay: true });
  // })
  .then((data) => {
    return Deno.writeTextFile(
      "store/rickroll.json",
      JSON.stringify(data, null, 2),
    );
    // return data;
  });
