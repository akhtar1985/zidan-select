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
├─ demo.css / demo.js   # demo-only assets
├─ package.json         # npm metadata + scripts
├─ scripts/
│  ├─ serve.mjs         # dependency-free dev server (port 4173)
│  ├─ build.mjs         # assembles dist/ (+ optional minification)
│  └─ test.mjs          # syntax / split-CSS / API checks
├─ docs/                # comparison, options, validation, frameworks, theming, build
├─ README.md
└─ LICENSE
```

## Scripts

| Command | Effect |
| --- | --- |
| `npm run dev` | Serves the repo at <http://localhost:4173> (`PORT=8080 npm run dev`). No dependency needed. |
| `npm test` | `node --check` on every script, asserts `plugin-core.css` has no colour literals, checks all presets/adapters and the exported API. |
| `npm run lint` | Syntax check only. |
| `npm run build` | Cleans `dist/`, copies the four assets, writes `dist/zidan-form.cjs`, and minifies **if** esbuild is installed. |

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
└─ *.min.*                 # only when esbuild is installed
```

```bash
npm i -D esbuild
npm run build
```

Without esbuild the build still succeeds and prints that minification was skipped. Add
`dist/` to `.gitignore`; it is regenerated at publish time.

## Local verification

1. `npm test` — structural checks.
2. `npm run dev` — open the demo and walk the six tabs.
3. Manual browser matrix: Chrome/Edge, Firefox, Safari (or Playwright WebKit). The demo
   includes the theme showcase and an iframe/width preview for responsive checks.
4. Validation pass: submit the empty "All inputs" form, confirm `aria-invalid`, fix fields,
   confirm the FormData summary, then reset.

## Versioning

Semantic versioning, with the changelog living in GitHub releases:

- **patch** — bug fixes, no token/API changes.
- **minor** — new themes, layouts, adapters, options (backwards compatible).
- **major** — renamed tokens, removed attributes, changed defaults.

Keep `VERSION` in `zidan-form.js`, `package.json` and the CSS headers in step. The runtime
guard (`__zidanFormGuard`) uses that version to avoid double-initialising when the file is
loaded twice.

## Publishing to npm

```bash
npm login
npm test
npm version minor -m "release: v%s"
npm run build
npm publish        # tarball limited by package.json "files"
git push --follow-tags
```

First publish: `npm publish --access public`. Scoped forks need `--access public` on every
publish.

`package.json` exposes both entries, so all of these work:

```js
import ZidanForm from 'zidan-select';
const { ZidanForm } = require('zidan-select');
import 'zidan-select/css/core';
import 'zidan-select/css/theme';
```

### Pre-publish checklist

- [ ] `npm test` passes.
- [ ] Demo loads with zero console errors in Chromium, Firefox and WebKit.
- [ ] Both stylesheets present; core contains no colours.
- [ ] `README.md` links point to files that exist in the tarball.
- [ ] `npm pack --dry-run` lists JS, CSS, dist, docs, README and LICENSE only.
- [ ] Version bumped in `package.json` and the JS/CSS headers.

## GitHub Pages

The demo is static and needs no build. `.github/workflows/pages.yml` assembles `_site/` on every
push to `main` — `index.html`, `demo.css`, `demo.js`, the four library files and `docs/` — then
uploads it with `actions/upload-pages-artifact` and publishes it with `actions/deploy-pages`.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

| URL | Serves |
| --- | --- |
| `https://akhtar1985.github.io/zidan-select/` | The tabbed demo |
| `https://akhtar1985.github.io/zidan-select/docs/` | Documentation index |
| `/#select`, `/#check`, `/#file`, `/#inputs`, `/#themes` | Deep links to a demo tab |

The workflow only copies demo assets, so `scripts/`, `dist/`, `package.json` and local scratch
files are never published.

## Release automation (optional)

```yaml
# .github/workflows/publish.yml
name: publish
on:
  release:
    types: [published]
jobs:
  npm:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://registry.npmjs.org
      - run: npm test
      - run: npm run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

The workflow needs no install step because the project has no dependencies.
