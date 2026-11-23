import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = fs.readFileSync(path.join(root, 'zidan-form.js'), 'utf8');
const dom = new JSDOM('<!doctype html><body><select id="remote"><option>placeholder</option></select></body>', {
  runScripts: 'dangerously',
  url: 'https://example.test/'
});
dom.window.eval(source);
const { window } = dom;
const all = Array.from({ length: 25 }, (_, i) => ({ value: 'v' + i, label: 'Item ' + i }));
let calls = [];
const select = window.zidanSelect('#remote', {
  mode: 'combobox',
  fetchPageSize: 10,
  cacheResults: true,
  fetchOptions: (query, signal, context) => {
    calls.push({ query, page: context.page, append: context.append });
    const start = context.page * context.pageSize;
    const items = all.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(start, start + context.pageSize);
    return new Promise((resolve) => setTimeout(() => resolve({ items, hasMore: start + context.pageSize < all.length }), 5));
  }
});

select.open();
await new Promise((r) => setTimeout(r, 20));
console.log('page0 calls:', JSON.stringify(calls), 'items:', select.asyncItems && select.asyncItems.length, 'hasMore:', select.hasMore, 'buttons:', select.dropdown.querySelectorAll('.zs-more').length);

const more = select.loadMore();
console.log('loadMore returns thenable:', !!more && typeof more.then === 'function');
await more;
console.log('after page1 items:', select.asyncItems.length, 'hasMore:', select.hasMore, 'page:', select.asyncPage);

const before = calls.length;
await select._fetch('', 0, false);
console.log('cache reused:', calls.length === before, 'items:', select.asyncItems.length, 'hasMore:', select.hasMore);

await select._fetch('', 0, false);
console.log('cache second reuse:', calls.length === before);

select.close();
select.open();
await new Promise((r) => setTimeout(r, 20));
console.log('reopen calls (page0 cached):', calls.length === before, 'items:', select.asyncItems.length);

select.destroy();
console.log('destroyed:', select.destroyed);
