import { build } from "esbuild";
import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const evidence =
  process.env.SCENE_EVIDENCE_DIR ||
  (await mkdtemp(join(tmpdir(), "vecinoclub-scene-")));
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const checks = [];
const check = (value, label) => {
  assert.ok(value, label);
  checks.push(label);
};
const projectionModule = await build({
  stdin: {
    contents:
      "export {P} from './src/projection.ts';export {characterProjection} from './src/characters.ts';export {iso} from './src/vendor/anatomy/iso-kit.mjs';",
    resolveDir: here,
  },
  bundle: true,
  format: "esm",
  write: false,
});
const projectionAPI = await import(
  "data:text/javascript;base64," +
    Buffer.from(projectionModule.outputFiles[0].text).toString("base64")
);
for (const point of [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [44, 32, 170],
]) {
  const a = projectionAPI.iso(point, projectionAPI.characterProjection),
    b = projectionAPI.P(point[0], point[1], point[2] + 175);
  check(
    Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9,
    "Anatomy projection matches environment axes and scale",
  );
}
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
  page.on("request", (r) => requests.push(r.url()));
  page.setDefaultTimeout(10000);
  const url = pathToFileURL(resolve(here, "../escena-isometrica.html")).href;
  await page.goto(url);
  await page.waitForSelector("[data-object]");
  await page.evaluate(() => document.fonts.ready);
  const config = async () =>
    page.evaluate(async () => {
      let blob;
      const url = URL.createObjectURL,
        click = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = function (value) {
        blob = value;
        return url.call(this, value);
      };
      HTMLAnchorElement.prototype.click = function () {};
      try {
        document.querySelector("#json").click();
        return JSON.parse(await blob.text());
      } finally {
        URL.createObjectURL = url;
        HTMLAnchorElement.prototype.click = click;
      }
    });
  const select = async (id) => page.locator(`[data-layer="${id}"]`).click();
  const menu = async (name, action) => {
    await page
      .locator(".layer-panel")
      .getByRole("button", { name: `Menú de ${name}`, exact: true })
      .click();
    await page.getByRole("menuitem", { name: action, exact: true }).click();
  };
  let data = await config();
  check(data.version === 2, "current JSON schema");
  check(data.elements.length === 8, "eight initial independent elements");
  check(
    data.elements.filter((e) => e.kind === "tree").length === 3,
    "three separate trees",
  );
  check(
    (await page
      .locator("[data-kind=shop] .model-content .accent")
      .first()
      .evaluate((n) => getComputedStyle(n).fill)) === "rgb(251, 119, 42)",
    "shop accent retains brand orange",
  );
  check(
    (await page
      .locator("[data-kind=shop] .model-content .detail")
      .first()
      .evaluate((n) => getComputedStyle(n).fill)) === "none",
    "interior details stay unfilled",
  );
  await page.screenshot({ path: join(evidence, "studio-default.png") });
  for (const kind of ["punto", "isotipo"]) {
    const object = data.elements.find((e) => e.kind === kind);
    await select(object.id);
    const paths = [];
    for (const orientation of ["NE", "SE", "SO", "NO"]) {
      await page.locator(`[data-orientation-control="${orientation}"]`).click();
      const node = page.locator(`[data-object="${object.id}"]`);
      check(
        (await node.getAttribute("data-orientation")) === orientation,
        `${kind} ${orientation}: projected orientation`,
      );
      check(
        (await node.locator(".model-content [data-plane]").count()) > 0,
        `${kind} ${orientation}: volume surfaces`,
      );
      check(
        (await node
          .locator(".idle")
          .evaluate((n) => getComputedStyle(n).animationName)) === "float",
        `${kind} ${orientation}: idle active`,
      );
      paths.push(await node.locator(".model-content").innerHTML());
      const saved = await config();
      check(
        saved.elements.find((e) => e.id === object.id).orientation ===
          orientation,
        `${kind} ${orientation}: JSON orientation`,
      );
      await page.screenshot({
        path: join(evidence, `${kind}-${orientation}.png`),
      });
    }
    check(
      new Set(paths).size === 4,
      `${kind}: four distinct projected geometries`,
    );
  }
  const priorFill = await page
    .locator("[data-kind=isotipo] .model-content [data-plane=cap]")
    .first()
    .getAttribute("fill");
  await page.locator("#fill").fill("#ab3421");
  check(
    (await config()).elements.find((e) => e.kind === "isotipo").fill ===
      "#ab3421",
    "isotipo color serialized",
  );
  check(
    (await page
      .locator("[data-kind=isotipo] .model-content [data-plane=cap]")
      .first()
      .getAttribute("fill")) !== priorFill,
    "isotipo color updates rendered cap",
  );
  // Exercise every numeric field through the real shadcn slider's keyboard interface.
  for (const [label, key, max, min] of [
    ["Grosor · px", "line", 4, 0.2],
    ["Tamaño", "scale", 2.5, 0.3],
    ["Posición horizontal", "x", 500, -500],
    ["Posición vertical", "y", 400, -400],
    ["Opacidad", "opacity", 1, 0.1],
    ["Flotación · px", "amplitude", 30, 0],
    ["Balanceo · °", "tilt", 8, 0],
  ]) {
    const slider = page.getByRole("slider", { name: label, exact: true });
    await slider.focus();
    await slider.press("End");
    let saved = (await config()).elements.find((e) => e.kind === "isotipo");
    check(saved[key] === max, `isotipo slider ${key}: maximum`);
    if (key === "line")
      check(
        (await page
          .locator("[data-kind=isotipo] .model-content [data-plane=cap]")
          .first()
          .evaluate((n) => getComputedStyle(n).strokeWidth)) === "4px",
        "isotipo line width rendered",
      );
    await slider.press("Home");
    saved = (await config()).elements.find((e) => e.kind === "isotipo");
    check(saved[key] === min, `isotipo slider ${key}: minimum`);
  }
  for (const [label, key, max, min] of [
    ["Zoom", "zoom", 1.2, 0.65],
    ["Duración idle · s", "duration", 12, 1],
  ]) {
    const slider = page.getByRole("slider", { name: label, exact: true });
    await slider.focus();
    await slider.press("End");
    check((await config()).global[key] === max, `global ${key}: maximum`);
    await slider.press("Home");
    check((await config()).global[key] === min, `global ${key}: minimum`);
  }
  const tree = data.elements.find((e) => e.name === "Árbol oeste");
  await select(tree.id);
  const crown = page
    .locator(`[data-object="${tree.id}"] .model-content .face`)
    .last();
  await crown.scrollIntoViewIfNeeded();
  let bounds = await crown.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width / 2 + 55,
    bounds.y + bounds.height / 2 + 35,
    { steps: 8 },
  );
  await page.mouse.up();
  let moved = (await config()).elements.find((e) => e.id === tree.id);
  check(
    moved.x !== tree.x && moved.y !== tree.y,
    "pointer drag updates independent position",
  );
  check(
    (await config()).elements.find((e) => e.name === "Árbol norte").x ===
      data.elements.find((e) => e.name === "Árbol norte").x,
    "drag preserves other tree",
  );
  bounds = await crown.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.evaluate(() => {
    document.querySelector("#scene").addEventListener("wheel", (e) => {
      window.lastWheelPrevented = e.defaultPrevented;
    });
  });
  await page.mouse.wheel(0, 80);
  await page.waitForTimeout(50);
  check(
    (await page.evaluate(() => window.lastWheelPrevented)) === false,
    "ordinary wheel retains page scroll",
  );
  await page.keyboard.down("Alt");
  await page.mouse.wheel(0, -100);
  await page.keyboard.up("Alt");
  await page.waitForTimeout(50);
  check(
    (await page.evaluate(() => window.lastWheelPrevented)) === true,
    "Alt wheel owns scale gesture",
  );
  check(
    (await config()).elements.find((e) => e.id === tree.id).scale > moved.scale,
    "Alt wheel changes element scale",
  );
  await page.screenshot({ path: join(evidence, "drag-wheel.png") });
  await page.locator("#reset").click();
  await select("punto-7");
  await page.locator("[data-orientation-control=NO]").click();
  await select("isotipo-8");
  await page.locator("[data-orientation-control=NO]").click();
  await select(tree.id);
  // Silhouette highlighting must not recolor any structural or interior path.
  await page.mouse.move(30, 30);
  const shop = page.locator('[data-kind="shop"]');
  const oldStroke = await shop
    .locator(".model-content .detail")
    .first()
    .evaluate((n) => getComputedStyle(n).stroke);
  const roof = shop.locator(".model-content .face").last();
  await roof.hover();
  check(
    (await shop
      .locator(".hover-outline")
      .evaluate((n) => getComputedStyle(n).opacity)) === "1",
    "hover reveals silhouette overlay",
  );
  check(
    (await shop
      .locator(".model-content .detail")
      .first()
      .evaluate((n) => getComputedStyle(n).stroke)) === oldStroke,
    "hover leaves interior lines unchanged",
  );
  await page.screenshot({ path: join(evidence, "hover-silhouette.png") });
  await menu("Punto", "Duplicar");
  data = await config();
  check(
    data.elements.filter((e) => e.kind === "punto").length === 2,
    "duplicate creates independent mascot",
  );
  const copy = data.elements.find((e) => e.name === "Punto · copia");
  await page.locator("[data-orientation-control=SE]").click();
  check(
    (await config()).elements.find((e) => e.id === copy.id).orientation ===
      "SE",
    "duplicate orientation editable",
  );
  check(
    (await config()).elements.find((e) => e.name === "Punto").orientation ===
      "NO",
    "duplicate preserves original orientation",
  );
  await page
    .getByRole("button", { name: "Añadir elemento", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Árbol", exact: true }).click();
  data = await config();
  check(
    data.elements.filter((e) => e.kind === "tree").length === 4,
    "add typed element",
  );
  await menu("Árbol", "Eliminar");
  data = await config();
  check(
    data.elements.filter((e) => e.kind === "tree").length === 3,
    "delete added element",
  );
  await menu("Árbol norte", "Ocultar");
  check(
    (await page
      .locator(
        `[data-object="${data.elements.find((e) => e.name === "Árbol norte").id}"]`,
      )
      .isVisible()) === false,
    "element menu toggles visibility",
  );
  await menu("Árbol norte", "Mostrar");
  const jsonWait = page.waitForEvent("download");
  await page.locator("#json").click();
  const actualJSON = JSON.parse(
    await readFile(await (await jsonWait).path(), "utf8"),
  );
  check(actualJSON.version === 2, "actual JSON download");
  const promise = page.waitForEvent("download");
  await page.locator("#export").click();
  const svgDownload = await promise;
  const exportedPath = join(evidence, "scene-export.svg");
  await svgDownload.saveAs(exportedPath);
  data = await config();
  await writeFile(
    join(evidence, "scene-config.json"),
    JSON.stringify(data, null, 2),
  );
  await page.goto(pathToFileURL(exportedPath).href);
  const exported = await page.evaluate(() => ({
    parts: document.querySelectorAll("[data-object]").length,
    meta: JSON.parse(document.querySelector("metadata").textContent),
    bad: document.querySelectorAll("script,.hover-outline").length,
    orientations: [...document.querySelectorAll("[data-object]")].map((e) => ({
      id: e.dataset.object,
      orientation: e.dataset.orientation,
    })),
  }));
  check(
    exported.parts === data.elements.length,
    "SVG includes added and duplicated elements",
  );
  check(exported.bad === 0, "SVG autonomous and without hover UI");
  check(
    JSON.stringify(exported.meta) === JSON.stringify(data),
    "SVG metadata equals downloaded JSON",
  );
  for (const item of exported.orientations)
    check(
      data.elements.find((e) => e.id === item.id).orientation ===
        item.orientation,
      "SVG projected orientations equal JSON",
    );
  await page.emulateMedia({ reducedMotion: "reduce" });
  check(
    (await page
      .locator(".idle")
      .first()
      .evaluate((n) => getComputedStyle(n).animationName)) === "none",
    "standalone SVG reduced motion",
  );
  await page.goto(url);
  await page.waitForSelector(".idle");
  check(
    await page.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    "real reduced motion emulated",
  );
  check(
    (await page
      .locator(".idle")
      .first()
      .evaluate((n) => getComputedStyle(n).animationName)) === "none",
    "editor reduced motion",
  );
  await page.evaluate(() => {
    const style = document.querySelector("#scene style");
    style.textContent = style.textContent.replace(
      "@media(prefers-reduced-motion:reduce){.idle{animation:none!important}}",
      "",
    );
  });
  check(
    (await page
      .locator(".idle")
      .first()
      .evaluate((n) => getComputedStyle(n).animationName)) === "float",
    "negative control detects removed reduced-motion rule",
  );
  await page.reload();
  await page.waitForSelector(".idle");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#pause").click();
  check(
    (await page
      .locator(".idle")
      .first()
      .evaluate((n) => getComputedStyle(n).animationPlayState)) === "paused",
    "pause all idles",
  );
  await page.locator("#pause").click();
  check(
    (await page
      .locator(".idle")
      .first()
      .evaluate((n) => getComputedStyle(n).animationPlayState)) === "running",
    "resume all idles",
  );
  const seam = await page
    .locator(".idle")
    .first()
    .evaluate((node) => {
      const a = node.getAnimations()[0];
      a.pause();
      const d = a.effect.getTiming().duration;
      const at = (t) => {
        a.currentTime = t;
        return new DOMMatrixReadOnly(getComputedStyle(node).transform).f;
      };
      const result = {
        start: at(0),
        end: at(d),
        mid: at(d / 2),
        before: at(d - 1),
        after: at(1),
      };
      a.play();
      return result;
    });
  check(
    Math.abs(seam.start - seam.end) < 0.001 &&
      Math.abs(seam.before - seam.after) < 0.01,
    "idle loop seam continuous",
  );
  check(seam.mid < seam.start - 9, "idle has observable travel");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(evidence, "studio-mobile.png"),
    fullPage: true,
  });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth === 390),
    "mobile no horizontal overflow",
  );
  check(errors.length === 0, "no browser errors");
  check(
    !requests.some((url) => /^https?:/.test(url)),
    "offline file with no network dependencies",
  );
  await writeFile(
    join(evidence, "studio-results.json"),
    JSON.stringify(
      {
        checks,
        errors,
        requests: requests.map((s) => s.split(":")[0]),
        evidence,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: checks.length, evidence }));
} finally {
  await browser.close();
}
