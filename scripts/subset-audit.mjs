#!/usr/bin/env node
/**
 * Audits the select-only and file-only bundles against the full build.
 *
 * A subset is a standalone build, not an add-on, so it must be complete on its
 * own: the JavaScript it ships, the CSS it ships, the options it documents and
 * the features it exposes may not drift from the core source.
 *
 * The JavaScript checks are empirical — every bundle is booted in jsdom and its
 * real runtime surface is inspected. Text scanning cannot tell a guarded
 * reference (`typeof ZidanSelect !== 'undefined'`) from a broken one, and it
 * cannot tell a CSS rule the bundle needs from one it does not.
 *
 *   node scripts/subset-audit.mjs           # report
 *   node scripts/subset-audit.mjs --json    # machine readable
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const pkg = JSON.parse(read('package.json'));
const fullTheme = read('plugin-theme.css');
const problems = [];
const notes = [];

function problem(area, message) {
  problems.push({ area, message });
}

function note(area, message) {
  notes.push({ area, message });
}

/* ---------- boot a bundle and read its real surface ---------- */

function boot(source, body = '') {
  const dom = new JSDOM('<!doctype html><html><body>' + body + '</body></html>', {
    runScripts: 'dangerously',
    url: 'https://zidan.test/'
  });
  dom.window.DataTransfer = class {
    constructor() { this._files = []; this.items = { add: (file) => this._files.push(file) }; }
    get files() { const list = this._files.slice(); list.item = (i) => list[i] || null; return list; }
  };
  Object.defineProperty(dom.window.HTMLInputElement.prototype, 'files', {
    configurable: true,
    get() { return this.__files || []; },
    set(value) { this.__files = Array.prototype.slice.call(value); }
  });
  dom.window.eval(source);
  return dom.window;
}

function surfaceOf(file, body) {
  const window = boot(read(file), body);
  return {
    window,
    version: window.ZidanForm ? window.ZidanForm.version : null,
    globals: Object.keys(window)
      .filter((key) => /^(Zidan|zidan|initZidan|registerZidan)/.test(key))
      .sort(),
    api: window.ZidanForm && window.ZidanForm.api ? Object.keys(window.ZidanForm.api).sort() : [],
    statics: window.ZidanForm
      ? Object.keys(window.ZidanForm).filter((key) => typeof window.ZidanForm[key] !== 'function').sort()
      : []
  };
}
/* ---------- the variant matrix ---------- */

const VARIANTS = [
  {
    key: 'select',
    label: 'Select-only',
    js: 'dist/select/zidan-select.js',
    min: 'dist/select/zidan-select.min.js',
    mjs: 'dist/select/zidan-select.mjs',
    dts: 'dist/select/zidan-select.d.ts',
    core: 'dist/select/plugin-select-core.css',
    theme: 'dist/select/plugin-select-theme.css',
    coreMin: 'dist/select/plugin-select-core.min.css',
    themeMin: 'dist/select/plugin-select-theme.min.css',
    api: ['ZidanSelect', 'zidanSelect', 'initZidanSelects', 'registerIcon'],
    globals: ['ZidanForm', 'ZidanSelect', 'zidanSelect', 'initZidanSelects', 'registerZidanIcon'],
    coreNeeded: ['.zs-root', '.zs-control', '.zs-dropdown', '.zs-option', '.zs-chip', '.zs-field'],
    probe: '<select id="s"><option value="a">A</option></select>'
  },
  {
    key: 'file',
    label: 'File-only',
    js: 'dist/file/zidan-file.js',
    min: 'dist/file/zidan-file.min.js',
    mjs: 'dist/file/zidan-file.mjs',
    dts: 'dist/file/zidan-file.d.ts',
    core: 'dist/file/plugin-file-core.css',
    theme: 'dist/file/plugin-file-theme.css',
    coreMin: 'dist/file/plugin-file-core.min.css',
    themeMin: 'dist/file/plugin-file-theme.min.css',
    api: ['ZidanFileUpload', 'zidanField', 'initZidanForms', 'downscaleImage', 'registerIcon'],
    globals: ['ZidanForm', 'zidanField', 'initZidanForms', 'registerZidanIcon'],
    coreNeeded: ['.zs-root', '.zs-field', '.zs-file-drop', '.zs-file-list', '.zs-native-input'],
    probe: '<input id="f" type="file">'
  }
];

/* ---------- 1. every bundle boots and exposes the right surface ---------- */

for (const variant of VARIANTS) {
  if (!exists(variant.js)) {
    problem(variant.key, variant.js + ' is missing — run `npm run build`');
    continue;
  }

  const surface = surfaceOf(variant.js, variant.probe);

  if (!surface.version) {
    problem(variant.key, variant.js + ' did not expose window.ZidanForm');
  } else if (surface.version !== pkg.version) {
    problem(variant.key, variant.js + ' reports v' + surface.version + ', package.json says ' + pkg.version);
  }

  for (const name of variant.api) {
    if (surface.api.indexOf(name) === -1) {
      problem(variant.key, variant.js + ' does not export ' + name + ' on ZidanForm.api');
    }
  }
  for (const name of variant.globals) {
    if (surface.globals.indexOf(name) === -1) {
      problem(variant.key, variant.js + ' does not expose window.' + name);
    }
  }

  /* the minified copy must expose exactly the same surface */
  if (!exists(variant.min)) {
    problem(variant.key, variant.min + ' is missing');
  } else {
    const min = surfaceOf(variant.min, variant.probe);
    const missing = variant.api.filter((name) => min.api.indexOf(name) === -1);
    if (missing.length) {
      problem(variant.key, variant.min + ' drops ' + missing.join(', '));
    }
    if (min.version !== surface.version) {
      problem(variant.key, variant.min + ' reports v' + min.version +
        ' but ' + variant.js + ' reports v' + surface.version);
    }
  }

  /* the .d.ts and .mjs wrappers must re-export what the bundle implements */
  if (!exists(variant.dts)) {
    problem(variant.key, variant.dts + ' is missing');
  } else {
    const dts = read(variant.dts);
    for (const name of variant.api) {
      if (!dts.includes(name)) {
        problem(variant.key, variant.dts + ' does not re-export ' + name);
      }
    }
    if (!dts.includes(pkg.version)) {
      problem(variant.key, variant.dts + ' does not carry the current version ' + pkg.version);
    }
  }
  if (!exists(variant.mjs)) {
    problem(variant.key, variant.mjs + ' is missing');
  } else {
    const mjs = read(variant.mjs);
    for (const name of variant.api) {
      if (!mjs.includes(name)) {
        problem(variant.key, variant.mjs + ' does not re-export ' + name);
      }
    }
  }
}
/* ---------- 2. CSS parity ---------- */

function adapterBlock(css, framework) {
  const marker = '.zs-root[data-zs-framework="' + framework + '"],';
  const start = css.indexOf(marker);
  return start === -1 ? '' : css.slice(start, css.indexOf('\n}', start)).trim();
}

/* the body of one @zidan-build slice, up to the next marker */
function buildSection(css, name) {
  const marker = '/* @zidan-build:' + name + ' */';
  const start = css.indexOf(marker);
  if (start === -1) return '';
  const rest = css.slice(start + marker.length);
  const next = rest.search(/\/\* @zidan-build:[a-z0-9-]+ \*\//);
  return next === -1 ? rest : rest.slice(0, next);
}

/* tokens the stylesheet defines (`--zs-x: value`) */
function declaredTokens(css) {
  return new Set([...css.matchAll(/(--zs-[a-z0-9-]+)\s*:/g)].map((match) => match[1]));
}

/* tokens the stylesheet consumes (`var(--zs-x)`) */
function referencedTokens(css) {
  return new Set([...css.matchAll(/var\(\s*(--zs-[a-z0-9-]+)/g)].map((match) => match[1]));
}

const FRAMEWORKS = ['bootstrap', 'tailwind', 'bulma', 'foundation'];

for (const variant of VARIANTS) {
  if (!exists(variant.theme)) continue;

  const subsetTheme = read(variant.theme);

  /* every adapter block must be identical to the full theme */
  for (const framework of FRAMEWORKS) {
    const expected = adapterBlock(fullTheme, framework);
    if (!expected) {
      problem(variant.key, 'the full theme omits the ' + framework + ' adapter');
      continue;
    }
    if (adapterBlock(subsetTheme, framework) !== expected) {
      problem(variant.key, variant.theme + ' has a stale ' + framework + ' adapter');
    }
  }

  /* every token in the base override surface — the shared `tokens` section —
     must be declared by the subset theme, so `data-zs-*` overrides behave the
     same as in the full build. Tokens a body section declares for itself (such
     as the scrollbar variant) are covered by the self-consistency check below
     rather than required here. */
  const baseTokens = [...declaredTokens(buildSection(fullTheme, 'tokens'))].sort();
  const subsetDeclared = declaredTokens(subsetTheme);
  const missingTokens = baseTokens.filter((token) => !subsetDeclared.has(token));
  if (missingTokens.length) {
    problem(variant.key, variant.theme + ' omits ' + missingTokens.length + ' base token(s): ' +
      missingTokens.slice(0, 8).join(', '));
  }

  /* and the subset theme may not reference a token it never declares — a rule
     that survived slicing but lost the section that declared its token would
     silently resolve to nothing */
  const undeclared = [...referencedTokens(subsetTheme)]
    .filter((token) => !subsetDeclared.has(token))
    .sort();
  if (undeclared.length) {
    problem(variant.key, variant.theme + ' references ' + undeclared.length +
      ' undeclared token(s): ' + undeclared.slice(0, 8).join(', '));
  }

  /* every preset theme must exist in the subset theme */
  for (const theme of ['modern', 'minimal', 'dark', 'glass']) {
    if (!subsetTheme.includes('[data-zs-theme="' + theme + '"]')) {
      problem(variant.key, variant.theme + ' omits the ' + theme + ' preset theme');
    }
  }

  /* the core subset must define the structural classes it needs */
  if (exists(variant.core)) {
    const subsetCore = read(variant.core);
    for (const selector of variant.coreNeeded) {
      if (!subsetCore.includes(selector)) {
        problem(variant.key, variant.core + ' omits ' + selector);
      }
    }
    /* the core stylesheet must stay structural: no colour literals */
    const hex = subsetCore.match(/#[0-9a-f]{3,8}\b/gi) || [];
    if (hex.length) {
      problem(variant.key, variant.core + ' contains colour literals: ' + hex.slice(0, 4).join(', '));
    }
  }
}

/* ---------- 3. the field layouts the bundle actually renders ---------- */

/*
 * A bundle that exposes setLayout() must ship the CSS for every layout it
 * advertises. The layouts are shared by every field family, so a rule that
 * lives in a section one bundle omits silently stops working there.
 *
 * The check is behavioural: the bundle's own stylesheet is loaded into jsdom
 * and the computed style of a real field is compared with the full build.
 */
const LAYOUTS = ['inline', 'card', 'compact'];

function computedFor(cssFile, layout) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously',
    url: 'https://zidan.test/'
  });
  const style = dom.window.document.createElement('style');
  style.textContent = read(cssFile);
  dom.window.document.head.appendChild(style);
  const host = dom.window.document.createElement('div');
  host.className = 'zs-field';
  host.setAttribute('data-zs-layout', layout);
  dom.window.document.body.appendChild(host);
  const computed = dom.window.getComputedStyle(host);
  return {
    padding: computed.paddingTop,
    borderStyle: computed.borderStyle,
    flexDirection: computed.flexDirection
  };
}

for (const variant of VARIANTS) {
  if (!exists(variant.core)) continue;
  /* the select bundle renders no .zs-field shell, so only the file bundle
     needs the field layout rules the runtime can produce */
  if (variant.key !== 'file') continue;

  for (const layout of LAYOUTS) {
    const subset = computedFor(variant.core, layout);
    const full = computedFor('plugin-core.css', layout);
    const differs = subset.padding !== full.padding ||
      subset.borderStyle !== full.borderStyle ||
      subset.flexDirection !== full.flexDirection;
    if (differs) {
      problem(variant.key, variant.core + ' renders the "' + layout + '" layout differently from ' +
        'plugin-core.css (subset ' + JSON.stringify(subset) + ' vs full ' + JSON.stringify(full) + ')');
    }
  }
}

/* the file bundle must expose setLayout() and apply the attribute */
{
  const fileSurface = surfaceOf('dist/file/zidan-file.js', '<input id="f" type="file">');
  const fullSurface = surfaceOf('zidan-form.js', '<input id="f" type="file">');
  try {
    const fileField = fileSurface.window.zidanField('#f', { layout: 'card' });
    const fullField = fullSurface.window.zidanField('#f', { layout: 'card' });
    if (fileField.root.getAttribute('data-zs-layout') !== fullField.root.getAttribute('data-zs-layout')) {
      problem('file', 'the file bundle sets a different data-zs-layout than the full build');
    }
    fileField.setLayout('compact');
    if (fileField.root.getAttribute('data-zs-layout') !== 'compact') {
      problem('file', 'the file bundle setLayout() does not update data-zs-layout');
    }
    fileField.destroy();
    fullField.destroy();
  } catch (error) {
    problem('file', 'the file bundle could not create a card-layout field: ' + error.message);
  }
}
/* ---------- 4. the docs must describe the subsets ---------- */

const DOCS = {
  'README.md': ['dist/select/zidan-select.js', 'dist/file/zidan-file.js', 'plugin-select-core.css', 'plugin-file-core.css'],
  'docs/build.md': ['dist/select/zidan-select.js', 'dist/file/zidan-file.js', 'plugin-select-theme.css', 'plugin-file-theme.css'],
  'docs/html-and-wordpress.md': ['dist/select/zidan-select.js', 'dist/file/zidan-file.js'],
  'docs/options.md': ['## Select options', '## Field options', '## File upload', '## Instance methods', '## Events']
};

for (const [file, needles] of Object.entries(DOCS)) {
  if (!exists(file)) {
    problem('docs', file + ' is missing');
    continue;
  }
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      problem('docs', file + ' does not mention ' + needle);
    }
  }
}

/* ---------- 5. package.json exports must match the bundles ---------- */

for (const variant of VARIANTS) {
  const entry = './' + variant.key;
  const exported = pkg.exports[entry];
  if (!exported) {
    problem('package', 'package.json has no ' + entry + ' export');
    continue;
  }
  for (const target of Object.values(exported)) {
    if (!exists(target)) {
      problem('package', 'package.json export ' + entry + ' points at the missing ' + target);
    }
  }
  const min = pkg.exports[entry + '/min'];
  if (!min || !exists(min)) {
    problem('package', 'package.json has no working ' + entry + '/min export');
  }
  for (const css of [entry + '/css/core', entry + '/css/theme']) {
    if (!pkg.exports[css] || !exists(pkg.exports[css])) {
      problem('package', 'package.json has no working ' + css + ' export');
    }
  }
}

/* ---------- report ---------- */

const report = {
  version: pkg.version,
  variants: VARIANTS.map((variant) => ({
    key: variant.key,
    label: variant.label,
    js: variant.js,
    bytes: exists(variant.js) ? fs.statSync(path.join(root, variant.js)).size : 0
  })),
  problems,
  notes
};

if (process.argv.includes('--json')) {
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} else {
  report.variants.forEach((variant) => {
    console.log(variant.label.padEnd(12) + variant.js.padEnd(30) +
      String(variant.bytes).padStart(8) + ' B');
  });
  console.log('');
  if (problems.length) {
    problems.forEach((item) => console.log('  FAIL [' + item.area + '] ' + item.message));
    console.log('\n' + problems.length + ' subset problem(s)');
  } else {
    console.log('  all subset checks passed');
  }
  notes.forEach((item) => console.log('  note [' + item.area + '] ' + item.message));
}

process.exit(problems.length ? 1 : 0);