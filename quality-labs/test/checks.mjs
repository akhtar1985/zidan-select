#!/usr/bin/env node
/** Focused, repository-independent checks used by the Testing Lab. */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { root, run, readPackage, readJson, relative, tail } from '../shared/common.mjs';

const fullSource = fs.readFileSync(path.join(root, 'zidan-form.js'), 'utf8');

function boot(body = '') {
  const dom = new JSDOM('<!doctype html><html><body>' + body + '</body></html>', {
    runScripts: 'dangerously',
    url: 'https://zidan.test/'
  });
  dom.window.eval(fullSource);
  return dom.window;
}

const CLASS_BY_COMPONENT = {
  select: 'ZidanSelect',
  field: 'ZidanFieldBase',
  checkbox: 'ZidanCheckbox',
  switch: 'ZidanCheckbox',
  radio: 'ZidanRadioGroup',
  file: 'ZidanFileUpload',
  text: 'ZidanTextField',
  form: 'ZidanForm'
};

export function checkApiSurface(registry) {
  const window = boot();
  const results = [];
  const byComponent = new Map();
  for (const record of registry.methods) {
    if (!byComponent.has(record.component)) byComponent.set(record.component, []);
    byComponent.get(record.component).push(record);
  }
  let checked = 0;
  for (const [component, records] of byComponent) {
    const className = CLASS_BY_COMPONENT[component];
    /* Classes live either as a global (ZidanSelect) or on the public namespace
       (ZidanForm.api.ZidanCheckbox); ZidanForm itself is a namespace object. */
    const ctor = component === 'form'
      ? window.ZidanForm
      : window[className] || (window.ZidanForm && window.ZidanForm.api && window.ZidanForm.api[className]);
    if (typeof ctor !== 'function' && (typeof ctor !== 'object' || ctor === null)) {
      results.push({ id: 'ZS-API-' + component, name: 'Public class ' + className, status: 'FAIL', evidence: 'no runtime constructor/namespace for ' + className });
      continue;
    }
    const missing = [];
    for (const record of records) {
      const target = component === 'form' ? ctor : ctor.prototype;
      const resolved = record.kind === 'static-member' ? target[record.name] !== undefined : typeof target[record.name] === 'function';
      if (!resolved) missing.push(record.name);
      checked += 1;
    }
    results.push({
      id: 'ZS-API-' + component,
      name: 'Declared members resolve on ' + className + ' (' + records.length + ')',
      status: missing.length ? 'FAIL' : 'PASS',
      detail: missing.length ? 'Missing: ' + missing.join(', ') : records.length + ' methods resolve',
      evidence: missing.length ? missing.join(', ') : 'all declared methods/functions and static members resolve'
    });
  }
  const factories = ['zidanSelect', 'zidanField', 'ZidanForm'];
  const missingFactories = factories.filter((name) => !window[name]);
  results.push({
    id: 'ZS-API-FACTORIES',
    name: 'Public factories and namespaces are exposed',
    status: missingFactories.length ? 'FAIL' : 'PASS',
    evidence: missingFactories.length ? 'missing ' + missingFactories.join(', ') : factories.join(', ')
  });
  const version = window.ZidanForm && window.ZidanForm.version;
  const pkg = readPackage();
  results.push({
    id: 'ZS-API-VERSION',
    name: 'Runtime version matches package.json',
    status: version === pkg.version ? 'PASS' : 'FAIL',
    evidence: 'runtime ' + version + ' · package ' + pkg.version
  });
  return { checks: results, checked, total: registry.methods.length };
}

export function checkSecurityRendering() {
  const window = boot('<select id="s"><option value="a">&lt;img src=x onerror="window.__zsXss=1"&gt;Safe</option><option value="b">Beta</option></select>');
  let detail = '';
  try {
    const select = window.zidanSelect('#s');
    select.open();
    const option = select.dropdown.querySelector('.zs-option');
    const text = option ? option.textContent : '';
    const injectedElement = !!(option && option.querySelector('img, script'));
    const executed = window.__zsXss === 1;
    const ok = !!option && !injectedElement && !executed && text.includes('Safe');
    detail = 'text=' + JSON.stringify(text) + ' injectedElement=' + injectedElement + ' executed=' + executed;
    select.destroy();
    return { id: 'ZS-SEC-RENDER', name: 'Untrusted option labels render as text', status: ok ? 'PASS' : 'FAIL', evidence: detail };
  } catch (error) {
    return { id: 'ZS-SEC-RENDER', name: 'Untrusted option labels render as text', status: 'FAIL', evidence: error.message };
  }
}

export function checkEventDelivery() {
  const window = boot('<select id="s"><option value="a">A</option><option value="b">B</option></select>');
  const select = window.zidanSelect('#s');
  let changes = 0;
  select.on('change', () => { changes += 1; });
  select.setValue('b');
  const afterFirst = changes;
  select.setValue('b');
  const afterSame = changes;
  select.setValue('a');
  const afterSecond = changes;
  select.off && select.off('change');
  select.destroy();
  const ok = afterFirst === 1 && afterSame === 1 && afterSecond === 2;
  return {
    id: 'ZS-EVENT-DELIVERY',
    name: 'change fires once per effective value',
    status: ok ? 'PASS' : 'FAIL',
    evidence: 'first=' + afterFirst + ' same=' + afterSame + ' second=' + afterSecond
  };
}

export async function checkFormIntegration() {
  const window = boot('<form id="f"><select id="s" name="plan" required><option value="a">A</option><option value="b">B</option></select><input name="email" value="a@b.co"></form>');
  const select = window.zidanSelect('#s');
  const form = window.document.getElementById('f');
  select.setValue('b');
  const data = new window.FormData(form);
  const valid = form.checkValidity();
  form.reset();
  await new Promise((resolve) => setTimeout(resolve, 30));
  const resetValue = select.el.value;
  const displayed = select.input.value;
  select.destroy();
  const ok = data.get('plan') === 'b' && valid === true && resetValue === 'a' && displayed === 'A';
  return {
    id: 'ZS-FORM-SYNC',
    name: 'Native FormData, reset and required state stay in sync',
    status: ok ? 'PASS' : 'FAIL',
    evidence: 'FormData=' + data.get('plan') + ' valid=' + valid + ' reset=' + resetValue + ' displayed=' + JSON.stringify(displayed)
  };
}

export function checkPackaging() {
  const pkg = readPackage();
  const packed = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { timeout: 120000 });
  if (packed.exitCode !== 0) {
    return { id: 'ZS-PACK-CONTENT', name: 'npm pack --dry-run', status: 'FAIL', evidence: tail(packed.stderr || packed.stdout), command: packed };
  }
  let files = [];
  try {
    const parsed = JSON.parse(packed.stdout);
    files = (parsed[0] && parsed[0].files ? parsed[0].files : []).map((entry) => entry.path);
  } catch (error) {
    return { id: 'ZS-PACK-CONTENT', name: 'npm pack --dry-run', status: 'FAIL', evidence: 'unparseable npm pack JSON: ' + error.message, command: packed };
  }
  const required = ['zidan-form.js', 'zidan-form.mjs', 'zidan-form.d.ts', 'zidan-form.d.mts', 'plugin-core.css', 'plugin-theme.css', 'README.md', 'dist/select/zidan-select.js', 'dist/select/zidan-select.d.mts', 'dist/file/zidan-file.js', 'dist/file/zidan-file.d.mts'];
  const missing = required.filter((file) => !files.includes(file));
  const labFiles = files.filter((file) => file.startsWith('quality-labs/'));
  const ok = missing.length === 0 && labFiles.length === 0;
  return {
    id: 'ZS-PACK-CONTENT',
    name: 'Packed artifact contains entry points/declarations and excludes labs',
    status: ok ? 'PASS' : 'FAIL',
    evidence: 'files=' + files.length + ' missing=' + (missing.join(', ') || 'none') + ' labFiles=' + labFiles.length,
    command: packed
  };
}

export function checkExportResolution() {
  const result = run(process.execPath, ['--input-type=module', '-e', 'const a=await import("./zidan-form.mjs"); const s=await import("./dist/select/zidan-select.mjs"); const f=await import("./dist/file/zidan-file.mjs"); console.log([a.default.version,s.default.version,f.default.version].join(","));'], { timeout: 60000 });
  const value = (result.stdout || '').trim();
  const pkg = readPackage();
  const ok = result.exitCode === 0 && value === [pkg.version, pkg.version, pkg.version].join(',');
  return { id: 'ZS-PACK-ESM', name: 'ESM entries import without a browser', status: ok ? 'PASS' : 'FAIL', evidence: ok ? value : tail(result.stderr || result.stdout), command: result };
}

export function checkInventoryFreshness() {
  const result = run(process.execPath, ['scripts/lab-inventory.mjs', '--check'], { timeout: 60000 });
  return { id: 'ZS-REGISTRY-FRESH', name: 'lab-inventory.js is current', status: result.exitCode === 0 ? 'PASS' : 'FAIL', evidence: result.exitCode === 0 ? 'no drift' : tail(result.stderr || result.stdout), command: result };
}

export function loadRegistryFile() {
  return readJson(path.join(root, 'quality-labs', 'shared', 'feature-registry', 'registry.json'));
}
