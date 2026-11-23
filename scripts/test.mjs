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
  for (const file of ['zidan-form.js', 'zidan-form.mjs', 'demo.js', 'playground.js', 'scripts/build.mjs', 'scripts/serve.mjs', 'scripts/dom/run.mjs']) {
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
    assert(
      new RegExp('window\\.' + name + '\\s*=').test(js) ||
        js.includes('api.' + name + ' = ' + name) ||
        js.includes(name + ': ' + name),
      'missing export ' + name
    );
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
  assert(html.includes('Which files should you load?'), 'demo does not explain which files to load');
  assert(html.includes('You do not need to load everything.'), 'demo does not state that the full bundle is optional');
  const readme = fs.existsSync(path.join(root, 'README.md')) ? read('README.md') : '';
  if (readme) assert(readme.includes('Which files should you load?'), 'README does not explain which files to load');
  if (readme) assert(readme.includes('You do not need to load everything.'), 'README does not state that the full bundle is optional');
  if (readme) assert(readme.includes('plugin-core.css'), 'README missing split CSS section');
  if (readme) assert(readme.includes('docs/comparison.md'), 'README does not link the comparison guide');
  assert(fs.existsSync(path.join(root, 'docs/comparison.md')), 'comparison guide missing');
  const cookbookPath = path.join(root, 'docs/html-and-wordpress.md');
  assert(fs.existsSync(cookbookPath), 'static HTML/WordPress cookbook missing');
  const cookbook = fs.readFileSync(cookbookPath, 'utf8');
  for (const needle of ['window.ZIDAN_FORM_CONFIG', 'wp_enqueue_script', 'dist/select/zidan-select.js', 'dist/file/zidan-file.js', 'zidanSelect(\'#', 'zidanField(\'#']) {
    assert(cookbook.includes(needle), 'cookbook missing example: ' + needle);
  }
  if (readme) assert(readme.includes('docs/html-and-wordpress.md'), 'README does not link the cookbook');
  assert(read('docs/index.html').includes('html-and-wordpress.md'), 'docs index does not link the cookbook');
  for (const needle of ['asset_url', '## 9. Shopify', 'Checkout UI Extensions']) {
    assert(cookbook.includes(needle), 'cookbook missing Shopify content: ' + needle);
  }
  const shopify = read('shopify.html');
  for (const needle of ['plugin-core.css', 'plugin-theme.css', 'zidan-form.js', '<link rel="canonical"', 'asset_url', 'cart_add_url']) {
    assert(shopify.includes(needle), 'Shopify demo missing: ' + needle);
  }
  assert(read('index.html').includes('shopify.html'), 'demo does not link the Shopify page');
});

check('field playground is wired up', () => {
  const playground = read('playground.html');
  assert(playground.includes('plugin-core.css') && playground.includes('plugin-theme.css'), 'playground does not load both stylesheets');
  assert(playground.includes('playground.css') && playground.includes('playground.js'), 'playground assets missing');
  ['select', 'file', 'checkbox', 'radio', 'text'].forEach(kind => {
    assert(playground.includes('data-kind="' + kind + '"'), 'missing playground tab ' + kind);
  });
  assert(read('index.html').includes('playground.html'), 'demo does not link the playground');
  assert(read('README.md').includes('playground.html'), 'README does not link the playground');
});

check('advanced page and shared header are wired up', () => {
  const page = read('advanced.html');
  const script = read('advanced.js');
  const styles = read('advanced.css');
  assert(styles.length > 0 && script.length > 0, 'advanced page assets missing');
  assert(page.includes('advanced.css') && page.includes('advanced.js'), 'advanced page does not load its assets');
  assert(page.includes('nav.css') && page.includes('demo.css'), 'advanced page does not load the shared demo styles');
  assert(page.includes('zidan-form.js'), 'advanced page does not load the library');
  for (const needle of ['fetchOptions', 'fetchPageSize', 'validate', 'data-zidan-options', 'zidan:load-more', 'zidan:async-validation', 'ZidanForm.observe']) {
    assert(page.includes(needle), 'advanced page missing technical detail: ' + needle);
  }
  assert(page.includes('data-lang="html"') && page.includes('data-lang="js"'), 'advanced page needs both HTML and JS examples');
  assert(read('index.html').includes('advanced.html'), 'demo does not link the advanced page');
  assert(read('README.md').includes('advanced.html'), 'README does not link the advanced page');
  assert(read('docs/index.html').includes('../advanced.html'), 'docs index does not link the advanced page');

  const pages = ['index.html', 'advanced.html', 'playground.html', 'shopify.html'];
  const navs = pages.map(name => {
    const match = read(name).match(/<nav class="header-nav"[\s\S]*?<\/nav>/);
    assert(match, name + ' is missing the shared header nav');
    return Array.from(match[0].matchAll(/<a href="([^"]+)"/g)).map(item => item[1]).join('|');
  });
  assert(new Set(navs).size === 1, 'demo pages do not share the same header links');
  assert(navs[0].includes('advanced.html') && navs[0].includes('shopify.html'), 'shared header is incomplete');
  assert(!/header-nav a:nth-child/.test(read('demo.css') + read('nav.css')), 'mobile CSS still hides header links');
});

check('new features are present', () => {
  for (const hook of ['.zs-more', '.zs-field--pending', 'zs-range-tick', 'zs-file-progress']) {
    assert(core.includes(hook), 'core missing ' + hook);
  }
  assert(/\[dir="rtl"\]/.test(core), 'core missing RTL overrides');
  assert(core.includes('--zs-range-tick-pct'), 'core missing range tick percentage');
  assert(theme.includes('--zs-range-angle'), 'theme missing range angle token');
  assert(/\[dir="rtl"\]/.test(theme), 'theme missing RTL overrides');
  assert(js.includes('fetchOptions') && js.includes('loadMore') && js.includes('_fetchCache'), 'remote pagination code missing');
  assert(js.includes('isThenable') && js.includes('_runAsync') && js.includes('async-validation'), 'async validation code missing');
  assert(js.includes('isRtl'), 'RTL detection missing');
});

check('TypeScript declarations ship', () => {
  const dts = read('zidan-form.d.ts');
  for (const name of ['ZidanSelect', 'ZidanFieldBase', 'ZidanFileUpload', 'FetchOptions', 'AsyncValidationContext', 'UploadHandler']) {
    assert(dts.includes(name), 'declarations missing ' + name);
  }
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.types === 'zidan-form.d.ts', 'package.json types field is stale');
  assert(pkg.exports['.'].types === './zidan-form.d.ts', 'exports map missing root types');
  assert(pkg.exports['./select'].types === './dist/select/zidan-select.d.ts', 'exports map missing select types');
  assert(pkg.exports['./file'].types === './dist/file/zidan-file.d.ts', 'exports map missing file types');
  assert(pkg.scripts.types && pkg.scripts.types.includes('tsc'), 'missing types script');
  assert(fs.existsSync(path.join(root, 'tsconfig.types.json')), 'tsconfig.types.json missing');
});

check('Pages metadata is complete', () => {
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');
  assert(robots.includes('Sitemap: https://akhtar1985.github.io/zidan-select/sitemap.xml'), 'robots.txt missing sitemap pointer');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/playground.html'), 'sitemap missing the playground');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/shopify.html'), 'sitemap missing the Shopify demo');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/advanced.html'), 'sitemap missing the advanced page');
  const workflow = read('.github/workflows/pages.yml');
  assert(workflow.includes('robots.txt') && workflow.includes('sitemap.xml'), 'Pages workflow does not publish robots/sitemap');
  assert(workflow.includes('shopify.html'), 'Pages workflow does not publish the Shopify demo');
  assert(workflow.includes('advanced.html') && workflow.includes('nav.css'), 'Pages workflow does not publish the advanced page or shared header');
  assert(read('advanced.html').includes('<link rel="canonical"'), 'advanced page missing canonical URL');
  const html = read('index.html');
  assert(html.includes('<link rel="canonical"'), 'demo missing canonical URL');
  assert(html.includes('property="og:image"'), 'demo missing Open Graph image');
  assert(read('playground.html').includes('<link rel="canonical"'), 'playground missing canonical URL');
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert(ld, 'demo missing JSON-LD structured data');
  try {
    JSON.parse(ld[1]);
  } catch (err) {
    throw new Error('JSON-LD is not valid JSON: ' + err.message);
  }
});

check('subset builds and minified copies exist', () => {
  try {
    execFileSync(process.execPath, [path.join(root, 'scripts/build.mjs')], { stdio: 'pipe', cwd: root });
  } catch (err) {
    throw new Error('build failed: ' + String(err.stderr || err.message).trim().split('\n').slice(-3).join(' '));
  }
  for (const file of [
    'dist/select/zidan-select.js', 'dist/select/zidan-select.mjs', 'dist/select/zidan-select.min.js',
    'dist/select/plugin-select-core.css', 'dist/select/plugin-select-theme.css',
    'dist/select/plugin-select-core.min.css', 'dist/select/plugin-select-theme.min.css',
    'dist/select/zidan-select.d.ts',
    'dist/file/zidan-file.js', 'dist/file/zidan-file.mjs', 'dist/file/zidan-file.min.js',
    'dist/file/plugin-file-core.css', 'dist/file/plugin-file-theme.css',
    'dist/file/plugin-file-core.min.css', 'dist/file/plugin-file-theme.min.css',
    'dist/file/zidan-file.d.ts',
    'dist/zidan-form.min.js', 'dist/plugin-core.min.css', 'dist/plugin-theme.min.css'
  ]) {
    assert(fs.existsSync(path.join(root, file)), 'missing build output ' + file);
  }
});

const dom = await import('./dom/run.mjs').then(mod => mod.runDomTests());
failures += dom.failures;

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nall checks passed (' + dom.total + ' DOM tests)');
process.exit(failures ? 1 : 0);
