import { RequiresLoginEvent } from "./auth.ts";
import { request_json } from "./mixins/_request.ts";
import {
  auth,
  get_library,
  get_library_artists,
  get_library_songs,
  get_library_subscriptions,
  init,
} from "./mod.ts";
import { FetchClient, RequestInit } from "./request.ts";
import { DenoFileStore } from "./store.ts";
import { debug } from "./util.ts";

const encoder = new TextEncoder();

async function hash(string: string) {
  // use the subtle crypto API to generate a 512 bit hash
  // return the hash as a hex string
  const data = encoder.encode(string);
  const hash = await crypto.subtle
    .digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

class CustomFetch extends FetchClient {
  async request(path: string, options: RequestInit) {
    // caching
    const cache_path = `store/cache/${await hash(
      JSON.stringify({ ...options.data, ...options.params } || {}),
    )}.json`;

    const cache = true;

    const cached = await Deno.readTextFile(cache_path)
      .then(JSON.parse).catch(() => null);

    if (cache && cached) return new Response(JSON.stringify(cached));
    // end caching

    console.debug(options.method, path);

    const hasData = options.data != null;

    const params = new URLSearchParams(options.params);

    const url = new URL(path + "?" + params.toString());

    const headers = new Headers(options.headers);

    if (this.auth_header) headers.set("Authorization", this.auth_header);

    debug(`Requesting ${options.method} with ${JSON.stringify(options)}`);

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: hasData ? JSON.stringify(options.data) : undefined,
    });

    // store into cache
    if (cache) {
      await Deno.mkdir("store/cache", { recursive: true });
      await Deno.writeTextFile(
        cache_path,
        JSON.stringify(await response.clone().json(), null, 2),
      );
    }

    console.debug("DONE", options.method, path);

    // if (!response.ok) {
    //   const text = await response.text();
    //   throw new Error(text);
    // }

    return response;
  }
}

init({
  store: new DenoFileStore("store/muse-store.json"),
  client: new CustomFetch(),
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

get_library_subscriptions({
  order: "z_to_a",
})
  // get_playlist("PLCwfwQhurMOukOqbFmYRidZ81ng_2iSUE")
  // .then((data) => {
  //   return get_queue(null, data.playlistId, { autoplay: true });
  // })
  .then((data) => {
    return Deno.writeTextFile(
      "store/rickroll.json",
      JSON.stringify(data, null, 2),
    );
  });

// await auth.requires_login();

// request(
//   "https://music.youtube.com/youtubei/v1/captions/AUieDabrBVLM_fV9CXYQ6L6XtClOZCDhTx3ciLv06QYQiX_EHqQ",
//   {
//     method: "post",
//   },
// )
//   .then((data) => {
//     console.log("result", data);
//   });
