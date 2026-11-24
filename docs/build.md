# Build & publish

The repository is deliberately tool-free: `zidan-form.js` is already a UMD-compatible classic
script, `zidan-form.mjs` is its ESM wrapper, and the CSS is shipped as authored. There is no
bundler step between source and browser.

## Layout

```
zidan-select/
├─ zidan-form.js        # all controls, classic script (UMD-ish)
├─ zidan-form.mjs       # ESM wrapper re-exporting the same API
├─ plugin-core.css      # structure only
├─ plugin-theme.css     # tokens, presets, layouts, framework adapters
├─ index.html           # tabbed demo + theme showcase
├─ advanced.html        # advanced options + HTML/JS reference
├─ advanced.css/js      # advanced-page-only assets
├─ playground.html      # per-field option builder
├─ playground.css/js    # playground-only assets
├─ nav.css / nav.js     # shared demo header and mobile menu
├─ robots.txt           # Pages crawler directives + sitemap pointer
├─ sitemap.xml          # public Pages URLs
├─ demo.css / demo.js   # demo-only assets
├─ package.json         # npm metadata + scripts
├─ scripts/
│  ├─ serve.mjs         # dependency-free dev server (port 4173)
│  ├─ build.mjs         # assembles dist/ and the select/file subset bundles
│  ├─ test.mjs          # syntax / split-CSS / API checks
│  └─ release.mjs       # one-command version bump, changelog roll, commit and tag
├─ docs/                # comparison, options, validation, frameworks, theming, build
├─ .github/workflows/   # pages.yml (demo) and release.yml (npm publish with provenance)
├─ CHANGELOG.md
├─ README.md
└─ LICENSE
```

### Which files should you load?

**You do not have to load everything.** If the page only needs one control, load only that
build; the complete form bundle is only for forms that enhance several inputs at once. A subset
is a standalone build, not an add-on, so never load it together with the full bundle.

| If the page only needs… | Load |
| --- | --- |
| Custom select dropdowns | `dist/select/zidan-select.js` plus `plugin-select-core.css` and `plugin-select-theme.css`. Every other input stays untouched; the full bundle is not needed. |
| File uploads | `dist/file/zidan-file.js` plus `plugin-file-core.css` and `plugin-file-theme.css`. The rest of the form is untouched. |
| Every input at once | `zidan-form.js` plus `plugin-core.css` and `plugin-theme.css`; one `initZidanForms()` call enhances text fields, selects, file uploads, checkboxes and radios together. |

Snippets and ESM variants for each row are under
[Select-only and file-only builds](#select-only-and-file-only-builds); the demo shows all three
side by side at the [builds section](https://akhtar1985.github.io/zidan-select/#builds).

## Scripts

| Command | Effect |
| --- | --- |
| `npm run dev` | Serves the repo at <http://localhost:4173> (`PORT=8080 npm run dev`). No dependency needed. |
| `npm test` | `node --check` on every script, asserts `plugin-core.css` has no colour literals, checks all presets/adapters and the exported API. |
| `npm run lint` | Syntax check only. |
| `npm run build` | Cleans `dist/`, copies the four assets, writes `dist/zidan-form.cjs`, generates the select-only and file-only bundles, and minifies **if** esbuild is installed. |
| `npm run release -- patch` | Bumps every version site, rolls `CHANGELOG.md`, runs the checks, commits and tags `vX.Y.Z`. |

There is no watch task: the JS and CSS are the distributables, so edit and reload. `npm run
dev` sends `Cache-Control: no-store`, which is enough for the demo.

### dist/ output

```
dist/
├─ zidan-form.js
├─ zidan-form.mjs
├─ zidan-form.cjs          # module.exports = require('../zidan-form.js')
├─ plugin-core.css
├─ plugin-theme.css
├─ select/
│  ├─ zidan-select.js      # select / combobox / tags only
│  ├─ zidan-select.mjs
│  ├─ plugin-select-core.css
│  └─ plugin-select-theme.css
├─ file/
│  ├─ zidan-file.js        # file upload only
│  ├─ zidan-file.mjs
│  ├─ plugin-file-core.css
│  └─ plugin-file-theme.css
└─ *.min.*                 # only when esbuild is installed
```

```bash
npm i -D esbuild
npm run build
```

Without esbuild the build still succeeds and prints that minification was skipped. Add
`dist/` to `.gitignore`; it is regenerated at publish time.

### Minified files

`npm run build` emits minified copies next to every bundle with esbuild:

| Build | JavaScript | Core CSS | Theme CSS |
| --- | --- | --- | --- |
| Full | `/dist/zidan-form.min.js` | `/dist/plugin-core.min.css` | `/dist/plugin-theme.min.css` |
| Select-only | `/dist/select/zidan-select.min.js` | `/dist/select/plugin-select-core.min.css` | `/dist/select/plugin-select-theme.min.css` |
| File-only | `/dist/file/zidan-file.min.js` | `/dist/file/plugin-file-core.min.css` | `/dist/file/plugin-file-theme.min.css` |

Prepend `https://cdn.jsdelivr.net/npm/zidan-select@2.4.0` to each path (or your own origin).
These are real files in the npm tarball, so unpkg and self-hosted CDNs serve the same bytes;
jsDelivr additionally auto-minifies the readable root files, but do not rely on that trick.
Check the three you use with `curl -I` before changing a version, then update the URLs in the
README, the demo build cards and the playground in the same commit.

## Select-only and file-only builds

`scripts/build.mjs` slices the single source into two smaller distributables. The sections in
`zidan-form.js`, `plugin-core.css` and `plugin-theme.css` are marked with
`/* @zidan-build:name */` comments; the builder keeps only the sections each variant needs and
writes the matching ESM wrapper. Edit the shared files, never the generated outputs.

| Build | JS | ESM | Core CSS | Theme CSS | Contains |
| --- | --- | --- | --- | --- | --- |
| Select | `dist/select/zidan-select.js` | `.mjs` | `plugin-select-core.css` | `plugin-select-theme.css` | Select, combobox, tags; icons, layouts, scrollbars |
| File | `dist/file/zidan-file.js` | `.mjs` | `plugin-file-core.css` | `plugin-file-theme.css` | File upload variants, previews, progress, validation |

Both theme stylesheets keep the token set, the five preset themes (`default`, `modern`,
`minimal`, `dark`, `glass`), the field layouts and the Bootstrap, Tailwind, Bulma and Foundation
adapters, so `data-zidan-theme`, `data-zidan-layout` and `data-zidan-framework` behave the same
as in the full build.

Approximate v2.4.0 sizes (readable → minified): select ≈104 → 62 kB JS, 12 → 9 kB core CSS,
32 → 27 kB theme; file ≈82 → 49 kB JS, 9 → 7 kB core, 34 → 29 kB theme; full ≈208 → 123 kB
JS, 38 → 29 kB core, 47 → 39 kB theme.

A page should load **one** flavour: a subset **or** the full build. The `__zidanFormGuard`
check keeps the first initialised copy, so loading two flavours together does not merge their
APIs — use the full build when a page needs both select and file upload.

Declarative init comes along in both subsets because the marker scan and the factory live in the
shared/factory sections every variant keeps. `class="zidan-select"`, `class="zidan-field"`,
`data-zidan-options` JSON and `window.ZIDAN_FORM_CONFIG` targets all work without a JS call; a
`zidan-form` scope enhances every select in the select bundle and every file input in the file
bundle.

Build-time safety: every generated JS file is passed through `node --check`, and missing sections
abort the build instead of producing a partial bundle.

## Local verification

1. `npm test` — structural checks.
2. `npm run dev` — open the demo and walk the six tabs.
3. Manual browser matrix: Chrome/Edge, Firefox, Safari (or Playwright WebKit). The demo
   includes the theme showcase and an iframe/width preview for responsive checks.
4. Validation pass: submit the empty "All inputs" form, confirm `aria-invalid`, fix fields,
   confirm the FormData summary, then reset.

## Versioning

Semantic versioning, with the history in [`CHANGELOG.md`](../CHANGELOG.md):

- **patch** — bug fixes, no token/API changes.
- **minor** — new themes, layouts, adapters, options (backwards compatible).
- **major** — renamed tokens, removed attributes, changed defaults.

The runtime guard (`__zidanFormGuard`) compares `VERSION` in `zidan-form.js`, so the version
constant, the `package.json` field, the lockfile and the CSS banners must always agree —
`npm test` fails when they drift.

## Releasing

```bash
npm run release -- patch --note "Fix the thing that broke"   # or: minor | major | 2.3.2
git push origin main --follow-tags
```

`scripts/release.mjs` is the whole release:

1. writes the new version into `package.json`, `package-lock.json`, the banner and `VERSION` in
   `zidan-form.js`, both CSS banners, the README CDN URLs, `index.html`, `advanced.html`,
   `docs/build.md` and `docs/html-and-wordpress.md`;
2. moves `## [Unreleased]` in `CHANGELOG.md` under `## [X.Y.Z] - YYYY-MM-DD` — write your notes
   there, or pass `--note "…"`; it refuses to cut a release with no notes;
3. runs `npm run types && npm test`;
4. commits `Release X.Y.Z` and creates the annotated tag `vX.Y.Z`.

Flags: `--dry-run` (print the plan, write nothing), `--no-commit` (edit files and the changelog
only), `--skip-checks`. It requires a clean tracked working tree, so the release commit holds only
the bump, and it refuses a version that is already tagged.

Pushing the tag starts `.github/workflows/release.yml`. Nothing else to run: it publishes to npm and
creates the matching GitHub Release, so the Releases panel and the changelog stay in step.

## Publishing to npm

Publishing happens in CI:

| Trigger | What happens |
| --- | --- |
| Tag `vX.Y.Z` pushed | Verifies the tag against `package.json`, refuses an existing version, runs `prepublishOnly` (types → build → test), publishes with `--provenance`, then creates the GitHub Release for the tag with `--generate-notes`. |
| **Actions → Publish to npm → Run workflow** | The same job without a tag, for publishing the version already committed. |

Authentication is **npm trusted publishing** over OIDC: the job requests `id-token: write` and
needs no token secret. One-time setup on npmjs.com — **zidan-select → Settings → Trusted
publishing → GitHub Actions**, owner `akhtar1985`, repository `zidan-select`, workflow
`release.yml`, environment left empty. Requires npm 11.5.1+; the workflow runs `node-version: 24`.

Without trusted publishing, create a granular access token with read+write on `zidan-select`,
store it as the `NPM_TOKEN` repository secret, and uncomment the `NODE_AUTH_TOKEN` env block at
the bottom of the workflow. Remove it once OIDC works.

Manual publishing remains a last resort:

```bash
npm login
npm test
npm publish        # tarball limited by package.json "files"
```

First publish: `npm publish --access public`. Scoped forks need `--access public` on every
publish.

`package.json` exposes both entries plus the subset builds, so all of these work:

```js
import ZidanForm from 'zidan-select';
const { ZidanForm } = require('zidan-select');
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

import { ZidanSelect } from 'zidan-select/select';
import 'zidan-select/select/css/core';
import 'zidan-select/select/css/theme';

import { zidanField, ZidanFileUpload } from 'zidan-select/file';
import 'zidan-select/file/css/core';
import 'zidan-select/file/css/theme';
```

### Pre-publish checklist

- [ ] `npm test` passes.
- [ ] Demo loads with zero console errors in Chromium, Firefox and WebKit.
- [ ] Both stylesheets present; core contains no colours.
- [ ] `README.md` links point to files that exist in the tarball.
- [ ] `npm pack --dry-run` lists JS, CSS, dist, docs, README and LICENSE only.
- [ ] Subset bundles regenerate and load without console errors.
- [ ] Version bumped in `package.json` and the JS/CSS headers.

## GitHub Pages

The demo is static and needs no build. `.github/workflows/pages.yml` assembles `_site/` on every
push to `main` — `index.html`, `advanced.html`, `playground.html`, `shopify.html`, `advanced.css`,
`advanced.js`, `playground.css`, `playground.js`, `demo.css`, `demo.js`, `nav.css`, `nav.js`, `robots.txt`,
`sitemap.xml`, the four library files and `docs/` — then uploads it with
`actions/upload-pages-artifact` and publishes it with `actions/deploy-pages`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

| URL | Serves |
| --- | --- |
| `https://akhtar1985.github.io/zidan-select/` | The tabbed demo |
| `https://akhtar1985.github.io/zidan-select/advanced.html` | Advanced options and API reference |
| `https://akhtar1985.github.io/zidan-select/playground.html` | Per-field option playground |
| `https://akhtar1985.github.io/zidan-select/shopify.html` | Shopify product-page demo |
| `https://akhtar1985.github.io/zidan-select/docs/` | Documentation index |
| `/#select`, `/#check`, `/#file`, `/#inputs`, `/#themes` | Deep links to a demo tab |
| `/playground.html#select`, `#file`, `#checkbox`, `#radio`, `#text` | Deep links to a playground control |
| `/robots.txt`, `/sitemap.xml` | Crawler directives and the public page URLs |

The workflow only copies demo assets, so `scripts/`, `dist/`, `package.json` and local scratch
files are never published.

## Release automation

[`.github/workflows/release.yml`](../.github/workflows/release.yml) is the complete workflow:
tag-triggered, provenance-enabled, dist-tag aware (`latest`, or `next` for prereleases), with
guards against a mismatched tag and a duplicate version. It installs the dev tooling with
`npm ci` only to build and test — the published package still has no runtime dependencies.
