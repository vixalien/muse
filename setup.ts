import { Authenticator, PureAuthenticatorOptions } from "./auth.ts";
import { FetchClient, RequestClient } from "./request.ts";
import { MemoryStore, Store } from "./store.ts";

export interface Options {
  auth: Authenticator;
  client: RequestClient;
  store: Store;
  language: string | null;
  location: string | null;
  debug: boolean;
}

const default_store = new MemoryStore();
const default_client = new FetchClient();

const options: Options = {
  store: default_store,
  client: default_client,
  auth: new Authenticator({
    client: default_client,
    store: default_store,
  }),
  language: null,
  location: null,
  debug: false,
};

let last_options: Options | null = null;
let frozen_options: Readonly<Options> | null = null;

export function get_options() {
  if (last_options !== options) {
    last_options = options;
    frozen_options = Object.freeze(options);
  }

  return frozen_options as Readonly<Options>;
}

export function get_option<Name extends keyof Options>(name: Name) {
  return get_options()[name];
}

export function set_options(passed_options: Partial<Options>) {
  Object.assign(options, passed_options);
}

export interface SetupOptions extends Omit<Options, "auth"> {
  auth: PureAuthenticatorOptions;
}

export function setup(passed_options: Partial<SetupOptions> = {}) {
  const options_without_auth = { ...passed_options };
  delete options_without_auth.auth;

  set_options(options_without_auth as Omit<Options, "auth">);

  if (passed_options.auth || passed_options.client || passed_options.store) {
    if (passed_options.auth instanceof Authenticator) {
      options.auth = passed_options.auth;
    } else {
      options.auth = new Authenticator({
        client: options.client,
        store: options.store,
        ...(passed_options.auth ?? {}) as PureAuthenticatorOptions,
      });
    }
  }
}
