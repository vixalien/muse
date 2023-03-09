import { Client } from "./client.ts";
import { DenoFileStore } from "./store.ts";

// set_debug(true);

const client = new Client({
  store: new DenoFileStore("store/muse-store.json"),
});

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

// client.request("browse", {
//   data: {
//     browseId: "UC_x4LxqOApIT5QAi-m-oXJw",
//   },
// })
//   .then(async (data) => {
//     console.log(await data.text());
//   });

client.search("drake")
  .then((data) => {
    Deno.writeTextFile(
      "store/rickroll.json",
      JSON.stringify(data, null, 2),
    );
  });
