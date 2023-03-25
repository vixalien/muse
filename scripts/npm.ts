// ex. scripts/build_npm.ts
import { build, emptyDir } from "https://deno.land/x/dnt@0.33.1/mod.ts";

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  packageManager: "bun",
  test: false,
  typeCheck: false,
  compilerOptions: {
    lib: ["es2022", "dom"],
  },
  package: {
    // package.json properties
    name: "libmuse",
    version: Deno.args[0],
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
    ]
  },
});

// post build steps
Deno.copyFileSync("LICENCE", "npm/LICENCE");
Deno.copyFileSync("README.md", "npm/README.md");
