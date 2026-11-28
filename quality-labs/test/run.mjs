#!/usr/bin/env node
/**
 * Testing Lab — executes the repository's jsdom suite, declaration checks,
 * package/export checks and focused API/security/form checks. Audit-only:
 * it never edits production source (the build writes generated dist/ only).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  root, createRun, writeReport, printResult, run, makeCheck, relative, tail, flag
} from '../shared/common.mjs';
import { buildRegistry, writeRegistry } from '../shared/registry.mjs';
import {
  checkApiSurface, checkSecurityRendering, checkEventDelivery, checkFormIntegration,
  checkPackaging, checkExportResolution, checkInventoryFreshness
} from './checks.mjs';

const runData = createRun('test', {
  options: { build: !flag('no-build'), strict: flag('strict') },
  limitations: [
    'The jsdom suite is not browser verification; rendering, layout, focus and real keyboard behaviour belong to the Demo Lab.',
    'Coverage percentages count feature-name references in the test corpus. They are coverage leads, not proof that a behaviour was asserted.',
    'Options are not exhaustively instantiated with every documented value; method existence and selected behaviour are checked instead.',
    'Accessibility is asserted structurally in jsdom; no screen-reader or automated axe pass is included.',
    'Performance thresholds are not asserted; no reproducible performance run is part of this lab.'
  ]
});

function add(check) {
  runData.checks.push(makeCheck(check.id, check.name, check.status, check));
  if (check.command) runData.commands.push(check.command);
}

try {
  const registry = buildRegistry();
  writeRegistry(registry);

  add(checkInventoryFreshness());

  const types = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'types'], { timeout: 180000 });
  runData.commands.push(types);
  add(makeCheck('ZS-TYPES', 'TypeScript declarations compile (Bundler + NodeNext)', types.exitCode === 0 ? 'PASS' : 'FAIL', { evidence: types.exitCode === 0 ? 'both tsconfigs passed' : tail(types.stderr || types.stdout) }));

  if (!flag('no-build')) {
    const build = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { timeout: 180000 });
    runData.commands.push(build);
    add(makeCheck('ZS-BUILD', 'Build generated bundles and declarations inputs', build.exitCode === 0 ? 'PASS' : 'FAIL', { evidence: build.exitCode === 0 ? 'build completed (dist/ only)' : tail(build.stderr || build.stdout) }));
  }

  const hasDist = fs.existsSync(path.join(root, 'dist', 'select', 'zidan-select.js')) && fs.existsSync(path.join(root, 'dist', 'file', 'zidan-file.js'));
  if (!hasDist) {
    add(makeCheck('ZS-DOM-SUITE', 'Existing jsdom DOM suite', 'BLOCKED', { evidence: 'dist/ subset bundles are missing; run npm run build or omit --no-build' }));
  } else {
    const dom = run(process.execPath, ['quality-labs/test/dom-suite.mjs'], { timeout: 240000 });
    runData.commands.push(dom);
    const okLines = [];
    const failLines = [];
    for (const line of (dom.stdout || '').split(/\r?\n/)) {
      const ok = /^ok\s+(.+)$/.exec(line);
      const failed = /^FAIL\s+(.+?)\s+—\s+(.*)$/.exec(line);
      if (ok) okLines.push(ok[1]);
      else if (failed) failLines.push({ name: failed[1], message: failed[2] });
    }
    okLines.forEach((name, index) => {
      runData.checks.push(makeCheck('ZS-DOM-' + String(index + 1).padStart(3, '0'), name, 'PASS', { evidence: 'assertion passed' }));
    });
    failLines.forEach((failure, index) => {
      runData.checks.push(makeCheck('ZS-DOM-FAIL-' + String(index + 1).padStart(3, '0'), failure.name, 'FAIL', { evidence: failure.message }));
    });
    const summary = (dom.stdout || '').split(/\r?\n/).find((line) => line.startsWith('#ZS-DOM-SUMMARY#'));
    let parsed = null;
    if (summary) {
      try { parsed = JSON.parse(summary.slice('#ZS-DOM-SUMMARY#'.length)); } catch (error) { parsed = null; }
    }
    if (!parsed || parsed.total === 0) {
      add(makeCheck('ZS-DOM-RUN', 'Existing jsdom DOM suite completed', 'FAIL', { evidence: 'runner produced no summary; exit ' + dom.exitCode + '\n' + tail(dom.stderr || dom.stdout) }));
    } else if (parsed.failures > 0 || dom.exitCode !== 0) {
      add(makeCheck('ZS-DOM-RUN', 'Existing jsdom DOM suite completed', 'FAIL', { evidence: parsed.failures + ' failure(s) of ' + parsed.total }));
    } else {
      add(makeCheck('ZS-DOM-RUN', 'Existing jsdom DOM suite completed', 'PASS', { evidence: parsed.total + ' DOM tests passed' }));
    }
  }

  const subset = run(process.execPath, ['scripts/subset-audit.mjs'], { timeout: 120000 });
  runData.commands.push(subset);
  add(makeCheck('ZS-SUBSET-AUDIT', 'Select-only and file-only bundles are complete', subset.exitCode === 0 ? 'PASS' : 'FAIL', { evidence: subset.exitCode === 0 ? 'all subset checks passed' : tail(subset.stderr || subset.stdout) }));

  const api = checkApiSurface(registry);
  for (const check of api.checks) add(check);
  add(makeCheck('ZS-API-SURFACE', 'Declared public methods and static members resolve at runtime', api.checked === api.total && api.checks.every((check) => check.status !== 'FAIL') ? 'PASS' : 'FAIL', { evidence: api.checked + ' / ' + api.total + ' declared members checked' }));

  add(checkSecurityRendering());
  add(checkEventDelivery());
  add(await checkFormIntegration());
  add(checkPackaging());
  add(checkExportResolution());

  const kinds = ['options', 'methods', 'events', 'attributes'];
  const byKind = {};
  for (const kind of kinds) {
    const records = kind === 'options' ? registry.options : kind === 'methods' ? registry.methods : kind === 'events' ? registry.events : registry.attributes;
    const covered = records.filter((record) => (record.references.tests || []).length > 0).length;
    byKind[kind] = { covered, total: records.length };
  }
  byKind.demos = { covered: registry.demos.filter((demo) => demo.exists).length, total: registry.demos.length };
  byKind.documentation = { covered: registry.documentation.length, total: registry.documentation.length };
  runData.coverage = {
    summary: 'Reference coverage: a feature counts here when its name appears in the test corpus. This is not behavioural proof. API surface existence is checked separately for all ' + registry.methods.length + ' declared members.',
    byKind,
    surface: { methods: api.checked, total: api.total }
  };
  runData.registry = { counts: registry.counts, sourceHash: registry.sourceHash };
} catch (error) {
  runData.checks.push(makeCheck('ZS-LAB-ERROR', 'Testing Lab completed without an internal error', 'FAIL', { evidence: error.stack || error.message }));
}

const paths = writeReport(runData);
printResult(runData, paths);
