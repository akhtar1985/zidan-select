#!/usr/bin/env node
/**
 * Generates lab-inventory.js — the single source of truth the testing lab reads.
 *
 * The lab must never hand-maintain a list of options, methods, events or CSS
 * names: those drift the moment the plugin changes. This script derives the
 * complete inventory from the files that define the public surface:
 *
 *   zidan-form.d.ts      -> options, callbacks, classes and their methods
 *   zidan-form.js        -> every emitted `zidan:*` event and field callback
 *   plugin-core.css      -> every `zs-*` class
 *   plugin-theme.css     -> every `--zs-*` token, theme and framework adapter
 *   package.json         -> version the inventory was generated from
 *
 *   node scripts/lab-inventory.mjs            # write lab-inventory.js
 *   node scripts/lab-inventory.mjs --check    # exit 1 when the file is stale
 *   node scripts/lab-inventory.mjs --json     # print the inventory as JSON
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const uniq = (list) => [...new Set(list.filter(Boolean))].sort();

const pkg = JSON.parse(read('package.json'));
const dts = read('zidan-form.d.ts');
const js = read('zidan-form.js');
const coreCss = read('plugin-core.css');
const themeCss = read('plugin-theme.css');
const allCss = coreCss + '\n' + themeCss;

/* ---------- tiny TypeScript source reader (no compiler dependency) ---------- */

/** Return the `{...}` block that starts at `start` (which must point at `{`). */
function braceBlock(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function bracketBlock(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return '';
}

function interfaceBody(name) {
  const match = new RegExp('export\\s+interface\\s+' + name + '\\b[^{]*').exec(dts);
  if (!match) return '';
  return braceBlock(dts, dts.indexOf('{', match.index + match[0].length));
}

function classBody(name) {
  const match = new RegExp('export\\s+class\\s+' + name + '\\b[^{]*').exec(dts);
  if (!match) return '';
  return braceBlock(dts, dts.indexOf('{', match.index + match[0].length));
}
/** Top-level `name?:` / `name:` keys of an interface body (2-space indent). */
function propertyKeys(body) {
  return body.split('\n').map((line) => {
    const match = /^\s{2}([A-Za-z_$][\w$]*)\??\s*[:(<]/.exec(line);
    return match ? match[1] : null;
  }).filter(Boolean);
}

/** Public (non-constructor) method names declared at the top level of a class/interface. */
function methodNames(body) {
  return body.split('\n').map((line) => {
    if (/^\s{2}(?:static|readonly|private|protected)\b/.test(line)) return null;
    const match = /^\s{2}([A-Za-z_$][\w$]*)\s*[(<]/.exec(line);
    return match && match[1] !== 'constructor' ? match[1] : null;
  }).filter(Boolean);
}

function staticMembers(body) {
  const names = [];
  for (const line of body.split('\n')) {
    const match = /^\s{2}static\s+(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*[:(<]/.exec(line);
    if (match) names.push(match[1]);
  }
  return uniq(names);
}

function unionValues(name) {
  const match = new RegExp('export\\s+type\\s+' + name + '\\s*=').exec(dts);
  if (!match) return [];
  let depth = 0;
  let end = match.index + match[0].length;
  for (; end < dts.length; end += 1) {
    const ch = dts[end];
    if ('{(<['.includes(ch)) depth += 1;
    else if ('})>]'.includes(ch)) depth -= 1;
    else if (ch === ';' && depth === 0) break;
  }
  return uniq([...dts.slice(match.index, end).matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

/** A `var NAME = ['a', 'b']` array literal from the runtime source. */
function sourceArray(name) {
  const match = new RegExp('(?:var|const|let)\\s+' + name + '\\s*=\\s*\\[').exec(js);
  if (!match) return [];
  const start = js.indexOf('[', match.index + match[0].length - 1);
  return uniq([...bracketBlock(js, start).matchAll(/'([^']+)'/g)].map((m) => m[1]));
}
/* ---------- public surface ---------- */

const selectCallbacks = propertyKeys(interfaceBody('SelectCallbacks'));
const selectOwnOptions = propertyKeys(interfaceBody('SelectOptions'));
const baseFieldOptions = propertyKeys(interfaceBody('FieldOptions'));
const fileFieldOptions = propertyKeys(interfaceBody('FileFieldOptions'));
const textFieldOptions = propertyKeys(interfaceBody('TextFieldOptions'));

const selectMethods = methodNames(classBody('ZidanSelect'));
const baseFieldMethods = methodNames(classBody('ZidanFieldBase'));
const checkboxMethods = methodNames(classBody('ZidanCheckbox'));
const radioMethods = methodNames(classBody('ZidanRadioGroup'));
const fileMethods = methodNames(classBody('ZidanFileUpload'));
const textMethods = methodNames(classBody('ZidanTextField'));
const selectStatic = staticMembers(classBody('ZidanSelect'));
const formMethods = methodNames(interfaceBody('ZidanFormStatic'));

const fieldOptions = uniq([...baseFieldOptions, ...fileFieldOptions, ...textFieldOptions]).sort();
const fieldMethods = uniq([...baseFieldMethods, ...checkboxMethods, ...radioMethods, ...fileMethods, ...textMethods]);

const optionCallbacks = fieldOptions.filter((name) => /^on[A-Z]/.test(name));
// FieldBase#call('onSomething') invocations are the callbacks the runtime actually fires.
// Scan only the field side of the bundle: the select class (before the `fields`
// build marker) fires its own callbacks, which are tracked from SelectCallbacks
// and must not be duplicated into the field group where no field can reach them.
const fieldRegionAt = js.indexOf('/* @zidan-build:fields */');
const fieldJs = fieldRegionAt >= 0 ? js.slice(fieldRegionAt) : js;
const runtimeCallbacks = uniq([...fieldJs.matchAll(/\bcall\(\s*'([A-Za-z]+)'/g)].map((m) => m[1]))
  .filter((name) => /^on[A-Z]/.test(name));
const fieldCallbacks = uniq([...optionCallbacks, ...runtimeCallbacks]);

// Events come from FieldBase#emit('name') and from direct CustomEvent('zidan:name')
// dispatches (the form-level `zidan:validate`), so both spellings are collected.
const events = uniq([
  ...[...js.matchAll(/emit\(\s*'([a-z0-9-]+)'/g)].map((m) => m[1]),
  ...[...js.matchAll(/['"]zidan:([a-z0-9-]+)['"]/g)].map((m) => m[1])
]);

/* ---------- CSS vocabulary ---------- */

const cssClasses = uniq([...allCss.matchAll(/\.(zs-[a-z0-9-]+)/g)].map((m) => m[1]));
const cssTokens = uniq([...themeCss.matchAll(/--zs-[a-z0-9-]+/g)].map((m) => m[0]));
const cssThemes = uniq([...allCss.matchAll(/data-zs-theme="([a-z0-9-]+)"/g)].map((m) => m[1]));
const cssFrameworks = uniq([...allCss.matchAll(/data-zs-framework="([a-z0-9-]+)"/g)].map((m) => m[1]));
const inventory = {
  version: pkg.version,
  generatedBy: 'scripts/lab-inventory.mjs',
  select: {
    options: uniq([...selectOwnOptions, ...selectCallbacks]).sort(),
    coreOptions: selectOwnOptions.sort(),
    callbacks: selectCallbacks.sort(),
    methods: selectMethods.sort(),
    staticMembers: selectStatic,
    modes: unionValues('SelectMode'),
    layouts: unionValues('SelectLayout'),
    themes: unionValues('Theme'),
    frameworks: unionValues('Framework'),
    scrollbars: unionValues('Scrollbar'),
    locales: ['en', 'es', 'fr', 'de', 'ar']
  },
  field: {
    options: fieldOptions,
    baseOptions: baseFieldOptions.sort(),
    fileOptions: fileFieldOptions.sort(),
    textOptions: textFieldOptions.sort(),
    callbacks: fieldCallbacks,
    methods: fieldMethods,
    baseMethods: baseFieldMethods.sort(),
    checkboxMethods: checkboxMethods.sort(),
    radioMethods: radioMethods.sort(),
    fileMethods: fileMethods.sort(),
    textMethods: textMethods.sort(),
    variants: {
      checkbox: sourceArray('CHECKBOX_VARIANTS'),
      switch: sourceArray('SWITCH_STYLES'),
      radio: sourceArray('RADIO_VARIANTS'),
      file: sourceArray('FILE_VARIANTS'),
      range: sourceArray('RANGE_VARIANTS'),
      stepper: sourceArray('STEPPER_MODES'),
      fieldLayouts: sourceArray('FIELD_LAYOUTS'),
      textTypes: sourceArray('TEXT_TYPES')
    }
  },
  form: {
    methods: formMethods.sort(),
    statics: [
      'version', 'themes', 'frameworks', 'fieldLayouts', 'fields', 'messages', 'locales',
      'icons', 'variants', 'stepperModes', 'phoneCountries', 'phoneFormats', 'api',
      'registerIcon', 'get', 'init', 'field', 'refresh', 'destroy', 'destroyAll', 'observe',
      'formatPhone', 'detectPhoneCountry', 'mask', 'unmask', 'downscaleImage', 'serialize', 'validate'
    ].sort()
  },
  events,
  css: {
    classes: cssClasses,
    tokens: cssTokens,
    themes: cssThemes,
    frameworks: cssFrameworks
  }
};

const banner = `/* Auto-generated by scripts/lab-inventory.mjs — do not edit by hand.
 * Regenerate with: npm run lab:inventory
 * Source of truth: zidan-form.d.ts, zidan-form.js, plugin-core.css, plugin-theme.css
 */
`;

const output = banner + 'window.ZIDAN_LAB_INVENTORY = ' + JSON.stringify(inventory, null, 2) + ';\n';
const target = path.join(root, 'lab-inventory.js');

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(inventory, null, 2) + '\n');
} else if (process.argv.includes('--check')) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
  if (current !== output) {
    console.error('lab-inventory.js is stale — run `npm run lab:inventory`.');
    process.exit(1);
  }
  console.log('lab-inventory.js is up to date.');
} else {
  fs.writeFileSync(target, output);
  console.log('wrote lab-inventory.js (v' + inventory.version + ')');
}

if (!process.argv.includes('--json')) {
  console.log('  select: ' + inventory.select.options.length + ' options, ' +
    inventory.select.callbacks.length + ' callbacks, ' + inventory.select.methods.length + ' methods');
  console.log('  field:  ' + inventory.field.options.length + ' options, ' +
    inventory.field.callbacks.length + ' callbacks, ' + inventory.field.methods.length + ' methods');
  console.log('  events: ' + inventory.events.length);
  console.log('  css:    ' + inventory.css.classes.length + ' classes, ' +
    inventory.css.tokens.length + ' tokens');
}