import * as muse from "../mod.ts";

muse.set_option("fetch", (url, options) => {
  return fetch(`https://your.proxy.com/?url=${url}`, options);
});

const results = await muse.search("hello_world");

console.log("search results", results);
