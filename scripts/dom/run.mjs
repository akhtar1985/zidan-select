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
  assert.match(select.dropdown.textContent, /Offline/);
  fail = false;
  await select.refreshOptions();
  assert.equal(select.error, null);
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
