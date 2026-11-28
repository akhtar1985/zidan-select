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
import { registerReliabilityTests } from './reliability.mjs';

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

test('select defaults resolve the theme and mode-dependent free text', () => {
  const window = boot('<select id="combo"><option value="a">A</option></select><select id="tags" multiple data-zidan-select="tags"></select>');
  const combo = window.zidanSelect('#combo', { mode: 'combobox' });
  const tags = window.zidanSelect('#tags');

  assert.equal(window.ZidanSelect.defaults.theme, 'default');
  assert.equal(combo.opts.theme, 'default');
  assert.equal(combo.opts.allowFreeText, false);
  assert.equal(tags.opts.allowFreeText, true);
  assert.equal(tags.addTag('new'), true);
  combo.destroy();
  tags.destroy();
});

test('select framework adapters inherit scope and update Bootstrap markup', () => {
  const window = boot([
    '<div data-zs-framework="bulma">',
    '  <select id="s"><option value="a">Alpha</option></select>',
    '  <select id="tags" multiple data-zidan-select="tags"><option selected>One</option><option selected>Two</option></select>',
    '</div>',
    '<div data-zs-framework="bootstrap"><select id="bs"><option value="b">Beta</option></select></div>',
    '<select id="page-fw"><option value="a">Alpha</option></select>'
  ].join(''));
  const select = window.zidanSelect('#s');
  const tags = window.zidanSelect('#tags');
  const bootstrap = window.zidanSelect('#bs');
  tags.setValue(['One', 'Two']);

  assert.equal(bootstrap.framework, 'bootstrap');
  assert.equal(bootstrap.controlEl.classList.contains('form-control'), true);
  assert.equal(bootstrap.controlEl.classList.contains('form-select'), true);

  assert.equal(select.framework, 'bulma');
  assert.equal(select.root.getAttribute('data-zs-framework'), 'bulma');
  assert.equal(select.controlEl.classList.contains('form-control'), false);

  select.setFramework('bootstrap');
  assert.equal(select.root.getAttribute('data-zs-framework'), 'bootstrap');
  assert.equal(select.controlEl.classList.contains('form-control'), true);
  assert.equal(select.controlEl.classList.contains('form-select'), true);

  assert.equal(tags.chipsEl.querySelectorAll('.zs-chip.badge').length, 0);
  tags.setFramework('bootstrap');
  assert.equal(tags.chipsEl.querySelectorAll('.zs-chip.badge').length, 2);
  tags.setFramework('tailwind');
  assert.equal(tags.chipsEl.querySelectorAll('.zs-chip.badge').length, 0);
  assert.equal(tags.root.getAttribute('data-zs-framework'), 'tailwind');

  window.document.documentElement.setAttribute('data-zs-framework', 'foundation');
  const page = window.zidanSelect('#page-fw');
  assert.equal(page.framework, 'foundation');
  assert.equal(page.root.getAttribute('data-zs-framework'), 'foundation');

  select.destroy();
  tags.destroy();
  bootstrap.destroy();
  page.destroy();
});

test('declarative select attributes control closing, accessibility and required state', () => {
  const window = boot('<form><select id="s" data-zidan-close-on-select="false" data-zidan-aria-label="Pick a plan" data-zidan-required="true"><option value="">Pick</option><option value="a">A</option></select></form>');
  const select = window.zidanSelect('#s');

  assert.equal(select.opts.closeOnSelect, false);
  assert.equal(select.input.getAttribute('aria-label'), 'Pick a plan');
  assert.equal(select.opts.required, true);
  assert.equal(select.native.required, true);
  assert.equal(window.document.querySelector('form').checkValidity(), false);
  select.open();
  select.dropdown.querySelector('[data-zs-option="1"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(select.isOpen(), true, 'data-zidan-close-on-select=false keeps the list open');
  select.destroy();
});

test('callback exceptions reach onError with the callback name and error', () => {
  const window = boot('<select id="s"><option value="">Pick</option><option value="a">A</option></select>');
  const errors = [];
  const select = window.zidanSelect('#s', {
    onChange() { throw new Error('callback failed'); },
    onError(detail) { errors.push(detail); }
  });

  select.setValue('a');
  assert.equal(errors.length, 1);
  assert.equal(errors[0].message, 'callback failed');
  assert.equal(errors[0].callback, 'onChange');
  assert.equal(errors[0].error.message, 'callback failed');
  assert.equal(errors[0].instance, select);
  select.destroy();
});

test('ZidanSelect exposes the shared icon registry in the full build', () => {
  const window = boot('<select id="s"><option value="a">A</option></select>');
  window.ZidanSelect.registerIcon('audit-star', '<path d="M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z"/>');
  assert.ok(window.ZidanSelect.icons['audit-star'].includes('path'));
  assert.equal(window.ZidanSelect.registerIcon, window.ZidanForm.registerIcon);
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
  const loadedPages = [];
  const select = window.zidanSelect('#remote', {
    mode: 'combobox',
    fetchPageSize: 10,
    onLoadMore(detail) { loadedPages.push(detail.page); },
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
  assert.deepEqual(loadedPages, [1], 'onLoadMore receives the zero-based page index');

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

test('declarative fetch attributes set headers, params, body, credentials and omitted parameters', async () => {
  const window = boot(`<select id="api" data-zidan-fetch-url="https://api.test/rows" data-zidan-fetch-method="POST" data-zidan-fetch-headers='{"X-Tenant":"north"}' data-zidan-fetch-params='{"tenant":"north","debug":true}' data-zidan-fetch-body='{"query":"phone","page":1}' data-zidan-fetch-credentials="include" data-zidan-fetch-query-param="" data-zidan-fetch-page-param="" data-zidan-fetch-page-size-param=""></select>`);
  const requests = [];
  window.fetch = (url, init) => {
    requests.push({ url: String(url), init });
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ items: [{ value: 'a', label: 'A' }] })
    });
  };

  const select = window.zidanSelect('#api', { mode: 'combobox' });
  select.open();
  await wait(20);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, 'https://api.test/rows?tenant=north&debug=true', 'extra fetchParams merge into the URL while empty parameter names omit query, page and page size');
  assert.equal(requests[0].init.method, 'POST');
  assert.equal(requests[0].init.headers['X-Tenant'], 'north');
  assert.equal(requests[0].init.headers['Content-Type'], 'application/json', 'object bodies get a JSON content type');
  assert.equal(requests[0].init.body, '{"query":"phone","page":1}', 'fetchBody serialises objects to JSON');
  assert.equal(requests[0].init.credentials, 'include');
  select.destroy();
});

test('declarative fetchBody strings keep an explicit content type', async () => {
  const window = boot('<select id="api"></select>');
  const requests = [];
  window.fetch = (url, init) => {
    requests.push({ url: String(url), init });
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ items: [{ value: 'a', label: 'A' }] })
    });
  };

  const select = window.zidanSelect('#api', {
    mode: 'combobox',
    fetchUrl: 'https://api.test/rows',
    fetchMethod: 'PUT',
    fetchBody: 'raw=1',
    fetchHeaders: { 'Content-Type': 'text/plain' }
  });
  select.open();
  await wait(20);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, 'PUT');
  assert.equal(requests[0].init.body, 'raw=1', 'string bodies are sent unchanged');
  assert.equal(requests[0].init.headers['Content-Type'], 'text/plain', 'an explicit content type is not overwritten');
  select.destroy();
});

test('declarative fetchBody is ignored for GET requests', async () => {
  const window = boot('<select id="api"></select>');
  const requests = [];
  window.fetch = (url, init) => {
    requests.push({ url: String(url), init });
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ items: [{ value: 'a', label: 'A' }] })
    });
  };

  const select = window.zidanSelect('#api', {
    mode: 'combobox',
    fetchUrl: 'https://api.test/rows',
    fetchBody: { ignored: true },
    fetchParams: { pageSizeHint: 1 }
  });
  select.open();
  await wait(20);

  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.method, 'GET');
  assert.equal(requests[0].init.body, undefined, 'GET must not send a body');
  assert.equal(requests[0].init.headers['Content-Type'], undefined, 'GET must not claim a JSON body');
  assert.ok(requests[0].url.includes('pageSizeHint=1'), 'fetchParams still applies to GET');
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

test('file upload: AJAX request options and response paths', async () => {
  const window = boot('<input id="docs" type="file">');
  const requests = [];
  window.XMLHttpRequest = class FakeXHR {
    constructor() {
      this.upload = {};
      this.headers = {};
      this.status = 0;
      this.responseText = '';
      requests.push(this);
    }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(name, value) { this.headers[name] = value; }
    send(body) {
      this.body = body;
      this.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = 201;
      this.responseText = JSON.stringify({ data: { url: 'https://cdn.test/a.pdf' } });
      this.onload();
    }
    abort() { if (this.onabort) this.onabort(); }
  };
  const field = window.zidanField(fileInput(window, 'docs'), {
    uploadUrl: 'https://api.test/upload',
    uploadMethod: 'PUT',
    uploadParams: { folder: 'docs', tag: ['a', 'b'] },
    uploadField: 'document',
    uploadData: { token: 'secret', note: ['one', 'two'] },
    uploadHeaders: (file) => ({ 'X-File': file.name, 'X-Multi': ['a', 'b'] }),
    withCredentials: true,
    uploadTimeout: 5000,
    uploadResponsePath: 'data.url',
    autoUpload: false
  });
  field.addFiles([new window.File(['pdf'], 'a.pdf', { type: 'application/pdf' })]);
  field.uploadAll();

  const xhr = requests[0];
  assert.equal(xhr.method, 'PUT');
  assert.match(xhr.url, /^https:\/\/api\.test\/upload\?/);
  assert.match(xhr.url, /folder=docs/);
  assert.match(xhr.url, /tag=a&tag=b/);
  assert.equal(xhr.withCredentials, true);
  assert.equal(xhr.timeout, 5000);
  assert.equal(xhr.headers['X-File'], 'a.pdf');
  assert.equal(xhr.headers['X-Multi'], 'a, b');
  assert.equal(xhr.body.get('document').name, 'a.pdf');
  assert.equal(xhr.body.get('token'), 'secret');
  assert.deepEqual(xhr.body.getAll('note'), ['one', 'two']);

  const states = await field.whenUploaded();
  assert.equal(states[0].status, 'done');
  assert.equal(states[0].progress, 100);
  assert.equal(states[0].result, 'https://cdn.test/a.pdf');
  field.destroy();
});

test('file upload: concurrency, automatic retry and whenUploaded', async () => {
  const window = boot('<input id="docs" type="file" multiple>');
  const contexts = new Map();
  let active = 0;
  let maxActive = 0;
  const retries = [];
  const queued = [];
  const field = window.zidanField(fileInput(window, 'docs'), {
    uploadConcurrency: 2,
    uploadRetries: 1,
    uploadRetryDelay: 2,
    autoUpload: false,
    uploadHandler: (file, context) => {
      contexts.set(file.name, context);
      active += 1;
      maxActive = Math.max(maxActive, active);
      context.signal.addEventListener('abort', () => { active = Math.max(0, active - 1); });
    },
    onUploadQueued: (event) => queued.push(event.name),
    onUploadRetry: (event) => retries.push(event.attempt)
  });
  const finish = (name, value) => {
    active = Math.max(0, active - 1);
    contexts.get(name).complete(value);
  };
  const fail = (name, error) => {
    active = Math.max(0, active - 1);
    contexts.get(name).fail(error);
  };
  field.addFiles([
    new window.File(['a'], 'a.txt'),
    new window.File(['b'], 'b.txt'),
    new window.File(['c'], 'c.txt')
  ]);
  const bFile = field.getFiles()[1];
  field.uploadAll();
  assert.equal(active, 2);
  assert.equal(maxActive, 2);
  assert.equal(field.getUploadState()[2].status, 'queued');
  assert.deepEqual(queued, ['c.txt']);
  assert.equal(field.isUploading(), true);

  finish('a.txt', { ok: true });
  assert.equal(contexts.has('c.txt'), true);
  assert.equal(active, 2);
  fail('b.txt', { message: 'Try again', retryable: true });
  assert.equal(field.getFileState(bFile).status, 'retrying');
  finish('c.txt', { ok: true });
  const pending = field.whenUploaded();
  await wait(10);
  assert.equal(contexts.get('b.txt').signal.aborted, false);
  assert.equal(field.getFileState(bFile).attempts, 2);
  assert.deepEqual(retries, [1]);
  finish('b.txt', { ok: true });
  const states = await pending;
  assert.deepEqual(Array.from(states, (state) => state.status), ['done', 'done', 'done']);
  assert.equal(field.isUploading(), false);
  field.destroy();
});

test('file upload: selection limits, bulk removal and custom status', async () => {
  const window = boot('<input id="docs" type="file" multiple>');
  const field = window.zidanField(fileInput(window, 'docs'), {
    minFiles: 2,
    maxTotalSize: 6,
    statusFormat: (context) => context.files.length + '/' + context.total + ' bytes'
  });
  field.addFiles([new window.File(['abc'], 'a.txt'), new window.File(['def'], 'b.txt')]);
  assert.equal(field.fileError, '');
  assert.equal(field.status.textContent, '2/6 bytes');
  field.addFiles([new window.File(['ghi'], 'c.txt')]);
  assert.equal(field.getFiles().length, 3, 'files are kept, the total-size error explains why');
  assert.match(field.fileError, /exceed/);
  field.removeFiles([0, field.getFiles()[1]]);
  assert.equal(field.getFiles().length, 1);
  assert.match(field.fileError, /at least 2/);
  field.addFiles([new window.File(['xyz'], 'd.txt')]);
  assert.equal(field.getFiles().length, 2);
  assert.equal(field.fileError, '');
  field.destroy();
});

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

  field.addFiles([new window.File(['next'], 'b.pdf', { type: 'application/pdf' })]);
  field.uploadAll();
  const settled = field.whenUploaded();
  field.clear();
  assert.equal(field.getFiles().length, 0);
  assert.deepEqual(Array.from(await settled), [], 'clear settles a pending whenUploaded() promise');
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
  const window = boot('<div data-zs-framework="bulma"><select id="s"><option value="a">A</option><option value="b">B</option></select></div>', selectSource());
  assert.equal(typeof window.zidanSelect, 'function');
  assert.equal(typeof window.zidanField, 'undefined');
  assert.equal(typeof window.ZidanSelect.registerIcon, 'function');
  window.ZidanSelect.registerIcon('subset-star', '<path d="M12 2l3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z"/>');
  assert.ok(window.ZidanSelect.icons['subset-star']);
  const select = window.zidanSelect('#s', { mode: 'combobox', fetchPageSize: 2, fetchOptions: () => ({ items: [{ value: 'x', label: 'X' }], hasMore: true }) });
  assert.equal(select.framework, 'bulma');
  assert.equal(select.controlEl.classList.contains('form-control'), false);
  select.setFramework('bootstrap');
  assert.equal(select.controlEl.classList.contains('form-control'), true);
  assert.equal(select.controlEl.classList.contains('form-select'), true);
  select.open();
  await wait();
  assert.equal(select.asyncItems.length, 1);
  assert.equal(select.hasMore, true);
  select.setValue('b');
  assert.equal(select.getValue(), 'b');
  select.destroy();
});

test('file-only build: async validation and uploads work without select code', async () => {
  const window = boot('<div data-zs-framework="foundation"><input id="docs" type="file"></div>', fileSource());
  assert.equal(typeof window.zidanField, 'function');
  assert.equal(typeof window.zidanSelect, 'undefined');
  const input = fileInput(window, 'docs');
  let uploads = 0;
  const field = window.zidanField(input, {
    validate: (files) => Promise.resolve(files.length ? true : 'Choose a file'),
    uploadHandler: (file, context) => { uploads += 1; context.complete({}); }
  });
  assert.equal(field.framework, 'foundation');
  assert.equal(field.root.getAttribute('data-zs-framework'), 'foundation');
  field.setFramework('bootstrap');
  assert.equal(field.root.getAttribute('data-zs-framework'), 'bootstrap');
  assert.equal(await field.validate(), false);
  field.addFiles([new window.File(['x'], 'x.txt')]);
  assert.equal(await field.validate(), true);
  await field.uploadAll();
  assert.equal(uploads, 1);
  assert.equal(field.getFileState('x.txt').status, 'done');
  assert.equal((await field.whenUploaded())[0].status, 'done');
  field.removeFiles(['x.txt']);
  assert.equal(field.getFiles().length, 0);
  field.destroy();
});

test('minified select and file bundles behave like the full build', async () => {
  const selectWindow = boot('<div data-zs-framework="bulma"><select id="s"><option value="a">A</option></select></div>', minSelectSource());
  const select = selectWindow.zidanSelect('#s');
  assert.equal(select.framework, 'bulma');
  select.setFramework('bootstrap');
  assert.equal(select.controlEl.classList.contains('form-control'), true);
  assert.equal(select.controlEl.classList.contains('form-select'), true);
  select.setValue('a');
  assert.equal(select.getValue(), 'a');
  select.destroy();

  const fileWindow = boot('<div data-zs-framework="foundation"><input id="docs" type="file"></div>', minFileSource());
  const field = fileWindow.zidanField(fileInput(fileWindow, 'docs'), {
    validate: (files) => Promise.resolve(files.length ? true : 'Choose a file')
  });
  assert.equal(field.framework, 'foundation');
  field.setFramework('bootstrap');
  assert.equal(field.root.getAttribute('data-zs-framework'), 'bootstrap');
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
  assert.equal(lab.expected.events.length, 32, 'event inventory is incomplete');
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

test('demo framework buttons update adapter markup and clear Bootstrap classes', async () => {
  const window = await bootDemoLab();
  const doc = window.document;
  const select = doc.getElementById('tp-select').__zidanSelect;

  doc.querySelector('[data-framework="bootstrap"]').click();
  assert.equal(select.root.getAttribute('data-zs-framework'), 'bootstrap');
  assert.equal(select.controlEl.classList.contains('form-control'), true);
  assert.equal(select.controlEl.classList.contains('form-select'), true);

  doc.querySelector('[data-framework="tailwind"]').click();
  assert.equal(select.root.getAttribute('data-zs-framework'), 'tailwind');
  assert.equal(select.controlEl.classList.contains('form-control'), false);
  assert.equal(select.controlEl.classList.contains('form-select'), false);
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

  const downscale = window.document.getElementById('pg-opt-downscale');
  downscale.checked = true;
  downscale.dispatchEvent(new window.Event('change', { bubbles: true }));
  markup = window.document.getElementById('pg-html').textContent;
  assert.match(markup, /data-zidan-downscale/);
  assert.match(markup, /data-zidan-downscale-max-width="1024"/);
  assert.match(markup, /data-zidan-downscale-quality="0.85"/);
  assert.match(window.document.getElementById('pg-js').textContent, /downscale: \{"maxWidth":1024/);
});

test('API lab: self-tests pass and every public event is observed', async () => {
  const window = await bootDemoLab();
  const output = await window.DemoLab.runSelfTest();
  const results = Array.from(output.results);
  const failed = results.filter(result => !result.ok);
  assert.ok(results.length >= 90, 'self-test did not exercise the full public API');
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
          <option value="auto">Auto</option>
        </select>
      </nav>
    </header>
    <div id="select-root"></div>
    <div id="field-root"></div>
  </body></html>`, { runScripts: 'dangerously', url: 'https://zidan.test/' });
  const { window } = dom;
  const media = { matches: false, addEventListener() {} };
  const autoListeners = [];
  const autoMedia = {
    matches: false,
    addEventListener(type, listener) { if (type === 'change') autoListeners.push(listener); }
  };
  window.matchMedia = (query) => String(query).indexOf('prefers-color-scheme') !== -1 ? autoMedia : media;
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

  quick.value = 'auto';
  quick.dispatchEvent(new window.Event('change'));
  assert.equal(window.document.documentElement.getAttribute('data-zs-theme'), 'default');
  assert.equal(window.document.getElementById('select-root').getAttribute('data-zs-theme'), 'default');
  autoMedia.matches = true;
  autoListeners.forEach((listener) => listener());
  assert.equal(window.document.documentElement.getAttribute('data-zs-theme'), 'dark', 'auto did not follow a live OS change');
  assert.equal(window.document.getElementById('field-root').getAttribute('data-zs-theme'), 'dark');
});

/* ---------------- search quality, scale, i18n & themes ---------------- */

test('search folds diacritics and highlights the match', () => {
  const window = boot('<select id="s"></select><select id="p"></select>');
  const select = window.zidanSelect('#s', {
    mode: 'combobox',
    options: ['Café au lait', 'Zürich', 'Señor', 'Ångström'],
    highlightMatches: true
  });
  select.open();
  select.input.value = 'cafe';
  select.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  let options = select.dropdown.querySelectorAll('[role="option"]');
  assert.equal(options.length, 1, 'accent folding did not match');
  assert.equal(options[0].textContent, 'Café au lait');
  const mark = options[0].querySelector('mark.zs-match');
  assert.ok(mark, 'match was not wrapped in <mark>');
  assert.equal(mark.textContent, 'Café');

  select.input.value = 'zurich';
  select.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(select.dropdown.querySelectorAll('[role="option"]').length, 1);

  select.input.value = 'zzz';
  select.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(select.dropdown.querySelectorAll('[role="option"]').length, 0);
  assert.ok(select.dropdown.querySelector('.zs-state--empty'));

  const plain = window.zidanSelect('#p', { mode: 'combobox', accentInsensitive: false, options: ['Café'] });
  plain.open();
  plain.input.value = 'cafe';
  plain.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(plain.dropdown.querySelectorAll('[role="option"]').length, 0, 'folding should be opt-out');
  plain.input.value = 'café';
  plain.input.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(plain.dropdown.querySelectorAll('[role="option"]').length, 1);
});

test('virtual lists render a window and keep ARIA positions', () => {
  const window = boot('<select id="s"></select>');
  const values = [];
  for (let i = 0; i < 500; i += 1) values.push('Row ' + (i + 1));
  const select = window.zidanSelect('#s', { options: values, virtual: true, itemHeight: 32 });
  let scrollTop = 0;
  Object.defineProperty(select.dropdown, 'clientHeight', { configurable: true, value: 320 });
  Object.defineProperty(select.dropdown, 'scrollTop', {
    configurable: true,
    get() { return scrollTop; },
    set(value) { scrollTop = value; }
  });
  select.open();

  let rendered = select.dropdown.querySelectorAll('[role="option"]');
  assert.ok(rendered.length > 0 && rendered.length < 60, 'expected a window, rendered ' + rendered.length);
  assert.equal(rendered[0].getAttribute('data-zs-option'), '0');
  assert.equal(rendered[0].getAttribute('aria-setsize'), '500');
  assert.equal(rendered[0].getAttribute('aria-posinset'), '1');
  assert.ok(select.dropdown.querySelector('.zs-virtual-space'), 'missing top spacer');

  scrollTop = 32 * 200;
  select.dropdown.dispatchEvent(new window.Event('scroll'));
  rendered = select.dropdown.querySelectorAll('[role="option"]');
  assert.equal(rendered[0].getAttribute('data-zs-option'), '196');
  assert.equal(rendered[0].getAttribute('aria-posinset'), '197');

  select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  const last = select.dropdown.querySelectorAll('[role="option"]');
  const finalOption = last[last.length - 1];
  assert.equal(finalOption.getAttribute('data-zs-option'), '499');
  assert.equal(select.input.getAttribute('aria-activedescendant'), finalOption.id);
});

test('type-ahead jumps and cycles options in a plain select', async () => {
  const window = boot('<select id="s"><option>Apple</option><option>Banana</option><option>Blueberry</option><option>Cherry</option></select>');
  const select = window.zidanSelect('#s', { mode: 'select', typeAheadTimeout: 20 });
  select.open();
  assert.equal(select.input.readOnly, true);

  select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'c', bubbles: true }));
  assert.equal(select.dropdown.querySelector('.zs-option--active').textContent, 'Cherry');

  await wait(30);
  select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', bubbles: true }));
  assert.equal(select.dropdown.querySelector('.zs-option--active').textContent, 'Banana');
  select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'b', bubbles: true }));
  assert.equal(select.dropdown.querySelector('.zs-option--active').textContent, 'Blueberry');

  select.close();
  await wait(30);
  select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  assert.equal(select.getValue(), 'Apple', 'typing while closed should select like a native select');
});

test('locale packs localize built-in strings', () => {
  const window = boot('<select id="s"></select><select id="n"></select>');
  const select = window.zidanSelect('#s', { locale: 'fr', options: [] });
  select.open();
  assert.equal(select.root.getAttribute('lang'), 'fr');
  assert.equal(select.dropdown.querySelector('.zs-state--empty').textContent, 'Aucune option');
  assert.equal(select.opts.noResultsText, 'Aucun résultat');
  assert.equal(select.opts.placeholder, 'Sélectionnez une option…');

  window.ZidanSelect.locales.nl = { emptyText: 'Geen opties' };
  const custom = window.zidanSelect('#n', { locale: 'nl', options: [] });
  custom.open();
  assert.equal(custom.dropdown.querySelector('.zs-state--empty').textContent, 'Geen opties');
});

test('theme auto follows prefers-color-scheme', () => {
  const window = boot('<select id="s"></select><input id="f" data-zidan-input>');
  window.matchMedia = () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {}
  });
  const select = window.zidanSelect('#s', { theme: 'auto' });
  assert.equal(select.root.getAttribute('data-zs-theme'), 'dark');
  const field = window.zidanField('#f', { theme: 'auto' });
  assert.equal(field.root.getAttribute('data-zs-theme'), 'dark');
  assert.ok(window.ZidanForm.themes.includes('auto'), 'auto is not a registered theme');
});

test('option groups expose role=group and stay unvirtualized', () => {
  const window = boot('<select id="s"></select>');
  const select = window.zidanSelect('#s', {
    virtual: true,
    options: [
      { value: 'a', label: 'A', group: 'First' },
      { value: 'b', label: 'B', group: 'First' },
      { value: 'c', label: 'C', group: 'Second' }
    ]
  });
  select.open();
  const groups = select.dropdown.querySelectorAll('[role="group"]');
  assert.equal(groups.length, 2);
  const label = groups[0].querySelector('.zs-group-label');
  assert.equal(label.textContent, 'First');
  assert.equal(groups[0].getAttribute('aria-labelledby'), label.id);
  assert.equal(groups[0].querySelectorAll('[role="option"]').length, 2);
  assert.equal(select.dropdown.querySelectorAll('[role="option"]').length, 3);
});

test('getTags returns the tag values in order', () => {
  const window = boot('<select id="s" multiple></select>');
  const select = window.zidanSelect('#s', { mode: 'tags', options: ['One', 'Two'] });
  select.addTag('One');
  select.addTag('Two');
  assert.deepEqual(Array.from(select.getTags()), ['One', 'Two']);
  assert.equal(typeof select.getTags()[0], 'string');
});

test('scoped destroy tears down only the controls inside a subtree', () => {
  const window = boot('<div id="a"><select id="sa"><option>One</option></select><input id="fa" data-zidan-input></div><div id="b"><select id="sb"><option>Two</option></select><input id="fb" data-zidan-input></div>');
  const selectA = window.zidanSelect('#sa');
  const fieldA = window.zidanField('#fa');
  const selectB = window.zidanSelect('#sb');
  const fieldB = window.zidanField('#fb');

  assert.equal(window.ZidanForm.destroy('#a'), 2);
  assert.equal(selectA.el.__zidanSelect, undefined);
  assert.equal(fieldA.el.__zidanField, undefined);
  assert.ok(selectB.el.__zidanSelect, 'select outside the scope must survive');
  assert.ok(fieldB.el.__zidanField, 'field outside the scope must survive');
  assert.equal(window.ZidanForm.destroy(window.document.getElementById('missing')), 0);

  assert.equal(window.ZidanForm.destroy(), 2);
  assert.equal(window.ZidanSelect.instances.length, 0);
  assert.equal(window.ZidanForm.fields.length, 0);
});

/* ---------------- v2.5.0 extension features ---------------- */

test('input mask formats literals and exposes mask/unmask helpers', () => {
  const window = boot('<input id="f" data-zidan-mask="(###) ###-####">');
  const field = window.zidanField('#f');
  assert.equal(field.el.value, '', 'an empty mask leaves the field empty');
  assert.equal(window.ZidanForm.mask('', '(###) ###-####'), '');
  assert.equal(window.ZidanForm.mask('1234567890', '(###) ###-####'), '(123) 456-7890');
  assert.equal(window.ZidanForm.unmask('(123) 456-7890'), '1234567890');
  field.el.value = '1234567890';
  field.el.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(field.el.value, '(123) 456-7890');
  assert.equal(field.getUnmaskedValue(), '1234567890');
  field.setValue('5551234');
  assert.equal(field.el.value, '(555) 123-4');
  assert.equal(field.getUnmaskedValue(), '5551234');
  assert.equal(field.setValue('abc12').getUnmaskedValue(), '12');
});

test('tags can be reordered and renamed in place', () => {
  const window = boot('<select id="s" multiple></select>');
  const select = window.zidanSelect('#s', {
    mode: 'tags', reorderable: true, editable: true,
    minTagLength: 2, maxTagLength: 8,
    validateTag: (value) => value !== 'Bad',
    options: ['One', 'Two', 'Three']
  });
  select.addTag('One');
  select.addTag('Two');
  select.addTag('Three');
  assert.equal(select.moveTag(2, 0), true);
  assert.deepEqual(Array.from(select.getTags()), ['Three', 'One', 'Two']);
  assert.equal(select.editTag('One', 'Uno'), true);
  const items = select.getSelectedItems();
  assert.equal(items[1].label, 'Uno');
  const nativeOne = Array.from(select.el.options).find((option) => option.value === 'One');
  assert.equal(nativeOne.textContent, 'Uno', 'native option label did not follow the edit');
  assert.equal(select.editTag('missing', 'x'), false);
  assert.equal(select.editTag('Uno', 'X'), false, 'editTag should enforce minTagLength');
  assert.equal(select.editTag('Uno', 'FarTooLong'), false, 'editTag should enforce maxTagLength');
  assert.equal(select.editTag('Uno', 'Bad'), false, 'editTag should run validateTag');
  assert.equal(select.editTag('Uno', 'Two'), false, 'editTag should reject duplicate labels');
  assert.equal(select.getSelectedItems()[1].label, 'Uno', 'rejected edits must not change the tag');
  const chip = select.chipsEl.querySelector('.zs-chip[data-zs-index="0"]');
  chip.focus();
  chip.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true }));
  const editor = select.chipsEl.querySelector('.zs-chip-edit');
  assert.ok(editor, 'F2 did not open the inline tag editor');
  assert.equal(editor.maxLength, 8, 'inline editor should inherit maxTagLength');
  editor.value = 'Third';
  editor.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.equal(select.chipsEl.querySelector('.zs-chip-edit'), null, 'Enter did not close the inline tag editor');
  assert.equal(select.getSelectedItems()[0].label, 'Third');
  select.destroy();
});

test('multiple helpers select, toggle and clear every enabled option', () => {
  const window = boot('<select id="s" multiple><option value="a">A</option><option value="b">B</option><option value="c" disabled>C</option></select>');
  const select = window.zidanSelect('#s');
  select.setValue(['b']);
  select.selectAll();
  assert.deepEqual(Array.from(select.getValue()), ['b', 'a']);
  assert.equal(select.areAllSelected(), true);
  select.toggleAll();
  assert.equal(select.getValue().length, 0);
  select.toggleAll();
  assert.deepEqual(Array.from(select.getValue()), ['a', 'b']);
  select.deselectAll();
  assert.equal(select.getValue().length, 0);
  select.destroy();
});

test('ZidanForm.serialize flattens form data and repeats array keys', () => {
  const window = boot('<form id="f"><input name="a" value="1"><input name="tag" value="x"><input name="tag" value="y"><input type="checkbox" name="ok" value="yes" checked><textarea name="msg" data-zidan-input>hi</textarea></form>');
  window.zidanField('#f textarea');
  const data = window.ZidanForm.serialize('#f');
  assert.equal(data.a, '1');
  assert.deepEqual(Array.from(data.tag), ['x', 'y']);
  assert.equal(data.ok, 'yes');
  assert.equal(data.msg, 'hi');
  assert.throws(() => window.ZidanForm.serialize('#missing'), /expected a <form>/);
});

test('ZidanForm.validate runs field rules and native constraints', async () => {
  const window = boot('<form id="f"><input name="email" type="email" value="nope" required><textarea id="t" name="msg" data-zidan-input></textarea></form>');
  const text = window.zidanField('#t', { validate: (value) => value.length >= 3 });
  const events = [];
  window.document.getElementById('f').addEventListener('zidan:validate', (event) => events.push(event.detail.valid));
  assert.equal(await window.ZidanForm.validate('#f'), false, 'invalid email should fail');
  assert.equal(window.document.activeElement.name, 'email', 'first native invalid control should get focus');
  window.document.querySelector('[name="email"]').value = 'a@b.co';
  assert.equal(await window.ZidanForm.validate('#f'), false, 'field rule should fail');
  assert.equal(window.document.activeElement.id, 't');
  text.setValue('hey');
  assert.equal(await window.ZidanForm.validate('#f', { focus: false }), true);
  assert.deepEqual(events, [false, false, true]);
});

test('phone country picker keeps the current country active and searches', () => {
  const window = boot('<input id="p" type="tel" data-zidan-phone="true" data-zidan-phone-country="GB">');
  const field = window.zidanField('#p');
  const button = field.root.querySelector('.zs-phone-picker');
  const menu = field.root.querySelector('.zs-phone-menu');
  assert.ok(button, 'visible picker button missing');
  assert.ok(field.root.querySelector('.zs-phone-country--native'), 'native value holder missing');
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(menu.hidden, false);
  assert.equal(button.getAttribute('aria-expanded'), 'true');
  const active = menu.querySelector('.zs-phone-option--active');
  assert.equal(active && active.getAttribute('data-iso'), 'GB', 'opening should highlight the current country');
  const search = menu.querySelector('.zs-phone-search');
  search.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  assert.equal(field.getPhoneCountry(), 'GB', 'Enter should keep the current country');
  search.value = 'germany';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  const options = menu.querySelectorAll('[data-iso]');
  assert.equal(options.length, 1);
  assert.equal(options[0].getAttribute('data-iso'), 'DE');
  options[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(field.getPhoneCountry(), 'DE');
  assert.equal(button.querySelector('.zs-phone-picker-dial').textContent, '+49');
  assert.equal(menu.hidden, true);
});

test('textarea autogrow follows scrollHeight and respects its cap', () => {
  const window = boot('<textarea id="a" data-zidan-input></textarea><textarea id="b" data-zidan-input></textarea>');
  const grow = window.document.getElementById('a');
  const capped = window.document.getElementById('b');
  Object.defineProperty(grow, 'scrollHeight', { configurable: true, value: 120 });
  Object.defineProperty(capped, 'scrollHeight', { configurable: true, value: 120 });
  const fieldA = window.zidanField('#a', { autogrow: true });
  const fieldB = window.zidanField('#b', { autogrow: true, autogrowMax: 60 });
  fieldA.setValue('one\ntwo');
  fieldB.setValue('one\ntwo');
  assert.equal(fieldA.el.style.height, '120px');
  assert.equal(fieldB.el.style.height, '60px');
  assert.equal(fieldB.el.style.overflowY, 'auto');
});

test('image downscale helper degrades safely without canvas', async () => {
  const window = boot('<input id="f" type="file" accept="image/*">');
  const file = new window.File(['png-bytes'], 'photo.png', { type: 'image/png' });
  assert.equal(await window.ZidanForm.downscaleImage(file, { maxWidth: 10 }), file);
  const uploaded = [];
  const field = window.zidanField('#f', {
    downscale: true,
    uploadHandler: (picked) => { uploaded.push(picked); return { ok: true }; }
  });
  field.addFiles([file]);
  field.uploadAll();
  await wait(30);
  assert.equal(uploaded.length, 1);
  assert.equal(uploaded[0].name, 'photo.png');
  assert.equal(field.getUploadState()[0].status, 'done');
});

/* ---------------- historical bug regressions ---------------- */

test('regression BUG-003: deselectable radio reports one change per native change', () => {
  const window = boot('<form><fieldset id="rg" data-zidan="radio-group"><label><input type="radio" name="p" value="a" checked> A</label><label><input type="radio" name="p" value="b"> B</label></fieldset></form>');
  const group = window.zidanField('#rg', { deselectable: true });
  let callbackCount = 0;
  group.opts.onChange = () => { callbackCount += 1; };
  let emitted = 0;
  const originalEmit = group.emit.bind(group);
  group.emit = (name, detail) => {
    if (name === 'change') emitted += 1;
    return originalEmit(name, detail);
  };
  const input = window.document.querySelector('input[value="a"]');
  input.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert.equal(input.checked, false, 'clicking the checked radio clears it');
  assert.equal(callbackCount, 0, 'the click handler must not call onChange itself');
  assert.equal(emitted, 0, 'the click handler must not emit zidan:change itself');
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(callbackCount, 1, 'the native change still reaches onChange exactly once');
  assert.equal(emitted, 1, 'the native change still emits zidan:change exactly once');
  group.destroy();
});

test('regression BUG-004/028: setOptions clears fetch errors and restores the active option', () => {
  const window = boot('<select id="s"><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>');
  const select = window.zidanSelect('#s');
  select.open();
  select.error = 'Network failed';
  select.loadMoreError = 'More failed';
  select.activeIndex = 2;
  select.setOptions([{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]);
  assert.equal(select.error, null, 'a successful setOptions clears the fetch error');
  assert.equal(select.loadMoreError, null, 'a successful setOptions clears the load-more error');
  assert.equal(select.activeIndex, 0, 'the active option returns to the first enabled entry');
  assert.equal(select.items.length, 2);
  select.destroy();
});

test('regression BUG-013: clear({silent:true}) suppresses change on a plain select', () => {
  const window = boot('<select id="s"><option value="a">A</option></select>');
  let changes = 0;
  const select = window.zidanSelect('#s', { onChange: () => { changes += 1; } });
  select.setValue('a');
  changes = 0;
  select.clear({ silent: true });
  assert.equal(select.getValue(), null);
  assert.equal(changes, 0, 'a silent clear must not call onChange');
  select.setValue('a');
  changes = 0;
  select.clear();
  assert.equal(changes, 1, 'a normal clear still reports the change');
  select.destroy();
});

test('regression BUG-019: file dedupe keeps same-name files from different folders', () => {
  const window = boot('<input id="f" type="file" multiple>');
  const field = window.zidanField('#f');
  const make = (relativePath) => {
    const file = new window.File(['same'], 'photo.png', { type: 'image/png', lastModified: 12345 });
    Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
    return file;
  };
  field.addFiles([make('a/photo.png'), make('b/photo.png')]);
  assert.equal(field.getFiles().length, 2, 'files from different folders are not duplicates');
  field.addFiles([make('a/photo.png')]);
  assert.equal(field.getFiles().length, 2, 'a true duplicate is still skipped');
  field.destroy();
});

test('regression BUG-021: phone formatting leaves digit-less input untouched', () => {
  const window = boot('<input id="p" type="tel" data-zidan-phone="true">');
  const field = window.zidanField('#p');
  field.el.value = '+';
  field.el.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert.equal(field.el.value, '+', 'input must not be rewritten to a bare plus');
  field.el.dispatchEvent(new window.Event('blur', { bubbles: true }));
  assert.equal(field.el.value, '+', 'blur must not wipe the text either');
  field.el.value = '+1 415 555 2671';
  field.el.dispatchEvent(new window.Event('blur', { bubbles: true }));
  assert.equal(field.el.value.replace(/\D/g, ''), '1415555267', 'the digits survive formatting');
  assert.notEqual(field.el.value, '+1 415 555 2671', 'formatting rewrites the raw number');
  field.destroy();
});

test('large option lists are inserted as one DOM batch', async () => {
  const options = Array.from({ length: 300 }, (_, i) => '<option value="o' + i + '">Option ' + i + '</option>').join('');
  const window = boot('<select id="s">' + options + '</select>');
  const select = window.zidanSelect('#s');
  select.open();
  const added = [];
  const observer = new window.MutationObserver((records) => {
    records.forEach((record) => added.push(record.addedNodes.length));
  });
  observer.observe(select.dropdown, { childList: true });
  select.setOptions(Array.from({ length: 300 }, (_, i) => ({ value: 'o' + i, label: 'Option ' + i })));
  await new Promise((resolve) => setTimeout(resolve, 0));
  observer.disconnect();
  const rows = added.reduce((sum, count) => sum + count, 0);
  assert.ok(rows >= 300, 'the list still renders every option');
  assert.ok(added.length <= 3, 'the list is inserted in a batch, saw ' + added.length + ' mutations');
  assert.equal(select.dropdown.querySelectorAll('.zs-option').length, 300);
  select.destroy();
});

/* ---------------- reliability suite ---------------- */

registerReliabilityTests({ test, boot, wait, assert });

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
