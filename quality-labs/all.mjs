#!/usr/bin/env node
/**
 * Cross-lab runner. Each lab stays independently runnable and writes its own
 * report; this runner invokes them sequentially and records partial failures
 * without masking them. Audit-only: it does not edit production source.
 */
import path from 'node:path';
import {
  root, createRun, writeReport, printResult, makeCheck, run, tail
} from './shared/common.mjs';

const LABS = [
  { id: 'test', name: 'Testing Lab', script: 'quality-labs/test/run.mjs' },
  { id: 'demo', name: 'Demo Lab', script: 'quality-labs/demo/run.mjs' },
  { id: 'bugs', name: 'Bug Finder Lab', script: 'quality-labs/bugs/run.mjs' },
  { id: 'docs', name: 'Documentation Lab', script: 'quality-labs/docs/run.mjs' }
];

const forwarded = process.argv.slice(2).filter((arg) => arg === '--online');
const runData = createRun('all', {
  limitations: [
    'The combined runner reports each lab result as a unit; inspect the individual report for check-level evidence.',
    'A failing lab is not retried and is never converted into a pass.',
    'The runner forwards only --online (Documentation Lab); other flags must be passed to the individual lab.',
    'Labs execute sequentially to keep browser, build and report artifacts isolated.'
  ]
});

for (const lab of LABS) {
  const started = Date.now();
  const result = run(process.execPath, [path.join(root, lab.script), ...forwarded], { timeout: 600000 });
  const durationMs = Date.now() - started;
  runData.commands.push(result);
  const passed = result.exitCode === 0;
  const outputLines = (result.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const summary = outputLines.find((line) => /^(PASS|FAIL)\s/.test(line)) || (passed ? 'PASS' : 'FAIL');
  const counts = outputLines.find((line) => /^passed \d+/.test(line)) || '';
  const errorTail = passed ? '' : tail(result.stderr, 300);
  runData.checks.push(makeCheck('ZS-ALL-' + lab.id.toUpperCase(), lab.name + ' completed', passed ? 'PASS' : 'FAIL', {
    durationMs,
    evidence: 'exit ' + result.exitCode + ' · ' + summary + (counts ? ' · ' + counts : '') + (errorTail ? ' · ' + errorTail : '')
  }));
  process.stdout.write((passed ? 'PASS  ' : 'FAIL  ') + lab.name + ' (' + Math.round(durationMs / 1000) + 's)\n');
  if (result.stdout) process.stdout.write(result.stdout.split(/\r?\n/).filter((line) => /^(PASS|FAIL|\s+passed|\s+report)/.test(line)).join('\n') + '\n');
  if (!passed && result.stderr) process.stdout.write(result.stderr + '\n');
}

runData.coverage = {
  summary: 'Cross-lab gate: one check per independently executed lab.',
  byKind: Object.fromEntries(LABS.map((lab) => [lab.name, { covered: runData.checks.find((check) => check.id === 'ZS-ALL-' + lab.id.toUpperCase()).status === 'PASS' ? 1 : 0, total: 1 }]))
};

const paths = writeReport(runData);
printResult(runData, paths);
