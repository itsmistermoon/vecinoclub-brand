// Run with chrome-devtools-axi run, with escena-isometrica.html already open.
// Exercises the public DOM and the downloadable design documents, without application internals.
console.log(JSON.stringify(await page.eval(async () => {
  const checks = [];
  const assert = (ok, label) => { if (!ok) throw Error(label); checks.push(label); };
  const $ = s => document.querySelector(s);
  const input = (container, key, value) => {
    const el = $(`${container} [data-key="${key}"]`);
    if (el.type === 'checkbox') el.checked = value; else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return el;
  };
  const reset = () => $('#reset').click();
  assert(!$('#import') && !$('#file') && !$('#preset'), 'editor: no import or preset controls');
  reset();
  for (const layer of document.querySelectorAll('[data-layer]')) {
    layer.click();
    const id = layer.dataset.layer, el = $(`[data-object="${id}"]`);
    assert(layer.getAttribute('aria-pressed') === 'true', `${id}: layer selection`);
    for (const [key, css] of [['fill', '--fill'], ['stroke', '--stroke'], ['accent', '--accent']]) {
      const control = $(`#object-controls [data-key="${key}"]`);
      if (control.parentNode.hidden) continue;
      input('#object-controls', key, '#123456');
      assert(getComputedStyle(el).getPropertyValue(css).trim() === '#123456', `${id}: ${key}`);
    }
    for (const [key, values] of [['line', [0.2, 4]], ['scale', [0.4, 1.6]], ['x', [-180, 180]], ['y', [-120, 120]], ['opacity', [0.1, 1]]]) {
      for (const value of values) {
        const previous = Number($(`#object-controls [data-key="${key}"]`).value);
        const priorMatrix = el.transform.baseVal.consolidate().matrix;
        const control = input('#object-controls', key, value);
        assert(control.labels.length === 1, `${id}: ${key} labelled ${value}`);
        if (key === 'line') assert(Number(getComputedStyle(el.querySelector('.face')).strokeWidth.replace('px','')) === value, `${id}: line ${value}`);
        else if (key === 'opacity') assert(Number(getComputedStyle(el).opacity) === value, `${id}: opacity ${value}`);
        else {
          const matrix = el.transform.baseVal.consolidate().matrix;
          if (key === 'x' || key === 'y') { const axis = key === 'x' ? 'e' : 'f'; assert(Math.abs(matrix[axis] - priorMatrix[axis] - value + previous) < 0.001, `${id}: position ${key} ${value}`); }
          assert(key !== 'scale' || Math.abs(matrix.a - value) < 0.001, `${id}: scale ${value}`);
          assert(control.parentNode.querySelector('output').value === String(value), `${id}: readout ${key} ${value}`);
        }
      }
    }
    input('#object-controls', 'visible', false);
    assert(getComputedStyle(el).display === 'none', `${id}: hidden`);
    input('#object-controls', 'visible', true);
    assert(getComputedStyle(el).display !== 'none', `${id}: visible`);
    reset();
    el.dispatchEvent(new MouseEvent('click', {bubbles:true}));
    assert(layer.getAttribute('aria-pressed') === 'true', `${id}: scene selection`);
    el.dispatchEvent(new KeyboardEvent('keydown', {key:'Enter', bubbles:true}));
    assert(layer.getAttribute('aria-pressed') === 'true', `${id}: keyboard selection`);
  }
  reset();
  for (const [key, values, target, property, suffix] of [
    ['speed', [1,12], '.idle', 'animationDuration','s'],
    ['amplitude', [0,30], '#scene', '--amplitude','px'],
    ['tilt', [0,8], '#scene', '--tilt','deg']]) {
    for (const value of values) {
      input('#global-controls', key, value);
      const css = getComputedStyle($(target));
      assert((property.startsWith('--') ? css.getPropertyValue(property).trim() : css[property]) === `${value}${suffix}`, `${key}: ${value}`);
    }
  }
  for (const value of [0.65,1.2]) {
    input('#global-controls', 'zoom', value);
    assert(Math.abs($('#composition').transform.baseVal.consolidate().matrix.a - value) < 0.001, `zoom: ${value}`);
  }
  input('#global-controls', 'background', '#123456');
  assert(getComputedStyle($('#scene')).backgroundColor === 'rgb(18, 52, 86)', 'background');
  for (const [key, selector] of [['details','.extras'],['awning','#awning'],['shadow','#pin-shadow']]) {
    for (const value of [false,true]) {
      input('#global-controls', key, value);
      assert([...document.querySelectorAll(selector)].every(el => (getComputedStyle(el).display !== 'none') === value), `${key}: ${value}`);
    }
  }
  reset();
  $('#pause').click();
  assert(getComputedStyle($('.idle')).animationPlayState === 'paused', 'pause');
  $('#pause').click();
  assert(getComputedStyle($('.idle')).animationPlayState === 'running', 'resume');
  const animation = $('.idle').getAnimations()[0];
  animation.pause();
  const duration = animation.effect.getTiming().duration;
  const transformAt = time => { animation.currentTime = time; return new DOMMatrixReadOnly(getComputedStyle($('.idle')).transform); };
  const midpoint = transformAt(duration / 2);
  assert(midpoint.f < -9, 'idle: moves through its midpoint');
  const first = transformAt(0), last = transformAt(duration), before = transformAt(duration - 1), after = transformAt(1);
  assert(Math.abs(first.f-last.f) < 0.001 && Math.abs(first.a-last.a) < 0.001, 'idle: identical loop endpoints');
  assert(Math.abs(before.f-after.f) < 0.01 && Math.abs(before.a-after.a) < 0.001, 'idle: continuous loop seam');
  animation.play();
  reset();
  // Capture real export-button blobs while retaining the normal download behavior.
  const blobs = [], originalURL = URL.createObjectURL;
  URL.createObjectURL = function(blob) { blobs.push(blob); return originalURL.call(this, blob); };
  $('#json').click(); $('#export').click();
  URL.createObjectURL = originalURL;
  const config = JSON.parse(await blobs[0].text()), exported = await blobs[1].text();
  const doc = new DOMParser().parseFromString(exported, 'image/svg+xml');
  assert(!doc.querySelector('parsererror'), 'SVG export: valid XML');
  assert(doc.documentElement.localName === 'svg' && doc.querySelectorAll('[data-object]').length === 5, 'SVG export: all scene elements');
  assert(!doc.querySelector('script,image,use,link'), 'SVG export: no script or external assets');
  assert(JSON.parse(doc.querySelector('metadata').textContent).version === config.version, 'SVG export: config metadata');
  const image = new Image();
  image.src = originalURL.call(URL, blobs[1]);
  await image.decode();
  assert(image.naturalWidth === 1000 && image.naturalHeight === 760, 'SVG export: standalone image decoded');
  URL.revokeObjectURL(image.src);
  const standalone = document.createElement('iframe');
  standalone.srcdoc = exported.replace(/^<\?xml[^>]*>\s*/, '');
  document.body.append(standalone);
  await new Promise((resolve, reject) => { standalone.onload = resolve; standalone.onerror = reject; });
  const standaloneWindow = standalone.contentWindow;
  const idleName = standaloneWindow.getComputedStyle(standalone.contentDocument.querySelector('.idle')).animationName;
  assert(idleName === (standaloneWindow.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'float'), 'SVG export: idle follows reduced-motion preference');
  standalone.remove();
  reset();
  return {passed:checks.length, checks, reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
})));
