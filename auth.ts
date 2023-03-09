import CONSTANTS from "./constants-ng.json" assert { type: "json" };
import { RequestClient } from "./request.ts";
import { wait } from "./util.ts";
import { Store } from "./store.ts";
import { ERROR_CODE, MuseError } from "./errors.ts";

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_date: Date;
  expires_in: number;
}

export interface LoginCode {
  device_code: string;
  user_code: string;
  expires_in: number;
  interval: number;
  verification_url: string;
}

export interface PureAuthenticatorOptions {
  token?: Token;
}

interface AuthenticatorOptions extends PureAuthenticatorOptions {
  client: RequestClient;
  store: Store;
}

/**
 * Authenticates with youtube's API
 */
export class Authenticator {
  _token: Token | null = null;
  store: Store;
  client: RequestClient;

  constructor(options: AuthenticatorOptions) {
    this.token = options.token ?? options.store.get("token") ?? null;
    this.store = options.store;
    this.client = options.client;
  }

  set token(token: Token | null) {
    if (token) token.expires_date = new Date(token.expires_date);
    this._token = token;
    this.store?.set("token", token);
  }

  /**
   * Get if the API requires a login
   */
  requires_login() {
    return this._token == null;
  }

  /**
   * Get a login code to login via Google Authentiction
   */
  async get_login_code() {
    const response = await this.client.request(
      "https://www.youtube.com/o/oauth2/device/code",
      {
        method: "post",
        data: {
          client_id: CONSTANTS.CLIENT_ID,
          scope: CONSTANTS.SCOPE,
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new MuseError(
        ERROR_CODE.AUTH_CANT_GET_LOGIN_CODE,
        "Can't get login code",
        {
          cause: text,
        },
      );
    }

    const data = response.json() as Promise<LoginCode>;

    return data;
  }

  /**
   * After getting a login code, get a token
   */
  async load_token_with_code(code: string, interval = 5) {
    let res: Token | null = null;
    let tries = 0;

    while (!res || !res.refresh_token) {
      try {
        const response = await this.client.request(
          "https://oauth2.googleapis.com/token",
          {
            method: "post",
            data: {
              client_id: CONSTANTS.CLIENT_ID,
              client_secret: CONSTANTS.CLIENT_SECRET,
              code: code,
              grant_type: "http://oauth.net/grant_type/device/1.0",
            },
          },
        );

        res = await response.json() as Token;

        if (!response.ok) await wait(interval * 1000);

        tries++;
      } catch (e) {
        if (tries++ > 10) throw e;
        await wait(interval * 1000);
      }
    }

    this.token = {
      ...res,
      expires_date: new Date(Date.now() + res.expires_in * 1000),
    };
  }

  /**
   * Smartly load a token, when you have already loaded one
   * If a token is present, it will check if it is expired
   */
  async get_token() {
    const token = this._token;

    if (!token) {
      throw new MuseError(
        ERROR_CODE.AUTH_NO_TOKEN,
        "No token present, use `get_login_code` to get a new token",
      );
    }

    if (token.expires_date < new Date()) {
      const res = await this.client.request(
        "https://oauth2.googleapis.com/token",
        {
          method: "post",
          data: {
            client_id: CONSTANTS.CLIENT_ID,
            client_secret: CONSTANTS.CLIENT_SECRET,
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
          },
        },
      );

      if (!res.ok) {
        // throw the error, but also set the token to null
        this.token = null;
        const text = await res.text();
        throw new MuseError(
          ERROR_CODE.AUTH_INVALID_REFRESH_TOKEN,
          `Can't refresh token, refresh token is invalid or expired`,
          { cause: text },
        );
      }

      const new_token = await res.json() as Token;

      this.token = {
        ...token,
        ...new_token,
        expires_date: new Date(Date.now() + new_token.expires_in * 1000),
      };

      return this._token!;
    }

    return token;
  }

  async get_headers() {
    const token = await this.get_token();

    return {
      Authorization: `${token.token_type} ${token.access_token}`,
    };
  }
}
