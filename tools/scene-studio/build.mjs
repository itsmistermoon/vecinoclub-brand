import { build } from "esbuild";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, "../..");
await mkdir(join(here, ".build"), { recursive: true });
execFileSync(
  process.execPath,
  [
    join(here, "node_modules/@tailwindcss/cli/dist/index.mjs"),
    "-i",
    "src/styles.css",
    "-o",
    ".build/styles.css",
    "--minify",
  ],
  { cwd: here, stdio: "inherit" },
);
const result = await build({
  absWorkingDir: here,
  entryPoints: ["src/app.tsx"],
  bundle: true,
  write: false,
  minify: true,
  format: "iife",
  target: "es2022",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "inline",
});
const fonts = [
  ["Rubik", "rubik-latin-wght-normal.woff2", "300 900"],
  ["Barlow", "barlow-condensed-latin-700-normal.woff2", "700"],
];
let css = "";
for (const [name, file, weight] of fonts)
  css += `@font-face{font-family:${name};font-weight:${weight};src:url(data:font/woff2;base64,${(await readFile(join(root, "fonts", file))).toString("base64")}) format('woff2');font-display:swap}`;
css += await readFile(join(root, "tokens/vecinoclub.css"), "utf8");
css += await readFile(join(here, ".build/styles.css"), "utf8");
let notices =
  "VecinoClub scene tool. Projection adapted from iso-figure, MIT © 2026 Tolga Cohce.\n";
notices += await readFile(join(here, "LICENSE-iso-figure.txt"), "utf8");
for (const file of ["OFL-Rubik.txt", "OFL-BarlowCondensed.txt"])
  notices += "\n" + (await readFile(join(root, "fonts", file), "utf8"));
const lock = JSON.parse(
  await readFile(join(here, "package-lock.json"), "utf8"),
);
for (const [path, pkg] of Object.entries(lock.packages)) {
  if (!path || pkg.dev) continue;
  try {
    const files = await readdir(join(here, path));
    const license = files.find((f) => /^licen[cs]e(?:\.(txt|md))?$/i.test(f));
    if (license)
      notices +=
        `\n\n${path}\n` + (await readFile(join(here, path, license), "utf8"));
  } catch (error) {
    throw new Error(`License collection failed: ${path}`, { cause: error });
  }
}
notices += "\n\n" + (await readFile(join(here, "LICENSE-shadcn.txt"), "utf8"));
notices +=
  "\n\nAnatomy curves kit\n" +
  (await readFile(join(here, "src/vendor/anatomy/LICENSE"), "utf8"));
const script = result.outputFiles[0].text.replaceAll("</script", "<\\/script").replace(/^[ \t]+$/gm, "");
await writeFile(
  join(root, "tools/escena-isometrica.html"),
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VecinoClub · Taller de escena</title><style>${css}</style></head><body><div id="app"></div><!--\n${notices
    .replaceAll("-->", "-- >")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")}\n--><script>${script}</script></body></html>`,
);
console.log("Built tools/escena-isometrica.html (all resources inline)");
