#!/usr/bin/env node
/**
 * Dependency-free checks (no DOM required):
 *   - JavaScript syntax for every shipped script
 *   - core CSS holds structure only (no colour literals)
 *   - the theme ships the documented presets and adapters
 *   - the public API names exist in the bundle
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log('ok   ' + name);
  } catch (err) {
    failures += 1;
    console.log('FAIL ' + name + ' — ' + err.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

check('JavaScript syntax', () => {
  for (const file of ['zidan-form.js', 'zidan-form.mjs', 'demo.js', 'scripts/build.mjs', 'scripts/serve.mjs']) {
    execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
  }
});

const core = read('plugin-core.css');
const theme = read('plugin-theme.css');

check('core CSS is structural only', () => {
  const hex = core.match(/#[0-9a-f]{3,8}\b/gi) || [];
  const rgb = core.match(/\brgba?\(/gi) || [];
  assert(hex.length === 0, 'found colour literals: ' + hex.slice(0, 5).join(', '));
  assert(rgb.length === 0, 'found rgb()/rgba() colour literals: ' + rgb.length);
});

check('core defines every component', () => {
  for (const selector of ['.zs-root', '.zs-field', '.zs-check', '.zs-switch-track', '.zs-radio-group', '.zs-file-drop', '.zs-input-shell', '.zs-native-input']) {
    assert(core.includes(selector), 'missing ' + selector);
  }
});

check('theme ships presets and adapters', () => {
  for (const themeName of ['modern', 'minimal', 'dark', 'glass']) {
    assert(theme.includes('[data-zs-theme="' + themeName + '"]'), 'missing theme ' + themeName);
  }
  for (const framework of ['bootstrap', 'tailwind', 'bulma', 'foundation']) {
    assert(theme.includes('[data-zs-framework="' + framework + '"]'), 'missing adapter ' + framework);
  }
  assert(theme.includes('--zs-check-checked-bg'), 'missing field tokens');
});

const js = read('zidan-form.js');

check('public API is exported', () => {
  for (const name of ['ZidanForm', 'ZidanSelect', 'ZidanCheckbox', 'ZidanRadioGroup', 'ZidanFileUpload', 'ZidanTextField', 'zidanField', 'initZidanForms']) {
    assert(new RegExp('window\\.' + name + '\\s*=').test(js) || js.includes(name + ': ' + name), 'missing export ' + name);
  }
});

check('native inputs stay reachable', () => {
  assert(/'zs-native-input'/.test(js), 'native input class missing');
  const nativeRule = core.split('.zs-native-input {')[1];
  assert(nativeRule, '.zs-native-input rule missing');
  const declarations = nativeRule.split('}')[0];
  assert(!/display:\s*none/.test(declarations), 'core hides the native input with display:none');
});

check('docs and demo reference the current files', () => {
  const html = read('index.html');
  assert(html.includes('plugin-core.css') && html.includes('plugin-theme.css'), 'demo does not load both stylesheets');
  assert(!html.includes('ZidanSelect.js'), 'demo still references the removed bundle');
  const readme = fs.existsSync(path.join(root, 'README.md')) ? read('README.md') : '';
  if (readme) assert(readme.includes('plugin-core.css'), 'README missing split CSS section');
  if (readme) assert(readme.includes('docs/comparison.md'), 'README does not link the comparison guide');
  assert(fs.existsSync(path.join(root, 'docs/comparison.md')), 'comparison guide missing');
});

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nall checks passed');
process.exit(failures ? 1 : 0);
