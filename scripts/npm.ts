// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.33.1/mod.ts";

await emptyDir("./npm");

async function get_latest_version() {
  const p = Deno.run({
    cmd: ["git", "describe", "--tags", "--abbrev=0"],
    stdout: "piped",
  });

  const decoder = new TextDecoder("utf-8");

  const latest = await p
    .output()
    .then((result) => decoder.decode(result))
    // remove \n from end of string
    .then((result) => result.slice(0, -1));

  console.log(`No version provided, using latest: ${latest}`);

  return latest;
}

await build({
  entryPoints: ["./mod.ts", "./auth.ts", "./request.ts", "./store.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: false,
  },
  packageManager: "npm",
  test: false,
  typeCheck: false,
  compilerOptions: {
    lib: ["es2022", "dom"],
  },
  package: {
    // package.json properties
    name: "libmuse",
    version: Deno.args[0] || await get_latest_version(),
    description:
      "A library to interact with the YouTube Music (InnerTube) api.",
    tags: [
      "youtube",
      "music",
      "api",
      "youtube-music",
      "innertube",
      "ytmusicapi",
      "muse",
    ],
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/vixalien/muse.git",
    },
    bugs: {
      url: "https://github.com/vixalien/muse/issues",
    },
    files: [
      "/esm",
      "/script",
      "/types",
      "LICENSE",
      "README.md",
    ],
  },
});

// post build steps
Deno.copyFileSync("LICENCE", "npm/LICENCE");
Deno.copyFileSync("README.md", "npm/README.md");
