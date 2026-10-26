import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const editor = await context.newPage();
  await editor.goto(pathToFileURL(`${process.cwd()}/tools/escena-isometrica.html`).href);
  assert.equal(await editor.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  assert.equal(await editor.locator('.idle').evaluate(el => getComputedStyle(el).animationName), 'none');

  const svg = await editor.evaluate(async () => {
    let blob;
    const createObjectURL = URL.createObjectURL;
    URL.createObjectURL = value => { blob = value; return createObjectURL.call(URL, value); };
    document.querySelector('#export').click();
    URL.createObjectURL = createObjectURL;
    return blob.text();
  });
  const standalone = await context.newPage();
  await standalone.goto(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
  assert.equal(await standalone.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  assert.equal(await standalone.locator('.idle').evaluate(el => getComputedStyle(el).animationName), 'none');
} finally {
  await browser.close();
}
