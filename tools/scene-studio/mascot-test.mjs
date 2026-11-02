import { build } from "esbuild";
import { chromium } from "playwright-core";
import { readFile, writeFile, mkdir, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
const here = dirname(fileURLToPath(import.meta.url)),
  evidence =
    process.env.SCENE_EVIDENCE_DIR ||
    (await mkdtemp(join(tmpdir(), "punto-measurements-")));
await mkdir(evidence, { recursive: true });
const source = await readFile(
  join(here, "../../assets/mascot/_sheets/punto-vistas.png"),
);
const fixture = JSON.parse(
  await readFile(join(here, "src/mascot-reference.json"), "utf8"),
);
assert.equal(
  createHash("sha256").update(source).digest("hex"),
  fixture.sha256,
  "canonical sheet changed: remeasure source before changing tolerances",
);
const bundle = await build({
  stdin: {
    contents: 'export * from "./src/mascot-calibration.ts";',
    resolveDir: here,
  },
  bundle: true,
  format: "iife",
  globalName: "Calibration",
  write: false,
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const report = await page.evaluate(
    async (data) => {
      const image = new Image();
      image.src = data;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, image.width, image.height).data;
      const scan = (roi, predicate) => {
        let l = Infinity,
          t = Infinity,
          r = -Infinity,
          b = -Infinity;
        for (let y = roi[1]; y < roi[3]; y++)
          for (let x = roi[0]; x < roi[2]; x++) {
            const at = (y * image.width + x) * 4;
            if (predicate(...pixels.slice(at, at + 4))) {
              l = Math.min(l, x);
              t = Math.min(t, y);
              r = Math.max(r, x + 1);
              b = Math.max(b, y + 1);
            }
          }
        return [l, t, r, b];
      };
      const orange = (r, g, b, a) => a > 220 && r > 100,
        dark = (r, g, b, a) => a > 220 && r < 70 && g < 60 && b < 55,
        cream = (r, g, b, a) =>
          a > 220 && r > 170 && g > 150 && b > 130 && r - g < 50 && g - b < 50;
      const results = [];
      for (let i = 0; i < 3; i++) {
        const ref = Calibration.reference.views[i],
          svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", "-85 -5 170 185");
        svg.setAttribute("width", "340");
        svg.setAttribute("height", "370");
        svg.innerHTML =
          "<style>" +
          Calibration.comparisonStyle +
          "</style>" +
          Calibration.comparisonBody(i);
        document.body.append(svg);
        const actual = await Calibration.measureMascot(svg),
          rows = Calibration.deviations(
            Calibration.metrics(actual),
            Calibration.metrics(ref),
          );
        // Remeasure fixed ROIs on the real PNG, independently of the SVG model.
        const pixelsMeasured = {
          full: scan(ref.roi, orange),
          head: scan([ref.roi[0], 10, ref.roi[2], 386], orange),
          eyes: ref.eyes.map((box) =>
            scan([box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3], dark),
          ),
          smile: scan(ref.mouth, dark),
          seal: scan(
            [
              ref.seal[0] - 10,
              ref.seal[1] - 10,
              ref.seal[2] + 10,
              ref.seal[3] + 10,
            ],
            cream,
          ),
        };
        const checks = [
          ["full", pixelsMeasured.full, ref.full],
          ["head", pixelsMeasured.head, ref.head],
          ["smile", pixelsMeasured.smile, ref.smile],
          ["seal", pixelsMeasured.seal, ref.seal],
          ...pixelsMeasured.eyes.map((b, k) => ["eye" + k, b, ref.eyes[k]]),
        ];
        // Negative controls operate on rendered geometry. A fixed-value assertion cannot pass them.
        const head = svg.querySelector("[data-part=head]");
        head.setAttribute("transform", "scale(1.15)");
        const altered = Calibration.deviations(
          Calibration.metrics(await Calibration.measureMascot(svg)),
          Calibration.metrics(ref),
        );
        head.removeAttribute("transform");
        results.push({
          view: ref.name,
          boxes: actual,
          rows,
          pixelChecks: checks,
          eyeCount: actual.eyes.length,
          expectedEyes: ref.eyes.length,
          negativeControlDetected: altered.some((r) => r.error > 0.05),
        });
        svg.remove();
      }
      return results;
    },
    "data:image/png;base64," + source.toString("base64"),
  );
  let count = 1;
  for (const v of report) {
    for (const [part, actual, target] of v.pixelChecks) {
      assert.deepEqual(
        actual,
        target,
        `${v.view} ${part}: raster landmark remeasurement`,
      );
      count++;
    }
    assert.equal(v.eyeCount, v.expectedEyes, `${v.view}: visible eye count`);
    count++;
    for (const row of v.rows) {
      assert.ok(
        row.error <= 0.05,
        `${v.view} ${row.name}: ${(row.error * 100).toFixed(2)}% exceeds 5%`,
      );
      count++;
    }
    assert.ok(
      v.negativeControlDetected,
      `${v.view}: scaled head must fail tolerance`,
    );
    count++;
  }
  await writeFile(
    join(evidence, "mascot-measurements.json"),
    JSON.stringify(
      { checks: count, sourceSHA256: fixture.sha256, tolerance: 0.05, report },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      mascotChecks: count,
      maxRelativeError: Math.max(
        ...report.flatMap((v) => v.rows.map((r) => r.error)),
      ),
      evidence,
    }),
  );
} finally {
  await browser.close();
}
