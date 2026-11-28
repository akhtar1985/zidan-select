#!/usr/bin/env node
/**
 * Bug Finder Lab — static defect scans, package/reference integrity, the
 * historical BUGS.md inventory and focused regression probes. Audit-only.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  root, createRun, writeReport, printResult, makeCheck, run, walk, relative, tail
} from '../shared/common.mjs';
import { radioChangeProbe, setOptionsErrorProbe, existingFieldFactoryProbe } from './probes.mjs';

const PAGES = ['index.html', 'advanced.html', 'playground.html', 'api.html', 'ajax.html', 'shopify.html', 'lab.html', 'docs/index.html', 'docs/options.html', 'docs/theming.html', 'docs/frameworks.html', 'docs/comparison.html', 'docs/validation.html', 'docs/validation-guide.html', 'docs/build.html', 'docs/html-and-wordpress.html'];
const runData = createRun('bugs', {
  limitations: [
    'Static scans cannot prove the absence of defects; they find classes of defect that are visible in source and packaging.',
    'The BUGS.md status table is treated as a claim inventory. Only the probes listed below independently re-check a claim.',
    'The security sink scan flags dangerous primitives for human review; it does not execute an exploit or prove sanitisation.',
    'No fuzzing, property-based testing, mutation testing or long-running stress test is included.'
  ]
});
function add(check) { runData.checks.push(makeCheck(check.id, check.name, check.status, check)); }
function finding(check, severity, where, detail) {
  runData.findings.push({ id: check.id, title: check.name, status: 'confirmed', severity, confidence: 'high', where, detail: detail || check.evidence });
}

/* ---------- git whitespace and syntax ---------- */
const diff = run('git', ['diff', '--check'], { timeout: 60000 });
runData.commands.push(diff);
add(makeCheck('ZS-BUG-WHITESPACE', 'Tracked changes have no whitespace errors', diff.exitCode === 0 ? 'PASS' : 'FAIL', { evidence: diff.exitCode === 0 ? 'git diff --check clean' : tail(diff.stdout || diff.stderr) }));

const sourceFiles = walk(root, { filter: (file) => /\.(?:m?js)$/.test(file) && !/[\\/](?:node_modules|dist|zidan-select-lab-kit|\.build)[\\/]/.test(file) });
const syntaxFailures = [];
for (const file of sourceFiles) {
  const check = run(process.execPath, ['--check', file], { timeout: 30000 });
  if (check.exitCode !== 0) syntaxFailures.push(relative(file) + ': ' + tail(check.stderr, 3));
}
add(makeCheck('ZS-BUG-SYNTAX', 'Every JavaScript/ESM source file parses', syntaxFailures.length === 0 ? 'PASS' : 'FAIL', { evidence: syntaxFailures.length ? syntaxFailures.join(' | ') : sourceFiles.length + ' files parsed with node --check' }));

/* ---------- duplicate IDs and local references ---------- */
function markupOnly(html) {
  return html.replace(/<pre[\s\S]*?<\/pre>/gi, '').replace(/<code[\s\S]*?<\/code>/gi, '');
}
const duplicateIds = [];
for (const file of PAGES) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const html = markupOnly(fs.readFileSync(path.join(root, file), 'utf8'));
  const seen = new Map();
  for (const match of html.matchAll(/\bid=["']([^"']+)["']/g)) seen.set(match[1], (seen.get(match[1]) || 0) + 1);
  for (const [id, count] of seen) if (count > 1) duplicateIds.push(file + '#' + id + ' ×' + count);
}
add(makeCheck('ZS-BUG-DUPLICATE-IDS', 'Demo and documentation pages have unique IDs', duplicateIds.length === 0 ? 'PASS' : 'FAIL', { evidence: duplicateIds.length ? duplicateIds.slice(0, 30).join(', ') : 'no duplicates across ' + PAGES.length + ' pages' }));

function slug(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').trim().replace(/\s/g, '-');
}
const PLAYGROUND_ANCHORS = new Set(['select', 'text', 'textarea', 'number', 'phone', 'range', 'date', 'switch', 'radio', 'file']);
const missingRefs = [];
const seenRefs = new Set();
function checkRef(fromFile, raw) {
  if (!raw || /\{\{/.test(raw) || /^(?:https?:|mailto:|tel:|javascript:|data:|\/\/)/i.test(raw) || raw === '#') return;
  const [rawPath, hash] = raw.split('#');
  const pathPart = (rawPath || '').split('?')[0];
  if (!pathPart && !hash) return;
  if (pathPart.endsWith('playground.html') && PLAYGROUND_ANCHORS.has(decodeURIComponent(hash || ''))) return;
  const target = pathPart ? path.resolve(path.dirname(path.join(root, fromFile)), decodeURIComponent(pathPart)) : path.join(root, fromFile);
  const key = fromFile + ' -> ' + raw;
  if (seenRefs.has(key)) return;
  seenRefs.add(key);
  if (!fs.existsSync(target)) { missingRefs.push(fromFile + ' -> ' + raw); return; }
  if (hash) {
    const content = fs.readFileSync(target, 'utf8');
    const decoded = decodeURIComponent(hash);
    const hasId = new RegExp('\\bid=["\']' + decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']').test(content);
    const hasName = new RegExp('\\bname=["\']' + decoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']').test(content);
    const hasHeading = content.split(/\r?\n/).some((line) => /^#{1,6}\s+/.test(line) && slug(line.replace(/^#{1,6}\s+/, '')) === decoded);
    if (!hasId && !hasName && !hasHeading) missingRefs.push(fromFile + ' -> ' + raw + ' (missing anchor)');
  }
}
for (const file of PAGES) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) checkRef(file, match[1]);
}
for (const file of walk(path.join(root, 'docs'), { filter: (entry) => entry.endsWith('.md') }).map(relative).concat(['README.md'])) {
  const markdown = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) checkRef(file, match[1]);
}
add(makeCheck('ZS-BUG-LOCAL-REFS', 'Local links, assets and anchors resolve', missingRefs.length === 0 ? 'PASS' : 'FAIL', { evidence: missingRefs.length ? missingRefs.slice(0, 40).join(' | ') : seenRefs.size + ' local references checked' }));
if (missingRefs.length) finding({ id: 'ZS-BUG-LOCAL-REFS', name: 'Broken local links or anchors', evidence: missingRefs.slice(0, 20).join('; ') }, 'medium', 'HTML/Markdown local references', missingRefs.slice(0, 20).join('\n'));

/* ---------- package exports ---------- */
function exportTargets(value) {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(exportTargets);
  if (value && typeof value === 'object') return Object.values(value).flatMap(exportTargets);
  return [];
}
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const targets = exportTargets(pkg.exports || {});
const badTargets = targets.filter((target) => !fs.existsSync(path.join(root, target.replace(/^\.\//, ''))));
const entryFields = ['main', 'module', 'types'].filter((field) => pkg[field] && !fs.existsSync(path.join(root, pkg[field].replace(/^\.\//, ''))));
add(makeCheck('ZS-BUG-EXPORTS', 'package.json export targets exist on disk', badTargets.length === 0 && entryFields.length === 0 ? 'PASS' : 'FAIL', { evidence: (badTargets.concat(entryFields)).join(', ') || targets.length + ' export targets and 3 entry fields resolve' }));

/* ---------- security sink review ---------- */
const sinkFiles = ['zidan-form.js', 'zidan-form.mjs', 'demo.js', 'lab.js', 'advanced.js', 'ajax.js', 'playground.js', 'nav.js'];
const sinks = [];
for (const file of sinkFiles) {
  if (!fs.existsSync(path.join(root, file))) continue;
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  content.split(/\r?\n/).forEach((line, index) => {
    if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(line)) {
      sinks.push({ file, line: index + 1, code: line.trim().slice(0, 180) });
    }
  });
}
add(makeCheck('ZS-BUG-SINKS', 'HTML/eval sinks are enumerated for security review', 'INCONCLUSIVE', { evidence: sinks.length + ' sink line(s): ' + sinks.slice(0, 12).map((sink) => sink.file + ':' + sink.line).join(', ') + ' — custom renderers are documented opt-in; no exploit was executed' }));
if (sinks.length) {
  runData.findings.push({ id: 'ZS-BUG-SINKS', title: 'HTML/eval sinks require review', status: 'inconclusive', severity: 'low', confidence: 'medium', where: sinks.slice(0, 6).map((sink) => sink.file + ':' + sink.line).join(', '), detail: 'Sinks: ' + sinks.map((sink) => sink.file + ':' + sink.line + ' ' + sink.code).join('\n') });
}

/* ---------- known bug inventory ---------- */
const bugsText = fs.readFileSync(path.join(root, 'BUGS.md'), 'utf8');
const section = bugsText.split('### Original v2.4.2 findings')[1] || '';
const rows = [];
for (const match of section.matchAll(/^\|\s*(\d{3})\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/gm)) {
  rows.push({ id: 'BUG-' + match[1], verdict: match[2].trim(), note: match[3].trim() });
}
const fixedIds = rows.filter((row) => /fixed/i.test(row.verdict) && !/already fixed/i.test(row.verdict)).map((row) => row.id);
const alreadyFixed = rows.filter((row) => /already fixed/i.test(row.verdict)).map((row) => row.id);
const noChange = rows.filter((row) => /not a bug|no change|documented|deferred/i.test(row.verdict)).map((row) => row.id);
add(makeCheck('ZS-BUG-INVENTORY', 'BUGS.md resolution inventory is complete and parseable', rows.length === 30 ? 'PASS' : 'FAIL', { evidence: rows.length + ' rows · fixed=' + fixedIds.length + ' · already fixed=' + alreadyFixed.length + ' · no-change/not-a-bug=' + noChange.length }));

const regressionText = fs.readFileSync(path.join(root, 'scripts', 'dom', 'run.mjs'), 'utf8');
const regressionIds = [...new Set([...regressionText.matchAll(/regression BUG-(\d{3})/g)].map((match) => 'BUG-' + match[1]))];
const unverifiedFixed = fixedIds.filter((id) => !regressionIds.includes(id));
add(makeCheck('ZS-BUG-REGRESSION-GAP', 'Named regressions cover every fixed BUGS.md entry', unverifiedFixed.length === 0 ? 'PASS' : 'INCONCLUSIVE', { evidence: regressionIds.length + ' named regressions (' + regressionIds.join(', ') + '); fixed without a named regression: ' + (unverifiedFixed.join(', ') || 'none') }));
if (unverifiedFixed.length) {
  runData.findings.push({ id: 'ZS-BUG-REGRESSION-GAP', title: 'Fixed bugs without a named regression test', status: 'inconclusive', severity: 'low', confidence: 'high', where: 'scripts/dom/run.mjs', detail: unverifiedFixed.join(', ') + ' are marked fixed but have no test name containing the bug ID. Behaviour may still be covered by unnamed tests.' });
}

/* ---------- probes ---------- */
for (const probe of [radioChangeProbe(), setOptionsErrorProbe(), existingFieldFactoryProbe()]) {
  add(probe);
  if (probe.status === 'FAIL') finding(probe, probe.severity, 'zidan-form.js', probe.detail + '\n\nEvidence: ' + probe.evidence);
}

runData.coverage = {
  inventory: { covered: rows.length, total: 30 },
  regressionTests: { covered: regressionIds.length, total: Math.max(fixedIds.length, 1) },
  probes: { covered: 3, total: 3 }
};
const paths = writeReport(runData);
printResult(runData, paths);
