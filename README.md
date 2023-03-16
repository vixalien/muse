# muse

A library to interact with the YouTube Music (InnerTube) api.

> Note: This library is still in development, and is not ready for production
> use.

## Usage

Requires Deno.

```ts
import { get_album, search } from "https://deno.land/x/muse/mod.ts";

search("drake")
  .then((data) => {
    console.log("search results", data);
  });
```

## Auth

Currently, muse supports oauth authentication by posing as the YouTube TV app.

Here's the flow:

1. Get a login code
2. Go to the given login url, and type in the login code on a device that is
   logged into a google account
3. Get the OAuth token & refresh tokens

```ts
import { auth } from "https://deno.land/x/muse/mod.ts";
import { RequiresLoginEvent } from "https://deno.land/x/muse/auth.ts";

// this is the authentication flow
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

  // not necessary, but saves some requests
  confirm("Press enter when you have logged in");

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
  const resolve = (event as RequiresLoginEvent).detail;

  resolve(auth_flow);
});
```

In the future, I plan to add support for other auth methods, such as cookies and
Youtube TV login codes.

## Storage

You can pass in a storage object to the client to persist the auth token.

```ts
import { init } from "https://deno.land/x/muse/mod.ts";
import {
  DenoFileStore,
  get_default_store,
  LocalStorageStore,
  MemoryStore,
  Store,
} from "https://deno.land/x/muse/store.ts";

// you can use the default store, which is DenoFileStore if available, then LocalStorageStore, then MemoryStore
const client = init({ store: get_default_store() });

// or you can use any of the built-in stores
const client = init({ store: new DenoFileStore("/path/to/file.json") });
const client = init({ store: new LocalStorageStore() });
const client = init({ store: new MemoryStore() });

// or you can implement your own store
// by extending the Store abstract class
class MyStore extends Store {
  get<T>(key: string): T | null;
  set(key: string, value: unknown): void;
  delete(key: string): void;
}

// then use it accordingly
const client = init({ store: new MyStore() });

// Do note that init() can be called multiple times, but it's not recommended. 
// this is because init overrides the global store, so if you call init()
// multiple times, other options set before will be ignored. example:

init({ auth: { /* custom auth options */ } });
init({ store: /* custom store */ });

// the above will only use the custom store, and ignore the custom auth options
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
- [ ] get album browse id
- [x] get user
- [x] get user playlists
- [x] get song
- [ ] get song related
- [ ] get lyrics
- [ ] get tasteprofile
- [ ] set tasteprofile

### explore

- [ ] get mood categories
- [ ] get mood playlists
- [ ] get charts

### watch

- [ ] get watch playlist

### library

- [x] get library
- [ ] get library playlists
- [ ] get library songs
- [ ] get library albums
- [ ] get library artists
- [ ] get library subscriptions
- [ ] get liked songs
- [ ] get history
- [ ] add history item
- [ ] remove history items
- [ ] rate song
- [ ] edit song library status
- [ ] rate playlist
- [ ] subscribe artists

### playlists

- [ ] get playlist
- [ ] create playlist
- [ ] edit playlist
- [ ] delete playlist
- [ ] add playlist items
- [ ] remove playlist items

### uploads

- [ ] get library upload songs
- [ ] get library upload artists
- [ ] get library upload albums
- [ ] get library upload artist
- [ ] get library upload album
- [ ] upload song
- [ ] delete upload entity

## Acknowledgements

- [ytmusicapi] - The inspiration for this library
- [Youtube Internal Clients][internal-clients] - The source of the client names
  and versions
- many random gists and blog posts whose links I've lost

[ytmusicapi]: https://ytmusicapi.readthedocs.io/en/stable/reference.html
[internal-clients]: https://github.com/zerodytrash/YouTube-Internal-Clients
