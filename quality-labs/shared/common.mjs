#!/usr/bin/env node
/**
 * Shared runtime for the four Zidan Select quality labs.
 *
 * Responsibilities: repository/environment metadata, safe command execution,
 * stable run IDs, the shared report contract (JSON + Markdown) and small
 * filesystem helpers. No lab should invent its own report format.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const LAB_VERSION = '1.0.0';
export const SCHEMA_VERSION = 1;
export const REPORTS = path.join(root, 'quality-labs', 'reports');

export const STATUS = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
  SKIP: 'SKIP',
  BLOCKED: 'BLOCKED',
  NOT_RUN: 'NOT RUN',
  UNSUPPORTED: 'UNSUPPORTED',
  INCONCLUSIVE: 'INCONCLUSIVE',
  FLAKY: 'FLAKY'
});

const STATUS_KEYS = {
  'PASS': 'passed',
  'FAIL': 'failed',
  'SKIP': 'skipped',
  'BLOCKED': 'blocked',
  'NOT RUN': 'notRun',
  'UNSUPPORTED': 'unsupported',
  'INCONCLUSIVE': 'inconclusive',
  'FLAKY': 'flaky'
};

export function argValue(name, fallback = null) {
  const eq = process.argv.find((value) => value.startsWith('--' + name + '='));
  if (eq) return eq.slice(name.length + 3);
  const index = process.argv.indexOf('--' + name);
  if (index !== -1 && process.argv[index + 1] && !process.argv[index + 1].startsWith('--')) {
    return process.argv[index + 1];
  }
  return fallback;
}

export function flag(name) {
  return process.argv.includes('--' + name);
}

export function stamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0');
  return date.getFullYear() + pad(date.getMonth() + 1) + pad(date.getDate()) + '-' +
    pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds());
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function readPackage() {
  return readJson(path.join(root, 'package.json'));
}

export function git(args) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  return result.status === 0 ? result.stdout.trim() : '';
}

export function repoState() {
  const pkg = readPackage();
  const porcelain = git(['status', '--porcelain']);
  const dirtyFiles = porcelain ? porcelain.split(/\r?\n/).filter(Boolean) : [];
  return {
    root,
    packageName: pkg.name,
    version: pkg.version,
    branch: git(['branch', '--show-current']) || '(detached)',
    commit: git(['rev-parse', 'HEAD']) || '(unknown)',
    dirty: dirtyFiles.length > 0,
    dirtyFiles
  };
}

export function environment(extra = {}) {
  const windows = process.platform === 'win32';
  const npm = windows
    ? spawnSync('npm.cmd --version', [], { encoding: 'utf8', shell: true })
    : spawnSync('npm', ['--version'], { encoding: 'utf8' });
  return {
    node: process.version,
    npm: (npm.stdout || '').trim() || '(unavailable)',
    os: os.platform() + ' ' + os.release(),
    arch: os.arch(),
    cpus: os.cpus().length,
    ...extra
  };
}

export function commandLine(command, args) {
  const quote = (value) => /\s/.test(value) ? '"' + value + '"' : value;
  return [command, ...args].map(quote).join(' ');
}

/**
 * Execute one command and record it for the report. Never throws on a
 * non-zero exit; callers decide whether the exit code is a finding.
 */
export function run(command, args = [], options = {}) {
  const started = Date.now();
  const isWindowsScript = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command);
  const spawnCommand = isWindowsScript ? commandLine(command, args) : command;
  const spawnArgs = isWindowsScript ? [] : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: options.cwd || root,
    encoding: 'utf8',
    timeout: options.timeout || 180000,
    shell: isWindowsScript,
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024
  });
  const record = {
    command: commandLine(command, args),
    exitCode: result.status,
    signal: result.signal || null,
    durationMs: Date.now() - started,
    stdout: (result.stdout || '').replace(/\x1b\[[0-9;]*m/g, ''),
    stderr: (result.stderr || '').replace(/\x1b\[[0-9;]*m/g, '')
  };
  if (result.error) record.error = result.error.message;
  return record;
}

export function tail(text, limit = 1600) {
  const value = String(text || '').trim();
  return value.length <= limit ? value : '…' + value.slice(-limit);
}

export function countByStatus(checks) {
  const counts = { passed: 0, failed: 0, skipped: 0, blocked: 0, unsupported: 0, inconclusive: 0, flaky: 0, notRun: 0 };
  for (const check of checks) {
    const key = STATUS_KEYS[check.status];
    if (key) counts[key] += 1;
  }
  return counts;
}

export function makeCheck(id, name, status, options = {}) {
  return {
    id,
    name,
    status,
    severity: options.severity || null,
    detail: options.detail || '',
    evidence: options.evidence || '',
    durationMs: options.durationMs ?? null,
    ...options
  };
}

export function createRun(lab, options = {}) {
  const runId = options.runId || argValue('run-id') || stamp();
  return {
    schemaVersion: SCHEMA_VERSION,
    lab,
    labVersion: LAB_VERSION,
    runId,
    startedAt: new Date().toISOString(),
    repo: repoState(),
    environment: environment(options.environment || {}),
    options: options.options || {},
    commands: [],
    checks: [],
    coverage: options.coverage || null,
    limitations: options.limitations || [],
    findings: []
  };
}

export function finishRun(run) {
  run.finishedAt = new Date().toISOString();
  run.counts = countByStatus(run.checks);
  run.ok = run.counts.failed === 0;
  return run;
}

export function reportDir(lab, runId) {
  return path.join(REPORTS, lab, runId);
}

export function writeReport(run) {
  const dir = reportDir(run.lab, run.runId);
  fs.mkdirSync(dir, { recursive: true });
  finishRun(run);
  const jsonPath = path.join(dir, 'report.json');
  const mdPath = path.join(dir, 'report.md');
  fs.writeFileSync(jsonPath, JSON.stringify(run, null, 2) + '\n');
  fs.writeFileSync(mdPath, renderMarkdown(run));
  fs.writeFileSync(path.join(REPORTS, run.lab, 'latest.json'), JSON.stringify({ runId: run.runId, ok: run.ok, report: path.relative(root, jsonPath) }, null, 2) + '\n');
  return { dir, jsonPath, mdPath };
}

export function renderMarkdown(run) {
  const lines = [];
  lines.push('# ' + titleCase(run.lab) + ' Lab report', '');
  lines.push('> Run `' + run.runId + '` · ' + run.repo.packageName + ' ' + run.repo.version + ' · `' + run.repo.commit.slice(0, 12) + '`' + (run.repo.dirty ? ' · **dirty working tree**' : ' · clean working tree'), '');
  lines.push('| Field | Value |', '| --- | --- |');
  lines.push('| Started | ' + run.startedAt + ' |');
  lines.push('| Finished | ' + run.finishedAt + ' |');
  lines.push('| Branch | `' + run.repo.branch + '` |');
  lines.push('| Node | ' + run.environment.node + ' |');
  lines.push('| OS | ' + run.environment.os + ' (' + run.environment.arch + ') |');
  lines.push('| Report schema | ' + run.schemaVersion + ' |');
  lines.push('| Result | ' + (run.ok ? 'PASS' : 'FAIL') + ' |', '');
  lines.push('## Counts', '', '| Passed | Failed | Skipped | Blocked | Unsupported | Inconclusive | Flaky | Not run |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  const c = run.counts;
  lines.push('| ' + [c.passed, c.failed, c.skipped, c.blocked, c.unsupported, c.inconclusive, c.flaky, c.notRun].join(' | ') + ' |', '');
  if (run.commands.length) {
    lines.push('## Commands', '', '| Command | Exit | Duration |', '| --- | --- | --- |');
    for (const command of run.commands) lines.push('| `' + command.command.replace(/\|/g, '\\|') + '` | ' + command.exitCode + ' | ' + command.durationMs + ' ms |');
    lines.push('');
  }
  lines.push('## Checks', '', '| ID | Check | Status | Evidence |', '| --- | --- | --- | --- |');
  for (const check of run.checks) {
    const evidence = String(check.evidence || check.detail || '').replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').slice(0, 300);
    lines.push('| `' + check.id + '` | ' + String(check.name).replace(/\|/g, '\\|') + ' | **' + check.status + '** | ' + evidence + ' |');
  }
  lines.push('');
  if (run.coverage) {
    lines.push('## Coverage', '');
    if (run.coverage.summary) lines.push(run.coverage.summary, '');
    if (run.coverage.byKind) {
      lines.push('| Kind | Covered / Total | Percent |', '| --- | --- | --- |');
      for (const [kind, value] of Object.entries(run.coverage.byKind)) {
        const percent = value.total ? Math.round((value.covered / value.total) * 100) : 0;
        lines.push('| ' + kind + ' | ' + value.covered + ' / ' + value.total + ' | ' + percent + '% |');
      }
      lines.push('');
    }
  }
  if (run.findings.length) {
    lines.push('## Findings', '');
    for (const finding of run.findings) lines.push('### ' + finding.id + ' — ' + finding.title, '', '- Status: `' + finding.status + '`', '- Severity: `' + finding.severity + '`', '- Confidence: `' + finding.confidence + '`', '- Where: `' + (finding.where || '') + '`', '', finding.detail || '', '');
  }
  if (run.limitations.length) {
    lines.push('## Limitations', '');
    for (const limitation of run.limitations) lines.push('- ' + limitation);
    lines.push('');
  }
  lines.push('---', '', 'Generated by `quality-labs` (audit-only). Reports are not part of the npm package.', '');
  return lines.join('\n');
}

function titleCase(lab) {
  return lab.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function printResult(run, paths) {
  const c = run.counts;
  console.log('');
  console.log((run.ok ? 'PASS' : 'FAIL') + '  ' + run.lab + ' lab');
  console.log('  passed ' + c.passed + ' · failed ' + c.failed + ' · inconclusive ' + c.inconclusive + ' · not run ' + c.notRun);
  console.log('  report ' + path.relative(root, paths.mdPath));
  if (!run.ok) process.exitCode = 1;
}

export function walk(dir, options = {}) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.build' || entry.name === 'reports') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, options));
    else if (!options.filter || options.filter(full)) out.push(full);
  }
  return out;
}

export function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}
