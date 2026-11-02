import { chromium } from "playwright-core";
import { build } from "esbuild";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
const here = dirname(fileURLToPath(import.meta.url)),
  evidence =
    process.env.SCENE_EVIDENCE_DIR ||
    (await mkdtemp(join(tmpdir(), "scene-import-")));
await mkdir(evidence, { recursive: true });
const fixtureText = await readFile(
    join(here, "../scenes/vecinoclub-escena.json"),
    "utf8",
  ),
  saved = JSON.parse(fixtureText);
// The captain's saved scene is format 5; loading upgrades it with Gota defaults.
const fixture = {
  ...saved,
  version: 6,
  elements: saved.elements.map((e) => ({
    ...e,
    spinning: true,
    spin: 8,
    shine: 0.85,
  })),
};
const checks = [],
  check = (ok, name) => {
    assert.ok(ok, name);
    checks.push(name);
  };
// Exercise the edge of the editor's own duplicate output against the real parser.
const modelBundle = await build({
  stdin: {
    contents:
      'export {parseSceneDocument} from "./src/scene-document.ts";export {createElement,duplicate,initialScene} from "./src/model.ts";',
    resolveDir: here,
  },
  bundle: true,
  format: "esm",
  write: false,
});
const model = await import(
  "data:text/javascript;base64," +
    Buffer.from(modelBundle.outputFiles[0].text).toString("base64")
);
const edge = model.initialScene();
Object.assign(edge.elements[0], { x: 500, y: 400, name: "X".repeat(80) });
edge.elements.push(model.duplicate(edge.elements[0]));
check(
  model.parseSceneDocument(JSON.stringify(edge)).elements.at(-1).name.length ===
    80,
  "duplicate at position/name limits remains a valid saved document",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1100 },
    acceptDownloads: true,
  });
  await context.setOffline(true);
  const page = await context.newPage(),
    errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("request", (r) => requests.push(r.url().split(":")[0]));
  await page.goto(pathToFileURL(join(here, "../escena-isometrica.html")).href);
  await page.locator("[data-object]").first().waitFor();
  const save = async (id) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#" + id).click(),
    ]);
    return readFile(await download.path(), "utf8");
  };
  // Repeated state assertions inspect the same public download buttons without
  // triggering dozens of OS downloads. Round-trip checks below use real downloads.
  const capture = async (id) =>
    page.evaluate(async (id) => {
      let blob;
      const create = URL.createObjectURL,
        click = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = function (value) {
        blob = value;
        return create.call(this, value);
      };
      HTMLAnchorElement.prototype.click = function () {};
      try {
        document.getElementById(id).click();
        return await blob.text();
      } finally {
        URL.createObjectURL = create;
        HTMLAnchorElement.prototype.click = click;
      }
    }, id);
  const document = async () => JSON.parse(await capture("json"));
  const choose = async (text, name = "scene.json") => {
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Cargar JSON", exact: true })
      .click();
    await (
      await chooser
    ).setFiles({
      name,
      mimeType: "application/json",
      buffer: Buffer.from(text),
    });
  };
  const loaded = async (name) => {
    await page
      .locator(".import-notice[data-error=false]")
      .filter({ hasText: name })
      .waitFor();
  };
  await choose(fixtureText, "vecinoclub-escena.json");
  await loaded("vecinoclub-escena.json");
  assert.deepEqual(
    await document(),
    fixture,
    "provided saved file restored verbatim",
  );
  checks.push(
    "provided file: all elements/properties/global settings restored",
  );
  check(
    await page.locator("[data-object=isotipo-8]").isHidden(),
    "provided file: hidden isotipo restored",
  );
  check(
    (await page
      .locator("[data-object=map-1]")
      .getAttribute("data-orientation")) === "SE",
    "provided file: map orientation restored",
  );
  const svgBefore = await save("export"),
    jsonSaved = await save("json");
  await writeFile(join(evidence, "import-source.svg"), svgBefore);
  await writeFile(join(evidence, "import-source.json"), jsonSaved);
  await page.screenshot({ path: join(evidence, "provided-json-loaded.png") });
  // Modify every category before loading the actual downloaded file.
  await page.locator("[data-layer=shop-2]").click();
  await page.locator("#fill").fill("#abcdef");
  await page.locator("[data-orientation-control=NO]").click();
  await page
    .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
    .click();
  for (const name of [
    "Tamaño",
    "Posición horizontal",
    "Posición vertical",
    "Grosor · px",
  ]) {
    const slider = page.getByRole("slider", { name, exact: true });
    await slider.focus();
    await slider.press("End");
  }
  await page
    .locator(".layer-panel")
    .getByRole("button", { name: "Menú de Comercio", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Traer al frente", exact: true })
    .click();
  await page.getByRole("tab", { name: "Escena", exact: true }).click();
  await page.locator("#background").fill("#123456");
  for (const name of ["Zoom", "Duración idle · s"]) {
    const slider = page.getByRole("slider", { name, exact: true });
    await slider.focus();
    await slider.press("End");
  }
  await page.locator("#pause").click();
  check(
    JSON.stringify(await document()) !== JSON.stringify(fixture),
    "test changed geometry, order, orientation, reflection, colors and global settings",
  );
  await choose(jsonSaved, "saved-round-trip.json");
  await loaded("saved-round-trip.json");
  assert.deepEqual(await document(), fixture);
  checks.push("save/load restores complete document after editing");
  assert.equal(await save("export"), svgBefore);
  checks.push("save → load → export SVG is byte-for-byte identical");
  // Real file drag/drop, including the visible drop target and layer-list coexistence.
  const fileDrop = async (text, name = "dropped.json", multiple = false) => {
    const data = await page.evaluateHandle(
      ({ text, name, multiple }) => {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([text], name, { type: "application/json" }),
        );
        if (multiple)
          transfer.items.add(
            new File([text], "second.json", { type: "application/json" }),
          );
        return transfer;
      },
      { text, name, multiple },
    );
    const target = page.locator('[data-layer-row="shop-2"]');
    await target.dispatchEvent("dragenter", { dataTransfer: data });
    await page.locator(".file-drop-overlay").waitFor({ state: "visible" });
    await target.dispatchEvent("dragover", { dataTransfer: data });
    await target.dispatchEvent("drop", { dataTransfer: data });
    await data.dispose();
    await page.locator(".file-drop-overlay").waitFor({ state: "hidden" });
  };
  await page.locator("[data-layer=shop-2]").click();
  await page.locator("#stroke").fill("#fedcba");
  await fileDrop(jsonSaved, "dropped.json");
  await loaded("dropped.json");
  assert.deepEqual(await document(), fixture);
  checks.push(
    "file drop over layers restores full document without reordering",
  );
  assert.equal(await save("export"), svgBefore);
  checks.push("drag/drop round trip SVG is byte-for-byte identical");
  // Each invalid import leaves the last complete scene and SVG untouched.
  const badCases = [
    ["syntax", "{", "JSON inválido"],
    ["old-version", JSON.stringify({ ...saved, version: 4 }), "versiones 5"],
    [
      "future-version",
      JSON.stringify({ ...fixture, version: 7 }),
      "versiones 5",
    ],
    [
      "no-version",
      JSON.stringify({ ...fixture, version: undefined }),
      "ausente",
    ],
    [
      "duplicate-id",
      JSON.stringify({
        ...fixture,
        elements: [fixture.elements[0], fixture.elements[0]],
      }),
      "repetido",
    ],
    [
      "missing-field",
      JSON.stringify({
        ...fixture,
        global: { ...fixture.global, duration: undefined },
      }),
      "global.duration",
    ],
    [
      "unknown-field",
      JSON.stringify({ ...fixture, unknown: true }),
      "campo desconocido",
    ],
    [
      "invalid-orientation",
      JSON.stringify({
        ...fixture,
        elements: [{ ...fixture.elements[0], orientation: "N" }],
      }),
      "orientation",
    ],
    [
      "invalid-color",
      JSON.stringify({
        ...fixture,
        elements: [
          { ...fixture.elements[0], fill: "url(https://example.com/x)" },
        ],
      }),
      "fill",
    ],
    [
      "invalid-type",
      JSON.stringify({
        ...fixture,
        elements: [{ ...fixture.elements[0], visible: "false" }],
      }),
      "visible",
    ],
    [
      "unsafe-id",
      JSON.stringify({
        ...fixture,
        elements: [{ ...fixture.elements[0], id: "<script>" }],
      }),
      "id",
    ],
    [
      "out-of-range",
      JSON.stringify({
        ...fixture,
        elements: [{ ...fixture.elements[0], scale: 10 }],
      }),
      "scale",
    ],
    [
      "infinite-number",
      JSON.stringify(fixture).replace('"zoom":1', '"zoom":1e400'),
      "zoom",
    ],
    [
      "too-many-elements",
      JSON.stringify({
        ...fixture,
        elements: Array.from({ length: 201 }, (_, i) => ({
          ...fixture.elements[0],
          id: "item-" + i,
        })),
      }),
      "200",
    ],
    ["oversized-file", " ".repeat(2 * 1024 * 1024 + 1), "2 MiB"],
  ];
  for (const [name, text, message] of badCases) {
    await choose(text, name + ".json");
    const alert = page.locator(".import-notice[data-error=true]");
    await alert.filter({ hasText: message }).waitFor();
    check(
      (await alert.textContent()).includes(message),
      `${name}: clear validation message`,
    );
    assert.deepEqual(await document(), fixture);
    assert.equal(await capture("export"), svgBefore);
    checks.push(`${name}: complete prior document and SVG preserved`);
  }
  await fileDrop(jsonSaved, "multiple.json", true);
  await page
    .locator(".import-notice[data-error=true]")
    .filter({ hasText: "un solo archivo" })
    .waitFor();
  assert.deepEqual(await document(), fixture);
  checks.push("multiple dropped files rejected without changing scene");
  await page.screenshot({ path: join(evidence, "json-validation-error.png") });
  // Reused IDs with a different kind must build fresh animation/anchor nodes.
  const changed = structuredClone(fixture);
  changed.elements[0].kind = "punto";
  changed.elements[0].fill = "#abc";
  changed.elements[0].accent = "#fff";
  changed.elements[0].flipX = true;
  changed.elements[0].orientation = "NO";
  await choose(JSON.stringify(changed), "changed-kind.json");
  await loaded("changed-kind.json");
  check(
    (await page.locator("[data-object=map-1] .idle").count()) === 1,
    "reused ID with changed kind rebuilds idle node",
  );
  check(
    (await page
      .locator("[data-object=map-1] [data-part=head] .iso-fill")
      .first()
      .evaluate((n) => getComputedStyle(n).fill)) === "rgb(170, 187, 204)",
    "three-digit HEX renders correctly in imported mascot",
  );
  const changedSVG = await capture("export");
  await choose(await save("json"), "changed-kind-saved.json");
  await loaded("changed-kind-saved.json");
  assert.equal(await capture("export"), changedSVG);
  checks.push("changed kind, reflection and shorthand HEX round trip");
  // Gota: spin, shine and orientation survive save/load; spin frames honour motion settings.
  const withGota = structuredClone(fixture);
  withGota.elements.push({
    ...model.createElement("gota", "gota-9"),
    orientation: "NE",
    flipX: true,
    spin: 3,
    shine: 0.4,
    fill: "#123456",
  });
  await choose(JSON.stringify(withGota), "gota.json");
  await loaded("gota.json");
  assert.deepEqual(await document(), withGota);
  check(
    (await page.locator("[data-object=gota-9] .spin-frame").count()) === 90,
    "gota renders 90 spin frames",
  );
  const frame = (i) =>
    page
      .locator("[data-object=gota-9] .spin-frame")
      .nth(i)
      .evaluate((n) => {
        const s = getComputedStyle(n);
        return [s.animationName, s.animationDuration, s.animationDelay];
      });
  const [name, duration, delay] = await frame(30);
  check(
    name === "spin-frame" && duration === "3s" && delay === "1s",
    "gota spin speed and phase come from the document",
  );
  const gotaSVG = await capture("export");
  check(
    gotaSVG.includes('data-orientation="NE"') &&
      /--shine:\s*0\.4/.test(gotaSVG) &&
      !gotaSVG.includes("<script"),
    "exported SVG keeps gota orientation, shine and stays script-free",
  );
  await choose(await save("json"), "gota-saved.json");
  await loaded("gota-saved.json");
  assert.equal(await capture("export"), gotaSVG);
  checks.push("gota save, load and SVG export round trip is identical");
  await page.emulateMedia({ reducedMotion: "reduce" });
  check(
    (await frame(30))[0] === "none" &&
      (await page
        .locator("[data-object=gota-9] .spin-frame")
        .evaluateAll((nodes) =>
          nodes.map((n) => getComputedStyle(n).opacity).join(""),
        )) ===
        "1" + "0".repeat(89),
    "reduced motion stops the spin and shows only the starting frame",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  withGota.elements.at(-1).spinning = false;
  await choose(JSON.stringify(withGota), "gota-still.json");
  await loaded("gota-still.json");
  check(
    (await frame(30))[0] === "none",
    "spinning off leaves gota on its chosen orientation",
  );
  const spinOff = await page.evaluate(
    () => document.querySelectorAll("[data-object=gota-9] .spin-frame").length,
  );
  assert.equal(spinOff, 90);
  const bad = structuredClone(withGota);
  bad.elements.at(-1).spin = 0;
  await choose(JSON.stringify(bad), "gota-bad.json");
  await page
    .locator(".import-notice[data-error=true]")
    .filter({ hasText: "elements[" })
    .waitFor();
  checks.push("out-of-range spin rejected with its field path");
  const empty = { ...fixture, elements: [] };
  await choose(JSON.stringify(empty), "empty.json");
  await loaded("empty.json");
  check(
    (await page.locator("#composition > [data-object]").count()) === 0,
    "empty document loads without stale geometry",
  );
  assert.deepEqual(await document(), empty);
  checks.push("empty document can be saved");
  await choose(jsonSaved, "final.json");
  await loaded("final.json");
  await page.emulateMedia({ reducedMotion: "reduce" });
  check(
    (await page
      .locator("[data-kind=punto] .idle")
      .evaluate((n) => getComputedStyle(n).animationName)) === "none",
    "import respects actual reduced motion",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await choose(jsonSaved, "mobile.json");
  await loaded("mobile.json");
  check(
    await page.evaluate(() => document.documentElement.scrollWidth === 390),
    "import controls and notice fit mobile viewport",
  );
  await page.screenshot({
    path: join(evidence, "json-import-mobile.png"),
    fullPage: true,
  });
  check(errors.length === 0, "import workflow has no browser errors");
  check(
    !requests.includes("http") && !requests.includes("https"),
    "import workflow requires no network",
  );
  await writeFile(
    join(evidence, "document-results.json"),
    JSON.stringify({ checks, errors, requests }, null, 2),
  );
  console.log(JSON.stringify({ documentChecks: checks.length, evidence }));
} finally {
  await browser.close();
}
