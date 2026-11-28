/* Keeps the size figures in the docs in sync with the built assets.
   `npm test` fails when they drift: run `npm run build` then `npm run sizes`. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const stat = (file) => {
  const buf = fs.readFileSync(path.join(root, file));
  if (!/\.(?:js|mjs|css|html|md|json|ts|txt)$/.test(file)) return buf.length;
  return Buffer.byteLength(buf.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
};
const kb = (bytes) => Math.round(bytes / 1024);
const comma = (bytes) => bytes.toLocaleString('en-US');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const basename = (file) => file.split('/').pop();

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
  coreKb: kb(stat(b.core)), coreMinKb: kb(stat(b.coreMin)),
  themeBytes: stat(b.theme), themeMinBytes: stat(b.themeMin),
  themeKb: kb(stat(b.theme)), themeMinKb: kb(stat(b.themeMin))
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
  const quickRe = new RegExp('^\\| ' + escapeRe(b.label) + ' \\| `[^`]+` — ≈\\d+ kB \\| `[^`]+` — ≈\\d+ kB \\| `[^`]+` — ≈\\d+ kB \\|$', 'm');
  const quickRow = '| ' + b.label + ' | `/' + b.min + '` — ≈' + b.minKb + ' kB | `/' + b.coreMin + '` — ≈' + b.coreMinKb + ' kB | `/' + b.themeMin + '` — ≈' + b.themeMinKb + ' kB |';
  out = must(b.label + ' CDN row', out, quickRe, () => quickRow);
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
  const cssRe = new RegExp('(<code>' + escapeRe(basename(b.core)) + '</code> )\\d+( → )\\d+( kB<br><code>' + escapeRe(basename(b.theme)) + '</code> )\\d+( → )\\d+( kB)');
  advanced = must(b.core + ' CSS row', advanced, cssRe, (match, p1, p2, p3, p4, p5) => p1 + b.coreKb + p2 + b.coreMinKb + p3 + b.themeKb + p4 + b.themeMinKb + p5);
}
docs.set('advanced.html', advanced);

const readme = read('README.md').split('\n');
for (const b of builds) {
  const i = readme.findIndex((line) => line.indexOf('@' + version + '/' + b.raw + ')') !== -1 && /≈\d+ kB raw · ≈\d+ kB minified/.test(line));
  if (i === -1) throw new Error('sizes: no README row for ' + b.raw);
  readme[i] = readme[i].replace(/≈\d+ kB raw · ≈\d+ kB minified/, () => '≈' + b.rawKb + ' kB raw · ≈' + b.minKb + ' kB minified');
}
let readmeText = readme.join('\n');
for (const b of builds) {
  const cdn = 'https://cdn.jsdelivr.net/npm/zidan-select@' + version + '/';
  const cdnRow = '| ' + b.label + ' | [' + basename(b.min) + '](' + cdn + b.min + ') — ≈' + b.minKb + ' kB | [' + basename(b.coreMin) + '](' + cdn + b.coreMin + ') — ≈' + b.coreMinKb + ' kB + [' + basename(b.themeMin) + '](' + cdn + b.themeMin + ') — ≈' + b.themeMinKb + ' kB |';
  const cdnRe = new RegExp('^\\| ' + escapeRe(b.label) + ' \\| \\[[^\\]]+\\]\\([^)]*\\) — ≈\\d+ kB \\| \\[[^\\]]+\\]\\([^)]*\\) — ≈\\d+ kB \\+ \\[[^\\]]+\\]\\([^)]*\\) — ≈\\d+ kB \\|$', 'm');
  readmeText = must(b.label + ' README CDN row', readmeText, cdnRe, () => cdnRow);

  const intro = b.id === 'select' ? 'Select / combobox / tags only' : (b.id === 'file' ? 'File upload only' : '');
  if (!intro) continue;
  const proseRe = new RegExp('(' + escapeRe(intro) + ' \\(≈)\\d+( kB raw / ≈)\\d+( kB minified JS, ≈)\\d+( → )\\d+( kB core CSS,\\n≈)\\d+( → )\\d+( kB theme CSS\\))');
  readmeText = must(intro + ' README prose', readmeText, proseRe, (match, p1, p2, p3, p4, p5, p6, p7) => p1 + b.rawKb + p2 + b.minKb + p3 + b.coreKb + p4 + b.coreMinKb + p5 + b.themeKb + p6 + b.themeMinKb + p7);
}
docs.set('README.md', readmeText);

const full = builds[0];
docs.set('docs/comparison.md', must('comparison weight', read('docs/comparison.md'), /≈\d+ kB raw JS/, () => '≈' + full.rawKb + ' kB raw JS'));

for (const [file, text] of docs) fs.writeFileSync(path.join(root, file), text);
console.log('sizes: synced ' + docs.size + ' documents');
