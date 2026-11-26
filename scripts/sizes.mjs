/* Keeps the size figures in the docs in sync with the built assets.
   `npm test` fails when they drift: run `npm run build` then `npm run sizes`. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const stat = (file) => fs.statSync(path.join(root, file)).size;
const kb = (bytes) => Math.round(bytes / 1024);
const comma = (bytes) => bytes.toLocaleString('en-US');

const BASE = [
  { id: 'full', label: 'Full', title: 'Full build', raw: 'zidan-form.js', min: 'dist/zidan-form.min.js',
    core: 'plugin-core.css', coreMin: 'dist/plugin-core.min.css',
    theme: 'plugin-theme.css', themeMin: 'dist/plugin-theme.min.css' },
  { id: 'select', label: 'Select-only', title: 'Select-only', raw: 'dist/select/zidan-select.js', min: 'dist/select/zidan-select.min.js',
    core: 'dist/select/plugin-select-core.css', coreMin: 'dist/select/plugin-select-core.min.css',
    theme: 'dist/select/plugin-select-theme.css', themeMin: 'dist/select/plugin-select-theme.min.css' },
  { id: 'file', label: 'File-only', title: 'File-only', raw: 'dist/file/zidan-file.js', min: 'dist/file/zidan-file.min.js',
    core: 'dist/file/plugin-file-core.css', coreMin: 'dist/file/plugin-file-core.min.css',
    theme: 'dist/file/plugin-file-theme.css', themeMin: 'dist/file/plugin-file-theme.min.css' }
];

const builds = BASE.map((b) => ({
  ...b,
  rawBytes: stat(b.raw), minBytes: stat(b.min),
  rawKb: kb(stat(b.raw)), minKb: kb(stat(b.min)),
  coreBytes: stat(b.core), coreMinBytes: stat(b.coreMin),
  themeBytes: stat(b.theme), themeMinBytes: stat(b.themeMin)
}));

const docs = new Map();
const read = (file) => {
  if (!docs.has(file)) docs.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
  return docs.get(file);
};
const must = (label, text, re, next) => {
  if (!re.test(text)) throw new Error('sizes: no match for ' + label);
  return text.replace(re, next);
};

let out = read('docs/build.md');
for (const b of builds) {
  const row = '| ' + b.label + ' | ' + comma(b.rawBytes) + ' B (≈' + kb(b.rawBytes) + ' kB) → ' + comma(b.minBytes) + ' B (≈' + kb(b.minBytes) + ' kB) | ' + comma(b.coreBytes) + ' B (≈' + kb(b.coreBytes) + ' kB) → ' + comma(b.coreMinBytes) + ' B (≈' + kb(b.coreMinBytes) + ' kB) | ' + comma(b.themeBytes) + ' B (≈' + kb(b.themeBytes) + ' kB) → ' + comma(b.themeMinBytes) + ' B (≈' + kb(b.themeMinBytes) + ' kB) |';
  const re = new RegExp('^\\| ' + b.label + ' \\| [\\d,]+ B \\(≈\\d+ kB\\) → [\\d,]+ B \\(≈\\d+ kB\\) \\|.*$', 'm');
  out = must(b.label + ' row', out, re, () => row);
}
docs.set('docs/build.md', out);

let index = read('index.html');
for (const b of builds) {
  const card = new RegExp('<h3>' + b.title + ' <span class="build-size">≈\\d+ kB · ≈\\d+ kB min</span></h3>');
  index = must(b.title + ' card', index, card, () => '<h3>' + b.title + ' <span class="build-size">≈' + b.rawKb + ' kB · ≈' + b.minKb + ' kB min</span></h3>');
  const pick = new RegExp('(href="#build-' + b.id + '"[\\s\\S]*?<em>)≈\\d+ kB JS · ≈\\d+ kB minified(</em>)');
  index = must(b.id + ' picker', index, pick, (match, before, after) => before + '≈' + b.rawKb + ' kB JS · ≈' + b.minKb + ' kB minified' + after);
}
docs.set('index.html', index);

let advanced = read('advanced.html');
for (const b of builds) {
  const re = new RegExp('(<code>' + b.raw + '</code><br>)\\d+ kB raw · \\d+ kB min');
  advanced = must(b.raw + ' row', advanced, re, (match, before) => before + b.rawKb + ' kB raw · ' + b.minKb + ' kB min');
}
docs.set('advanced.html', advanced);

const readme = read('README.md').split('\n');
for (const b of builds) {
  const i = readme.findIndex((line) => line.indexOf('@2.4.2/' + b.raw + ')') !== -1 && /≈\d+ kB raw · ≈\d+ kB minified/.test(line));
  if (i === -1) throw new Error('sizes: no README row for ' + b.raw);
  readme[i] = readme[i].replace(/≈\d+ kB raw · ≈\d+ kB minified/, () => '≈' + b.rawKb + ' kB raw · ≈' + b.minKb + ' kB minified');
}
docs.set('README.md', readme.join('\n'));

const full = builds[0];
docs.set('docs/comparison.md', must('comparison weight', read('docs/comparison.md'), /≈\d+ kB raw JS/, () => '≈' + full.rawKb + ' kB raw JS'));

for (const [file, text] of docs) fs.writeFileSync(path.join(root, file), text);
console.log('sizes: synced ' + docs.size + ' documents');
