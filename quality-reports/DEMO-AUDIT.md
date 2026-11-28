# Zidan Select — Public Demo Coverage Audit

**Status:** baseline audit (2.5.1). Phase 2 local updates are noted below; nothing pushed, deployed or published.
**Repository:** `D:\Projects\qoder-build\slect-luging` · branch `chore/p3-repo-hygiene` · HEAD `e969423` (P3 stacked on P2) · package version 2.5.1.
**Artifact:** [`quality-reports/DEMO-COVERAGE-MATRIX.csv`](DEMO-COVERAGE-MATRIX.csv) — 616 rows, one per public feature/API surface.
**Post-audit progress:** Stage 1 adds typed metadata and filtering to all 108 playground controls; see [`IMPLEMENTATION-LOG.md`](IMPLEMENTATION-LOG.md). The findings below describe the audited baseline and are not yet closed.

## 1. Executive summary

The demos are broad and visually polished, but they are **showcase-level, not complete developer documentation**. Under the strict six-evidence rule in §2, **no row is COMPLETE**. The matrix records:

| Status | Rows | Meaning in this audit |
| --- | ---: | --- |
| COMPLETE | 0 | Live preview + per-option control + code + explanation + test + visible metadata/default/type/current value |
| PARTIAL | 477 | Some real evidence exists, but at least one required piece is missing |
| MISSING | 114 | No live or interactive demonstration; at most docs/code/test references |
| NOT_APPLICABLE | 24 | 23 internal `data-zs-*` markers + deprecated `themeFramework` alias |
| UNSUPPORTED | 1 | `previews` — declared in `.d.ts`/registry/docs, absent from `zidan-form.js` |

Highest-impact findings:

- **108 option controls exist, but every one is label-only.** `playground.js` renders a label and an input; it never shows the option name, explanation, default, accepted type/values or current value, so none can be COMPLETE.
- **55 options/callbacks have no live demo at all** (47 options + 8 callbacks), including `virtual`, `typeAhead`, `locale`, `renderOption`, `filterOption`, `onDeselect`, `uploadHandler`, `validateDate`.
- **8 callbacks are not observable**: `filterOption`, `formatTag`, `onDeselect`, `renderOption`, `renderSelected`, `renderTag`, `validateTag`, `renderFile`.
- **3 of 33 events are absent from the index event console**: `deselect`, `upload-queued`, `upload-retry` (30 names in `EVENT_NAMES`). Payload rendering drops objects, so full event details are never shown.
- **29 form/select statics have no executable example**; 4 method rows (`ZidanSelect.emit`, field `emit`, `ZidanForm.serialize`, `ZidanForm.destroyAll`) have no demo either. 95 methods are PARTIAL with a self-test button but no signature/params/return/expected-result documentation.
- **Docs are not a complete reference**: 49 select/file options are absent from `docs/options.md` tables; `Returns` appears **zero** times and `Parameters` once, so method pages have no structured signature/parameter/return sections.
- **Uploads are simulated**: `advanced.html` and `index.html` use `simulateUpload`; there is no configured real endpoint. API POST examples use `dummyjson.com` mock data. This must remain explicit unless a real endpoint is approved.
- **Frameworks are class-only demos**: playground applies `bootstrap`/`tailwind`/`bulma`/`foundation` classes, but `index.html` loads only `plugin-core.css`, `plugin-theme.css`, `demo.css`, `nav.css` — no framework CSS.

## 2. Method and evidence

- **Source of truth**: `zidan-form.js`, `zidan-form.mjs`, `zidan-form.d.ts`/`.d.mts`, plus the generated `lab-inventory.js`.
- **Inventories compared**: source; fresh `lab-inventory.js` (select: 86 options = 68 core + 18 callbacks, 41 methods, 11 static members; field: 133 options, 19 callbacks, 53 methods; form: 9 methods + 28 statics; 33 events; CSS lists); `quality-labs/shared/feature-registry/*.json` (8 components, 228 options, 193 methods, 32 events, 165 attributes, 258 CSS hooks, 26 enum values); `lab.js` EXPECTED arrays; `docs/options.md` tables; README.
- **Demo evidence**: static inspection of `index.html` (7 tabs, 14 `<h2>`, 69 `<h3>`, 17 code blocks, 42 buttons, one copy button `#copy-config`), `playground.html`/`playground.js` (11 kinds, 108 option keys), `api.html` (4 sections, 2 live GET/POST selects, 7 method buttons, 18 `<tr>` incl. header, 0 copy buttons, 0 option inputs), `advanced.html` (9 sections, 18 code blocks, copy buttons), `ajax.html` (4 sections, 0 copy buttons), `shopify.html` (mock theme page), `lab.html`/`lab.js` (76 method buttons, 33 event tests), and the 9 `docs/*.md` pages.
- **No browser run in this audit.** The latest four-lab evidence is the P3 baseline (`npm test` 93 DOM tests, types, lint 39 files, `lab:all` 4/4 PASS with 36 Demo Lab checks). The new matrix is static and must be re-validated by the Demo Lab after implementation.
- Each CSV status is computed from six evidence flags: **control, live preview, code example, explanation, test, metadata**. `COMPLETE` requires all six; a name appearing only in a snippet never counts.

## 3. Current demo inventory

| Page / asset | What it is today | Real strengths | Gaps that block completeness |
| --- | --- | --- | --- |
| `index.html` + `demo.js` | All-in-one showcase: 7 tabs (`all`, `select`, `check`, `file`, `inputs`, `lab`, `themes`), JS API table, event console, no-JS init | Real interactive selects/files/fields, theme showcase, event console, good copy | No per-option metadata panel; only 1 copy button; 14 sections mix many components; event log 30/33; no viewport/RTL/high-contrast controls; method/API table is static |
| `playground.html` + `playground.js` | Configurator for 11 kinds: select, file, checkbox, switch, radio, text, textarea, number, phone, range, date | 108 live controls, generated HTML/JS code tabs, reset, copy; genuine live updates | Label-only controls; only 23 select controls; no fetch/render options in the panel; methods/events are static lists; no per-option explanation/default/type/current readout |
| `api.html` + `api.js` | Request-options lab: 2 live remote selects (GET/POST), async-state buttons, option reference table (18 `<tr>` incl. header) | Shows real request lifecycle, cache/load-more/open/close buttons, request snippets | 0 copy buttons; 0 interactive request-option controls (all fixed in JS); table covers only the fetch family; no per-option preview of headers/body/paths |
| `advanced.html` + `advanced.js` | Patterns page: paged remote data, async email, phone formatting, range ticks, compact upload | Live advanced examples + 18 code blocks, copy buttons, clear narrative | No per-option controls; upload is simulated (`simulateUpload`), only 1 `uploadUrl` mention; no dedicated event/payload demos |
| `ajax.html` + `ajax.js` | AJAX tutorial with live API examples and retry/error contract | Real GET/POST examples, retry/error explanation | 0 copy buttons; no option controls; no event log; duplicates API content with different snippets |
| `shopify.html` | Mock product page + theme snippets | Shows integration shape | Not a real Shopify theme integration; no end-to-end test; explicit mock disclaimer needed |
| `lab.html` + `lab.js` + `lab-inventory.js` | Internal coverage board, 76 method buttons, 33 event self-tests | Executable method/event probes, coverage comparison | Stale EXPECTED arrays (see §7); not a public docs page; buttons lack signature/params/return docs |
| `docs/*.md` + generated HTML (9 pages) | Reference: options, theming, frameworks, validation, comparison, HTML/WordPress, build | Broad prose, theming/frameworks guidance, examples | 199 option table rows vs 220+ options, 49 options absent; methods have no structured parameters/returns; generated pages not linked to per-component demos |

## 4. Feature-to-demo coverage matrix

| Feature kind | Rows | PARTIAL | MISSING | N/A | UNSUPPORTED | COMPLETE |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Components | 8 | 8 | 0 | 0 | 0 | 0 |
| Options | 198 | 149 | 47 | 1 | 1 | 0 |
| Callbacks | 38 | 30 | 8 | 0 | 0 | 0 |
| Init options | 8 | 8 | 0 | 0 | 0 | 0 |
| Methods | 99 | 95 | 4 | 0 | 0 | 0 |
| Statics | 41 | 12 | 29 | 0 | 0 | 0 |
| Events | 33 | 30 | 3 | 0 | 0 | 0 |
| Attributes | 165 | 119 | 23 | 23 | 0 | 0 |
| Enum values | 26 | 26 | 0 | 0 | 0 | 0 |
| **Total** | **616** | **477** | **114** | **24** | **1** | **0** |

Interpretation: components and enums are demoed but not documented to the A–I standard; options split into controls without metadata, fixed live instances without controls, or no demo; methods are mostly exercised by lab buttons but lack reference documentation; statics and attributes are the weakest surfaces.

## 5. Missing option controls

### 5.1 Features with no live demonstration (55)

- **Select (25):** `accentInsensitive`, `ariaLabel`, `caseSensitive`, `clearText`, `customClasses`, `delimiters`, `emptyText`, `highlightMatches`, `itemHeight`, `locale`, `requiredText`, `searchValues`, `suggestions`, `typeAhead`, `typeAheadTimeout`, `valueDelimiter`, `virtual`, `virtualThreshold`, `filterOption`, `formatTag`, `onDeselect`, `renderOption`, `renderSelected`, `renderTag`, `validateTag`.
- **Field/file (30):** `allowPaste`, `canceledLabel`, `clearLabel`, `descriptions`, `fileVariant`, `hidePasswordLabel`, `labels`, `maxSize`, `maxTotalSize`, `maxTotalSizeMB`, `minFiles`, `queuedLabel`, `rangeBubble`, `replaceTitle`, `retryingLabel`, `showCancel`, `showClear`, `showPasswordLabel`, `showRemove`, `showRetry`, `showStatus`, `statusFormat`, `stepperDownLabel`, `stepperStep`, `stepperUpLabel`, `uploadHandler`, `uploadIcon`, `uploadWithCredentials`, `validateDate`, `renderFile`.

Every one has a row in the CSV with its default/type and the specific missing work. Several are aliases or advanced hooks, but aliases still need an explicit “same as X” demo note; they are not N/A.

### 5.2 Features with only a fixed live instance (no control)

- **Fetch family (22):** `fetchUrl`, `fetchMethod`, `fetchParams`, `fetchBody`, `fetchHeaders`, `fetchCredentials`, `fetchQueryParam`, `fetchPageParam`, `fetchSkipParam`, `fetchPageSizeParam`, `fetchPageSize`, `fetchItemsPath`, `fetchTotalPath`, `fetchHasMorePath`, `fetchOptions`, `autoLoadMore`, `cacheResults`, `debounce`, `minChars`, `loadMoreText`, `loadingText`, `noResultsText`. The page shows a working fixed request, not the effect of changing each option.
- **Init (8):** `autoInit`, `selector`, `targets`, `fieldTargets`, `formTargets`, `options`, `fieldOptions`, `fields` — only implicit auto-init on `index.html`; no mode/selector/JSON editor or precedence demo.
- **Event-only callbacks:** logged in the shared console but without a dedicated toggle/payload card (e.g. `onOpen`, `onClose`, `onSelect`, `onTagAdd`).

### 5.3 Controls that exist but are not complete

- All **108** option/callback controls in the CSV are `PARTIAL`: the panel contains no option name, short description, default, accepted type/values, current value, dependency note or mutability note.
- `optionRow()` in `playground.js` renders only `<label>` + input; there is no metadata model to drive such a panel.
- Select exposes only 23 controls (mode, layout, theme, framework, scrollbar, label, placeholder, searchable, clearable, multiple, closeOnSelect, maxDropdownHeight, maxTags, minTagLength, maxTagLength, reorderable, editable, allowFreeText, commitOnTab, commitOnBlur, required, disabled, validation); upload, fetch, rendering, a11y and virtualisation options are absent from the panel.

### 5.4 Missing callbacks, events and attributes

- Callbacks with no demo: the 8 listed in §1; `onDeselect` is documented but never logged; `onUploadQueued`/`onUploadRetry` exist but the console omits their events.
- Events missing from the console: `deselect`, `upload-queued`, `upload-retry`; the other 30 log only scalar detail keys — objects (`item`, `files`, `error`) are dropped.
- Attributes: **23 MISSING** (`data-zidan-accent-insensitive`, `allow-paste`, `aria-label`, `case-sensitive`, `file-variant`, `highlight-matches`, `item-height`, `locale`, `max-size`, `max-total-size`, `max-total-size-mb`, `min-files`, `range-bubble`, `show-clear`, `show-status`, `stepper-down-label`, `stepper-up-label`, `type-ahead`, `type-ahead-timeout`, `upload-icon`, `upload-with-credentials`, `virtual`, `virtual-threshold`); **119 PARTIAL** (generated in code but no attribute editor or markup/JS equivalence demo); **23 N/A** (22 internal `data-zs-*` + `themeFramework`).

## 6. Missing component demonstrations

No page meets sections A–I. Current state by section:

| Page | A intro/limitations | B live preview | C per-option panel | D option groups | E methods/API | F events | G code tabs + copy/reset | H responsive/a11y | I explanations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `index.html` | Partial (marketing intro, no limitations) | Yes | No (controls only in playground) | Partial (tabs, not option groups) | Static table + lab | 30/33 events | 1 copy button; no per-example reset | No viewport/RTL/contrast | Docs elsewhere |
| `playground.html` | Partial (title only) | Yes | Label-only | Yes (groups per kind) | Static list (27 methods) | Static event list | HTML/JS tabs, copy + reset | No | No inline explanations |
| `api.html` | Yes (request scope) | Yes (fixed GET/POST) | No | Yes (fetch families) | 7 buttons, no signatures | No | 0 copy | No | Partial |
| `advanced.html` | Yes | Yes | No | Partial | No | No | Copy on most snippets | No | Good prose |
| `ajax.html` | Yes | Yes | No | Partial | No | No | 0 copy | No | Partial |
| `shopify.html` | Partial (mock) | No (mock page) | No | No | No | No | Theme snippets + copy | No | Partial |
| `lab.html` | Internal only | Yes | No | Yes (test groups) | 76 buttons | 33 tests | No | No | Internal |

**Component-specific gaps:**

- **ZidanSelect**: no dedicated page; `combobox`/`select`/`tags` modes are only tabs/sections; no tags keyboard/reorder/edit walkthrough; no virtual/type-ahead/locale demo; no render-hook playground; no async error/retry/empty-state controls; method examples are not executable outside the lab.
- **ZidanFieldBase**: shared behaviours (validation, async validation, theme/layout/framework, disabled/required) are scattered across index and playground; no single contract page.
- **ZidanCheckbox / switch**: switch is a variant of the checkbox class; no indeterminate/checked reset demo beyond playground; no label/description/error matrix.
- **ZidanRadioGroup**: only a small playground kind; `deselectable` has a control, but `lab-inventory` omits it while `lab.js` lists it; no keyboard arrow/roving tabindex demo.
- **ZidanFileUpload**: 133 options, 34 playground controls; most labels/status/upload-contract options have no control; uploads simulated; no real endpoint; no queued/retry/cancel state walkthrough; no downscale before/after visual proof.
- **ZidanTextField**: 60 text-family options in one schema, but conditional fields are hidden by type; no per-type page for number/phone/date/time/range/textarea; no mask or phone-country data demo.
- **ZidanForm**: no form-level demo for init, `serialize`, `validate`, `observe`, `refresh`, `destroyAll`; form statics (29) are docs-only.

## 7. Incorrect, stale and outdated demonstrations

| Finding | Evidence | Impact |
| --- | --- | --- |
| Registry is stale | select options **84** vs source **86**; events **32** vs **33** (e.g. `onDeselect`/`deselect` absent) | Lab coverage can pass while real features are unlisted |
| `lab.js` EXPECTED arrays are stale | `selectOptions` 83 (missing `onDeselect`, `onTagEdit`, `onTagMove`); `fieldOptions` 129 (missing `multiple`, `onUploadQueued`, `onUploadRetry`, `previews`, `rows`); `selectMethods` 35 (missing `call`/`emit`); `fieldMethods` 50 (missing `call`/`emit`/`on`) | The “live coverage for every option” claim is false |
| `previews` is phantom API | Declared in `zidan-form.d.ts` (`previews?: boolean`), registry and README; no occurrence in `zidan-form.js` | Docs promise an option that does nothing — must be removed or implemented |
| Event console incomplete | `EVENT_NAMES` has 30 of 33; `deselect`, `upload-queued`, `upload-retry` absent; object detail values skipped | Users cannot see real payloads for several events |
| Docs tables incomplete | 49 options absent, including `virtual`, `typeAhead`, `highlightMatches`, `locale`, `fetchOptions`, `renderOption`, `formatTag`, `onUploadQueued`, `rows`, `switchStyle`; “Every select option” object has 83, not 86; “Every file option” object has 44 defaults, not 133 options | Reference feels complete but is not |
| Methods docs lack contract | `Returns` 0 occurrences; `Parameters` 1; no signature/return/failure tables | Developers cannot implement against methods without reading source |
| API page has no option controls/copy | 0 `<input>`; 2 live selects; 0 copy buttons; static reference table (18 `<tr>` incl. header) | Changing headers/body/paths is not demonstrated |
| Upload demos simulate success | `advanced.html` 4 “simulat*” hits; index uses `simulateUpload`; no real endpoint configured | Users may believe a server upload occurred |
| Framework demos don’t load framework CSS | Playground selector has none/bootstrap/tailwind/bulma/foundation; index links only plugin/demo CSS | Framework “adapter” visuals are not proven |
| Shopify page is a mock | Mock product markup; no real theme/asset integration test | Integration claim needs an explicit mock disclaimer |
| Radio `deselectable` inventory mismatch | Source/docs/playground support it; `lab-inventory` omits it while `lab.js` lists it | The generated inventory and the lab disagree about a supported option |
| Hard-coded counts drift | Docs/lab/registry counts are literals; already diverge from source | Any future option breaks “complete” claims silently |

## 8. Documentation and accessibility gaps

**Documentation quality:** options lack name/type/default/accepted values/description/dependencies/related methods/events/mutability in one structured record; 199 doc table rows are prose-heavy and omit 49 options. Methods have no signature block, parameter table, return type, failure cases or post-init mutability. Events have no per-event table with exact name, trigger, payload shape, bubbles flag and listener example. Code snippets are not executed by tests, so drift is uncaught. No-JS init precedence (`window.ZIDAN_FORM_CONFIG`, `data-zidan-options`, attributes) is documented but not demonstrated interactively.

**Accessibility / responsive:** no demo supplies desktop/tablet/mobile viewport switches, keyboard-only walkthroughs, focus-order visualisation, RTL toggle, high-contrast mode, reduced-motion check, or screen-reader name/role/state inspection. Labels/ARIA exist in markup, but there is no automated axe check in the Demo Lab and no evidence the A–I a11y scenarios are covered. No page shows a 320 px layout test or zoom at 200%.

## 9. Proposed demo navigation and page structure

Keep every existing URL/anchor working; add canonical component pages and a shared shell rather than replacing the current showcase.

```text
Demos
  index.html                 overview + feature router (keep anchors/tabs)
  demos/select.html          Select / Combobox / Tags (A–I)
  demos/file-upload.html     File upload / dropzone / previews (A–I, explicit simulated vs real)
  demos/checkbox-radio.html  Checkbox, switch, radio group (A–I)
  demos/text-inputs.html     Text, number, phone, date/time, range, textarea (A–I)
  demos/form.html            Form init, no-JS config, serialize/validate/lifecycle (A–I)
  demos/async.html           Fetch, paging, cache, errors, retry (A–I)
Reference
  playground.html            configurator (rebuild with metadata panels)
  api.html                   request-option reference (add controls + copy)
  advanced.html              advanced patterns (keep, link to canonical pages)
  ajax.html                  AJAX tutorial (keep, dedupe snippets)
  theming.html / frameworks  theme + framework value galleries
  accessibility.html         keyboard/RTL/contrast/responsive lab
  shopify.html               integration example (mock disclaimer)
Labs
  lab.html                   internal coverage dashboard
```

Each component page uses fixed section IDs (`#overview`, `#live`, `#options`, `#methods`, `#events`, `#examples`, `#accessibility`, `#css`) so links/tests are stable. Sections: **A** intro/name/purpose/when/limitations/basic example; **B** live preview with states; **C** option panel (grouped, searchable) with metadata + control; **D** groups (General/Appearance/Behaviour/Search/Selection/Validation/Remote/Events/Accessibility/Advanced, only real ones); **E** methods with signature/params/returns/example/button/expected result/edge cases; **F** events with trigger/payload/bubbles/listener + live log; **G** HTML/JS-init/JS-options/CSS/complete tabs with copy + reset feedback; **H** desktop/tablet/mobile, keyboard-only, focus, labels/names, SR attributes, RTL, high contrast; **I** per-option explanations and dependency/mutability notes.

## 10. Implementation plan (after approval)

| Stage | Work | Acceptance |
| --- | --- | --- |
| 0 | Owner reviews this audit + CSV; approve scope, page names, real upload endpoint decision, `previews` disposition | Written go-ahead; no code before it |
| 1 | Shared demo shell: option metadata schema (name/type/default/values/description/dependencies/related API/mutability), accessible panel renderer, code tabs, copy/reset with success/failure, event payload renderer | One component page pilot renders metadata from a single registry; copy/reset tested |
| 2 | Select page: all 86 options, 41 methods, 18 callbacks, 11 events; tags/combobox/select modes; virtual/locale/type-ahead/render hooks | No missing select row except approved N/A; every control changes the live component |
| 3 | File upload page: 133 options, 53 methods, 19 callbacks, 6 events; queued/progress/cancel/retry/error; downscale before/after; simulated vs real banner | Local simulation labelled; real upload gated on configured endpoint |
| 4 | Checkbox/switch/radio + text-family pages: state matrices, conditional fields, masks, phone data, date/time, range, textarea | All real options have controls; hidden/irrelevant ones explained, not fake |
| 5 | Form/init + async/API pages: auto-init precedence, selectors/JSON, serialize/validate/observe/refresh/destroy; fetch option editors; request inspector | Form statics have executable examples; request options visibly change the request |
| 6 | Cross-cutting: viewport/RTL/high-contrast/keyboard demos; theme/framework galleries load real CSS or state the limitation | A–I checklist passes on every page |
| 7 | Docs sync: README, `docs/options.md` tables, method/event contracts, `.d.ts` examples, CHANGELOG, npm README; regenerate docs; fix registry/lab EXPECTED from source | No doc claim without a demo/test; `ZS-REGISTRY-FRESH` passes |
| 8 | Demo Lab automation + full verification: matrix regeneration, registry comparison, console/network/viewport/link/copy checks; then `npm test`, types, lint, `lab:all`, pack check, browser pass | 0 unexplained PARTIAL/MISSING; four labs PASS; no push/deploy without separate approval |

## 11. Demo Lab automation (to add after approval)

A new check compares the feature registry (or, preferably, generated source inventory) to `DEMO-COVERAGE-MATRIX.csv` and fails with the exact feature ID and page path when:

- a supported option/method/event/attribute has no row, an unknown/unsupported row exists, or an option is marked COMPLETE without all six evidence fields;
- an applicable option has no interactive control, a control does not change the component (compare serialized state/props before/after), or a control is decorative;
- a method row has no executable example/button or no expected result; an event is not fired by a real interaction or has no payload assertion;
- a code sample references an API absent from `.d.ts`/source, copy/reset fails, a link is broken, the console has errors, or a viewport (desktop/tablet/mobile) fails.

Output format: `FAIL <FEATURE-ID> <page>#<section>: <reason>`; summary by kind; machine-readable JSON alongside the CSV. `UNSUPPORTED` rows require a source-absence assertion; `NOT_APPLICABLE` requires an explicit reason (identity/alias/internal marker).

## 12. Approval gate

This audit changes no demo, source, docs, package metadata or version. Before implementation, approve:

1. The page/navigation plan in §9 and the A–I structure.
2. Whether `previews` is removed (recommended) or implemented, and whether `themeFramework` stays as a documented alias.
3. Whether a real upload endpoint will be configured; otherwise all upload demos keep an explicit “simulated locally, no server upload” banner.
4. The staged order and the Demo Lab gate in §10–11.

No push, deploy, publish or version bump will happen without a separate explicit instruction.

## Appendix A — Status vocabulary

- **COMPLETE**: all six evidence flags true; interactive control with metadata and live effect, code, explanation, test.
- **PARTIAL**: at least one real demo/control exists, but one or more required pieces are missing; the `Missing work` cell names them.
- **MISSING**: no live/interactive demonstration; docs/code/test references only.
- **NOT_APPLICABLE**: identity/internal marker or deprecated alias with an explicit reason (23 `data-zs-*` internals + `themeFramework`).
- **UNSUPPORTED**: documented/declared but not implemented (`previews`).

## Appendix B — CSV columns

`Feature ID` (stable, kind-prefixed), `Component`, `Option/API name`, `Default value`, `Accepted values/type`, `Demo page`, `Demo section`, `Interactive UI control`, `Live preview`, `Code example`, `Explanation`, `Test ID`, `Coverage status`, `Missing work`.
