# muse

A library to interact with the YouTube Music (InnerTube) api.

> Note: This library is still in development, and is not ready for production
> use.

## Usage

muse works on Deno, Node.js, the browser and any javascript environment that
supports ES modules and fetch.

You can read [the docs](https://deno.land/x/muse?doc) for more information about
the usage of each function.

Don't forget to replace `VERSION` with the
[latest version](https://github.com/vixalien/muse/tags)

### Deno

```ts
import * as muse from "https://deno.land/x/muse@VERSION/mod.ts";

// you can also use the latest version (not recommended) with
// import * as muse from "https://deno.land/x/muse/mod.ts";

// you can also import directly from github
// import * as muse from "https://raw.githubusercontent.com/vixalien/muse/VERSION/mod.ts";

const search_results = await muse.search("drake");
const rickroll = await muse.get_song("dQw4w9WgXcQ");
```

### Browser

You'll need to use a CDN that supports ES modules, such as
[esm.sh](https://esm.sh/), [jspm.io](https://jspm.io/) or
[skypack.dev](https://skypack.dev/).

#### Proxy

You'll also need to use a proxy server to get around CORS errors. It's a good
idea to self host the proxy server
([cors-anywhere](https://github.com/Rob--W/cors-anywhere) and
[deno_deploy_cors_proxy](https://github.com/justjavac/deno_deploy_cors_proxy/)
are good options).

```js
import * as muse from "https://esm.sh/libmuse@VERSION";

// import * as muse from "https://jspm.dev/npm:libmuse@VERSION";
// import * as muse from "https://cdn.skypack.dev/libmuse@VERSION";

// setting up our proxy
muse.set_option("fetch", (url, options) => {
  return fetch(`https://proxy.example.com/${url}`, options);
});

const search_results = await muse.search("top radio");
```

### Node

First install using your preferred package manager (npm, yarn, pnpm etc.)

```bash
npm install libmuse
```

Then use it in by importing `libmuse`. The Node version has the exact same
features as the Deno version.

```js
import * as muse from "libmuse";
// commonjs: const muse = require("libmuse");

const artist = await muse.get_artist("UCvyjk7zKlaFyNIPZ-Pyvkng");
```

For the complete list of operations, see
[the docs](https://deno.land/x/muse/mod.ts?doc).

## Auth

Currently, muse supports oauth authentication by posing as the YouTube TV app.

Here's the flow:

1. Get a login code
2. Go to the given login url, and type in the login code on a device that is
   logged into a google account
3. Get the OAuth token & refresh tokens

```ts
import * as muse from "https://deno.land/x/muse@VERSION/mod.ts";

const auth = muse.get_option("auth");

muse.setup({
  // make sure to persist the token
  store: new DenoFileStore("store/muse-store.json"),
  debug: true,
});

// this is the authentication flow
const auth_flow = async () => {
  if (auth.has_token()) return;
  console.log("Getting login code...");

  const loginCode = await auth.get_login_code();

  console.log(
    `Go to ${loginCode.verification_url} and enter the code: ${loginCode.user_code}`,
  );

  // not necessary, but saves some requests
  alert("Press enter when you have logged in");

  console.log("Loading token...");

  await auth.load_token_with_code(
    loginCode.device_code,
    loginCode.interval,
  );

  console.log("Logged in!", auth._token);
};

// listen to the `requires-login` event, then resolve pass on a function that
// returns a promise that will resolve when the auth flow is complete
auth.addEventListener("requires-login", (event) => {
  const resolve = event.detail;

  resolve(auth_flow);
});
```

In the future, I plan to add support for other auth methods, such as cookies and
Youtube TV login codes.

## Storage

You can pass in a storage object to the client to persist the auth token.

```ts
import * as muse from "https://deno.land/x/muse@VERSION/mod.ts";

// you can use the "best" store, which is DenoFileStore if available, then LocalStorageStore, then MemoryStore
const client = muse.setup({ store: muse.get_best_store() });

// or you can use any of the built-in stores
const client = muse.setup({ store: new muse.DenoFileStore("/path/to/file.json") });
const client = muse.setup({ store: new muse.LocalStorageStore() });
const client = muse.setup({ store: new muse.MemoryStore() });

// or you can implement your own store
// by extending the Store abstract class
class MyStore extends muse.Store {
  get<T>(key: string): T | null;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

// then use it accordingly
const client = muse.setup({ store: new MyStore() });

// Do note that setup() can be called multiple times, but it's not recommended. 
// this is because setup overrides the global store, so if you call setup()
// multiple times, other options set before will be ignored. example:

muse.setup({ auth: { /* custom auth options */ } });
muse.setup({ store: /* custom store */ });

// the above will only use the custom store, and ignore the custom auth options

// if you need to configure options many times use `muse.set_option`
muse.set_option("store", /* custom store */)
```

## Operations

I'm currently targetting to match the [ytmusicapi]'s capabilities.

### search

- [x] search
- [x] search suggestions

### browsing

- [x] home
- [x] get artist
- [x] get artist albums
- [x] get album
- [x] get album browse id
- [x] get user
- [x] get user playlists
- [x] get song
- [x] get song related
- [x] get lyrics
- [ ] get tasteprofile
- [ ] set tasteprofile

### explore

- [x] get explore
- [x] get mood categories
- [x] get mood playlists
- [x] get charts
- [x] get new releases

### watch

- [x] get queue ~~get watch playlist~~

### library

- [x] get library
- [x] get library playlists
- [x] get library songs
- [x] get library albums
- [x] get library artists
- [x] get library subscriptions
- [x] get liked songs
- [x] get history
- [x] add history item
- [x] remove history items
- [x] rate song
- [x] edit song library status
- [x] rate playlist
- [x] subscribe artists
- [x] unsubscribe artists

### playlists

- [x] get playlist
- [x] create playlist
- [x] edit playlist
- [x] delete playlist
- [x] add playlist items
- [x] remove playlist items

### uploads

- [x] get library uploads
- [x] get library upload songs
- [x] get library upload artists
- [x] get library upload albums
- [x] get library upload artist
- [x] get library upload album
- [x] upload song (doesn't currectly work because the TV client can't do
      uploads)
- [x] delete upload entity

## Acknowledgements

- [ytmusicapi] - The inspiration for this library
- [Youtube Internal Clients][internal-clients] - The source of the client names
  and versions
- many random gists and blog posts whose links I've lost

[ytmusicapi]: https://ytmusicapi.readthedocs.io/en/stable/reference.html
[internal-clients]: https://github.com/zerodytrash/YouTube-Internal-Clients
