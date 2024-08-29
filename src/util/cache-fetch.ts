import { debug } from "../util.ts";

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

export async function cache_fetch(url: string, options: RequestInit) {
  const cache_path = `store/cache/${await hash(
    JSON.stringify({
      body: options.body?.toString(),
      lang: new Headers(options.headers).get("Accept-Language"),
      url,
    }),
  )}.json`;

  const cache = !url.includes("like/");

  const cached = await Deno.readTextFile(cache_path)
    .then(JSON.parse)
    .catch(() => null);

  if (cache && cached) {
    debug("CACHED", options.method, url);
    return new Response(JSON.stringify(cached));
  }
  // end caching

  const response = await fetch(url, options);

  // store into cache
  if (cache) {
    try {
      await Deno.mkdir("store/cache", { recursive: true });
      await Deno.writeTextFile(
        cache_path,
        JSON.stringify(await response.clone().json(), null, 2),
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
