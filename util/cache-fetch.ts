import { FetchClient, RequestInit } from "../request.ts";
import { debug } from "../util.ts";
import { omit } from "../deps.ts";

const encoder = new TextEncoder();

async function hash(string: string) {
  // use the subtle crypto API to generate a 512 bit hash
  // return the hash as a hex string
  const data = encoder.encode(string);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export class CacheFetch extends FetchClient {
  constructor(public enable_cache = true) {
    super();
  }

  async request(path: string, options: RequestInit) {
    // caching
    const cache_path = `store/cache/${await hash(
      JSON.stringify(
        {
          ...omit(options.data, ["context"]),
          ...options.params,
          lang: options.headers?.["Accept-Language"],
          path,
        },
      ),
    )}.json`;

    const cache = this.enable_cache && !path.startsWith("like/");

    const cached = await Deno.readTextFile(cache_path)
      .then(JSON.parse)
      .catch(() => null);

    if (cache && cached) {
      debug("CACHED", options.method, path);
      return new Response(JSON.stringify(cached));
    }
    // end caching

    const response = await super.request(path, options);

    // store into cache
    if (cache) {
      try {
        await Deno.mkdir("store/cache", { recursive: true });
        await Deno.writeTextFile(
          cache_path,
          JSON.stringify(await response.clone().json()),
        );
      } catch {
        // not json probably: ignore
      }
    }

    // if (!response.ok) {
    //   const text = await response.text();
    //   throw new Error(text);
    // }

    return response;
  }
}
