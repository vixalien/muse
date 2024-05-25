import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");

async function get_latest_version() {
  const p = new Deno.Command("git", {
    args: ["describe", "--tags", "--abbrev=0"],
  });

  const decoder = new TextDecoder("utf-8");

  const latest = await p
    .output()
    .then((result) => {
      if (result.code !== 0) throw new Error("Couldn't get latest tag");
      return decoder.decode(result.stdout);
    })
    // remove \n from end of string
    .then((result) => result.slice(0, -1));

  console.log(`No version provided, using latest: ${latest}`);

  return latest;
}

await build({
  entryPoints: [
    "./mod.ts",
    {
      name: "./locales/locales",
      path: "./locales/locales.json",
    },
  ],
  outDir: "./npm",
  shims: {
    // see JS docs for overview and more options
    deno: false,
  },
  packageManager: "npm",
  test: false,
  typeCheck: false,
  compilerOptions: {
    lib: ["ES2022", "DOM"],
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
  },
});

// post build steps
Deno.copyFileSync("LICENCE", "npm/LICENCE");
Deno.copyFileSync("README.md", "npm/README.md");
