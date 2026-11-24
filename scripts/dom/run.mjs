#!/usr/bin/env node
/**
 * jsdom suite: select behaviour, fields, async validation, remote pagination,
 * RTL, uploads, teardown, and the select-only / file-only subset bundles.
 * Runs through `npm test`; requires `npm run build` output for subset checks
 * (scripts/test.mjs builds first).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fullSource = fs.readFileSync(path.join(root, 'zidan-form.js'), 'utf8');
const demoSource = () => fs.readFileSync(path.join(root, 'demo.js'), 'utf8');
const labSource = () => fs.readFileSync(path.join(root, 'lab.js'), 'utf8');
const playgroundSource = () => fs.readFileSync(path.join(root, 'playground.js'), 'utf8');
const navSource = () => fs.readFileSync(path.join(root, 'nav.js'), 'utf8');
const selectSource = () => fs.readFileSync(path.join(root, 'dist/select/zidan-select.js'), 'utf8');
const fileSource = () => fs.readFileSync(path.join(root, 'dist/file/zidan-file.js'), 'utf8');
const minSelectSource = () => fs.readFileSync(path.join(root, 'dist/select/zidan-select.min.js'), 'utf8');
const minFileSource = () => fs.readFileSync(path.join(root, 'dist/file/zidan-file.min.js'), 'utf8');

function boot(body, source = fullSource, { dir = 'ltr' } = {}) {
  const dom = new JSDOM(`<!doctype html><html dir="${dir}"><body>${body}</body></html>`, {
    runScripts: 'dangerously',
    url: 'https://zidan.test/'
  });
  installDataTransfer(dom.window);
  dom.window.eval(source);
  return dom.window;
}

/* jsdom has no DataTransfer; the library needs it to assign input.files */
function installDataTransfer(window) {
  class DataTransfer {
    constructor() {
      this._files = [];
      this.items = { add: (file) => { this._files.push(file); } };
    }
    get files() {
      const list = this._files.slice();
      list.item = (index) => list[index] || null;
      return list;
    }
  }
  window.DataTransfer = DataTransfer;
  Object.defineProperty(window.HTMLInputElement.prototype, 'files', {
    configurable: true,
    get() { return this.__zsFiles || []; },
    set(value) { this.__zsFiles = Array.prototype.slice.call(value); }
  });
}

const wait = (ms = 12) => new Promise((resolve) => setTimeout(resolve, ms));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function fileInput(window, id) {
  return window.document.getElementById(id);
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

/* ---------------- select core ---------------- */

test('select opens, renders options and selects a value', () => {
  const window = boot('<select id="s" data-zidan-select><option value="a">Alpha</option><option value="b" disabled>Beta</option></select>');
  const select = window.zidanSelect('#s', { layout: 'classic-clean' });
  select.open();
  assert.equal(select.isOpen(), true);
  assert.equal(select.dropdown.getAttribute('role'), 'listbox');
  const option = select.dropdown.querySelector('[data-zs-option="0"]');
  option.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(select.getValue(), 'a');
  assert.equal(select.isOpen(), false);
  select.destroy();
});

test('select multi value and clear', () => {
  const window = boot('<select id="s" multiple><option value="a">A</option><option value="b">B</option></select>');
  const select = window.zidanSelect('#s');
  select.setValue(['a', 'b']);
  assert.deepEqual(Array.from(select.getValue()), ['a', 'b']);
  select.clear();
  assert.equal(select.getValue().length, 0);
  select.destroy();
});

test('a JS label replaces the author label instead of duplicating it', () => {
  const window = boot('<label class="field-label" for="s">Movie</label><select id="s"><option>A</option></select>');
  const authorLabel = window.document.querySelector('.field-label');
  const select = window.zidanSelect('#s', { label: 'Movie' });

  assert.equal(authorLabel.getAttribute('data-zs-hidden-label'), 'true');
  const visible = Array.from(window.document.querySelectorAll('label'))
    .filter(el => !el.hidden && el.textContent.trim() === 'Movie');
  assert.equal(visible.length, 1, 'the page should show the label once');

  select.destroy();
  assert.equal(authorLabel.getAttribute('data-zs-hidden-label'), null);
  assert.equal(authorLabel.hidden, false);
});

test('phone country options show the code once (ISO + dial)', () => {
  const window = boot('<input id="p" type="tel" data-zidan-phone="true" data-zidan-phone-country="GB">');
  const field = window.zidanField('#p');
  const select = window.document.querySelector('.zs-phone-country');
  assert.ok(select, 'the country selector should render');
  for (const option of Array.from(select.options)) {
    const iso = option.value;
    const hits = option.textContent.match(new RegExp('\\b' + iso + '\\b', 'g')) || [];
    assert.equal(hits.length, 1, iso + ' option repeats its code: "' + option.textContent + '"');
  }
  assert.equal(select.options[Array.from(select.options).findIndex(o => o.value === 'GB')].textContent, 'GB +44');
  field.destroy();
});

/* ---------------- async validation ---------------- */

test('async validation: pending state, success, failure and events', async () => {
  const window = boot('<form><input id="email" type="email"></form>');
  const input = window.document.getElementById('email');
  let release;
  const field = window.zidanField(input, {
    validate: () => new Promise((resolve) => { release = resolve; }),
    showValidState: true
  });
  const events = [];
  field.root.addEventListener('zidan:async-validation', (event) => events.push(event.detail));

  const outcome = field.validate();
  assert.equal(typeof outcome.then, 'function');
  assert.equal(field.pending, true);
  assert.equal(input.getAttribute('aria-busy'), 'true');
  assert.ok(field.root.classList.contains('zs-field--pending'));
  assert.equal(field.root.getAttribute('data-zs-validation'), 'pending');

  release('Already registered.');
  assert.equal(await outcome, false);
  assert.equal(field.pending, false);
  assert.equal(input.hasAttribute('aria-busy'), false);
  assert.equal(field.errorMessage, 'Already registered.');
  assert.equal(field.root.classList.contains('zs-field--invalid'), true);
  assert.equal(events.length, 1);
  assert.equal(events[0].valid, false);

  field.opts.validate = () => Promise.resolve(true);
  assert.equal(await field.validate(), true);
  assert.equal(field.errorMessage, null);
  assert.equal(field.validation, 'valid');
  field.destroy();
});

test('async validation: stale results are ignored and rejection shows its message', async () => {
  const window = boot('<input id="name">');
  const field = window.zidanField(window.document.getElementById('name'), { validate: () => Promise.resolve(true) });
  const first = deferred();
  const second = deferred();
  let call = 0;
  field.opts.validate = () => (++call === 1 ? first.promise : second.promise);

  const firstRun = field.validate();
  const secondRun = field.validate();
  first.resolve('stale error');
  assert.equal(await firstRun, false);
  assert.equal(field.pending, true);
  assert.equal(field.errorMessage, null);
  second.resolve(true);
  assert.equal(await secondRun, true);
  assert.equal(field.errorMessage, null);

  field.opts.validate = () => Promise.reject(new Error('Network down'));
  assert.equal(await field.validate(), false);
  assert.equal(field.errorMessage, 'Network down');
  field.destroy();
});

test('async validation: destroy aborts and settles safely', async () => {
  const window = boot('<input id="name">');
  const field = window.zidanField(window.document.getElementById('name'), {
    validate: () => new Promise((resolve) => setTimeout(() => resolve('late'), 10))
  });
  const pending = field.validate();
  field.destroy();
  assert.equal(await pending, false);
  assert.equal(field.destroyed, true);
});

test('async validation applies to checkbox and file fields', async () => {
  const window = boot('<input id="agree" type="checkbox"><input id="docs" type="file">');
  const checkbox = window.zidanField(window.document.getElementById('agree'), {
    validate: (checked) => Promise.resolve(checked ? true : 'Please accept')
  });
  assert.equal(await checkbox.validate(), false);
  checkbox.setChecked(true);
  assert.equal(await checkbox.validate(), true);
  checkbox.destroy();

  const file = window.zidanField(fileInput(window, 'docs'), {
    validate: (files) => Promise.resolve(files.length ? true : 'Choose a file')
  });
  assert.equal(await file.validate(), false);
  assert.equal(file.errorMessage, 'Choose a file');
  file.destroy();
});

test('uploadAll waits for an async rule before uploading', async () => {
  const window = boot('<input id="docs" type="file" multiple>');
  const input = fileInput(window, 'docs');
  const gate = deferred();
  let uploads = 0;
  const field = window.zidanField(input, {
    validate: () => gate.promise,
    uploadHandler: (file, context) => {
      uploads += 1;
      context.complete({ url: 'https://cdn.test/doc.pdf' });
    }
  });
  field.addFiles([new window.File(['x'], 'doc.pdf', { type: 'application/pdf' })]);
  const outcome = field.uploadAll();
  assert.equal(typeof outcome.then, 'function');
  await wait(0);
  assert.equal(uploads, 0);
  gate.resolve(true);
  assert.equal(await outcome, true);
  await wait(0);
  assert.equal(uploads, 1);
  field.destroy();
});

/* ---------------- remote pagination ---------------- */

test('pagination: first page, load more, footer and cache', async () => {
  const window = boot('<select id="remote"><option value="">Pick</option></select>');
  const all = Array.from({ length: 25 }, (_, i) => ({ value: 'v' + i, label: 'Item ' + i }));
  const calls = [];
  const select = window.zidanSelect('#remote', {
    mode: 'combobox',
    fetchPageSize: 10,
    fetchOptions: (query, signal, context) => {
      calls.push({ query, page: context.page, append: context.append });
      return new Promise((resolve) => {
        const start = context.page * context.pageSize;
        setTimeout(() => resolve({
          items: all.slice(start, start + context.pageSize),
          hasMore: start + context.pageSize < all.length
        }), 5);
      });
    }
  });
  select.open();
  await wait(20);
  assert.equal(select.asyncItems.length, 10);
  assert.equal(select.hasMoreResults(), true);
  assert.equal(select.dropdown.querySelectorAll('.zs-more').length, 1);
  assert.deepEqual(calls[0], { query: '', page: 0, append: false });

  await select.loadMore();
  assert.equal(select.asyncItems.length, 20);
  assert.equal(select.asyncPage, 1);
  assert.deepEqual(calls[1], { query: '', page: 1, append: true });

  const before = calls.length;
  select.close();
  select.open();
  await wait(20);
  assert.equal(calls.length, before, 'reopening keeps the loaded pages without refetching');
  assert.equal(select.asyncItems.length, 20);
  assert.equal(select.asyncPage, 1);

  select.clearCache();
  select.close();
  select.refreshOptions();
  select.open();
  await wait(20);
  assert.equal(calls.length, before + 1, 'refreshOptions forces a page-0 refetch');
  assert.equal(select.asyncItems.length, 10);
  select.destroy();
});

test('pagination: closing during a fetch aborts it and reopening refetches', async () => {
  const window = boot('<select id="remote"></select>');
  let calls = 0;
  let aborted = 0;
  const select = window.zidanSelect('#remote', {
    mode: 'combobox',
    fetchOptions: (query, signal) => {
      calls += 1;
      return new Promise((resolve) => {
        const timer = setTimeout(() => resolve({ items: [{ value: 'v' + calls, label: 'V' + calls }] }), 30);
        if (signal) signal.addEventListener('abort', () => { aborted += 1; clearTimeout(timer); }, { once: true });
      });
    }
  });
  select.open();
  select.close();
  assert.equal(aborted, 1);
  select.open();
  await wait(50);
  assert.equal(calls, 2);
  assert.equal(select.asyncItems.length, 1);
  select.destroy();
});

test('pagination: query change resets to page 0 and scroll loads more', async () => {
  const window = boot('<select id="remote"></select>');
  const calls = [];
  const select = window.zidanSelect('#remote', {
    mode: 'combobox',
    debounce: 0,
    fetchPageSize: 2,
    fetchOptions: (query, signal, context) => {
      calls.push(context.page + ':' + query);
      return {
        items: [{ value: query + context.page, label: query + ' ' + context.page }],
        hasMore: context.page < 1
      };
    }
  });
  select.open();
  await wait();
  assert.equal(select.asyncPage, 0);
  assert.equal(select.hasMore, true);

  select.dropdown.dispatchEvent(new window.Event('scroll'));
  await wait();
  assert.equal(select.asyncPage, 1, 'scroll near the end triggers loadMore');

  select.input.value = 'ab';
  select.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  await wait();
  assert.equal(select.asyncPage, 0);
  assert.equal(calls[calls.length - 1], '0:ab');
  select.destroy();
});

test('declarative fetchUrl builds the request and maps the response', async () => {
  const window = boot('<select id="api"></select>');
  const requests = [];
  window.fetch = (url, init) => {
    requests.push({ url: String(url), init });
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({
        products: [{ id: 1, title: 'Phone' }, { id: 2, title: 'Laptop' }],
        total: 4
      })
    });
  };

  const select = window.zidanSelect('#api', {
    mode: 'combobox',
    fetchUrl: 'https://api.test/products',
    fetchItemsPath: 'products',
    fetchTotalPath: 'total',
    fetchSkipParam: 'skip',
    fetchPageSize: 2
  });

  select.open();
  await wait(20);

  assert.equal(requests.length, 1);
  assert.ok(requests[0].url.startsWith('https://api.test/products?'), 'fetchUrl is the request base');
  assert.ok(requests[0].url.includes('q='), 'sends the query parameter');
  assert.ok(requests[0].url.includes('limit=2'), 'sends fetchPageSize as limit');
  assert.ok(requests[0].url.includes('skip=0'), 'sends skip instead of page when fetchSkipParam is set');
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.headers.Accept, 'application/json');
  assert.equal(JSON.stringify(select.asyncItems.map(item => [item.value, item.label])), '[["1","Phone"],["2","Laptop"]]');
  assert.equal(select.hasMoreResults(), true, 'total 4 with a page of 2 leaves more rows');

  await select.loadMore();
  assert.equal(requests.length, 2);
  assert.ok(requests[1].url.includes('skip=2'), 'the second page skips the first page');
  assert.equal(select.hasMoreResults(), false, 'the last page clears hasMore');
  select.destroy();
});

test('declarative fetchUrl reports HTTP failures without emptying the list', async () => {
  const window = boot('<select id="api"></select>');
  let status = 200;
  window.fetch = () => Promise.resolve({
    ok: status === 200,
    status: status,
    statusText: 'Service Unavailable',
    json: () => Promise.resolve({ items: [{ value: 'a', label: 'A' }], hasMore: false })
  });
  const select = window.zidanSelect('#api', { mode: 'combobox', fetchUrl: 'https://api.test/rows' });
  select.open();
  await wait(20);
  assert.equal(select.asyncItems.length, 1);

  status = 503;
  select.refreshOptions();
  await wait(20);
  assert.ok(select.error && /503/.test(select.error.message), 'the failure surfaces the HTTP status');

  status = 200;
  select.refreshOptions();
  await wait(20);
  assert.equal(select.error, null, 'a later success clears the error');
  assert.equal(select.asyncItems.length, 1, 'the retry repopulates the list');
  select.destroy();
});

test('pagination: page errors keep the loaded list and allow retry', async () => {
  const window = boot('<select id="remote"></select>');
  let failNext = false;
  const select = window.zidanSelect('#remote', {
    mode: 'combobox',
    fetchPageSize: 2,
    fetchOptions: (query, signal, context) => {
      if (context.page === 0) return { items: [{ value: 'a', label: 'A' }], hasMore: true };
      if (failNext) {
        failNext = false;
        return Promise.reject(new Error('Page failed'));
      }
      return { items: [{ value: 'b', label: 'B' }], hasMore: false };
    }
  });
  select.open();
  await wait();
  failNext = true;
  await select.loadMore();
  assert.equal(select.asyncItems.length, 1);
  assert.equal(select.loadMoreError, 'Page failed');
  assert.equal(select.dropdown.querySelector('.zs-more').textContent, 'Page failed');

  select.dropdown.querySelector('.zs-more').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait();
  assert.equal(select.asyncItems.length, 2);
  assert.equal(select.hasMore, false);
  select.destroy();
});

test('pagination: initial fetch errors render a retryable state', async () => {
  const window = boot('<select id="remote"></select>');
  let fail = true;
  const select = window.zidanSelect('#remote', {
    mode: 'combobox',
    fetchOptions: () => (fail ? Promise.reject(new Error('Offline')) : { items: [{ value: 'a', label: 'A' }] })
  });
  select.open();
  await wait();
  assert.equal(select.error.message, 'Offline');
  assert.equal(select.getAsyncState().error, 'Offline');
  assert.match(select.dropdown.textContent, /Offline/);
  fail = false;
  await select.refreshOptions();
  assert.equal(select.error, null);
  assert.equal(select.getAsyncState().error, null);
  assert.equal(select.asyncItems.length, 1);
  select.destroy();
});

/* ---------------- uploads ---------------- */

test('file upload: custom uploader, progress and cancel', async () => {
  const window = boot('<input id="docs" type="file">');
  const input = fileInput(window, 'docs');
  const field = window.zidanField(input, {
    uploadHandler: (file, context) => {
      context.onProgress(40);
      setTimeout(() => context.complete({ url: 'https://cdn.test/a.pdf' }), 5);
    }
  });
  field.addFiles([new window.File(['data'], 'a.pdf', { type: 'application/pdf' })]);
  assert.equal(field.getFiles().length, 1);
  const pending = field.uploadAll();
  await wait(15);
  const state = field.getUploadState()[0];
  assert.equal(state.status, 'done');
  assert.equal(state.progress, 100);
  assert.equal(pending, field);
  field.destroy();
});

/* ---------------- RTL ---------------- */

test('RTL: component roots follow dir and range ticks use logical positions', () => {
  const window = boot('<div id="wrap"><select id="s"></select><input id="r" type="range" min="0" max="100" value="50"></div>', fullSource, { dir: 'rtl' });
  const select = window.zidanSelect('#s');
  assert.equal(select.root.getAttribute('dir'), 'rtl');
  const range = window.zidanField(window.document.getElementById('r'), { rangeFormat: '%s', rangeTicks: [0, 50, 100] });
  assert.equal(range.root.getAttribute('dir'), 'rtl');
  const tick = range.root.querySelector('.zs-range-tick');
  assert.ok(tick, 'ticks rendered');
  assert.match(tick.getAttribute('style') || '', /--zs-range-tick-pct/);
  assert.ok(!/left:/.test(tick.getAttribute('style') || ''), 'no physical left offset on ticks');
  select.destroy();
  range.destroy();
});

test('range: labeled endpoint ticks replace the min/max scale instead of repeating it', () => {
  const window = boot('<input id="r" type="range" min="0" max="1000" step="50" value="400">');
  const field = window.zidanField(window.document.getElementById('r'), {
    rangeTicks: [0, 250, 500, 750, 1000],
    rangeTickLabels: true,
    rangeFormat: (value) => '€' + Number(value).toLocaleString('en-US')
  });
  const ticks = Array.from(field.rangeTicksEl.querySelectorAll('.zs-range-tick'));
  assert.equal(ticks.length, 5);
  assert.equal(ticks[0].textContent, '€0');
  assert.equal(ticks[4].textContent, '€1,000');
  assert.ok(ticks[0].classList.contains('zs-range-tick--start'));
  assert.ok(ticks[4].classList.contains('zs-range-tick--end'));
  const scale = field.rangeScale;
  assert.ok(scale.classList.contains('zs-range-scale--hidden'), 'min/max scale is replaced, not repeated');

  field.rangeTicksOption = 0;
  field._syncRange('400');
  assert.equal(field.rangeTicksEl.children.length, 0, 'stale ticks are cleared');
  assert.ok(!scale.classList.contains('zs-range-scale--hidden'), 'scale returns when ticks are removed');
  field.destroy();
});

test('range: bubble mode/position, fill, custom ends and tick parsing', () => {
  const window = boot('<input id="r" type="range" min="0" max="30" step="1" value="5"\n    data-zidan-range-bubble-mode="active" data-zidan-range-bubble-position="bottom"\n    data-zidan-range-fill="false" data-zidan-range-min-label="Low"\n    data-zidan-range-max-label="High" data-zidan-range-ticks="0,10,20,30"\n    data-zidan-range-tick-labels="true"><input id="j" type="range" min="0" max="30" value="5" data-zidan-range-ticks="[5,15,25]">');
  const field = window.zidanField('#r');
  assert.ok(field.range.classList.contains('zs-range--bubble-active'));
  assert.ok(field.range.classList.contains('zs-range--bubble-bottom'));
  assert.ok(field.range.classList.contains('zs-range--fill-off'));
  assert.ok(field.range.classList.contains('zs-range--no-bubble') === false);
  const ticks = Array.from(field.rangeTicksEl.querySelectorAll('.zs-range-tick'));
  assert.deepEqual(ticks.map(t => t.textContent), ['0', '10', '20', '30'], 'comma list ticks parsed from the attribute');
  const json = window.zidanField('#j');
  assert.equal(json.rangeTicksEl.querySelectorAll('.zs-range-tick').length, 3, 'JSON array ticks parsed from the attribute');
  field.destroy();
  json.destroy();
});

test('range: custom scale ends, formatted aria value and no-bubble mode', () => {
  const window = boot('<input id="r" type="range" min="0" max="10" value="4"><input id="q" type="range" min="0" max="10" value="4"><input id="x" type="range" min="0" max="10" value="4">');
  const field = window.zidanField(window.document.getElementById('r'), {
    rangeMinLabel: 'Low',
    rangeMaxLabel: 'High',
    rangeFormat: (value) => value + ' days'
  });
  assert.equal(field.rangeScale.firstChild.textContent, 'Low');
  assert.equal(field.rangeScale.lastChild.textContent, 'High');
  assert.equal(field.el.getAttribute('aria-valuetext'), '4 days');
  assert.ok(!field.range.classList.contains('zs-range--no-bubble'));
  field.destroy();
  assert.equal(field.el.getAttribute('aria-valuetext'), null, 'destroy restores native semantics');
  const again = window.zidanField(window.document.getElementById('r'));

  const quiet = window.zidanField(window.document.getElementById('q'), { rangeBubbleMode: 'never' });
  assert.equal(quiet.rangeBubble, null, 'never removes the bubble');
  assert.ok(quiet.range.classList.contains('zs-range--no-bubble'));

  assert.doesNotThrow(() => window.zidanField(window.document.getElementById('x'), { output: '###' }), 'a bad output selector must not break init');
  again.destroy();
  quiet.destroy();
});

test('range: the output mirrors the formatted value', () => {
  const window = boot('<input id="r" type="range" min="0" max="1000" step="50" value="400"><output id="out"></output>');
  const field = window.zidanField(window.document.getElementById('r'), {
    output: '#out',
    rangeFormat: (value) => '€' + Number(value).toLocaleString('en-US')
  });
  const out = window.document.getElementById('out');
  assert.equal(out.textContent, '€400');
  field.setValue(750);
  assert.equal(out.textContent, '€750');
  const bubble = field.range.querySelector('.zs-range-bubble');
  assert.ok(!bubble.classList.contains('zs-range-bubble--start'));
  assert.ok(!bubble.classList.contains('zs-range-bubble--end'));
  field.setValue(0);
  assert.ok(bubble.classList.contains('zs-range-bubble--start'), 'bubble stays inside the track at min');
  field.setValue(1000);
  assert.ok(bubble.classList.contains('zs-range-bubble--end'), 'bubble stays inside the track at max');
  field.destroy();
});

/* ---------------- subset builds ---------------- */

/* ---------------- regression fixes ---------------- */

test('radio group destroy keeps the author fieldset and radios', () => {
  const window = boot('<form><fieldset id="rg" data-zidan="radio-group"><label><input type="radio" name="p" value="a" checked> A</label><label><input type="radio" name="p" value="b"> B</label></fieldset></form>');
  const group = window.zidanField('#rg');
  assert.equal(group.el, window.document.getElementById('rg'));
  group.destroy();
  assert.ok(window.document.getElementById('rg'), 'the fieldset must stay in the document');
  assert.equal(window.document.querySelectorAll('input[type="radio"]').length, 2);
  assert.equal(group.el.classList.contains('zs-radio-group'), false, 'enhancement classes are removed');
});

test('a single radio resolves its fieldset instead of destroying the input', () => {
  const window = boot('<form><fieldset id="rg"><label><input id="r" type="radio" name="p" value="a" data-zidan> A</label></fieldset></form>');
  const group = window.zidanField('#r');
  assert.equal(group.el, window.document.getElementById('rg'));
  group.destroy();
  assert.ok(window.document.getElementById('r'), 'the radio must stay in the document');
});

test('JS required on a select blocks the form and mirrors to the native control', () => {
  const window = boot('<form><select id="s" data-zidan-select><option value="">Pick</option><option value="a">A</option></select></form>');
  const select = window.zidanSelect('#s', { required: true });
  assert.equal(select.native.required, true);
  assert.equal(window.document.querySelector('form').checkValidity(), false);
  assert.equal(select.input.getAttribute('aria-required'), 'true');
  select.setValue('a');
  assert.equal(window.document.querySelector('form').checkValidity(), true);
  select.destroy();
  assert.equal(select.native.required, false, 'destroy removes the mirrored required attribute');
});

test('tags listbox announces that it is multi-selectable', () => {
  const window = boot('<select id="t" multiple data-zidan-select="tags"><option value="js">JS</option></select>');
  const select = window.zidanSelect('#t');
  assert.equal(select.dropdown.getAttribute('aria-multiselectable'), 'true');
  select.destroy();
});

test('Space opens a closed select', () => {
  const window = boot('<select id="s" data-zidan-select><option value="a">A</option></select>');
  const select = window.zidanSelect('#s');
  select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  assert.equal(select.isOpen(), true);
  select.destroy();
});

test('destroy restores the author aria-describedby instead of leaving stale ids', () => {
  const window = boot('<div><p id="author">Help</p><input id="a" data-zidan="input" data-zidan-hint="Extra" aria-describedby="author"></div>');
  const field = window.zidanField('#a');
  assert.equal(field.el.getAttribute('aria-describedby'), 'author a-hint');
  field.setError('Bad value');
  field.destroy();
  assert.equal(field.el.getAttribute('aria-describedby'), 'author');
});

test('checkbox hint adds to, and destroy restores, the author aria-describedby', () => {
  const window = boot('<div><p id="author">Help</p><label><input id="c" type="checkbox" data-zidan="checkbox" data-zidan-hint="Extra" aria-describedby="author"> C</label></div>');
  const field = window.zidanField('#c');
  assert.equal(field.el.getAttribute('aria-describedby'), 'author c-hint');
  field.destroy();
  assert.equal(field.el.getAttribute('aria-describedby'), 'author');
});

test('file list re-renders do not accumulate per-item listeners', () => {
  const window = boot('<input id="f" type="file" multiple data-zidan="file">');
  const field = window.zidanField('#f');
  field.addFiles([new window.File(['x'], 'a.txt'), new window.File(['y'], 'b.txt')]);
  const before = field._listeners.length;
  field._render();
  field._render();
  assert.equal(field._listeners.length, before);
  field.destroy();
});

/* ---------------- subset builds ---------------- */

test('select-only build: select, pagination and independent fields', async () => {
  const window = boot('<select id="s"><option value="a">A</option><option value="b">B</option></select>', selectSource());
  assert.equal(typeof window.zidanSelect, 'function');
  assert.equal(typeof window.zidanField, 'undefined');
  const select = window.zidanSelect('#s', { mode: 'combobox', fetchPageSize: 2, fetchOptions: () => ({ items: [{ value: 'x', label: 'X' }], hasMore: true }) });
  select.open();
  await wait();
  assert.equal(select.asyncItems.length, 1);
  assert.equal(select.hasMore, true);
  select.setValue('b');
  assert.equal(select.getValue(), 'b');
  select.destroy();
});

test('file-only build: async validation and uploads work without select code', async () => {
  const window = boot('<input id="docs" type="file">', fileSource());
  assert.equal(typeof window.zidanField, 'function');
  assert.equal(typeof window.zidanSelect, 'undefined');
  const input = fileInput(window, 'docs');
  let uploads = 0;
  const field = window.zidanField(input, {
    validate: (files) => Promise.resolve(files.length ? true : 'Choose a file'),
    uploadHandler: (file, context) => { uploads += 1; context.complete({}); }
  });
  assert.equal(await field.validate(), false);
  field.addFiles([new window.File(['x'], 'x.txt')]);
  assert.equal(await field.validate(), true);
  await field.uploadAll();
  assert.equal(uploads, 1);
  field.destroy();
});

test('minified select and file bundles behave like the full build', async () => {
  const selectWindow = boot('<select id="s"><option value="a">A</option></select>', minSelectSource());
  const select = selectWindow.zidanSelect('#s');
  select.setValue('a');
  assert.equal(select.getValue(), 'a');
  select.destroy();

  const fileWindow = boot('<input id="docs" type="file">', minFileSource());
  const field = fileWindow.zidanField(fileInput(fileWindow, 'docs'), {
    validate: (files) => Promise.resolve(files.length ? true : 'Choose a file')
  });
  assert.equal(await field.validate(), false);
  field.addFiles([new fileWindow.File(['x'], 'x.txt')]);
  assert.equal(await field.validate(), true);
  field.destroy();
});

/* ---------------- documentation ---------------- */

test('cookbook: the complete static page enhances every control', async () => {
  const markdown = fs.readFileSync(path.join(root, 'docs/html-and-wordpress.md'), 'utf8');
  const pages = Array.from(markdown.matchAll(/```html\r?\n([\s\S]*?)```/g), (match) => match[1]);
  const page = pages.find((block) => block.includes('<!DOCTYPE html>') && block.includes('class="zidan-form"'));
  assert.ok(page, 'cookbook full-page example not found');

  // load the local source instead of the CDN tags
  const html = page
    .replace(/<link rel="stylesheet"[^>]*>/g, '')
    .replace(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/zidan-select@[^"]*"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://zidan.test/' });
  installDataTransfer(dom.window);
  dom.window.eval(fullSource);
  await wait(30);

  const doc = dom.window.document;
  assert.ok(doc.getElementById('country').__zidanSelect, 'cookbook select not enhanced');
  for (const id of ['email', 'phone', 'guests', 'budget', 'message', 'docs']) {
    assert.ok(doc.getElementById(id).__zidanField, 'cookbook field #' + id + ' not enhanced');
  }
  assert.ok(doc.querySelector('input[name="news"]').__zidanField, 'cookbook switch not enhanced');
  assert.ok(doc.querySelector('fieldset[data-zidan="radio-group"]').__zidanField, 'cookbook radio group not enhanced');
});

test('shopify demo: the product page enhances every control', async () => {
  const page = fs.readFileSync(path.join(root, 'shopify.html'), 'utf8');
  const html = page
    .replace(/<link rel="stylesheet"[^>]*>/g, '')
    .replace(/<script src="zidan-form\.js"><\/script>/, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://zidan.test/shopify.html' });
  installDataTransfer(dom.window);
  dom.window.eval(fullSource);
  await wait(30);

  const doc = dom.window.document;
  assert.ok(doc.getElementById('size').__zidanSelect, 'shopify size combobox not enhanced');
  assert.ok(doc.getElementById('frame').__zidanSelect, 'shopify frame select not enhanced');
  for (const id of ['quantity', 'engraving', 'artwork']) {
    assert.ok(doc.getElementById(id).__zidanField, 'shopify field #' + id + ' not enhanced');
  }
  assert.ok(doc.querySelector('fieldset[data-zidan="radio-group"]').__zidanField, 'shopify finish radios not enhanced');
  assert.ok(doc.querySelector('input[name="properties[Gift wrap]"]').__zidanField, 'shopify gift wrap not enhanced');
});

/* ---------------- option regressions ---------------- */

test('a preset validation state survives construction and update()', () => {
  const window = boot('<input id="e" type="email" data-zidan-validation="invalid"><input id="n" type="text">');
  const preset = window.zidanField('#e');
  assert.equal(preset.getValidation(), 'invalid');
  assert.equal(window.document.getElementById('e').getAttribute('aria-invalid'), 'true');

  const manual = window.zidanField('#n');
  manual.setValidation('invalid');
  manual.update();
  assert.equal(manual.getValidation(), 'invalid', 'update() must keep a manual invalid state');

  const input = window.document.getElementById('e');
  input.value = 'ada@example.com';
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(preset.getValidation(), null, 'typing clears the preset state');
});

test('a preset select validation state survives the initial value', () => {
  const window = boot('<select id="s" data-zidan-validation="invalid"><option value="a">A</option></select>');
  const select = window.zidanSelect('#s');
  assert.equal(select.root.getAttribute('data-zs-validation'), 'invalid');
  select.setValue('a');
  assert.equal(select.root.getAttribute('data-zs-validation'), null, 'a real value change clears it');
});

test('a non-searchable select is read-only and never filters', () => {
  const window = boot('<select id="s" data-zidan-select="select"><option value="a">Alpha</option><option value="b">Beta</option></select>');
  const select = window.zidanSelect('#s', { searchable: false });
  assert.equal(select.input.readOnly, true);
  select.open();
  select.input.value = 'zzz';
  select.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(select._visibleItems().length, 2, 'typing must not filter a plain select');
  assert.equal(select.dropdown.querySelectorAll('[data-zs-option]').length, 2);
});

test('tags allowFreeText=false accepts listed values only', () => {
  const window = boot('<select id="t" multiple data-zidan-select="tags" data-zidan-allow-free-text="false"><option value="html">HTML</option><option value="css">CSS</option></select>');
  const tags = window.zidanSelect('#t');
  tags.addTag('html');
  tags.addTag('css');
  tags.addTag('ruby');
  assert.deepEqual(Array.from(tags.getTags()), ['html', 'css']);
});

async function bootDemoLab() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace(/<link rel="stylesheet"[^>]*>/g, '')
    .replace(/<script src="[^"]+"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://zidan.test/', pretendToBeVisual: true });
  installDataTransfer(dom.window);
  dom.window.eval(fullSource);
  dom.window.eval(demoSource());
  dom.window.eval(labSource());
  await wait(50);
  return dom.window;
}

test('API lab: every documented option, callback and method is demonstrated', async () => {
  const window = await bootDemoLab();
  const lab = window.DemoLab;
  assert.ok(lab, 'DemoLab was not initialized');
  const missing = lab.missing();
  for (const category of Object.keys(missing)) {
    assert.deepEqual(Array.from(missing[category]), [], category + ' coverage is incomplete');
  }
  assert.equal(lab.expected.events.length, 27, 'event inventory is incomplete');
  const selectDefaults = Object.keys(window.ZidanSelect.defaults);
  assert.deepEqual(Array.from(selectDefaults.filter(name => !lab.expected.selectOptions.includes(name))), [], 'API lab inventory omits select defaults');
  const optionsDoc = fs.readFileSync(path.join(root, 'docs/options.md'), 'utf8');
  const completeObject = optionsDoc.split('### Every select option in one object')[1].split('```js')[1].split('```')[0];
  assert.deepEqual(Array.from(selectDefaults.filter(name => !completeObject.includes(name + ':'))), [], 'complete options example omits select defaults');
  for (const id of ['lab-select', 'lab-tags', 'lab-remote', 'lab-declarative', 'lab-upload', 'lab-text']) {
    const el = window.document.getElementById(id);
    assert.ok(el && (el.__zidanSelect || el.__zidanField), 'API lab control #' + id + ' was not enhanced');
  }
});

test('playground emits supported attributes and complete JavaScript options', () => {
  const html = fs.readFileSync(path.join(root, 'playground.html'), 'utf8')
    .replace(/<link rel="stylesheet"[^>]*>/g, '')
    .replace(/<script src="[^"]+"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://zidan.test/playground.html#phone', pretendToBeVisual: true });
  const { window } = dom;
  window.eval(fullSource);
  window.eval(playgroundSource());

  const phoneToggle = window.document.getElementById('pg-opt-phoneValidate');
  phoneToggle.checked = false;
  phoneToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
  let markup = window.document.getElementById('pg-html').textContent;
  assert.match(markup, /data-zidan-options="\{&quot;phone&quot;:\{&quot;validate&quot;:false\}\}"/);
  assert.doesNotMatch(markup, /data-zidan-phone-country-label/);
  assert.equal(window.document.getElementById('pg-phone').__zidanField.phone.validate, false);

  window.document.querySelector('.pg-runmode [data-mode="js"]').click();
  assert.match(window.document.getElementById('pg-js').textContent, /"validate":false/);
  assert.equal(window.document.getElementById('pg-phone').__zidanField.phone.validate, false);

  window.document.querySelector('#pg-tab-file').click();
  markup = window.document.getElementById('pg-html').textContent;
  for (const name of ['progress-template', 'uploaded-label', 'failed-label', 'cancel-label', 'retry-label']) {
    assert.doesNotMatch(markup, new RegExp('data-zidan-' + name));
    assert.match(window.document.getElementById('pg-js').textContent, new RegExp(name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) + ':'));
  }
});

test('API lab: self-tests pass and every public event is observed', async () => {
  const window = await bootDemoLab();
  const output = await window.DemoLab.runSelfTest();
  const results = Array.from(output.results);
  const failed = results.filter(result => !result.ok);
  assert.ok(results.length >= 74, 'self-test did not exercise the full public API');
  assert.deepEqual(failed.map(result => result.name + ': ' + result.message), [], 'API lab self-test failures');
  assert.deepEqual(Array.from(output.missingEvents), [], 'API lab did not observe every public event');
  for (const category of Object.keys(output.missingCoverage)) {
    assert.deepEqual(Array.from(output.missingCoverage[category]), [], category + ' self-test coverage is incomplete');
  }
});

test('shared header: mobile menu and quick theme work on every shell', () => {
  const dom = new JSDOM(`<!doctype html><html data-zs-theme="default"><body>
    <header class="site-header">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
      <nav class="header-nav" id="site-nav">
        <a href="index.html">Demo</a>
        <select id="quick-theme">
          <option value="default">Default theme</option>
          <option value="dark">Dark</option>
        </select>
      </nav>
    </header>
    <div id="select-root"></div>
    <div id="field-root"></div>
  </body></html>`, { runScripts: 'dangerously', url: 'https://zidan.test/' });
  const { window } = dom;
  const media = { matches: false, addEventListener() {} };
  window.matchMedia = () => media;
  window.ZidanSelect = { instances: [{ root: window.document.getElementById('select-root') }] };
  window.ZidanForm = { fields: [{ root: window.document.getElementById('field-root') }] };
  window.eval(navSource());
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

  const header = window.document.querySelector('.site-header');
  const toggle = window.document.querySelector('.nav-toggle');
  assert.equal(header.getAttribute('data-nav-ready'), '', 'header was not enhanced');
  assert.equal(header.getAttribute('data-nav'), 'open');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  toggle.click();
  assert.equal(header.getAttribute('data-nav'), 'collapsed');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  toggle.click();
  assert.equal(header.getAttribute('data-nav'), 'open');

  const quick = window.document.getElementById('quick-theme');
  quick.value = 'dark';
  quick.dispatchEvent(new window.Event('change'));
  assert.equal(window.document.documentElement.getAttribute('data-zs-theme'), 'dark');
  assert.equal(window.document.getElementById('select-root').getAttribute('data-zs-theme'), 'dark');
  assert.equal(window.document.getElementById('field-root').getAttribute('data-zs-theme'), 'dark');
});

/* ---------------- runner ---------------- */

export async function runDomTests() {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('ok   ' + name);
    } catch (err) {
      failures += 1;
      console.log('FAIL ' + name + ' — ' + (err && err.message ? err.message : err));
    }
  }
  return { failures, total: tests.length };
}
