#!/usr/bin/env node
/**
 * Source-grounded feature registry for the four labs.
 *
 * It deliberately reuses scripts/lab-inventory.mjs (already the API Lab's
 * single source of truth) instead of parsing the declarations a second time.
 * The registry adds stable IDs, component applicability, source locations and
 * current references in tests/demos/docs. A reference is a coverage *lead*, not
 * proof that a behaviour was executed: status stays `unverified` until a lab
 * executes an observable check.
 *
 *   node quality-labs/shared/registry.mjs            # summary
 *   node quality-labs/shared/registry.mjs --write    # write JSON registry
 *   node quality-labs/shared/registry.mjs --json     # print full registry
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { root, run, readPackage, walk, relative } from './common.mjs';

const SOURCE_FILES = ['zidan-form.d.ts', 'zidan-form.js', 'plugin-core.css', 'plugin-theme.css', 'package.json', 'README.md'];
const DOC_FILES = ['README.md', ...walk(path.join(root, 'docs'), { filter: (file) => file.endsWith('.md') }).map(relative)];
const DEMO_FILES = ['index.html', 'advanced.html', 'playground.html', 'api.html', 'ajax.html', 'shopify.html', 'demo.js', 'lab.js', 'advanced.js', 'ajax.js', 'playground.js', 'nav.js'];
const TEST_FILES = [...walk(path.join(root, 'scripts', 'dom'), { filter: (file) => file.endsWith('.mjs') }).map(relative), 'scripts/test.mjs', 'scripts/subset-audit.mjs', 'scripts/types/usage.ts', 'scripts/types/package.ts'];

const cache = new Map();
function text(file) {
  if (!cache.has(file)) cache.set(file, fs.readFileSync(path.join(root, file), 'utf8'));
  return cache.get(file);
}

function lineOf(file, pattern) {
  const content = text(file);
  const regex = pattern instanceof RegExp ? pattern : new RegExp(escapeRegex(pattern));
  const match = regex.exec(content);
  if (!match) return null;
  return content.slice(0, match.index).split('\n').length;
}

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function kebab(name) {
  return name.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

function mentions(files, pattern) {
  const hits = [];
  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) continue;
    const regex = pattern instanceof RegExp ? pattern : new RegExp(escapeRegex(pattern));
    if (regex.test(text(file))) hits.push(file);
  }
  return hits;
}

function firstRef(files, patterns) {
  for (const file of files) {
    if (!fs.existsSync(path.join(root, file))) continue;
    for (const pattern of patterns) {
      const line = lineOf(file, pattern);
      if (line) return { file, line };
    }
  }
  return null;
}

function sourceRef(file, patterns, fallbackName) {
  for (const pattern of patterns) {
    const line = lineOf(file, pattern);
    if (line) return { file, line };
  }
  const line = lineOf(file, fallbackName);
  return line ? { file, line } : null;
}

function optionPatterns(name) {
  return [
    new RegExp('\\bopts\\.' + escapeRegex(name) + '\\b'),
    new RegExp('\\boptions\\.' + escapeRegex(name) + '\\b'),
    new RegExp('["\']' + escapeRegex(name) + '["\']\\s*:'),
    new RegExp('data-zidan-' + escapeRegex(kebab(name)) + '\\b')
  ];
}

function methodPatterns(className, name, isStatic = false) {
  return isStatic
    ? [new RegExp(escapeRegex(className) + '\\.' + escapeRegex(name) + '\\s*=')]
    : [new RegExp(escapeRegex(className) + '\\.prototype\\.' + escapeRegex(name) + '\\s*='), new RegExp('\\.' + escapeRegex(name) + '\\s*=\\s*function')];
}

function optionRecord(name, component, group) {
  const canonical = component === 'select' ? 'ZidanSelect' : 'ZidanFieldBase';
  const source = firstRef(['zidan-form.js'], optionPatterns(name)) || firstRef(['zidan-form.d.ts'], [new RegExp('^\\s{2}' + escapeRegex(name) + '\\??\\s*:', 'm')]);
  const docs = firstRef(DOC_FILES, [new RegExp('\\b' + escapeRegex(name) + '\\b')]);
  return {
    id: 'ZS-' + component.toUpperCase() + '-OPT-' + name,
    component,
    kind: group === 'callback' ? 'callback' : 'option',
    name,
    group,
    source,
    declaration: { file: 'zidan-form.d.ts', symbol: canonical },
    references: {
      tests: mentions(TEST_FILES, new RegExp('\\b' + escapeRegex(name) + '\\b')),
      demos: mentions(DEMO_FILES, new RegExp('\\b' + escapeRegex(name) + '\\b')),
      docs
    },
    status: 'unverified',
    verifiedBy: null
  };
}

function methodRecord(component, className, name, isStatic = false) {
  const source = firstRef(['zidan-form.js'], methodPatterns(className, name, isStatic)) || firstRef(['zidan-form.d.ts'], [new RegExp('\\b' + escapeRegex(name) + '\\s*\\(')]);
  const docs = firstRef(DOC_FILES, [new RegExp('\\b' + escapeRegex(name) + '\\b')]);
  return {
    id: 'ZS-' + component.toUpperCase() + (isStatic ? '-STATIC-' : '-METHOD-') + name,
    component,
    kind: isStatic ? 'static-member' : 'method',
    name,
    owner: className,
    source,
    declaration: { file: 'zidan-form.d.ts', symbol: className + (isStatic ? '.' : '.prototype.') + name },
    references: {
      tests: mentions(TEST_FILES, new RegExp('\\.' + escapeRegex(name) + '\\s*\\(')),
      demos: mentions(DEMO_FILES, new RegExp('\\.' + escapeRegex(name) + '\\s*\\(')),
      docs
    },
    status: 'unverified',
    verifiedBy: null
  };
}

function eventComponent(name) {
  if (name.startsWith('upload-')) return 'file';
  if (name.startsWith('tag-')) return 'select';
  if (['open', 'close', 'select', 'no-results', 'load-more'].includes(name)) return 'select';
  if (['validation', 'async-validation', 'icon-click'].includes(name)) return 'field';
  return 'all';
}

function eventRecord(name) {
  const source = firstRef(['zidan-form.js'], [new RegExp('emit\\(\\s*["\']' + escapeRegex(name) + '["\']')]);
  return {
    id: 'ZS-EVENT-' + name,
    component: eventComponent(name),
    kind: 'event',
    name: 'zidan:' + name,
    source,
    declaration: null,
    references: {
      tests: mentions(TEST_FILES, new RegExp('zidan:' + escapeRegex(name) + '\\b')),
      demos: mentions(DEMO_FILES, new RegExp('zidan:' + escapeRegex(name) + '\\b')),
      docs: firstRef(DOC_FILES, [new RegExp('zidan:' + escapeRegex(name) + '\\b')])
    },
    status: 'unverified',
    verifiedBy: null
  };
}

function attributeRecord(name) {
  const source = firstRef(['zidan-form.js'], [new RegExp('["\']' + escapeRegex(name) + '["\']')]) || firstRef(['plugin-core.css', 'plugin-theme.css'], [escapeRegex(name)]);
  return {
    id: 'ZS-ATTR-' + name.replace(/^data-/, ''),
    component: 'all',
    kind: 'attribute',
    name,
    source,
    declaration: null,
    references: {
      tests: mentions(TEST_FILES, [name]),
      demos: mentions(DEMO_FILES, [name]),
      docs: firstRef(DOC_FILES, [name])
    },
    status: 'unverified',
    verifiedBy: null
  };
}

function collectAttributes() {
  const found = new Map();
  const corpus = [text('zidan-form.js'), text('zidan-form.d.ts'), ...DOC_FILES.filter((file) => fs.existsSync(path.join(root, file))).map(text)].join('\n');
  for (const match of corpus.matchAll(/data-(?:zidan|zs)-[a-z0-9-]+/g)) {
    if (!found.has(match[0])) found.set(match[0], true);
  }
  return [...found.keys()].sort();
}

function demoRecords() {
  const pages = ['index.html', 'advanced.html', 'playground.html', 'api.html', 'ajax.html', 'shopify.html', 'docs/index.html', 'docs/options.html', 'docs/frameworks.html', 'docs/comparison.html', 'docs/validation.html', 'docs/html-and-wordpress.html'];
  return pages.map((file) => {
    if (!fs.existsSync(path.join(root, file))) return { id: 'ZS-DEMO-' + file, file, exists: false, title: null, controls: 0, scripts: [], styles: [] };
    const html = text(file);
    const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [null, null])[1];
    const scripts = [...html.matchAll(/<script[^>]+src=["\']([^"\']+)["\']/gi)].map((match) => match[1]);
    const styles = [...html.matchAll(/<link[^>]+href=["\']([^"\']+\.css[^"\']*)["\']/gi)].map((match) => match[1]);
    return {
      id: 'ZS-DEMO-' + file.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
      file,
      exists: true,
      title: title ? title.trim() : null,
      controls: (html.match(/data-zidan[a-z-]*/g) || []).length,
      scripts,
      styles
    };
  });
}

function docsRecords() {
  return DOC_FILES.filter((file) => fs.existsSync(path.join(root, file))).map((file) => {
    const content = text(file);
    return {
      id: 'ZS-DOC-' + file.replace(/[^a-z0-9]+/gi, '-').toLowerCase(),
      file,
      bytes: Buffer.byteLength(content),
      headings: [...content.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => match[1].trim())
    };
  });
}

function compatibility() {
  const readme = text('README.md');
  const browserSection = (readme.match(/## Browser support([\s\S]*?)(?=\n## |$)/) || [null, ''])[1];
  return {
    browsers: {
      claim: browserSection.replace(/[#*_`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 600),
      source: firstRef(['README.md'], [/## Browser support/]),
      status: 'unverified'
    },
    frameworks: {
      claim: 'Integration guides exist; no native React/Vue/Svelte/Angular package is claimed.',
      source: firstRef(['README.md'], [/no React\/Vue component package/]),
      status: 'unverified'
    },
    cms: {
      claim: 'WordPress/Shopify cookbook pages exist; they are guides, not plugins.',
      source: firstRef(['README.md'], [/html-and-wordpress/]),
      status: 'unverified'
    }
  };
}

export function buildRegistry() {
  const pkg = readPackage();
  const inventoryResult = run(process.execPath, ['scripts/lab-inventory.mjs', '--json'], { timeout: 60000 });
  if (inventoryResult.exitCode !== 0) {
    throw new Error('lab-inventory failed: ' + (inventoryResult.stderr || inventoryResult.stdout));
  }
  const inventory = JSON.parse(inventoryResult.stdout);

  const components = [
    { id: 'ZS-COMP-SELECT', name: 'ZidanSelect', family: 'select', modes: inventory.select.modes, source: firstRef(['zidan-form.js'], [/function ZidanSelect\(/]) },
    { id: 'ZS-COMP-FIELD', name: 'ZidanFieldBase', family: 'field', source: firstRef(['zidan-form.js'], [/function ZidanFieldBase\(/]) },
    { id: 'ZS-COMP-CHECKBOX', name: 'ZidanCheckbox', family: 'checkbox', variants: inventory.field.variants.checkbox, source: firstRef(['zidan-form.js'], [/function ZidanCheckbox\(/]) },
    { id: 'ZS-COMP-SWITCH', name: 'ZidanCheckbox (switch)', family: 'switch', variants: inventory.field.variants.switch, source: firstRef(['zidan-form.js'], [/function ZidanCheckbox\(/]) },
    { id: 'ZS-COMP-RADIO', name: 'ZidanRadioGroup', family: 'radio', variants: inventory.field.variants.radio, source: firstRef(['zidan-form.js'], [/function ZidanRadioGroup\(/]) },
    { id: 'ZS-COMP-FILE', name: 'ZidanFileUpload', family: 'file', variants: inventory.field.variants.file, source: firstRef(['zidan-form.js'], [/function ZidanFileUpload\(/]) },
    { id: 'ZS-COMP-TEXT', name: 'ZidanTextField', family: 'text', variants: inventory.field.variants.textTypes, source: firstRef(['zidan-form.js'], [/function ZidanTextField\(/]) },
    { id: 'ZS-COMP-FORM', name: 'ZidanForm', family: 'form', source: firstRef(['zidan-form.js'], [/ZidanForm\.api|var api = \{/]) }
  ];

  const options = [];
  for (const name of inventory.select.options) options.push(optionRecord(name, 'select', inventory.select.callbacks.includes(name) ? 'callback' : 'option'));
  for (const name of inventory.field.baseOptions) {
    for (const family of ['checkbox', 'switch', 'radio', 'file', 'text']) options.push(optionRecord(name, family, inventory.field.callbacks.includes(name) ? 'callback' : 'option'));
  }
  for (const name of inventory.field.fileOptions) {
    if (inventory.field.baseOptions.includes(name)) continue;
    options.push(optionRecord(name, 'file', inventory.field.callbacks.includes(name) ? 'callback' : 'option'));
  }
  for (const name of inventory.field.textOptions) {
    if (inventory.field.baseOptions.includes(name)) continue;
    options.push(optionRecord(name, 'text', inventory.field.callbacks.includes(name) ? 'callback' : 'option'));
  }

  const methods = [];
  const seenMethod = new Set();
  const addMethod = (component, className, name, isStatic = false) => {
    const key = [component, className, name, isStatic].join(':');
    if (seenMethod.has(key)) return;
    seenMethod.add(key);
    methods.push(methodRecord(component, className, name, isStatic));
  };
  for (const name of inventory.select.methods) addMethod('select', 'ZidanSelect', name);
  for (const name of inventory.field.baseMethods) {
    for (const family of ['checkbox', 'switch', 'radio', 'file', 'text']) addMethod(family, 'ZidanFieldBase', name);
  }
  for (const name of inventory.field.checkboxMethods) addMethod('checkbox', 'ZidanCheckbox', name);
  for (const name of inventory.field.radioMethods) addMethod('radio', 'ZidanRadioGroup', name);
  for (const name of inventory.field.fileMethods) {
    if (!inventory.field.baseMethods.includes(name)) addMethod('file', 'ZidanFileUpload', name);
  }
  for (const name of inventory.field.textMethods) {
    if (!inventory.field.baseMethods.includes(name)) addMethod('text', 'ZidanTextField', name);
  }
  for (const name of inventory.form.methods) addMethod('form', 'ZidanForm', name);
  for (const name of inventory.form.statics) addMethod('form', 'ZidanForm', name, true);

  const events = inventory.events.map(eventRecord);
  const attributes = collectAttributes().map(attributeRecord);
  const css = [
    ...inventory.css.classes.map((name) => ({ id: 'ZS-CSS-CLASS-' + name, component: 'all', kind: 'style-class', name, source: firstRef(['plugin-core.css', 'plugin-theme.css'], [escapeRegex('.' + name)]), references: { tests: mentions(TEST_FILES, [name]), demos: mentions(DEMO_FILES, [name]), docs: firstRef(DOC_FILES, [name]) }, status: 'unverified', verifiedBy: null })),
    ...inventory.css.tokens.map((name) => ({ id: 'ZS-CSS-TOKEN-' + name.replace(/^--/, ''), component: 'all', kind: 'style-token', name, source: firstRef(['plugin-theme.css', 'plugin-core.css'], [escapeRegex(name)]), references: { tests: mentions(TEST_FILES, [name]), demos: mentions(DEMO_FILES, [name]), docs: firstRef(DOC_FILES, [name]) }, status: 'unverified', verifiedBy: null }))
  ];

  const enums = [
    ...inventory.select.modes.map((value) => ({ id: 'ZS-VALUE-MODE-' + value, kind: 'enum-value', enum: 'SelectMode', value })),
    ...inventory.select.layouts.map((value) => ({ id: 'ZS-VALUE-LAYOUT-' + value, kind: 'enum-value', enum: 'SelectLayout', value })),
    ...inventory.select.themes.map((value) => ({ id: 'ZS-VALUE-THEME-' + value, kind: 'enum-value', enum: 'Theme', value })),
    ...inventory.select.frameworks.map((value) => ({ id: 'ZS-VALUE-FRAMEWORK-' + value, kind: 'enum-value', enum: 'Framework', value })),
    ...inventory.select.scrollbars.map((value) => ({ id: 'ZS-VALUE-SCROLLBAR-' + value, kind: 'enum-value', enum: 'Scrollbar', value }))
  ];

  const hash = crypto.createHash('sha256');
  for (const file of SOURCE_FILES) {
    if (fs.existsSync(path.join(root, file))) hash.update(file).update('\0').update(text(file)).update('\0');
  }

  const registry = {
    schemaVersion: 1,
    generator: 'quality-labs/shared/registry.mjs',
    source: 'scripts/lab-inventory.mjs',
    package: { name: pkg.name, version: pkg.version },
    sourceHash: hash.digest('hex'),
    components,
    options,
    methods,
    events,
    attributes,
    css,
    enums,
    demos: demoRecords(),
    documentation: docsRecords(),
    compatibility: compatibility(),
    counts: {}
  };
  registry.counts = {
    components: components.length,
    options: options.length,
    methods: methods.length,
    events: events.length,
    attributes: attributes.length,
    css: css.length,
    enums: enums.length,
    demos: registry.demos.filter((demo) => demo.exists).length,
    documentation: registry.documentation.length
  };
  return registry;
}

export function writeRegistry(registry) {
  const dir = path.join(root, 'quality-labs', 'shared', 'feature-registry');
  fs.mkdirSync(dir, { recursive: true });
  const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n');
  write('registry.json', registry);
  write('components.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, components: registry.components, enums: registry.enums });
  write('options.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, options: registry.options });
  write('methods.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, methods: registry.methods });
  write('events.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, events: registry.events });
  write('html-requirements.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, attributes: registry.attributes });
  write('css-features.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, css: registry.css });
  write('demos.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, demos: registry.demos });
  write('documentation.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, documentation: registry.documentation });
  write('compatibility.json', { schemaVersion: 1, package: registry.package, sourceHash: registry.sourceHash, compatibility: registry.compatibility });
  return dir;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const registry = buildRegistry();
  if (process.argv.includes('--write')) {
    const dir = writeRegistry(registry);
    console.log('registry written to ' + relative(dir) + ' (' + registry.counts.options + ' options, ' + registry.counts.methods + ' methods, ' + registry.counts.events + ' events)');
  } else if (process.argv.includes('--json')) {
    process.stdout.write(JSON.stringify(registry, null, 2) + '\n');
  } else {
    console.log(JSON.stringify(registry.counts, null, 2));
  }
}
