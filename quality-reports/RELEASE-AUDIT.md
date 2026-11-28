# Zidan Select — Phase 1 Release Audit and Proposed 2.6.0 Update Plan

**Status:** Phase 1 audit baseline, with Phase 2 local updates recorded in §9. Nothing has been committed, pushed, tagged, released on GitHub, published to npm, or changed in repository settings.
**Repository:** akhtar1985/zidan-select, local branch chore/p3-repo-hygiene
**Audited HEAD:** e9694234a252cae85585e8e8fb5cb55bd0d5dff5
**Released baseline:** tag v2.5.1 = 77e353858c90bbcbb09aa705f5e06042a98935de (also origin/main)
**Branch position:** 3 commits ahead of v2.5.1; not merged to main
**Audit artifacts:** this report and quality-reports/RELEASE-FEATURE-INVENTORY.csv (881 rows, 14 columns)

## 1. Executive Summary

The implementation is healthy at the unit and lab level. <code>npm test</code> passes all 93 DOM tests. All four labs pass, with two Bug Finder items inconclusive and one Documentation Lab check skipped. Package exports, TypeScript compilation, lint, and pack checks pass.

The repository is not release-ready as a truthful 2.5.1 or 2.6.0 release yet, for four reasons.

1. **Public API truth is inconsistent.** <code>deselectable</code> is a real, documented runtime option but is absent from <code>zidan-form.d.ts</code>; the test named “TypeScript declarations cover every public option” does not detect it. Conversely, <code>previews</code> is declared in the public declarations but does not exist in the runtime.
2. **The release tree is ahead of the published version.** HEAD is three commits ahead of v2.5.1. It contains an added <code>zidan:deselect</code> event and <code>onDeselect</code> callback, a new canonical <code>framework</code> option, a changed <code>virtual</code> default, and setter behavior changes. Every version site still says 2.5.1. Packing HEAD would create a second, different 2.5.1 artifact.
3. **Documentation and demos are substantially incomplete relative to the public API.** The demo matrix has **0 COMPLETE** rows: **477 PARTIAL**, **114 MISSING**, **24 N/A**, **1 UNSUPPORTED**. Options and callbacks are 218 of 236 in tables, 17 are prose-only, and one is absent. All 140 method and static entries are named somewhere but have no structured signature table. The event console sees only 30 of 33 events and drops object payloads.
4. **Release and package hygiene is inconsistent.** Published npm 2.5.1 has 53 files and no CHANGELOG.md. The local dry-run pack has 40 files and includes it. Published declarations are about 24.3 KB; local declarations are 36,917 bytes. The live Pages sitemap lists 8 pages while the local sitemap lists 16, and lab.html returns 404 live.

**Recommended version:** **2.6.0 (minor)**. It adds a public event and callback and a canonical option alias, and changes defaults and behavior. A patch release would misrepresent the scope. A major release is not justified because no documented runtime API is removed. The only removal candidate, <code>previews</code>, was never implemented.

## 2. Scope, Authority and Method

- **Source of truth:** <code>zidan-form.js</code> for runtime, <code>zidan-form.d.ts</code> for the public type surface, <code>zidan-form.mjs</code> for the ESM wrapper, plus <code>package.json</code>, exports, and built package output.
- **Secondary evidence:** <code>lab-inventory.js</code>, <code>quality-reports/DEMO-COVERAGE-MATRIX.csv</code>, documentation pages, demos, tests, labs, live GitHub Pages, npm registry metadata, and Git history.
- **No README assumption was accepted as fact.** Examples and counts in README and docs were checked against source or executable tests.
- **Test coverage in the inventory is conservative.** “Textual reference in tests (N)” means the feature name occurs in test source, not that a dedicated assertion proves every behavior. CSS rows record only stylesheet and packaging checks.
- **Demo coverage is the existing matrix baseline.** It was not regenerated during this audit. Passing labs do not override its per-feature statuses.

### Current verification snapshot

| Check | Result | Note |
| --- | --- | --- |
| <code>npm test</code> | **93 DOM tests pass** | Includes the declaration-parity test that misses deselectable |
| <code>npm run types</code> | Pass | Both declaration tsconfigs |
| <code>npm run lint</code> | Pass | 40 files checked in the current tree |
| <code>npm run pack:check</code> | Pass | Does not prove published tarball contents |
| Testing Lab | **113 pass** | — |
| Demo Lab | **36/36 pass** | 16 pages, 7/7 interactions, 37 comboboxes, no duplicate IDs, 390 px no overflow |
| Bug Finder Lab | **9 pass, 2 inconclusive** | 11 HTML/eval sink lines flagged for review; older fixed bugs lack named regression tests |
| Documentation Lab | **10 pass, 1 not run** | ZS-DOCS-ONLINE live npm version check skipped |
| All Labs | **4/4 pass** | Does not equal feature-complete documentation or demos |

## 3. Release Feature Inventory

<code>quality-reports/RELEASE-FEATURE-INVENTORY.csv</code> contains **881 source-grounded rows**.

| Group | Rows | What it covers |
| --- | ---: | --- |
| Components | 8 | Public classes and the switch variant |
| Options and callbacks | 236 | Select, field, file, text, and form options and callbacks |
| Initializers | 8 | <code>zidanSelect</code>, <code>initZidanSelects</code>, <code>zidanField</code>, <code>initZidanForms</code>, and related entry points |
| Methods | 99 | Public instance methods across components |
| Statics | 41 | ZidanSelect and ZidanForm statics |
| Events | 33 | All public zidan:* events |
| HTML attributes | 165 | Declarative data-zidan-* and generated data-zs-* hooks |
| Enum values | 26 | SelectMode, SelectLayout, Theme, Framework, Scrollbar |
| CSS classes and tokens | 258 | 158 classes and 100 custom properties |
| Validation groups | 7 | Native, custom, async, date, file, form, and messages |

Every row records a stable ID, component, kind, source file and line, public status, test reference, demo coverage, documentation coverage, TypeScript coverage, and release status. The CSV has the required 14 columns. No source location is unresolved.

### Release-status distribution

| Release status | Rows |
| --- | ---: |
| Shipped in or before 2.5.1 | 867 |
| Unreleased 2.6.0 candidate (zidan:deselect, onDeselect) | 2 |
| framework canonical name, alias shipped | 1 |
| themeFramework deprecated alias | 1 |
| virtual default auto change | 1 |
| Setter warning behavior changes | 8 |
| Unsupported (previews) | 1 |

The large shipped count is expected: most of the inventory is the existing 2.5.1 surface. It does not mean the shipped docs and demos cover those rows. Coverage is recorded separately.

## 4. Findings

Severity: **Blocker** means resolve before any release. **High** means release gate. **Medium** means fix in 2.6.0 or document a time-bound exception. **Low** means polish.

### F-01 — Blocker — Public option deselectable is missing from TypeScript declarations

- Runtime: <code>zidan-form.js:4236</code> reads <code>deselectable</code> as a boolean field option.
- Docs: <code>docs/options.md:213</code> documents it.
- Tests: <code>scripts/dom/run.mjs:1761</code> has a regression test for deselectable radio behavior.
- Declarations: <code>zidan-form.d.ts</code> has no <code>deselectable</code> member.
- The test at <code>scripts/dom/run.mjs:1869</code> claims “TypeScript declarations cover every public option, method and event,” but its <code>opts.</code> scan cannot see <code>fieldBool(target, this.opts, 'deselectable', ...)</code>. The test therefore passes falsely.

**Impact:** TypeScript consumers cannot pass the option without a cast. The public type contract and the parity test are both wrong. This is a release blocker.

### F-02 — High — previews is declared but not implemented

- <code>zidan-form.d.ts:557</code> declares <code>previews?: boolean</code>.
- <code>zidan-form.js</code> has no <code>previews</code> occurrence. The matrix marks it UNSUPPORTED.
- It is absent from the options table and has no test.

**Impact:** The declaration promises a no-op. Consumers may set it expecting file previews; the real option is <code>showPreview</code>. Decide before release: remove the declaration and document the cleanup, or implement and test it. Recommendation: remove it. <code>showPreview</code> already covers visible behavior, and a new option would expand 2.6.0 scope without a design.

### F-03 — Blocker — HEAD is an unreleased tree still labeled 2.5.1

- <code>package.json</code>, <code>package-lock.json</code>, runtime VERSION, <code>lab-inventory.js</code>, README CDN pins, and docs examples still identify 2.5.1.
- HEAD is three commits ahead of v2.5.1. The tree contains unreleased features and behavior changes from CHANGELOG.md [Unreleased].
- A dry-run pack of HEAD is already a different 2.5.1 artifact: 401,172 bytes packed, 1,725,176 bytes unpacked, 40 files. Published 2.5.1 is 53 files and 2,729,081 bytes unpacked.

**Impact:** Publishing without a bump fails or, worse, creates an ambiguous duplicate version. This is the first release-engineering fix.

### F-04 — High — Documentation overclaims completeness and API coverage

- <code>README.md:1286</code> says “71 jsdom suites”. The current suite reports **93 DOM tests**.
- <code>docs/options.md:12</code> says the API lab “exercises the complete option, callback, method and event inventory.” The API page is an options and reference surface with no complete executable method or event matrix. Method examples are concentrated in the index page’s lab section.
- All 140 method and static entries are named somewhere, but there is no structured per-method signature, parameter, return, error, or example table. The inventory’s method rows now carry extracted declaration signatures precisely because the docs do not.
- Select option tables omit a Type column; field tables include one. This is a recurring source of type drift. For example, <code>deselectable</code> was recorded as a string in the matrix even though the runtime treats it as boolean.

**Impact:** Readers cannot reliably answer “what type is this, what does it return, what can fail?” from the docs. The “complete” claim is not evidence-based.

### F-05 — High — Demo coverage is not complete; there is no COMPLETE row

From <code>quality-reports/DEMO-COVERAGE-MATRIX.csv</code>, which has 616 API and demo rows:

| Status | Rows |
| --- | ---: |
| COMPLETE | **0** |
| PARTIAL | 477 |
| MISSING | 114 |
| NOT_APPLICABLE | 24 |
| UNSUPPORTED | 1 |

Additional demo findings:

- No dedicated A to I interactive documentation page exists for each component. Coverage is spread across index.html, playground.html, api.html, ajax.html, advanced.html, and shopify.html.
- Callback coverage is weak: 46 callback rows are 38 PARTIAL and 8 MISSING. The missing callbacks are filterOption, formatTag, onDeselect, renderOption, renderSelected, renderTag, validateTag, and renderFile.
- 23 static rows are MISSING. Several important statics have no executable example.
- Upload demos are explicitly simulated in index.html and demo.js. The API demo uses DummyJSON. shopify.html is a mock. These are acceptable for learning only if labeled and isolated from production-integration claims.
- The framework demo does not load Bootstrap, Tailwind, Bulma, or Foundation CSS, so the visual framework story is not fully exercised in the browser.
- Copy support is partial. playground.html has per-control copy. index.html has one copy button for its code surface. API and AJAX pages have no per-snippet copy controls.

**Impact:** The library can look more complete than it is. A “complete documentation” release claim cannot be made until the matrix has no unjustified MISSING rows and every claimed COMPLETE row has preview, code, explanation, and a passing interaction check.

### F-06 — Medium — Event console misses 3 events and discards object payloads

- <code>demo.js:884</code> lists 30 event names. Missing: <code>zidan:deselect</code>, <code>zidan:upload-queued</code>, <code>zidan:upload-retry</code>, out of 33 public events.
- <code>demo.js:929</code> skips any payload value whose type is object. Nested detail fields for items, files, errors, and results disappear from the visible console.

**Impact:** The newest event, deselect, and upload queue and retry diagnostics are invisible where users evaluate them. Fix with a dedicated all-events console and a safe renderer that preserves object keys without exposing secrets.

### F-07 — High — Published npm 2.5.1 does not match the current package surface

| Property | Published 2.5.1 | Local dry-run pack at HEAD |
| --- | --- | --- |
| Version | 2.5.1 | 2.5.1 (needs 2.6.0) |
| File count | 53 | 40 |
| Packed size | 973,607 bytes | 401,172 bytes |
| Unpacked size | 2,729,081 bytes | 1,725,176 bytes |
| CHANGELOG.md | absent | present |
| zidan-form.d.ts | 24,345 bytes | 36,917 bytes |
| docs HTML | present | absent; local files ships docs/*.md only |

The published package is not the artifact the current manifest would produce. The next release must be verified from a fresh tarball, not from the working tree or an old pack output.

**Impact:** Consumers of 2.5.1 received a leaner and older documentation and declaration set than HEAD. A 2.6.0 release that silently drops packaged HTML docs or changes the declaration surface is a release risk.

### F-08 — High — Live GitHub Pages is stale relative to the local site

- Live home returns 200 and displays 2.5.1.
- Live sitemap.xml lists **8** URLs. Local sitemap.xml lists **16**.
- Live lab.html returns **404**, although the local tree and CHANGELOG describe the published testing lab.
- Live docs pages that exist return 200, but the sitemap does not advertise them consistently.

**Impact:** The live demo and documentation site is not a faithful release artifact. “Published” cannot be claimed from local files alone. The Pages workflow and deploy must be checked after release.

### F-09 — Medium — Repository governance files are missing

Present: README.md, CHANGELOG.md, LICENSE (MIT), .gitignore, and three workflows: pages.yml, package.yml, release.yml.

Missing: CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, .github/PULL_REQUEST_TEMPLATE.md, and .github/ISSUE_TEMPLATE/ with bug, feature, and config files.

GitHub metadata is otherwise healthy: public, MIT, issues enabled, homepage set, 15 topics, 0 open issues, Discussions disabled.

**Impact:** There are no contributor test, build, and release instructions, no private vulnerability-reporting path, and no PR or issue quality gate. These are not code blockers but are expected for a public npm and GitHub release.

### F-10 — High — API documentation lacks structured signatures

- 140 method and static rows are named, but no per-entry table gives signature, parameters, return type, thrown or rejected errors, or a runnable example.
- The inventory can now supply declaration signatures, but the human docs cannot.
- Event payloads are compact and sometimes combined, such as zidan:open and zidan:close or zidan:tag-add and zidan:tag-remove. Detail fields are not consistently described per event.

**Impact:** The public API is discoverable by name but not reliably usable from docs. This is the largest documentation workstream.

### F-11 — Medium — Option tables and CSS hooks have coverage gaps

- 17 option and callback rows are prose-only: 8 select options (accentInsensitive, highlightMatches, itemHeight, locale, typeAhead, typeAheadTimeout, virtual, virtualThreshold), 6 select callbacks (filterOption, formatTag, renderOption, renderSelected, renderTag, validateTag), the field validate callback, and 2 upload callbacks (onUploadQueued, onUploadRetry).
- 1 public attribute, <code>data-zidan-max-total-size-mb</code>, is not in the docs tables. 23 internal data-zs-* attributes are correctly marked non-user-facing.
- 143 of 258 CSS hooks are not mentioned in docs; 115 are mentioned. Many are internal state classes, but the public theming boundary is not stated.

**Impact:** Users must read source for common behaviors such as virtualization, type-ahead, and render callbacks. They cannot tell which CSS hooks are stable.

### F-12 — Medium — Version pins and size and test claims are stale or duplicated

- README has 40 lines and 52 occurrences of 2.5.1, mostly CDN pins. docs/build.md has 9 more.
- README says CDN links pin the 2.5.1 release. After 2.6.0 every pin must move together.
- README’s size table says full about 310 kB raw. Current zidan-form.js is 317,871 bytes. Sizes should be generated, not hand-maintained.

**Impact:** Release docs can point at the old version or understate payload size. Add a version-pin and size check to the release script.

### F-13 — Medium — Tests do not cover several release-critical claims

- The declaration-parity test described in F-01 is a false negative.
- Bug Finder reports two inconclusive items: 11 HTML and eval sink lines need review, and older fixed bugs lack named regression tests.
- No test currently asserts that previews is absent from the runtime while present in declarations. The mismatch is found only by the audit inventory.
- Virtual default auto, the framework alias, the deselect event, and setter warnings are described in the changelog but should each have a named regression test in the release commit.

**Impact:** Release confidence rests on tests that can pass while public contracts drift.

### F-14 — Medium — Working tree contains uncommitted Stage 1 work

- Modified: playground.css, playground.html, playground.js, scripts/test.mjs, with 285 insertions and 19 deletions.
- Untracked: playground-meta.js and quality-reports/.
- No commit, push, tag, or publish has occurred.

This Stage 1 playground metadata work is tested by the field playground option metadata check but is not in v2.5.1 and is not in the audit baseline commit. It must be included deliberately in the 2.6.0 release commit or split into its own commit or PR. It must not be lost or accidentally mixed into unrelated source fixes.

**Impact:** Release diff ambiguity and possible loss of approved work.

## 5. Version Recommendation

**Recommendation: 2.6.0, a minor release.**

Why not a patch:

- zidan:deselect and onDeselect are new public API.
- framework becomes the documented canonical select option. themeFramework remains a deprecated alias.
- virtual defaults to auto at 150 rows, a visible behavior and performance change.
- Five setters change from throwing to warning on unknown values.
- The testing lab, sitemap, lint coverage, and package and docs metadata are release-visible changes.

Why not a major:

- No documented runtime API is removed. themeFramework still works.
- previews was never implemented. Removing its never-functional declaration is cleanup, not runtime removal. Document it explicitly in the changelog.

Do not tag or publish 2.6.0 until every Blocker and High finding has an accepted resolution.

## 6. Proposed 2.6.0 Update Plan

This is a proposal only. No item below is authorized for execution until the user approves it.

### Workstream A — API truth and tests (release-blocking)

1. Add <code>deselectable?: boolean</code> to the appropriate field options declaration. Document default false and radio-group scope.
2. Remove <code>previews?: boolean</code> from zidan-form.d.ts (recommended) or implement it fully with runtime, docs, demo, and tests. Do not leave a declared no-op.
3. Extend the declaration-parity test to scan:
   - <code>fieldBool(..., 'name', ...)</code>, <code>fieldString</code>, <code>pick</code>, <code>pickList</code>, and similar option readers;
   - every option row in the release inventory;
   - every public event in the event map.
4. Add named regression tests for:
   - zidan:deselect and onDeselect, including user removal versus programmatic silence;
   - framework canonical name and themeFramework alias;
   - virtual auto at 149, 150, and 151 rows, and virtual false;
   - setter warning behavior for all five setters;
   - package and type parity for deselectable.
5. Resolve the Bug Finder review items. Classify the 11 sink lines and add named regression tests for older fixed bugs where feasible.

**Acceptance:** npm test, npm run types, npm run lint, and npm run pack:check pass. The inventory shows no undeclared public runtime option and no declared runtime-absent option.

### Workstream B — Documentation truth (release-blocking)

1. Correct README claims: 93 DOM tests, current sizes, CDN pins moved to 2.6.0, and a precise statement of what the API lab does and does not exercise.
2. Add Type columns to every select option and callback table. Add all 17 prose-only rows to tables.
3. Add a structured API reference for all 140 method and static entries: signature, parameters, return, errors and rejections, example, and since version.
4. Expand the event reference to 33 individually described events, or clearly grouped aliases, with payload fields and when they fire. Document deselect and upload queue and retry.
5. Document data-zidan-max-total-size-mb. Mark internal data-zs-* attributes and internal CSS classes as non-public. Document the stable CSS hook boundary.
6. Add a generated docs check that compares the release inventory against the docs tables and fails on public rows with no row or signature.

**Acceptance:** For every one of the 881 inventory rows, documentation coverage is a real table, signature, or mention, or an explicit internal or non-public classification. No “complete inventory” claim unless the check passes.

### Workstream C — Complete demos and controls (release-blocking for the completeness claim)

Target structure: one dedicated A to I page per component: Select, Text and Input, Checkbox, Switch, Radio group, File upload, Range, and Form, plus the existing overview. Each page must include:

- **A** Overview and when to use it.
- **B** Basic markup and initialization.
- **C** Every option and callback with a real control or a clearly labeled non-visual code example.
- **D** Methods with executable buttons and return and error display.
- **E** Events with a live payload console.
- **F** Validation and error states.
- **G** Accessibility: labels, keyboard, ARIA, focus, and screen-reader notes.
- **H** Responsive, theming, and framework states.
- **I** Copyable code tabs and API cross-links.

Concrete fixes:

1. Add the 3 missing events to the console: deselect, upload-queued, upload-retry.
2. Render object payloads safely, with no raw HTML injection and no token or secret fields. Preserve nested keys in a readable tree.
3. Add per-snippet copy controls to index, API, and AJAX pages.
4. Replace DummyJSON with local fixtures for deterministic demos, or label it as an external live service with failure handling.
5. Keep upload simulations but label them. Add one real-endpoint example using a local mock server or documented test endpoint.
6. Load at least Bootstrap and Tailwind CSS in the framework demo, or mark those comparisons as non-visual.
7. Regenerate DEMO-COVERAGE-MATRIX.csv. Allow COMPLETE only when preview, code, explanation, interaction, accessibility, responsive checks, and no console errors all pass.

**Acceptance:** 0 unjustified MISSING rows, 0 PARTIAL rows for public options or callbacks that cannot be observed, every COMPLETE row has evidence, and the event console covers 33 of 33.

### Workstream D — Repository and package hygiene

1. Add CONTRIBUTING.md with setup, build, test, types, lint, labs, PR and release rules, and no-secrets guidance.
2. Add SECURITY.md with supported versions and a private reporting route.
3. Add CODE_OF_CONDUCT.md, a PR template, and issue templates for bugs, features, and config.
4. Link these from README and the npm README.
5. Add a package verification script that:
   - builds from a clean checkout;
   - runs npm pack;
   - asserts the tarball contains CHANGELOG.md, README, LICENSE, declarations, CSS, and expected exports;
   - installs the tarball into a clean temp project and imports CJS, ESM, select, file, min, and CSS subpaths;
   - checks declaration resolution for both node and node16 module settings.
6. Decide the docs HTML packaging policy. A lean package plus docs link is recommended. Document it so the next release does not accidentally drop or duplicate pages.

**Acceptance:** The fresh tarball matches the documented file list, clean install passes, no secret patterns are present, and the package has CHANGELOG.md.

### Workstream E — Version, release notes, GitHub, npm

1. Bump every version site to 2.6.0: package.json, lockfile, runtime VERSION, lab-inventory.js, README CDN pins, docs/build.md, docs HTML version markers, and any release metadata.
2. Move [Unreleased] to [2.6.0] with a date. Write release notes with Added, Changed, Fixed, Deprecated, and Removed sections, including the previews removal.
3. Regenerate and review the demo matrix and release inventory. Archive them with the release.
4. Run the full gate: test, types, lint, pack:check, all labs, fresh tarball, clean install, and live-page smoke.
5. Merge to main through a PR and confirm main equals the release commit.
6. Tag v2.6.0 only after merge. Publish the GitHub release and npm only after separate explicit approval.
7. Deploy Pages and verify 16 of 16 sitemap URLs, lab.html 200, version 2.6.0, no 404s, and no console errors.
8. Post-release: npm view, clean install from registry, CDN URL checks, GitHub release asset checks, docs and demo smoke, and sitemap refresh.

### Workstream F — Release gates

A 2.6.0 release is blocked until:

- [ ] All Blocker and High findings are accepted as fixed or explicitly waived with rationale.
- [ ] deselectable is declared, previews is resolved, and the parity test cannot pass falsely.
- [ ] Version is 2.6.0 everywhere, with no 2.5.1 CDN pins in current docs.
- [ ] npm test with 93 plus new tests, types, lint, and pack:check pass.
- [ ] All Labs pass, the docs online check is no longer skipped, and Bug Finder inconclusive items are triaged.
- [ ] The demo matrix has no unjustified MISSING rows, the event console covers 33 of 33, and object payloads are visible.
- [ ] Docs tables cover every public option and callback, and all 140 method and static entries have structured signatures.
- [ ] The fresh tarball matches expected files and clean install works for all exports.
- [ ] Repository governance files are present and linked.
- [ ] Pages has all 16 URLs and the lab, and the live version matches npm and the GitHub release.
- [ ] No secrets or tokens are present in tracked files or demo code.
- [ ] Commit, push, tag, GitHub release, and npm publish are separately approved.

## 7. Decisions Required Before Phase 2

1. **Approve 2.6.0 minor**, recommended, or specify a different version.
2. **previews:** remove the declaration, recommended, or implement it as a real feature.
3. **Stage 1 uncommitted work:** include it in the 2.6.0 release commit, or split it into a separate commit or PR first.
4. **Demo scope:** require full A to I pages for all 8 components before 2.6.0, or ship 2.6.0 with API and docs truth fixes and explicitly defer component-page completeness to 2.7.0. The first option matches the earlier no-incomplete-pages requirement but is the largest workstream.
5. **External demo dependencies:** replace DummyJSON and the Shopify mock with local fixtures, or keep and label them as external or mock.
6. **Repository governance:** add all suggested files now, or only CONTRIBUTING and SECURITY for this release.

## 8. Explicit No-Change Statement

This Phase 1 audit did **not** edit, delete, commit, push, tag, publish, or change repository settings.

- No production source, docs, demo, test, package, workflow, or configuration file was modified.
- No Git commit, branch change, tag, GitHub release, npm publish, or Pages deploy occurred.
- The only new audit artifacts are quality-reports/RELEASE-FEATURE-INVENTORY.csv and this report.
- The pre-existing uncommitted Stage 1 changes listed in F-14 remain untouched.
- dist/ may have been regenerated by the read-only build and pack check. It is gitignored and not part of the audit deliverable.

**Awaiting explicit approval of the proposed plan and decisions before any Phase 2 edit.**


## 9. Phase 2 progress — 2026-11-28

This section is additive; the Phase 1 findings above remain the audit baseline. Nothing in this phase was committed, pushed, tagged or published.

| Finding | Status | Evidence |
| --- | --- | --- |
| F-01 deselectable declaration | **Closed** | `zidan-form.d.ts` declares `deselectable?: boolean`; declaration-parity test scans field option readers. |
| F-02 previews drift | **Closed** | `previews` removed from declarations; docs note the type cleanup; 2.6.0 changelog entry added. |
| F-03 unreleased 2.5.1 tree | **Closed** | Package, lockfile, runtime, CSS banners, CDN pins, demo pages and `lab-inventory.js` report 2.6.0. |
| F-04 documentation overclaims | **Partly closed** | Test count corrected to 93; API-lab claim narrowed; option type index and method/static signature indexes added. Event payload prose remains compact. |
| F-05 demo completeness | **Partly closed** | `playground.html` now carries an A–I review map and responsive width control for every tab; there is still no per-component page and the 616-row matrix is unchanged. Demo Lab passes 36 checks. |
| F-06 event console gaps | **Closed** | All 33 events are listed; nested object payloads are rendered by the recursive formatter. |
| F-07 npm artifact mismatch | **Addressed locally** | Fresh pack-check: 40 files, 398 kB packed, 1,711 kB unpacked, declarations and CHANGELOG present. Publication is still pending separate approval. |
| F-08 stale Pages site | **Open — post-release** | Local sitemap has 16 URLs and lab.html exists; live deployment must be checked after publication. |
| F-09 governance files | **Closed** | CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, PR template and three issue-template files added. |
| F-10 structured method docs | **Partly closed** | 108 instance/static method rows now carry declaration signatures; static registry table added. Per-entry parameters, returns, errors and runnable examples are not yet exhaustive. |
| F-11 option and CSS gaps | **Partly closed** | 235 valid option/callback rows included in the type index; `previews` excluded. Public CSS contract documented; a full class/token index is still open. |
| F-12 stale version/size/test claims | **Closed** | Version sites bumped; `npm run sizes` rewrote 5 documents; README test count corrected. |
| F-13 release-critical tests | **Partly closed** | Declaration parity and package required-file checks strengthened; demo matrix still static. |
| F-14 Stage 1 working tree | **Closed** | Stage 1 edits are included in the local 2.6.0 release commit. |

### Current gate evidence

| Gate | Result |
| --- | --- |
| `npm test` | PASS — 93 DOM tests |
| `npm run types` | PASS — bundler + node16 |
| `npm run lint` | PASS — 40 files |
| `npm run pack:check` | PASS — 40 files, 398 kB packed |
| Testing Lab | PASS — 113 passed |
| Demo Lab | PASS — 36 passed |
| Bug Finder Lab | PASS — 9 passed, 2 inconclusive |
| Documentation Lab | PASS — 10 passed, 1 not run (offline) |

**Remaining release blockers:** per-component A–I pages and matrix completion, and separate approval for push, tag, GitHub release, Pages deployment and npm publish. The public CSS contract is documented in `docs/theming.md`.


## 10. Phase 3 release candidate — 2026-11-28

Phase 3 evidence is recorded in `quality-reports/RELEASE-2.6.0-EVIDENCE.md`. The fresh 2.6.0 tarball has 40 files, is 407,128 bytes and unpacks to 1,752,550 bytes; all 33 export targets resolve. The 2.5.1 package had 53 files and 2,729,081 unpacked bytes; the difference is the slimmer `docs/*.md` packaging, removal of generated HTML/screenshots and duplicate full-build `dist` artifacts, plus `CHANGELOG.md`. No exported subpath was lost.

Diff review caught an accidental truncation of `ajax.css` to the literal text `utf8`; it was restored from HEAD and the `.ajax-copy` rule re-added. The Demo Lab and a browser computed-style check (padding 16px, radius 14px, background rgb(17,22,42), three copy controls) passed after the fix.

The first CI package run then exposed a Windows/Linux CRLF size drift: the full raw bundle was documented as 310 kB from a CRLF checkout while GitHub Actions checked out LF. `scripts/sizes.mjs` and `scripts/test.mjs` now normalize line endings before measuring, `docs/build.md` records the LF-canonical 310,366 B, and a new `.gitattributes` pins LF. CI is being re-run.

All local gates are green: 93 DOM tests, types, lint, pack check and 4/4 labs. The release candidate is committed locally; it is not pushed, tagged, deployed or published. The demo matrix remains 0 COMPLETE; only a truthful 2.6.0 API/docs release can be claimed.
