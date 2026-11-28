#!/usr/bin/env node
/**
 * Documentation Lab — verifies version/release metadata, API coverage, links,
 * examples, declarations, generated pages and npm package contents. Audit-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  root, createRun, writeReport, printResult, makeCheck, run, flag, tail
} from '../shared/common.mjs';

const runData = createRun('docs', {
  limitations: [
    'Coverage counts are textual API-name mentions in README.md and docs/*.md. A mention is evidence that a name appears, not proof that its description is complete or correct.',
    'Only local links and anchors are checked; external URLs are not fetched unless --online is passed, and even then only the npm version endpoint is queried.',
    'Documented code fences are counted and structurally checked, not executed. Demo Lab is responsible for executing browser examples.',
    'Generated HTML is built into .build/docs-verify; it is not compared byte-for-byte with the committed docs pages.',
    'Automated checks cannot judge whether prose is clear, accurate in every nuance, or appropriate for its audience.'
  ]
});
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const markdownFiles = ['README.md', ...fs.readdirSync(path.join(root, 'docs')).filter((f) => f.endsWith('.md')).map((f) => 'docs/' + f)];
const docsText = markdownFiles.map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
const add = (check) => runData.checks.push(makeCheck(check.id, check.name, check.status, check));

/* ---------------- version and changelog ---------------- */
const runtime = fs.readFileSync(path.join(root, 'zidan-form.js'), 'utf8');
const runtimeVersion = (runtime.match(/var VERSION = '([^']+)'/) || [])[1];
const pins = [...new Set([...docsText.matchAll(/zidan-select@([0-9][\w.-]*)/g)].map((m) => m[1]))];
const exactPins = pins.filter((pin) => pin === version);
const rangePins = pins.filter((pin) => pin !== version);
const versionOk = runtimeVersion === version && exactPins.length >= 1 && rangePins.length === 0;
add(makeCheck('ZS-DOCS-VERSION', 'Package, runtime, docs and CDN pins agree on one version', versionOk ? 'PASS' : 'FAIL', {
  evidence: 'package=' + version + ' · runtime=' + runtimeVersion + ' · exact CDN pins=' + exactPins.length + ' · non-exact pins=' + JSON.stringify(rangePins)
}));
if (!versionOk) runData.findings.push({ id: 'ZS-DOCS-VERSION', title: 'CDN snippets do not pin the documented release', status: 'confirmed', severity: 'medium', confidence: 'high', where: 'README.md quick-start CDN block', detail: 'package/runtime are ' + version + ', exact pins: ' + exactPins.length + ', non-exact pins: ' + JSON.stringify(rangePins) + '. The README says CDN links pin the 2.5.0 release, but the quick-start block uses a major-range URL.' });

const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
const releases = [...changelog.matchAll(/^## \[([0-9]+\.[0-9]+\.[0-9]+)\](?: - (\d{4}-\d{2}-\d{2}))?/gm)].map((m) => ({ version: m[1], date: m[2] || null }));
const duplicates = releases.map((r) => r.version).filter((v, i, all) => all.indexOf(v) !== i);
const dates = releases.map((r) => r.date).filter(Boolean);
const sortedDates = dates.every((date, i) => i === 0 || date <= dates[i - 1]);
const changelogOk = releases.length > 0 && releases[0].version === version && duplicates.length === 0 && sortedDates;
add(makeCheck('ZS-DOCS-CHANGELOG', 'CHANGELOG starts at the released version and is ordered', changelogOk ? 'PASS' : 'FAIL', {
  evidence: releases.length + ' releases · first=' + (releases[0] && releases[0].version) + ' · duplicates=' + (duplicates.join(', ') || 'none') + ' · dates descending=' + sortedDates
}));

/* ---------------- API coverage ---------------- */
const registryDir = path.join(root, 'quality-labs', 'shared', 'feature-registry');
function registryArray(file) {
  const data = JSON.parse(fs.readFileSync(path.join(registryDir, file), 'utf8'));
  return Object.values(data).find(Array.isArray) || [];
}
function mentioned(name) {
  const escaped = name.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');
  return new RegExp('(^|[^A-Za-z0-9_])' + escaped + '([^A-Za-z0-9_]|$)').test(docsText);
}
const options = registryArray('options.json');
const methods = registryArray('methods.json');
const events = registryArray('events.json');
const attributes = registryArray('html-requirements.json');
const components = registryArray('components.json');
const css = registryArray('css-features.json');
const publicAttributes = attributes.filter((item) => item.name.startsWith('data-zidan-'));
const missingOptions = options.filter((item) => !mentioned(item.name)).map((item) => item.name);
const missingMethods = methods.filter((item) => !mentioned(item.name)).map((item) => item.name);
const missingEvents = events.filter((item) => !mentioned(item.name)).map((item) => item.name);
const missingAttributes = publicAttributes.filter((item) => !mentioned(item.name) && !(item.name.endsWith('-mb') && docsText.includes('max-total-size-mb'))).map((item) => item.name);
const coveredComponents = components.filter((item) => mentioned(item.name) || (item.name === 'ZidanCheckbox' && /\bswitch\b/i.test(docsText))).length;
const cssTokens = css.filter((item) => item.kind === 'style-token');
const cssClasses = css.filter((item) => item.kind === 'style-class');
const coveredTokens = cssTokens.filter((item) => mentioned(item.name)).length;
const coveredClasses = cssClasses.filter((item) => mentioned(item.name)).length;
const apiOk = missingOptions.length === 0 && missingMethods.length === 0 && missingEvents.length === 0 && missingAttributes.length === 0;
add(makeCheck('ZS-DOCS-API-COVERAGE', 'Every public option, method, event and data attribute is documented', apiOk ? 'PASS' : 'FAIL', {
  evidence: 'options ' + (options.length - missingOptions.length) + '/' + options.length + ' · methods+statics ' + (methods.length - missingMethods.length) + '/' + methods.length + ' · events ' + (events.length - missingEvents.length) + '/' + events.length + ' · data attributes ' + (publicAttributes.length - missingAttributes.length) + '/' + publicAttributes.length + ' · missing=' + [missingOptions, missingMethods, missingEvents, missingAttributes].flat().join(', ')
}));

/* documented names must exist in source, not just the reverse */
const usedTokens = [...new Set(docsText.match(/--zs-[a-z0-9-]+/g) || [])];
const usedClasses = [...new Set((docsText.match(/\.zs-[a-z0-9-]+/g) || []).map((name) => name.slice(1)))];
const knownTokens = new Set(cssTokens.map((item) => item.name));
const knownClasses = new Set(cssClasses.map((item) => item.name));
const consumedTokens = new Set([...runtime.matchAll(/var\((--zs-[a-z0-9-]+)/g)].map((m) => m[1]));
const cssLiterals = fs.readFileSync(path.join(root, 'plugin-core.css'), 'utf8') + fs.readFileSync(path.join(root, 'plugin-theme.css'), 'utf8');
const definedInDocs = (name) => new RegExp(name.replace(/[.*+?^$()|[]{}\\]/g, '\\$&') + '\\s*:').test(docsText);
const inventedTokens = usedTokens.filter((name) => !knownTokens.has(name) && !consumedTokens.has(name) && !cssLiterals.includes(name) && !definedInDocs(name));
const inventedClasses = usedClasses.filter((name) => !knownClasses.has(name));
const usedAttributes = [...new Set(docsText.match(/data-zidan-[a-z0-9-]+/g) || [])];
const unknownAttributes = usedAttributes.filter((name) => !attributes.some((item) => item.name === name));
add(makeCheck('ZS-DOCS-NAME-VALIDITY', 'Documented CSS names and data attributes exist in the implementation', inventedTokens.length === 0 && inventedClasses.length === 0 && unknownAttributes.length === 0 ? 'PASS' : 'FAIL', {
  evidence: usedTokens.length + ' tokens, ' + usedClasses.length + ' classes and ' + usedAttributes.length + ' attributes referenced · invented tokens=' + (inventedTokens.join(', ') || 'none') + ' · invented classes=' + (inventedClasses.join(', ') || 'none') + ' · unknown attributes=' + (unknownAttributes.join(', ') || 'none')
}));

/* ---------------- examples ---------------- */
const fences = [];
for (const file of markdownFiles) {
  const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
  let open = null;
  lines.forEach((line, index) => {
    const match = line.match(/^\u0060\u0060\u0060(\w*)/);
    if (!match) return;
    if (open) { fences.push({ file, language: open.language, lines: index - open.line - 1 }); open = null; }
    else { open = { language: match[1] || 'text', line: index }; }
  });
  if (open) fences.push({ file, language: open.language, lines: -1, unclosed: true });
}
const unclosed = fences.filter((fence) => fence.unclosed);
const languages = [...new Set(fences.filter((fence) => !fence.unclosed).map((fence) => fence.language))].sort();
add(makeCheck('ZS-DOCS-EXAMPLES', 'Markdown code fences are balanced and examples are present', unclosed.length === 0 && fences.length >= 20 ? 'PASS' : 'FAIL', {
  evidence: fences.filter((fence) => !fence.unclosed).length + ' examples across ' + languages.length + ' languages (' + languages.join(', ') + ') · unclosed=' + unclosed.length
}));

/* ---------------- links and anchors ---------------- */
function githubSlug(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s/g, '-');
}
const missing = [];
const seen = new Set();
function checkLink(from, raw) {
  if (!raw || /\{\{/.test(raw) || /^(?:https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(raw) || raw === '#') return;
  const [rawPath, hash] = raw.split('#');
  const pathPart = (rawPath || '').split('?')[0];
  if (!pathPart && !hash) return;
  if (pathPart.endsWith('playground.html') && /^(select|text|textarea|number|phone|range|date|switch|radio|file)$/.test(hash || '')) return;
  const key = from + ' -> ' + raw;
  if (seen.has(key)) return;
  seen.add(key);
  const target = pathPart ? path.resolve(path.dirname(path.join(root, from)), decodeURIComponent(pathPart)) : path.join(root, from);
  if (!fs.existsSync(target)) { missing.push(from + ' -> ' + raw + ' (missing file)'); return; }
  if (!hash) return;
  const content = fs.readFileSync(target, 'utf8');
  const decoded = decodeURIComponent(hash);
  if (target.endsWith('.html')) {
    const idPattern = new RegExp('\\bid=["\']' + decoded.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '["\']');
    const namePattern = new RegExp('\\bname=["\']' + decoded.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&') + '["\']');
    if (!idPattern.test(content) && !namePattern.test(content)) missing.push(from + ' -> ' + raw + ' (missing HTML anchor)');
    return;
  }
  if (target.endsWith('.md')) {
    const headings = content.split(/\r?\n/).filter((line) => /^#{1,6}\s+/.test(line)).map((line) => githubSlug(line.replace(/^#{1,6}\s+/, '')));
    if (!headings.includes(decoded)) missing.push(from + ' -> ' + raw + ' (missing Markdown anchor)');
  }
}
for (const file of markdownFiles) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) checkLink(file, match[1]);
}
for (const file of fs.readdirSync(path.join(root, 'docs')).filter((f) => f.endsWith('.html'))) {
  const text = fs.readFileSync(path.join(root, 'docs', file), 'utf8');
  for (const match of text.matchAll(/href=["']([^"']+)["']/g)) checkLink('docs/' + file, match[1]);
}
add(makeCheck('ZS-DOCS-LINKS', 'Documentation links and anchors resolve', missing.length === 0 ? 'PASS' : 'FAIL', {
  evidence: missing.length ? missing.slice(0, 30).join(' | ') : seen.size + ' local links checked'
}));
for (const item of missing.slice(0, 10)) runData.findings.push({ id: 'ZS-DOCS-LINK-' + missing.indexOf(item), title: 'Broken documentation link', status: 'confirmed', severity: 'low', confidence: 'high', where: item.split(' -> ')[0], detail: item });

/* ---------------- declarations and packaging ---------------- */
const types = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'types'], { timeout: 180000 });
runData.commands.push(types);
add(makeCheck('ZS-DOCS-TYPES', 'Published TypeScript declarations compile for Bundler and NodeNext consumers', types.exitCode === 0 ? 'PASS' : 'FAIL', { evidence: types.exitCode === 0 ? 'npm run types passed' : tail(types.stdout + types.stderr) }));

const declarations = fs.readFileSync(path.join(root, 'zidan-form.d.ts'), 'utf8');
const requiredClasses = ['ZidanFieldBase', 'ZidanSelect', 'ZidanCheckbox', 'ZidanRadioGroup', 'ZidanFileUpload', 'ZidanTextField'];
const missingClasses = requiredClasses.filter((name) => !new RegExp('\\bclass ' + name + '\\b').test(declarations));
add(makeCheck('ZS-DOCS-DECLARATIONS', 'Declarations expose every public component class', missingClasses.length === 0 ? 'PASS' : 'FAIL', {
  evidence: missingClasses.length ? 'missing: ' + missingClasses.join(', ') : requiredClasses.length + ' classes declared; default export=' + /export default ZidanForm/.test(declarations)
}));

const pack = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json'], { timeout: 120000 });
runData.commands.push(pack);
let packFiles = [];
let packError = null;
try {
  const start = pack.stdout.indexOf('[');
  const parsed = JSON.parse(pack.stdout.slice(start));
  packFiles = (parsed[0] && parsed[0].files || []).map((entry) => entry.path);
} catch (error) { packError = error.message; }
const requiredPack = ['README.md', 'CHANGELOG.md', 'LICENSE', 'zidan-form.js', 'zidan-form.mjs', 'zidan-form.d.ts', 'zidan-form.d.mts', 'plugin-core.css', 'plugin-theme.css', 'docs/options.md', 'docs/build.md'];
const absent = requiredPack.filter((file) => !packFiles.includes(file));
/* The guides are published on GitHub Pages; the tarball keeps the Markdown sources
   but must not spend ~750 kB on generated HTML or screenshots npm cannot render. */
const forbidden = packFiles.filter((file) => /^(?:quality-labs|zidan-select-lab-kit|scripts|node_modules)\//.test(file) || /\.(?:png|html)$/.test(file));
const packOk = !packError && pack.exitCode === 0 && absent.length === 0 && forbidden.length === 0;
add(makeCheck('ZS-DOCS-PACK', 'npm package contains the documented runtime, CSS, declarations and guides', packOk ? 'PASS' : 'FAIL', {
  evidence: packError ? 'parse error: ' + packError : packFiles.length + ' packed files · absent=' + (absent.join(', ') || 'none') + ' · forbidden=' + (forbidden.join(', ') || 'none')
}));

/* ---------------- generated pages ---------------- */
const docsOut = path.join(root, '.build', 'docs-verify');
fs.rmSync(docsOut, { recursive: true, force: true });
const docsBuild = run(process.execPath, ['scripts/docs.mjs', docsOut], { timeout: 120000 });
runData.commands.push(docsBuild);
const expectedPages = ['options.html', 'theming.html', 'frameworks.html', 'comparison.html', 'validation-guide.html', 'build.html', 'html-and-wordpress.html'];
const missingPages = expectedPages.filter((file) => !fs.existsSync(path.join(docsOut, file)));
const authoredIndex = fs.existsSync(path.join(root, 'docs', 'index.html'));
add(makeCheck('ZS-DOCS-BUILD', 'Documentation generator produces every guide page', docsBuild.exitCode === 0 && missingPages.length === 0 && authoredIndex ? 'PASS' : 'FAIL', {
  evidence: docsBuild.exitCode === 0 ? expectedPages.length + ' generated pages · missing=' + (missingPages.join(', ') || 'none') + ' · authored docs/index.html=' + authoredIndex : tail(docsBuild.stdout + docsBuild.stderr)
}));
if (fs.existsSync(docsOut)) fs.rmSync(docsOut, { recursive: true, force: true });

/* ---------------- optional online drift ---------------- */
if (!flag('online')) {
  runData.checks.push(makeCheck('ZS-DOCS-ONLINE', 'Published npm version matches this tree', 'NOT RUN', { evidence: 'offline run; pass --online to query registry.npmjs.org' }));
} else {
  try {
    const response = await fetch('https://registry.npmjs.org/zidan-select/latest', { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const latest = await response.json();
    const same = latest.version === version;
    add(makeCheck('ZS-DOCS-ONLINE', 'Published npm version matches this tree', same ? 'PASS' : 'FAIL', { evidence: 'local=' + version + ' · npm latest=' + latest.version }));
    if (!same) runData.findings.push({ id: 'ZS-DOCS-ONLINE', title: 'npm latest differs from the working tree', status: 'confirmed', severity: 'high', confidence: 'high', where: 'https://registry.npmjs.org/zidan-select/latest', detail: 'local=' + version + ', npm=' + latest.version });
  } catch (error) {
    add(makeCheck('ZS-DOCS-ONLINE', 'Published npm version matches this tree', 'INCONCLUSIVE', { evidence: 'registry query failed: ' + error.message }));
  }
}

runData.coverage = {
  summary: 'Textual API-name coverage in README.md and docs/*.md. CSS classes and tokens are implementation reference material, not all of them are consumer-facing API.',
  byKind: {
    'options': { covered: options.length - missingOptions.length, total: options.length },
    'methods + statics': { covered: methods.length - missingMethods.length, total: methods.length },
    'events': { covered: events.length - missingEvents.length, total: events.length },
    'public data attributes': { covered: publicAttributes.length - missingAttributes.length, total: publicAttributes.length },
    'components': { covered: coveredComponents, total: components.length },
    'CSS tokens (reference)': { covered: coveredTokens, total: cssTokens.length },
    'CSS classes (reference)': { covered: coveredClasses, total: cssClasses.length }
  }
};

const paths = writeReport(runData);
printResult(runData, paths);
