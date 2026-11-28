# Zidan Select 2.6.0 — Release Candidate Evidence

**Status:** Phase 3 release candidate committed locally as the 2.6.0 release commit. Not pushed, tagged, deployed or published.
**Date:** 2026-11-28
**Branch:** `chore/p3-repo-hygiene` · HEAD `e9694234a252cae85585e8e8fb5cb55bd0d5dff5`
**Version:** 2.6.0 · published baseline: 2.5.1
**Authority:** `zidan-form.js` and `zidan-form.d.ts` outrank README, docs and demos.

## 1. Gate results

| Gate | Result |
| --- | --- |
| `npm test` | PASS — 93 DOM tests |
| `npm run types` | PASS — bundler + node16 |
| `npm run lint` | PASS — 40 files |
| `npm run pack:check` | PASS — 40 files, 398 kB packed |
| `npm run lab:all` | PASS — 4/4 labs |
| Testing Lab | 113 passed · 0 failed |
| Demo Lab | 36 passed · 0 failed |
| Bug Finder Lab | 9 passed · 2 inconclusive |
| Documentation Lab | 10 passed · 1 not run (offline npm query) |
| `node scripts/lab-inventory.mjs --check` | Up to date — select 86 options/18 callbacks/41 methods; field 133/19/53; 33 events; 158 classes/100 tokens |
| `git diff --check` | Clean |
| Secret-like pattern scan | No matches |
| CI pack-check follow-up | Clean rebuild asserts core CSS (esbuild is optional); consumer tarball is copied before install and extracted from its own directory |
| CI size-line-ending follow-up | Full-build docs normalized to LF (310,366 B, 303 kB); `scripts/sizes.mjs` and `scripts/test.mjs` normalize CRLF, and `.gitattributes` pins LF |
| AJAX browser style check | `pre` padding 16px, radius 14px, background rgb(17,22,42); 3 copy controls; no console errors |

The two Bug Finder inconclusive items are the pre-existing security-sink census and the
missing named regressions for older fixed bugs; neither is a failing probe.

## 2. Fresh tarball

| Measure | 2.6.0 candidate | Published 2.5.1 |
| --- | ---: | ---: |
| Files | **40** | 53 |
| Tarball bytes | **406,410** | 973,607 |
| Unpacked bytes | **1,738,158** | 2,729,081 |
| Root declaration bytes | **36,996** | 24,346 |

Every difference is accounted for:

- **Only in 2.6.0:** `CHANGELOG.md`.
- **Only in 2.5.1:** three duplicate full-build artifacts (`dist/zidan-form.cjs`,
  `dist/zidan-form.js`, `dist/zidan-form.mjs`), ten generated HTML docs, and two demo PNGs.
- The package `files` list on HEAD ships `docs/*.md` (not generated HTML/screenshots) and adds
  `CHANGELOG.md`. This is a pre-existing packaging choice, not a Phase 2 removal.
- `exports` is byte-for-byte equivalent to 2.5.1; all **33 export targets** resolve in the
  pack check. No exported subpath was removed.
- Declarations gained 317 lines and lost 5 versus 2.5.1, reflecting the 2.6.0 type surface,
  `deselectable`, and the removal of `previews`.

The tarball contains README, CHANGELOG, LICENSE, root declarations, ESM entry and
`docs/options.md`; no generated HTML, screenshots or unminified duplicate full-build artifacts are shipped.

## 3. Release-surface review

- `package.json`, `package-lock.json`, runtime banner/`VERSION`, CSS banners,
  `lab-inventory.js`, README CDN pins, docs and demo pages all report 2.6.0.
- `deselectable?: boolean` is declared and source-backed; `previews` is removed as a
  never-implemented declaration-only cleanup (`showPreview` is the real option).
- The inventory is `quality-reports/RELEASE-FEATURE-INVENTORY.csv`: **882 lines**
  (header + 881 rows), **14 columns**, including `Kind`.
- Generated quality-lab registry files were restored after the lab run and are not part of
  the release diff.

## 4. Residual gaps — do not overclaim

- `quality-reports/DEMO-COVERAGE-MATRIX.csv` remains **0 COMPLETE**, 477 PARTIAL,
  114 MISSING, 24 N/A, 1 UNSUPPORTED. There are no per-component A–I pages and callback
  coverage is incomplete. 2.6.0 must not be marketed as "complete demos" or "complete
  documentation."
- The API/AJAX examples are labeled demos; uploads are simulated and the POST endpoint is a
  local mock.
- The live GitHub Pages site and npm remain at 2.5.1 until separately approved publication.
- Phase 3 evidence is complete for this candidate; commit, push, tag, GitHub release, Pages
  deployment and npm publish still require separate explicit approval.
