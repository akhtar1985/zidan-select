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
| `npm test` | `node --check` on every script, asserts `plugin-core.css` has no colour literals, checks all presets/adapters, the exported API, and that the documented asset sizes match `dist/`. |
| `npm run lint` | Syntax check only. |
| `npm run build` | Cleans `dist/`, copies the four assets, writes `dist/zidan-form.cjs`, generates the select-only and file-only bundles, and minifies **if** esbuild is installed. |
| `npm run sizes` | Rewrites the byte sizes quoted in `docs/build.md`, `README.md`, `index.html` and `advanced.html` from the built files. Run it after `npm run build`; `npm test` fails when they drift. |
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
| Full | `/dist/zidan-form.min.js` — ≈132 kB | `/dist/plugin-core.min.css` — ≈31 kB | `/dist/plugin-theme.min.css` — ≈39 kB |
| Select-only | `/dist/select/zidan-select.min.js` — ≈68 kB | `/dist/select/plugin-select-core.min.css` — ≈9 kB | `/dist/select/plugin-select-theme.min.css` — ≈27 kB |
| File-only | `/dist/file/zidan-file.min.js` — ≈50 kB | `/dist/file/plugin-file-core.min.css` — ≈7 kB | `/dist/file/plugin-file-theme.min.css` — ≈29 kB |

Prepend `https://cdn.jsdelivr.net/npm/zidan-select@2.5.0` to each path (or your own origin). These are real entries in the npm tarball, so unpkg and self-hosted CDNs serve the same bytes.
Use these package files rather than relying on a CDN's auto-minification.
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

Measured current source sizes, including Unreleased fixes (1 kB = 1,024 bytes; readable → minified).
Regenerate them with `npm run build` followed by `npm run sizes`; `npm test` fails when they drift:

| Build | JavaScript | Core CSS | Theme CSS |
| --- | --- | --- | --- |
| Full | 279,391 B (≈273 kB) → 159,804 B (≈156 kB) | 44,016 B (≈43 kB) → 33,862 B (≈33 kB) | 47,953 B (≈47 kB) → 40,219 B (≈39 kB) |
| Select-only | 147,052 B (≈144 kB) → 85,306 B (≈83 kB) | 13,156 B (≈13 kB) → 10,092 B (≈10 kB) | 32,815 B (≈32 kB) → 27,741 B (≈27 kB) |
| File-only | 101,720 B (≈99 kB) → 58,615 B (≈57 kB) | 9,939 B (≈10 kB) → 7,210 B (≈7 kB) | 35,241 B (≈34 kB) → 30,159 B (≈29 kB) |

A page should load **one** flavour: a subset **or** the full build. The `__zidanFormGuard`
check keeps the first initialised copy, so loading two flavours together does not merge their
APIs — use the full build when a page needs both select and file upload.

Declarative init comes along in both subsets because the marker scan and the factory live in the
shared/factory sections every variant keeps. `class="zidan-select"`, `data-zidan-options` JSON
and `window.ZIDAN_FORM_CONFIG` targets all work without a JS call; a `zidan-form` scope enhances
every select in the select bundle and every file input in the file bundle. The select-only bundle
also contains the complete AJAX/pagination implementation — `fetchUrl`, `fetchOptions`,
`fetchPageSize`, `loadMore()`, `refreshOptions()`, `getAsyncState()` and cache clearing — because
those sections are part of its build. The file-only bundle intentionally excludes select APIs;
it keeps the shared validation, theming, declarative-init and upload features.

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
| Tag `vX.Y.Z` pushed | Verifies the tag against `package.json`, refuses an existing version, runs `prepublishOnly` (types → build → test), publishes with `--provenance`, then creates the GitHub Release for the tag with that version's `CHANGELOG.md` section as the body (`scripts/changelog-section.mjs`), falling back to `--generate-notes` when the section is missing. |
| **Actions → Publish to npm → Run workflow** | The same job without a tag, for publishing the version already committed. |

Authentication is **npm trusted publishing** over OIDC: the job requests `id-token: write` and
needs no token secret. One-time setup on npmjs.com — **zidan-select → Settings → Trusted
publishing → GitHub Actions**, owner `akhtar1985`, repository `zidan-select`, workflow
`release.yml`, environment left empty. Requires npm 11.5.1+; the workflow runs `node-version: 24`.

Without trusted publishing, create a granular access token with read+write on `zidan-select`,
store it as the `NPM_TOKEN` repository secret, and uncomment the `NODE_AUTH_TOKEN` env block at
the bottom of the workflow. Remove it once OIDC works.

### Publish fails with `E404` (trusted publishing not configured)

```text
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/zidan-select - Not found
npm error 404  The requested resource 'zidan-select@X.Y.Z' could not be found or you do not have permission to access it.
```

npm answers `404` instead of `403` when a publish cannot be authorised, so this is an auth
problem, not a missing package. The tag and commit are fine — the npm side has no trusted
publisher for this repository yet. Register it once (**zidan-select → Settings → Trusted
publishing → GitHub Actions**, owner `akhtar1985`, repository `zidan-select`, workflow
`release.yml`, environment empty), then publish the tag that already exists. Do not re-tag or
move the tag: the run reads the version from `package.json` at that ref, which is what keeps the
artefact in step with `vX.Y.Z`.

```bash
gh workflow run release.yml --ref v2.5.0   # any existing tag
gh run watch
npm view zidan-select dist-tags            # latest should be 2.5.0
npm view zidan-select@2.5.0 version
```

A `workflow_dispatch` run skips the push-only guards and the "Create the GitHub release" step, so
create the Release yourself when the panel is empty — the body comes from the same changelog
section the workflow uses:

```bash
node scripts/changelog-section.mjs 2.5.0 > .build/notes-2.5.0.md
gh release create v2.5.0 --title v2.5.0 --notes-file .build/notes-2.5.0.md --verify-tag
```

jsDelivr only serves published tarballs, so a version that is not on npm has no CDN files: its
`zidan-select@X.Y.Z` URLs return 404. If that happens, pin the README, demo build cards and docs
to the **last published** version until the publish succeeds; `scripts/release.mjs` re-pins every
`zidan-select@X.Y.Z` URL and `…@X.Y.Z` shorthand to the new version on the next release, so a
delayed pin never sticks. `npm test` allows a pin behind `package.json` but rejects one ahead of
it or a mix of versions.

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
