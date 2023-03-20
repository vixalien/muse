import { Authenticator, PureAuthenticatorOptions } from "./auth.ts";
import { FetchClient, RequestClient } from "./request.ts";
import { MemoryStore, Store } from "./store.ts";

interface ClientOptions {
  auth?: PureAuthenticatorOptions;
  client?: RequestClient;
  store?: Store;
}

export function setup(options: ClientOptions = {}) {
  const store = options.store ?? new MemoryStore();
  const client = options.client ?? new FetchClient();
  const auth = new Authenticator({
    client: client,
    store: store,
    ...options.auth,
  });

  return { auth, client, store };
}

let auth: Authenticator;
let client: RequestClient;
let store: Store;

init();

export function init(options: ClientOptions = {}) {
  const data = setup(options);

  auth = data.auth;
  client = data.client;
  store = data.store;

  return data;
}

export { auth, client, store };
