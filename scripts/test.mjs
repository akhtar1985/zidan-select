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
  for (const file of ['zidan-form.js', 'zidan-form.mjs', 'demo.js', 'lab.js', 'advanced.js', 'ajax.js', 'playground.js', 'nav.js', 'scripts/build.mjs', 'scripts/docs.mjs', 'scripts/serve.mjs', 'scripts/exa-search.mjs', 'scripts/changelog-section.mjs', 'scripts/dom/run.mjs']) {
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
    const marker = '.zs-root[data-zs-framework="' + framework + '"],';
    const start = theme.indexOf(marker);
    assert(start !== -1, 'missing adapter ' + framework);
    const block = theme.slice(start, theme.indexOf('\n}', start));
    for (const token of ['--zs-input-height', '--zs-chip-bg', '--zs-option-selected-bg']) {
      assert(block.includes(token + ':'), 'adapter ' + framework + ' omits ' + token);
    }
  }
  assert(theme.includes('.input-group > .zs-root[data-zs-framework="bootstrap"]'), 'input-group rules are not scoped to Bootstrap');
  assert(!/(^|\n)\.input-group > \.zs-root \{/.test(theme), 'unscoped input-group rule can break other frameworks');
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
  if (readme) assert(readme.includes('docs/comparison.html'), 'README does not link the comparison guide');
  assert(fs.existsSync(path.join(root, 'docs/comparison.md')), 'comparison guide missing');
  const cookbookPath = path.join(root, 'docs/html-and-wordpress.md');
  assert(fs.existsSync(cookbookPath), 'static HTML/WordPress cookbook missing');
  const cookbook = fs.readFileSync(cookbookPath, 'utf8');
  for (const needle of ['window.ZIDAN_FORM_CONFIG', 'wp_enqueue_script', 'dist/select/zidan-select.js', 'dist/file/zidan-file.js', 'zidanSelect(\'#', 'zidanField(\'#']) {
    assert(cookbook.includes(needle), 'cookbook missing example: ' + needle);
  }
  if (readme) assert(readme.includes('docs/html-and-wordpress.html'), 'README does not link the cookbook');
  assert(read('docs/index.html').includes('html-and-wordpress.html'), 'docs index does not link the cookbook');
  for (const needle of ['asset_url', '## 9. Shopify', 'Checkout UI Extensions']) {
    assert(cookbook.includes(needle), 'cookbook missing Shopify content: ' + needle);
  }
  const shopify = read('shopify.html');
  for (const needle of ['plugin-core.css', 'plugin-theme.css', 'zidan-form.js', '<link rel="canonical"', 'asset_url', 'cart_add_url']) {
    assert(shopify.includes(needle), 'Shopify demo missing: ' + needle);
  }
  assert(read('index.html').includes('shopify.html'), 'demo does not link the Shopify page');
});

check('version metadata and release tooling agree', () => {
  const pkg = JSON.parse(read('package.json'));
  const js = read('zidan-form.js');
  assert(js.includes('ZidanForm v' + pkg.version), 'zidan-form.js banner is behind package.json');
  assert(js.includes("var VERSION = '" + pkg.version + "'"), 'zidan-form.js VERSION is behind package.json');
  for (const css of ['plugin-core.css', 'plugin-theme.css']) {
    assert(read(css).includes('ZidanForm v' + pkg.version), css + ' banner is behind package.json');
  }
  const lock = JSON.parse(read('package-lock.json'));
  assert(lock.version === pkg.version, 'package-lock.json version is behind package.json');
  assert(lock.packages && lock.packages[''] && lock.packages[''].version === pkg.version, 'package-lock.json root package version is behind package.json');
  // A CDN pin may lag package.json while that version is still unpublished (see
  // docs/build.md, "Publish fails with E404"), but every pin must agree, name a released
  // version, and never lead package.json. Both the full URL and the `…@X.Y.Z` shorthand count;
  // `npm view zidan-select@X.Y.Z` style examples are commands, not pins, and are ignored.
  const pinned = new Map();
  for (const name of ['README.md', 'index.html', 'advanced.html', 'docs/build.md', 'docs/html-and-wordpress.md']) {
    for (const match of read(name).matchAll(/(?:cdn\.jsdelivr\.net\/npm\/zidan-select|…)@(\d+\.\d+\.\d+)/g)) {
      if (!pinned.has(match[1])) pinned.set(match[1], []);
      pinned.get(match[1]).push(name);
    }
  }
  assert(pinned.size === 1, 'CDN pins must all use one version (found: ' + ([...pinned].map(([v, files]) => v + ' in ' + [...new Set(files)].join(', ')).join('; ') || 'none') + ')');
  const pin = [...pinned.keys()][0];
  const pinParts = pin.split('.').map(Number);
  const pkgParts = pkg.version.split('.').map(Number);
  const lead = pinParts[0] - pkgParts[0] || pinParts[1] - pkgParts[1] || pinParts[2] - pkgParts[2];
  assert(lead <= 0, 'CDN pins use ' + pin + ', ahead of package.json ' + pkg.version);
  assert(read('CHANGELOG.md').includes('## [' + pin + ']'), 'CDN pins use ' + pin + ', which has no CHANGELOG.md entry');
  const changelog = read('CHANGELOG.md');
  assert(changelog.includes('## [Unreleased]'), 'CHANGELOG.md needs an Unreleased section for the release script');
  assert(changelog.includes('## [' + pkg.version + ']'), 'CHANGELOG.md has no entry for ' + pkg.version);
  assert(read('scripts/release.mjs').includes("'CHANGELOG.md'"), 'release script does not roll the changelog');
  assert(pkg.scripts.release === 'node scripts/release.mjs', 'package.json needs the release script entry');
  const workflow = read('.github/workflows/release.yml');
  assert(workflow.includes('--provenance'), 'release workflow must publish with provenance');
  assert(workflow.includes("tags: ['v*']"), 'release workflow must run on version tags');
  assert(workflow.includes('id-token: write'), 'release workflow needs id-token for trusted publishing');
  assert(workflow.includes('gh release create'), 'release workflow must create the GitHub Release for the tag');
  assert(workflow.includes('changelog-section.mjs') && workflow.includes('--notes-file'), 'release workflow must use the CHANGELOG section as the release body');
  assert(workflow.includes('--generate-notes'), 'release workflow needs a generated-notes fallback');
  assert(workflow.includes('--output "$notes"'), 'release workflow must write notes with --output (UTF-8), not a shell redirect');
  assert(!workflow.includes('changelog-section.mjs "$version" >'), 'release workflow must not use a shell redirect: Windows PowerShell writes it as UTF-16LE');
});

check('release notes come from the CHANGELOG section', () => {
  const pkg = JSON.parse(read('package.json'));
  const section = version => execFileSync(
    process.execPath,
    [path.join(root, 'scripts/changelog-section.mjs'), version],
    { encoding: 'utf8' }
  );
  const body = section(pkg.version).trim();
  assert(body.length > 0, 'changelog-section.mjs printed nothing for ' + pkg.version);
  assert(/^### /m.test(body), 'the ' + pkg.version + ' section has no subsections to publish');
  assert(!/^## \[/m.test(body), 'the release body must stop before the next version heading');
  assert(section('0.0.0-nonexistent') === '', 'a version with no section must print nothing so the workflow can fall back');
});

check('release notes file is UTF-8 without a BOM', () => {
  const pkg = JSON.parse(read('package.json'));
  const out = path.join(root, '.build', 'notes-encoding-test.md');
  try {
    execFileSync(process.execPath, [
      path.join(root, 'scripts/changelog-section.mjs'), pkg.version, '--output', out
    ], { stdio: 'pipe' });
    const bytes = fs.readFileSync(out);
    assert(bytes.length > 0, '--output wrote an empty notes file');
    assert(!(bytes[0] === 0xFF && bytes[1] === 0xFE), 'notes file starts with a UTF-16LE BOM');
    assert(!(bytes[0] === 0xFE && bytes[1] === 0xFF), 'notes file starts with a UTF-16BE BOM');
    assert(!bytes.includes(0), 'notes file contains NUL bytes (UTF-16), which gh renders as garbage');
    assert(bytes.toString('utf8').startsWith('### '), 'notes file is not readable UTF-8 markdown');
  } finally {
    fs.rmSync(out, { force: true });
  }
});

check('README links resolve on npm', () => {
  const readme = read('README.md');
  for (const bad of ['](docs/', '](LICENSE', '](.github/', '](../']) {
    assert(!readme.includes(bad), 'README has a relative link npm renders as a 404: ' + bad);
  }
  assert(readme.includes('https://raw.githubusercontent.com/akhtar1985/zidan-select/main/docs/demo.png'), 'demo screenshot must use an absolute raw URL so it renders on npm');
  assert(readme.includes('(https://akhtar1985.github.io/zidan-select/)'), 'README must link the live demo');
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.homepage === 'https://akhtar1985.github.io/zidan-select/', 'package.json homepage must be the live demo');
});

check('AJAX / remote data is supported and demoed', () => {
  const library = read('zidan-form.js');
  for (const option of ['fetchUrl', 'fetchItemsPath', 'fetchTotalPath', 'fetchSkipParam', 'fetchHasMorePath', 'createRemoteFetcher']) {
    assert(library.includes(option), 'library is missing the AJAX option ' + option);
  }
  assert(library.includes("fetchMethod: 'GET'"), 'fetchUrl must default to GET');
  const page = read('ajax.html');
  assert(page.includes('data-zidan-fetch-url="https://dummyjson.com/products/search"'), 'AJAX demo must exercise the declarative fetchUrl');
  assert(page.includes('data-zidan-fetch-items-path="products"'), 'AJAX demo must map the JSON rows');
  assert(page.includes('ajax.css') && page.includes('ajax.js'), 'AJAX page is missing its assets');
  assert(page.includes('fetchOptions'), 'AJAX page must document the fetchOptions contract');
  for (const id of ['retry-country', 'retry-fail', 'retry-request', 'retry-state']) {
    assert(page.includes('id="' + id + '"'), 'AJAX error/retry demo is missing #' + id);
  }
  assert(read('ajax.js').includes('String(state.error)'), 'AJAX state readout must render string errors');
  assert(read('lab.js').includes("fetchUrl: 'https://dummyjson.com/users/search'"), 'API lab must exercise declarative AJAX');
  assert(fs.existsSync(path.join(root, 'demo-data/countries.json')), 'AJAX demo dataset missing');
  const optionsDoc = read('docs/options.md');
  for (const option of ['fetchUrl', 'fetchQueryParam', 'fetchPageParam', 'fetchSkipParam', 'fetchPageSizeParam', 'fetchItemsPath', 'fetchTotalPath', 'fetchHasMorePath', 'fetchMethod', 'fetchHeaders', 'fetchCredentials']) {
    assert(optionsDoc.includes(option), 'docs/options.md does not document ' + option);
  }
  assert(optionsDoc.includes('renderOption(item, context)'), 'renderOption documentation has the wrong signature');
  assert(read('docs/index.html').includes('../ajax.html'), 'docs index does not link the AJAX demo');
  assert(read('index.html').includes('ajax.html'), 'the AJAX page is not linked from the demo');
  assert(read('README.md').includes('ajax.html'), 'the README does not mention the AJAX page');
});

check('API request options and the request lab are supported', () => {
  const library = read('zidan-form.js');
  assert(library.includes('fetchParams: null'), 'DEFAULTS is missing fetchParams');
  assert(library.includes('fetchBody: null'), 'DEFAULTS is missing fetchBody');
  assert(library.includes("data-zidan-fetch-params"), 'fetchParams data attribute is not normalised');
  assert(library.includes("d.zidanFetchBody"), 'fetchBody data attribute is not normalised');
  assert(library.includes("method !== 'GET' && method !== 'HEAD'"), 'fetchBody must be ignored for GET and HEAD');
  assert(library.includes("headers['Content-Type'] = 'application/json'"), 'object bodies must add a JSON content type');

  const page = read('api.html');
  for (const needle of [
    'data-zidan-fetch-params=', 'data-zidan-fetch-headers=',
    'data-zidan-fetch-method="POST"', 'api-get-request', 'api-post-request',
    'api-method-output', 'fetchParams', 'fetchBody', 'docs/options.html#combobox-async'
  ]) {
    assert(page.includes(needle), 'API lab is missing ' + needle);
  }
  assert(page.includes('api.css') && page.includes('api.js'), 'API lab is missing its assets');
  assert(read('api.js').includes('https://api.zidanform.test/search'), 'API lab POST demo is not wired to its mock endpoint');
  assert(read('api.js').includes('window.fetch ='), 'API lab does not expose the request inspector hook');
  assert(read('docs/options.md').includes('fetchParams') && read('docs/options.md').includes('fetchBody'), 'options docs do not document the new request options');
  assert(read('README.md').includes('api.html'), 'README does not link the API request lab');
  assert(read('index.html').includes('api.html'), 'demo does not link the API request lab');
  assert(read('docs/index.html').includes('../api.html'), 'docs index does not link the API request lab');
  const lab = read('lab.js');
  assert(lab.includes('fetchParams') && lab.includes('fetchBody'), 'API lab inventory does not claim the new request options');
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
  assert(read('docs/index.html').includes('../index.html#controls'), 'docs index does not link the controls reference');
  assert(read('README.md').includes('/#controls'), 'README does not link the controls reference');
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
  assert(page.includes('id="globals"') && page.includes('initZidanSelects') && page.includes('zidanField'), 'advanced page must map each build to its global functions');
  assert(/select-only[\s\S]{0,400}?initZidanForms[\s\S]{0,200}?zidanField/.test(page), 'advanced page does not separate select-only functions from the full bundle');
  assert(core.includes('[data-zs-hidden-label]'), 'core CSS must hide the author label the plugin replaces');
  assert(read('index.html').includes('advanced.html'), 'demo does not link the advanced page');
  assert(read('README.md').includes('advanced.html'), 'README does not link the advanced page');
  assert(read('docs/index.html').includes('../advanced.html'), 'docs index does not link the advanced page');

  const pages = ['index.html', 'advanced.html', 'playground.html', 'api.html', 'shopify.html', 'ajax.html'];
  const navs = pages.map(name => {
    const page = read(name);
    const match = page.match(/<nav[^>]*class="header-nav"[^>]*>[\s\S]*?<\/nav>/);
    assert(match, name + ' is missing the shared header nav');
    assert(/<nav[^>]*id="site-nav"/.test(match[0]), name + ' header nav is missing its id for the menu button');
    assert(/<button[^>]*class="nav-toggle"[^>]*aria-controls="site-nav"/.test(page), name + ' is missing the mobile menu button');
    assert(/data-nav="open"|aria-expanded="false"/.test(page), name + ' menu button is not announced as collapsible');
    assert(page.includes('<script src="nav.js">'), name + ' does not load the shared header script');
    return Array.from(match[0].matchAll(/<a href="([^"]+)"/g)).map(item => item[1]).join('|');
  });
  assert(new Set(navs).size === 1, 'demo pages do not share the same header links');
  const navLinks = navs[0].split('|');
  assert(new Set(navLinks).size >= 17, 'shared header should expose every demo page and docs page');
  for (const target of ['advanced.html', 'api.html', 'shopify.html', 'ajax.html', 'docs/']) {
    assert(navLinks.includes(target), 'shared header is missing ' + target);
  }
  for (const target of ['docs/options.html', 'docs/comparison.html', 'docs/frameworks.html', 'docs/html-and-wordpress.html']) {
    assert(navLinks.includes(target), 'docs submenu is missing ' + target);
    assert(pages.every(name => read(name).includes('href="' + target + '"')), 'not every demo page links ' + target);
  }
  assert(read('nav.css').includes('.nav-docs-panel'), 'docs submenu styles are missing');
  assert(read('.github/workflows/pages.yml').includes('ajax.html'), 'Pages workflow does not publish the AJAX page');
  assert(read('.github/workflows/pages.yml').includes('api.html') && read('.github/workflows/pages.yml').includes('api.js'), 'Pages workflow does not publish the API request lab');
  const navCss = read('nav.css');
  assert(!/header-nav a:nth-child/.test(read('demo.css') + navCss), 'mobile CSS still hides header links');
  assert(!/header-nav[\s\S]{0,400}?overflow-x:\s*auto/.test(navCss), 'mobile header still relies on a silent horizontal scroller');
  assert(navCss.includes('.nav-toggle') && navCss.includes('[data-nav="open"]') && navCss.includes('[data-nav-ready]'), 'mobile menu styles are missing');
  assert(read('nav.js').includes('data-nav-ready') && read('nav.js').includes('aria-expanded'), 'mobile menu script is missing its collapsed state or ARIA state');
  assert(read('.github/workflows/pages.yml').includes('nav.js'), 'Pages workflow does not publish the shared header script');
});

check('demo and documentation pages share the home visual system', () => {
  const rootPages = ['index.html', 'advanced.html', 'playground.html', 'api.html', 'ajax.html', 'shopify.html'];
  const docsPages = ['docs/index.html', 'docs/validation.html'];
  // Read the version instead of pinning it, so a release never leaves this check behind.
  const brand = 'v' + JSON.parse(read('package.json')).version + ' · zero dependencies';
  const assertShell = (name, html, prefix) => {
    for (const needle of [
      'class="site-header"', 'class="brand-sub"', brand,
      'class="bg-orbs"', 'id="quick-theme"', 'class="site-footer"',
      prefix + 'demo.css', prefix + 'nav.css', prefix + 'nav.js'
    ]) {
      assert(html.includes(needle), name + ' is missing shared UI: ' + needle);
    }
  };
  rootPages.forEach(name => assertShell(name, read(name), ''));
  docsPages.forEach(name => assertShell(name, read(name), '../'));
  docsPages.forEach(name => assert(read(name).includes('../docs.css'), name + ' does not load the shared docs styles'));
  const docsIndex = read('docs/index.html');
  assert(docsIndex.includes('href="validation-guide.html"') && docsIndex.includes('href="validation.html"'), 'docs index lost the validation guide or live test bench link');
  assert(read('ajax.html').includes('docs/options.html#combobox-async'), 'AJAX demo links to a missing remote-options anchor');
  assert(read('api.html').includes('docs/options.html#combobox-async'), 'API lab links to a missing remote-options anchor');
  assert(read('.github/workflows/pages.yml').includes('docs.css'), 'Pages workflow does not publish docs.css');

  const target = path.join(root, '.build', 'docs-ui-check');
  execFileSync(process.execPath, [path.join(root, 'scripts/docs.mjs'), target], { stdio: 'pipe' });
  try {
    for (const out of ['options', 'theming', 'frameworks', 'comparison', 'validation-guide', 'build', 'html-and-wordpress']) {
      const file = path.join(target, out + '.html');
      assert(fs.existsSync(file), 'docs generator did not write ' + out + '.html');
      const html = fs.readFileSync(file, 'utf8');
      assertShell('docs/' + out + '.html', html, '../');
      assert(html.includes('../docs.css') && html.includes('class="docs-content"'), out + ' guide does not use the shared docs layout');
      assert(!html.includes('class="doc-top"'), out + ' guide still uses the old plain header');
      if (out === 'options') assert(html.includes('id="combobox-async"'), 'options guide lost the remote select anchor used by the AJAX demo');
      if (out === 'build') {
        assert(html.includes('href="https://github.com/akhtar1985/zidan-select/blob/main/CHANGELOG.md"'), 'build guide does not link to the repository changelog');
        assert(html.includes('href="https://github.com/akhtar1985/zidan-select/blob/main/.github/workflows/release.yml"'), 'build guide does not link to the release workflow');
      }
      const prose = html.replace(/<pre>[\s\S]*?<\/pre>/g, '').replace(/<code>[\s\S]*?<\/code>/g, '');
      assert(!prose.includes('&lt;a '), out + ' guide escapes Markdown links instead of rendering them');
      const source = out === 'validation-guide' ? 'validation' : out;
      if (/\[[^\]]+\]\([^)]+\)/.test(read('docs/' + source + '.md'))) {
        assert(prose.includes('<a href='), out + ' guide did not render its Markdown links');
      }
    }
  } finally {
    fs.rmSync(target, { recursive: true, force: true });
  }
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
  assert(pkg.exports['.'].import.types === './zidan-form.d.mts', 'exports map missing root ESM types');
  assert(pkg.exports['.'].require.types === './zidan-form.d.ts', 'exports map missing root CJS types');
  assert(pkg.exports['./select'].import.types === './dist/select/zidan-select.d.mts', 'exports map missing select ESM types');
  assert(pkg.exports['./select'].require.types === './dist/select/zidan-select.d.ts', 'exports map missing select CJS types');
  assert(pkg.exports['./file'].import.types === './dist/file/zidan-file.d.mts', 'exports map missing file ESM types');
  assert(pkg.exports['./file'].require.types === './dist/file/zidan-file.d.ts', 'exports map missing file CJS types');
  assert(fs.existsSync(path.join(root, 'zidan-form.d.mts')), 'root ESM declaration missing');
  assert(pkg.scripts.types && pkg.scripts.types.includes('tsc'), 'missing types script');
  assert(fs.existsSync(path.join(root, 'tsconfig.types.json')), 'tsconfig.types.json missing');
  assert(fs.existsSync(path.join(root, 'tsconfig.types.node16.json')), 'NodeNext type-check config missing');
  for (const file of ['dist/select/zidan-select.d.ts', 'dist/file/zidan-file.d.ts']) {
    assert(fs.existsSync(path.join(root, file)), file + ' missing');
    assert(read(file).includes("'../../zidan-form.js'"), file + ' needs an explicit .js re-export for NodeNext consumers');
  }
});

check('ES module entries import without a browser', () => {
  const script = [
    "const [root, select, file] = await Promise.all([",
    "  import('./zidan-form.mjs'),",
    "  import('./dist/select/zidan-select.mjs'),",
    "  import('./dist/file/zidan-file.mjs')",
    "]);",
    "for (const [name, mod] of Object.entries({ root, select, file })) {",
    "  if (!mod.ZidanForm || mod.ZidanForm.version !== '2.5.0') throw new Error(name + ' ESM entry did not expose ZidanForm');",
    "}",
    "if (typeof root.zidanSelect !== 'function' || typeof select.ZidanSelect !== 'function' || typeof file.ZidanFileUpload !== 'function') {",
    "  throw new Error('an ESM entry lost its named exports');",
    "}"
  ].join('\n');
  execFileSync(process.execPath, ['--input-type=module', '-e', script], { cwd: root, encoding: 'utf8' });
});

check('Pages metadata is complete', () => {
  const robots = read('robots.txt');
  const sitemap = read('sitemap.xml');
  assert(robots.includes('Sitemap: https://akhtar1985.github.io/zidan-select/sitemap.xml'), 'robots.txt missing sitemap pointer');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/playground.html'), 'sitemap missing the playground');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/shopify.html'), 'sitemap missing the Shopify demo');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/advanced.html'), 'sitemap missing the advanced page');
  assert(sitemap.includes('https://akhtar1985.github.io/zidan-select/api.html'), 'sitemap missing the API request lab');
  const workflow = read('.github/workflows/pages.yml');
  assert(workflow.includes('robots.txt') && workflow.includes('sitemap.xml'), 'Pages workflow does not publish robots/sitemap');
  assert(workflow.includes('shopify.html'), 'Pages workflow does not publish the Shopify demo');
  assert(workflow.includes('advanced.html') && workflow.includes('nav.css'), 'Pages workflow does not publish the advanced page or shared header');
  assert(read('advanced.html').includes('<link rel="canonical"'), 'advanced page missing canonical URL');
  const html = read('index.html');
  assert(html.includes('<link rel="canonical"'), 'demo missing canonical URL');
  assert(html.includes('property="og:image"'), 'demo missing Open Graph image');
  assert(read('playground.html').includes('<link rel="canonical"'), 'playground missing canonical URL');
  assert(read('api.html').includes('<link rel="canonical"'), 'API lab missing canonical URL');
  assert(read('api.html').includes('property="og:image"'), 'API lab missing Open Graph image');
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
    'dist/select/zidan-select.d.ts', 'dist/select/zidan-select.d.mts',
    'dist/file/zidan-file.js', 'dist/file/zidan-file.mjs', 'dist/file/zidan-file.min.js',
    'dist/file/plugin-file-core.css', 'dist/file/plugin-file-theme.css',
    'dist/file/plugin-file-core.min.css', 'dist/file/plugin-file-theme.min.css',
    'dist/file/zidan-file.d.ts', 'dist/file/zidan-file.d.mts',
    'dist/zidan-form.min.js', 'dist/plugin-core.min.css', 'dist/plugin-theme.min.css'
  ]) {
    assert(fs.existsSync(path.join(root, file)), 'missing build output ' + file);
  }
});

check('subset CSS carries the current framework adapters', () => {
  const fullTheme = read('plugin-theme.css');
  const subsetThemes = {
    select: read('dist/select/plugin-select-theme.css'),
    file: read('dist/file/plugin-file-theme.css')
  };
  const adapterBlock = (css, framework) => {
    const marker = '.zs-root[data-zs-framework="' + framework + '"],';
    const start = css.indexOf(marker);
    return start === -1 ? '' : css.slice(start, css.indexOf('\n}', start)).trim();
  };
  for (const framework of ['bootstrap', 'tailwind', 'bulma', 'foundation']) {
    const expected = adapterBlock(fullTheme, framework);
    assert(expected, 'full theme omits the ' + framework + ' adapter block');
    for (const [name, css] of Object.entries(subsetThemes)) {
      assert(adapterBlock(css, framework) === expected, name + '-only theme has a stale ' + framework + ' adapter');
    }
  }
  const fileTheme = subsetThemes.file;
  for (const framework of ['bootstrap', 'tailwind', 'bulma', 'foundation']) {
    assert(fileTheme.includes('.zs-field--file[data-zs-framework="' + framework + '"]'),
      'file-only theme omits the ' + framework + ' file adapter');
    assert(!subsetThemes.select.includes('.zs-field--file[data-zs-framework="' + framework + '"]'),
      'select-only theme should not ship file adapter rules');
  }
  assert(fileTheme.includes('.zs-file-drop.form-control'), 'file-only theme omits Bootstrap drop sizing');
  for (const name of [
    'dist/select/plugin-select-theme.min.css', 'dist/file/plugin-file-theme.min.css'
  ]) {
    const css = read(name);
    for (const needle of ['--zs-input-height', '--zs-chip-bg', '--zs-option-selected-bg', '.input-group>.zs-root[data-zs-framework=bootstrap]']) {
      assert(css.includes(needle), name + ' is missing ' + needle);
    }
  }
  assert(read('dist/select/plugin-select-core.css').includes('height: var(--zs-input-height, 32px)'), 'select-only core CSS has a stale input height');
});

check('documented sizes match the built assets', () => {
  const builds = [
    { label: 'Full', raw: 'zidan-form.js', min: 'dist/zidan-form.min.js',
      core: 'plugin-core.css', coreMin: 'dist/plugin-core.min.css',
      theme: 'plugin-theme.css', themeMin: 'dist/plugin-theme.min.css' },
    { label: 'Select-only', raw: 'dist/select/zidan-select.js', min: 'dist/select/zidan-select.min.js',
      core: 'dist/select/plugin-select-core.css', coreMin: 'dist/select/plugin-select-core.min.css',
      theme: 'dist/select/plugin-select-theme.css', themeMin: 'dist/select/plugin-select-theme.min.css' },
    { label: 'File-only', raw: 'dist/file/zidan-file.js', min: 'dist/file/zidan-file.min.js',
      core: 'dist/file/plugin-file-core.css', coreMin: 'dist/file/plugin-file-core.min.css',
      theme: 'dist/file/plugin-file-theme.css', themeMin: 'dist/file/plugin-file-theme.min.css' }
  ];
  const sizeKb = (file) => Math.round(fs.statSync(path.join(root, file)).size / 1024);
  const home = read('index.html');
  const advanced = read('advanced.html');
  const readme = read('README.md');
  const version = JSON.parse(read('package.json')).version;
  const cdn = 'https://cdn.jsdelivr.net/npm/zidan-select@' + version + '/';
  for (const b of builds) {
    const rawKb = sizeKb(b.raw);
    const minKb = sizeKb(b.min);
    const coreKb = sizeKb(b.core);
    const coreMinKb = sizeKb(b.coreMin);
    const themeKb = sizeKb(b.theme);
    const themeMinKb = sizeKb(b.themeMin);
    assert(home.includes(`≈${rawKb} kB JS · ≈${minKb} kB minified`), 'home build picker has stale sizes for ' + b.raw);
    assert(home.includes(`≈${rawKb} kB · ≈${minKb} kB min`), 'home build card has stale sizes for ' + b.raw);
    assert(advanced.includes(`${rawKb} kB raw · ${minKb} kB min`), 'advanced page has stale JS sizes for ' + b.raw);
    assert(advanced.includes(`<code>${path.basename(b.core)}</code> ${coreKb} → ${coreMinKb} kB<br><code>${path.basename(b.theme)}</code> ${themeKb} → ${themeMinKb} kB`), 'advanced page has stale CSS sizes for ' + b.label);
    assert(readme.includes(`≈${rawKb} kB raw · ≈${minKb} kB minified`), 'README has stale raw/min sizes for ' + b.raw);
    const cdnRow = `| ${b.label} | [${path.basename(b.min)}](${cdn}${b.min}) — ≈${minKb} kB | [${path.basename(b.coreMin)}](${cdn}${b.coreMin}) — ≈${coreMinKb} kB + [${path.basename(b.themeMin)}](${cdn}${b.themeMin}) — ≈${themeMinKb} kB |`;
    assert(readme.includes(cdnRow), 'README CDN table has stale minified sizes for ' + b.label);
    if (b.label !== 'Full') {
      const intro = b.label === 'Select-only' ? 'Select / combobox / tags only' : 'File upload only';
      assert(readme.includes(`${intro} (≈${rawKb} kB raw / ≈${minKb} kB minified JS, ≈${coreKb} → ${coreMinKb} kB core CSS,\n≈${themeKb} → ${themeMinKb} kB theme CSS):`), 'README subset prose has stale sizes for ' + b.label);
    }
  }
  const docsBuild = read('docs/build.md');
  for (const b of builds) {
    const quickRow = `| ${b.label} | \`/${b.min}\` — ≈${sizeKb(b.min)} kB | \`/${b.coreMin}\` — ≈${sizeKb(b.coreMin)} kB | \`/${b.themeMin}\` — ≈${sizeKb(b.themeMin)} kB |`;
    assert(docsBuild.includes(quickRow), 'build guide CDN table has stale minified sizes for ' + b.label);
  }
  for (const file of [
    'zidan-form.js', 'dist/zidan-form.min.js',
    'plugin-core.css', 'dist/plugin-core.min.css', 'plugin-theme.css', 'dist/plugin-theme.min.css',
    'dist/select/zidan-select.js', 'dist/select/zidan-select.min.js',
    'dist/select/plugin-select-core.css', 'dist/select/plugin-select-core.min.css',
    'dist/select/plugin-select-theme.css', 'dist/select/plugin-select-theme.min.css',
    'dist/file/zidan-file.js', 'dist/file/zidan-file.min.js',
    'dist/file/plugin-file-core.css', 'dist/file/plugin-file-core.min.css',
    'dist/file/plugin-file-theme.css', 'dist/file/plugin-file-theme.min.css'
  ]) {
    const bytes = fs.statSync(path.join(root, file)).size;
    assert(docsBuild.includes(bytes.toLocaleString('en-US') + ' B'), 'build guide has a stale byte size for ' + file);
  }
});

const dom = await import('./dom/run.mjs').then(mod => mod.runDomTests());
failures += dom.failures;

console.log(failures ? '\n' + failures + ' check(s) failed' : '\nall checks passed (' + dom.total + ' DOM tests)');
process.exit(failures ? 1 : 0);
