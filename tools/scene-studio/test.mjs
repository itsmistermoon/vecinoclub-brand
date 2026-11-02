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
  check(data.version === 6, "current JSON schema");
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
  check(
    await page.evaluate(
      () => document.documentElement.dataset.theme === "dark",
    ),
    "brand dark theme active",
  );
  check(
    (await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    )) === "rgb(23, 23, 23)",
    "dark background matches brand token",
  );
  check(
    (await page
      .locator(".settings-panel")
      .evaluate((n) => getComputedStyle(n).backgroundColor)) ===
      "rgb(33, 30, 26)",
    "dark surface matches brand token",
  );
  await select("map-1");
  const mapPaths = [];
  for (const variant of ["barrio", "cruce", "plaza", "compacto"]) {
    await page.locator(`[data-map-variant-control="${variant}"]`).click();
    check(
      (await config()).elements.find((e) => e.id === "map-1").mapVariant ===
        variant,
      `map ${variant}: JSON variant`,
    );
    check(
      (await page
        .locator('[data-object="map-1"]')
        .getAttribute("data-map-variant")) === variant,
      `map ${variant}: rendered variant`,
    );
    mapPaths.push(
      await page.locator('[data-object="map-1"] .model-content').innerHTML(),
    );
    await page.screenshot({ path: join(evidence, `map-${variant}.png`) });
  }
  check(new Set(mapPaths).size === 4, "four distinct map geometries");
  check(
    await page
      .locator("[data-kind=map] .model-content .top")
      .evaluate(
        (n) =>
          n.getAttribute("width") === "300" &&
          n.getAttribute("height") === "300",
      ),
    "compact map has a square 300 by 300 world footprint",
  );
  await page.locator("[data-map-variant-control=barrio]").click();
  await select("punto-7");
  await page.screenshot({ path: join(evidence, "studio-default.png") });
  const paintOrder = async () =>
    page
      .locator("#composition > [data-object]")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.object));
  const sidebarOrder = async () =>
    page
      .locator(".layer-panel [data-layer]")
      .evaluateAll((nodes) => nodes.map((node) => node.dataset.layer));
  const verifyOrder = async (label) => {
    const ids = (await config()).elements.map((e) => e.id);
    check(
      JSON.stringify(await paintOrder()) === JSON.stringify(ids),
      `${label}: SVG follows document stacking`,
    );
    check(
      JSON.stringify(await sidebarOrder()) ===
        JSON.stringify([...ids].reverse()),
      `${label}: Sidebar front layer first`,
    );
  };
  check(
    (await page.locator(".layer-panel[data-slot=sidebar]").count()) === 1,
    "official Sidebar composition rendered",
  );
  check(
    await page
      .locator('[data-slot="slider-track"]')
      .first()
      .evaluate((node) => node.getBoundingClientRect().height >= 4),
    "Base Slider track has visible height",
  );
  await verifyOrder("initial");
  await page.locator("[data-kind=punto] .idle").evaluate((node) => {
    window.stackAnimation = node.getAnimations()[0];
    window.stackTime = window.stackAnimation.currentTime;
  });
  await page
    .getByRole("button", { name: "Añadir elemento", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Mapa · Plaza", exact: true })
    .click();
  const plaza = (await config()).elements.find(
    (e) => e.name === "Mapa · Plaza",
  );
  check(
    (await config()).elements.findIndex((e) => e.id === plaza.id) <
      (await config()).elements.findIndex((e) => e.id === "shop-2"),
    "new map starts behind the shop",
  );
  await menu("Mapa · Plaza", "Enviar al fondo");
  check((await config()).elements[0].id === plaza.id, "send to back");
  await verifyOrder("send to back");
  await page.screenshot({ path: join(evidence, "layers-map-back.png") });
  await menu("Mapa · Plaza", "Subir un nivel");
  check(
    (await config()).elements[1].id === plaza.id,
    "raise exactly one layer",
  );
  await verifyOrder("raise one");
  await menu("Mapa · Plaza", "Bajar un nivel");
  check(
    (await config()).elements[0].id === plaza.id,
    "lower exactly one layer",
  );
  await verifyOrder("lower one");
  await menu("Mapa · Plaza", "Traer al frente");
  check((await config()).elements.at(-1).id === plaza.id, "bring to front");
  await verifyOrder("bring to front");
  await page.screenshot({ path: join(evidence, "layers-map-front.png") });
  await page
    .locator(".layer-panel")
    .getByRole("button", { name: "Menú de Mapa · Plaza", exact: true })
    .click();
  check(
    await page
      .getByRole("menuitem", { name: "Subir un nivel", exact: true })
      .isDisabled(),
    "raise disabled at front boundary",
  );
  await page.keyboard.press("Escape");
  await menu("Mapa · Plaza", "Enviar al fondo");
  await page
    .locator(".layer-panel")
    .getByRole("button", { name: "Menú de Mapa · Plaza", exact: true })
    .click();
  check(
    await page
      .getByRole("menuitem", { name: "Bajar un nivel", exact: true })
      .isDisabled(),
    "lower disabled at back boundary",
  );
  await page.keyboard.press("Escape");
  check(
    await page
      .locator("[data-kind=punto] .idle")
      .evaluate(
        (node) =>
          node.getAnimations()[0] === window.stackAnimation &&
          node.getAnimations()[0].currentTime >= window.stackTime,
      ),
    "stacking preserves the running idle animation",
  );
  await menu("Mapa · Plaza", "Eliminar");
  const dragHandle = page.getByRole("button", {
      name: "Arrastrar Árbol norte para cambiar orden",
      exact: true,
    }),
    targetRow = page.locator('[data-layer-row="punto-7"]');
  await dragHandle.dragTo(targetRow, { targetPosition: { x: 60, y: 2 } });
  let ordered = (await config()).elements;
  check(
    ordered.findIndex((e) => e.id === "tree-3") ===
      ordered.findIndex((e) => e.id === "punto-7") + 1,
    "native row drag moves layer above target",
  );
  await verifyOrder("row drag");
  await page.screenshot({ path: join(evidence, "layers-dragged.png") });
  const targetBox = await targetRow.boundingBox();
  await dragHandle.dragTo(targetRow, {
    targetPosition: { x: 60, y: targetBox.height - 2 },
  });
  ordered = (await config()).elements;
  check(
    ordered.findIndex((e) => e.id === "tree-3") ===
      ordered.findIndex((e) => e.id === "punto-7") - 1,
    "native row drag moves layer below target",
  );
  await verifyOrder("row drag below");
  check(
    await page
      .locator("[data-kind=punto] .idle")
      .evaluate((node) => node.getAnimations()[0] === window.stackAnimation),
    "row drag preserves idle animation identity",
  );
  await page.locator("#reset").click();
  await verifyOrder("reset");
  for (const id of ["map-1", "bench-6"]) {
    await select(id);
    const views = [];
    const position = (await config()).elements.find((e) => e.id === id);
    for (const direction of ["NE", "SE", "SO", "NO"]) {
      await page.locator(`[data-orientation-control=${direction}]`).click();
      const saved = (await config()).elements.find((e) => e.id === id);
      check(
        saved.orientation === direction,
        `${id}: ${direction} rotation serialized`,
      );
      check(
        saved.x === position.x && saved.y === position.y,
        `${id}: rotation preserves anchor position`,
      );
      views.push(
        await page.locator(`[data-object="${id}"] .model-content`).innerHTML(),
      );
      await page.screenshot({ path: join(evidence, `${id}-${direction}.png`) });
    }
    check(
      new Set(views).size === 4,
      `${id}: four distinct projected geometries`,
    );
    await page
      .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
      .click();
    check(
      (await config()).elements.find((e) => e.id === id).flipX,
      `${id}: rotation composes with reflection`,
    );
  }
  await page.locator("#reset").click();
  await select("shop-2");
  check(
    (await config()).elements.find((e) => e.id === "shop-2").orientation ===
      "SE",
    "default shop faces right",
  );
  const variantGeometry = [];
  for (const [variant, name] of [
    ["generico", "Comercio"],
    ["cafeteria", "Cafetería"],
    ["panaderia", "Panadería"],
    ["floreria", "Florería"],
    ["almacen", "Almacén"],
  ]) {
    await page.locator("#shop-variant").selectOption(variant);
    check(
      (await config()).elements.find((e) => e.id === "shop-2").shopVariant ===
        variant,
      `${name}: variant control serialized`,
    );
    const views = [];
    for (const orientation of ["SE", "SO", "NE", "NO"]) {
      await page.locator(`[data-orientation-control="${orientation}"]`).click();
      const shop = page.locator('[data-object="shop-2"]');
      views.push(await shop.locator(".model-content").innerHTML());
      check(
        (await shop.getAttribute("data-orientation")) === orientation,
        `${name}: ${orientation} projected`,
      );
      if (orientation === "SE") {
        variantGeometry.push(views.at(-1));
        check(
          (await shop.locator(".model-content .awning").count()) > 0,
          `${name}: awning geometry present`,
        );
      }
      await page.screenshot({
        path: join(evidence, `shop-${variant}-${orientation}.png`),
      });
    }
    check(
      new Set(views).size === 4,
      `${name}: four distinct world projections`,
    );
  }
  check(
    new Set(variantGeometry).size === 5,
    "five geometrically distinct storefront designs",
  );
  await page.locator("#shop-variant").selectOption("generico");
  await page.locator("[data-orientation-control=SE]").click();
  const shopTransform = await page
    .locator('[data-object="shop-2"]')
    .getAttribute("transform");
  await page
    .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
    .click();
  check(
    (await config()).elements.find((e) => e.id === "shop-2").flipX,
    "shop mirror serialized",
  );
  check(
    (
      await page.locator('[data-object="shop-2"]').getAttribute("transform")
    ).includes("scale(-1 1)"),
    "shop mirror reflects around its anchor",
  );
  await page.screenshot({ path: join(evidence, "shop-reflected.png") });
  await page
    .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
    .click();
  check(
    (await page.locator('[data-object="shop-2"]').getAttribute("transform")) ===
      shopTransform,
    "shop mirror restores exact transform",
  );
  const awning = page
    .locator('[data-object="shop-2"] .model-content .awning')
    .first();
  await page.getByRole("switch", { name: "Toldo", exact: true }).click();
  check(!(await awning.isVisible()), "awning switch hides awning");
  await page.getByRole("switch", { name: "Toldo", exact: true }).click();
  check(await awning.isVisible(), "awning switch restores awning");
  for (const name of ["Cafetería", "Panadería", "Florería", "Almacén"]) {
    await page
      .getByRole("button", { name: "Añadir elemento", exact: true })
      .click();
    await page.getByRole("menuitem", { name, exact: true }).click();
    check(
      (await config()).elements.some(
        (e) => e.name === name && e.kind === "shop" && e.awning,
      ),
      `${name}: add independent awning shop`,
    );
    await menu(name, "Eliminar");
  }
  await select("shop-2");
  await page
    .getByRole("button", { name: "Elegir color: Acento", exact: true })
    .click();
  const picker = page.locator(".color-popover");
  check(
    await picker.locator(".react-colorful").isVisible(),
    "permissive color picker opens",
  );
  const saturation = picker.getByRole("slider", { name: "Color", exact: true });
  const hue = picker.getByRole("slider", { name: "Hue", exact: true });
  await hue.focus();
  await hue.press("ArrowRight");
  await page.waitForFunction(
    () => document.querySelector("#accent").value !== "#fb772a",
  );
  const afterHue = await page.locator("#accent").inputValue();
  check(afterHue !== "#fb772a", "color picker hue keyboard changes document");
  await saturation.focus();
  await saturation.press("ArrowLeft");
  await page.waitForFunction(
    (prior) => document.querySelector("#accent").value !== prior,
    afterHue,
  );
  check(
    (await page.locator("#accent").inputValue()) !== afterHue,
    "color picker saturation keyboard changes document",
  );
  const satBox = await saturation.boundingBox();
  const beforePointer = await page.locator("#accent").inputValue();
  await page.mouse.click(
    satBox.x + satBox.width * 0.4,
    satBox.y + satBox.height * 0.4,
  );
  await page.waitForFunction(
    (prior) => document.querySelector("#accent").value !== prior,
    beforePointer,
  );
  check(
    (await page.locator("#accent").inputValue()) !== afterHue,
    "color picker pointer changes document",
  );
  await page.screenshot({ path: join(evidence, "color-picker.png") });
  await picker
    .getByRole("button", { name: "Usar #fb772a", exact: true })
    .click();
  check(
    (await page.locator("#accent").inputValue()) === "#fb772a",
    "brand palette restores exact orange",
  );
  await page.keyboard.press("Escape");
  await picker.waitFor({ state: "hidden" });
  check(!(await picker.isVisible()), "color picker Escape dismisses popup");
  await page.locator("#accent").fill("#abcdef");
  check(
    (await config()).elements.find((e) => e.id === "shop-2").accent ===
      "#abcdef",
    "hex entry changes document",
  );
  await page.locator("#accent").fill("#fb772a");
  await page.locator("#reset").click();
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
      if (kind === "punto")
        check(
          (await node.locator(".model-content [data-part=head]").count()) === 1,
          `head ${orientation}: calibrated lathe geometry`,
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
  await page.getByRole("tab", { name: "Escena", exact: true }).click();
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
  const orderBeforeMove = (await config()).elements.map((e) => e.id);
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
    JSON.stringify((await config()).elements.map((e) => e.id)) ===
      JSON.stringify(orderBeforeMove),
    "canvas drag does not change manual stacking",
  );
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
  await page
    .getByRole("button", { name: "Añadir elemento", exact: true })
    .click();
  await page
    .getByRole("menuitem", { name: "Mapa · Cruce", exact: true })
    .click();
  check(
    (await config()).elements.some(
      (e) => e.kind === "map" && e.mapVariant === "cruce" && e.id !== "map-1",
    ),
    "add independent crossing map",
  );
  await page
    .getByRole("button", { name: "Añadir elemento", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Panadería", exact: true }).click();
  await page
    .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
    .click();
  await page.locator("[data-orientation-control=NO]").click();
  await select("map-1");
  await page.locator("[data-map-variant-control=compacto]").click();
  await page.locator("[data-orientation-control=NE]").click();
  await page
    .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
    .click();
  await select("bench-6");
  await page.locator("[data-orientation-control=NO]").click();
  const jsonWait = page.waitForEvent("download");
  await page.locator("#json").click();
  const actualJSON = JSON.parse(
    await readFile(await (await jsonWait).path(), "utf8"),
  );
  check(actualJSON.version === 6, "actual JSON download");
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
  check(
    (await page
      .locator("[data-shop-variant=panaderia][data-kind=shop]")
      .getAttribute("data-flip-x")) === "true",
    "standalone SVG preserves reflected store",
  );
  check(
    (
      await page
        .locator("[data-shop-variant=panaderia][data-kind=shop]")
        .getAttribute("transform")
    ).includes("scale(-1 1)"),
    "standalone SVG contains reflection geometry",
  );
  const exported = await page.evaluate(() => ({
    parts: document.querySelectorAll("[data-object]").length,
    meta: JSON.parse(document.querySelector("metadata").textContent),
    bad: document.querySelectorAll("script,.hover-outline").length,
    orientations: [...document.querySelectorAll("[data-object]")].map((e) => ({
      id: e.dataset.object,
      orientation: e.dataset.orientation,
      mapVariant: e.dataset.mapVariant,
    })),
  }));
  check(
    exported.parts === data.elements.length,
    "SVG includes added and duplicated elements",
  );
  check(exported.bad === 0, "SVG autonomous and without hover UI");
  check(
    JSON.stringify(exported.orientations.map((e) => e.id)) ===
      JSON.stringify(data.elements.map((e) => e.id)),
    "exported SVG paint order equals JSON document order",
  );
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
  const exportedMaps = await page
    .locator("[data-kind=map]")
    .evaluateAll((nodes) =>
      nodes.map((n) => ({
        id: n.dataset.object,
        variant: n.dataset.mapVariant,
      })),
    );
  for (const map of exportedMaps)
    check(
      data.elements.find((e) => e.id === map.id).mapVariant === map.variant,
      "SVG map variant equals JSON",
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
      "@media(prefers-reduced-motion:reduce){.idle,.spin-frame{animation:none!important}}",
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
  // Keep three explicit extreme configurations as visual evidence, using public controls.
  for (const mode of ["maximo", "minimo", "idle-rapido"]) {
    await page.locator("#reset").click();
    await select(mode === "idle-rapido" ? "punto-7" : "shop-2");
    const extreme = async (name, end) => {
      const control = page.getByRole("slider", { name, exact: true });
      await control.focus();
      await control.press(end ? "End" : "Home");
    };
    if (mode === "idle-rapido") {
      await extreme("Flotación · px", true);
      await extreme("Balanceo · °", true);
      await page
        .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
        .click();
      await page.getByRole("tab", { name: "Escena", exact: true }).click();
      await extreme("Duración idle · s", false);
    } else {
      await extreme("Tamaño", mode === "maximo");
      await extreme("Grosor · px", mode === "maximo");
      if (mode === "minimo") await extreme("Opacidad", false);
      await page
        .getByRole("switch", { name: "Reflejar horizontalmente", exact: true })
        .click();
    }
    const saved = await config();
    const subject = saved.elements.find(
      (e) => e.id === (mode === "idle-rapido" ? "punto-7" : "shop-2"),
    );
    check(
      mode === "idle-rapido"
        ? subject.amplitude === 30 &&
            subject.tilt === 8 &&
            subject.flipX &&
            saved.global.duration === 1
        : subject.scale === (mode === "maximo" ? 2.5 : 0.3) &&
            subject.line === (mode === "maximo" ? 4 : 0.2) &&
            subject.flipX,
      `extreme ${mode} document matches controls`,
    );
    await page.screenshot({ path: join(evidence, `extreme-${mode}.png`) });
    await writeFile(
      join(evidence, `extreme-${mode}.json`),
      JSON.stringify(saved, null, 2),
    );
  }
  await page.locator("#reset").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: join(evidence, "studio-mobile.png"),
    fullPage: true,
  });
  check(
    await page.evaluate(() => document.documentElement.scrollWidth === 390),
    "mobile no horizontal overflow",
  );
  await page
    .getByRole("button", { name: "Elegir color: Cuerpo", exact: true })
    .click();
  const mobilePicker = page.locator(".color-popover");
  await mobilePicker.waitFor({ state: "visible" });
  const pickerBox = await mobilePicker.boundingBox();
  check(
    pickerBox.x >= 0 && pickerBox.x + pickerBox.width <= 390,
    "mobile color picker stays in viewport",
  );
  await page.screenshot({
    path: join(evidence, "color-picker-mobile.png"),
    fullPage: true,
  });
  await mobilePicker
    .getByRole("button", { name: "Listo", exact: true })
    .click();
  await mobilePicker.waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page
    .getByRole("button", { name: "Comparar Punto", exact: true })
    .click();
  for (const view of [0, 1, 2]) {
    await page.locator(`[data-comparison-view="${view}"]`).click();
    await page.locator(`[data-comparison-model="${view}"]`).waitFor();
    await page.waitForFunction(
      () =>
        document.querySelectorAll("[data-measurement]").length >= 18 &&
        [...document.querySelectorAll("[data-within-tolerance]")].every(
          (n) => n.dataset.withinTolerance === "true",
        ),
    );
    check(
      (await page.locator("[data-comparison-reference] image").count()) === 1,
      `comparison ${view}: canonical sheet embedded`,
    );
    await page.screenshot({
      path: join(evidence, `comparison-side-${view}.png`),
    });
    await page.getByText("Superposición", { exact: true }).click();
    const opacity = page.getByRole("slider", { name: /Opacidad de la hoja/ });
    await opacity.focus();
    await opacity.press("Home");
    check(
      (await page
        .locator("[data-comparison-reference][opacity]")
        .getAttribute("opacity")) === "0",
      `comparison ${view}: opacity zero`,
    );
    await opacity.press("End");
    check(
      (await page
        .locator("[data-comparison-reference][opacity]")
        .getAttribute("opacity")) === "1",
      `comparison ${view}: opacity full`,
    );
    await opacity.press("Home");
    for (let step = 0; step < 50; step++) await opacity.press("ArrowRight");
    check(
      (await page
        .locator("[data-comparison-reference][opacity]")
        .getAttribute("opacity")) === "0.5",
      `comparison ${view}: translucent 50 percent overlay`,
    );
    await page.screenshot({
      path: join(evidence, `comparison-overlay-${view}.png`),
    });
    await page.getByText("Lado a lado", { exact: true }).click();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  check(
    await page
      .locator(".comparison-dialog")
      .evaluate(
        (n) =>
          n.getBoundingClientRect().width <= 390 &&
          n.scrollWidth <= n.clientWidth,
      ),
    "mobile comparison has no horizontal overflow",
  );
  await page.screenshot({ path: join(evidence, "comparison-mobile.png") });
  await page.getByRole("button", { name: "Cerrar", exact: true }).click();
  await page.locator(".comparison-dialog").waitFor({ state: "hidden" });
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
