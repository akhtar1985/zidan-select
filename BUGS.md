# Bugs found in the ZidanForm codebase

Initial audit performed against `zidan-form.js` (v2.4.2); re-checked against
the v2.5.0 working tree, including `zidan-form.mjs`, the page scripts
(`demo.js`, `lab.js`, `advanced.js`, `ajax.js`, `playground.js`, `nav.js`) and
the documentation sources (`docs/*.md`, `README.md`, `index.html`,
`advanced.html`). Severity follows:

* **High** — incorrect behaviour or silent data loss in normal use.
* **Medium** — wrong behaviour in edge cases, redundant work, or duplicate
  events a consumer can observe.
* **Low** — code smell, dead variable, cosmetic inconsistency.

**Current status (v2.5.0):** `npm run build`, `npm run sizes`, `npm run
types` and `npm test` pass. The suite runs 88 DOM tests plus the static
checks, and the API lab exercises every documented option, callback, method
and event (92 self-test rows). The size failure described in BUG-001/002 was
fixed before the v2.5.0 pass; the original verdicts are kept below as an
audit trail.

---

## High

### BUG-001 — `docs/build.md` row "Full" reports 230,109 B but `zidan-form.js` is 230,108 B
* **Where:** `docs/build.md` line 132.
* **Symptom:** `npm test` exits with `FAIL documented sizes match the built
  assets — build guide has a stale byte size for zidan-form.js`.
* **Fix:** change `230,109 B` to `230,108 B` (or run `npm run build && npm run
  docs` so the build guide is regenerated).

### BUG-002 — `docs/build.md` row "Select-only" reports 117,761 B but `dist/select/zidan-select.js` is 117,760 B
* **Where:** `docs/build.md` line 133.
* **Symptom:** same test as BUG-001 — the loop short-circuits on the first
  failure but the second file is also off by one byte.
* **Fix:** change `117,761 B` to `117,760 B`.

### BUG-003 — Radio group "deselectable" emits the `change` event twice
* **Where:** `zidan-form.js` lines 3517-3542.
* **Symptom:** when `deselectable: true`, clicking the already-checked option
  fires `zidan:change` (and `onChange`) twice. The first comes from the
  general radio-group `change` listener (line 3517), the second from the
  deselect click handler (line 3539).
* **Fix ideas:** drop the manual emit/call in the click handler — the native
  `change` already reaches the group listener — or short-circuit by tagging
  the field instance before the manual `checked = false` and skipping the
  second emit.

### BUG-004 — `setOptions` does not clear `this.error` after `clearCache()`
* **Where:** `zidan-form.js` lines 2574-2607.
* **Symptom:** a select that previously failed a remote fetch keeps the error
  message in the dropdown until the user opens it again and a new fetch runs,
  even after `setOptions(newArray)` is called.
* **Fix:** add `this.error = null; this.loadMoreError = null;` alongside the
  existing cache reset at line 2602.

### BUG-005 — `_renderChips` silently strips the `data` property from removed chips
* **Where:** `zidan-form.js` line 1846 (`this.value_ = this.value_.filter(...)`).
* **Symptom:** deselecting a multi-select chip discards its `data` field; only
  the selected ones keep it. Downstream listeners reading `value.data` from a
  re-selection will see inconsistent shapes.
* **Fix:** keep the original `{value,label,data}` object when filtering, not
  just `v` directly.

### BUG-006 — `_handleFormReset` does not pass tag values through `String(...)`
* **Where:** `zidan-form.js` line 1339 (`toArray(initial).forEach(function
  (tag) { this._addTagObject(tag, { silent: true }); }, this);`).
* **Symptom:** tag mode `_setInitialValue` correctly stringifies (line 1317)
  but the form-reset path does not. `_addTagObject` still calls `String` on
  line 2088 so the result is currently safe — but the inconsistency is a
  trap waiting for the next refactor. Tag it as inconsistent.
* **Fix:** match line 1317 — `this._addTagObject(String(tag), { silent: true
  })`.

---

## Medium

### BUG-007 — Unused `savedInputText` field
* **Where:** `zidan-form.js` lines 871, 1757.
* **Symptom:** `ZidanSelect` keeps `this.savedInputText` and writes to it on
  every `open()`, but reads from it in zero places. Confusing dead state that
  future readers will assume is meaningful.
* **Fix:** delete both references or wire it into the close/blur flow that
  restores the visible label of a searchable closed select.

### BUG-008 — Plain `<select>` click handler has dead branch
* **Where:** `zidan-form.js` lines 2396-2407 (`onControlClick`).
* **Symptom:** the line `if (!self.opts.searchable && !self.input.readOnly)
  return;` cannot trigger today (line 1155 makes a non-searchable select input
  read-only, and tags/combobox force searchable to true at lines 985-986).
  Grep the codebase after any of those lines change and this silently drops
  clicks.
* **Fix:** drop the branch or invert it — add an explicit comment that this is
  defensive.

### BUG-009 — `addTag()` triggers duplicate `_render()` / `_renderDropdown()` calls
* **Where:** `zidan-form.js` lines 2160-2165 vs. lines 2147-2155.
* **Symptom:** `_addTagObject({}, {silent:false})` already calls `_render()`,
  `_syncNative()` and `_renderDropdown()`. `addTag()` then calls them again.
* **Fix:** call internal `_addTagObject` and return; remove the duplicate
  render/sync/dropdown calls in `addTag`.

### BUG-010 — `_renderInputValue` line 1569 is redundant
* **Where:** `zidan-form.js` line 1569.
* **Symptom:** line 1567 already sets `input.value` to `''` when
  `!value_.length`; line 1569 re-sets it to `''`.
* **Fix:** delete line 1569.

### BUG-011 — `_selectItem` has inconsistent `select` event surface
* **Where:** `zidan-form.js` lines 1831-1869.
* **Symptom:** removal in multi-select (line 1846) fires no `zidan:select`,
  but neither does the "selection cleared" path. Add a `select`/`deselect`
  pair or document that removal is silent.
* **Fix:** emit a `zidan:deselect` event with `{item,value,instance}` from the
  removal branch, or document the asymmetry.

### BUG-012 — `setOptions` for a native `<select>` resets `selected` indices without restoring the previous value
* **Where:** `zidan-form.js` lines 2587-2595.
* **Symptom:** if the value is preserved by `this.value_.filter(...)`, the new
  native options never have `selected = true` because we `removeChild` every
  option before re-adding. `native.selectedIndex` becomes -1 until the next
  `_syncNative()` runs (which runs at 2605 and re-attaches). OK in this flow —
  but if a caller reads `select.value` between option removal and the
  `_syncNative()` call they will see `''`.
* **Fix:** either set `selected` on the new option element or call
  `_syncNative()` *before* `removeChild` loop to avoid the gap.

### BUG-013 — `clear()` for non-tags ignores user-supplied `{silent: true}` config
* **Where:** `zidan-form.js` line 2569.
* **Symptom:** `clear({silent: true})` still emits `change`/`onChange` because
  `_setValueInternal([], {})` is hard-coded with the empty config; the
  `_setValueInternal` then fires change events regardless of the caller's
  intent.
* **Fix:** `clear(config)` should forward `config.silent` to
  `_setValueInternal`.

### BUG-014 — `cancelUpload` may call `_canceledUpload()` twice for xhr uploads
* **Where:** `zidan-form.js` lines 4443-4452 vs. 4367.
* **Symptom:** `active.abort()` triggers `xhr.onabort → _canceledUpload(file)`,
  then `cancelUpload` calls `_canceledUpload(file)` directly. The second call
  is a guarded no-op (`if status !== 'uploading'`), but the `_queueRender()`
  call at 4438 is duplicated indirectly through the abort handler chain.
* **Fix:** only call `delete this._active[...]` once and call
  `_canceledUpload` from exactly one path.

### BUG-015 — `select` standalone `setValue` does not normalise single value into an array
* **Where:** `zidan-form.js` lines 2534-2555 (`ZidanSelect.prototype.setValue`).
* **Symptom:** `setValue('foo', { silent: false })` works through
  `_setValueInternal`, but if the `value` argument is a non-array non-string
  value (e.g., `{value: 'x', label: 'y'}`), `_setValueInternal` will push that
  object through `toArray` which does `Array.isArray(value) ? value.slice() :
  [value]` — OK; but the change event payload uses `getValue()` not the raw
  input, hiding the original shape. Verify intent.
* **Fix:** document or capture the input shape on the change payload.

### BUG-016 — `_observeResize` keeps observing after destroy if the control is detached before the callback fires
* **Where:** `zidan-form.js` lines 2516-2523 and 2738.
* **Symptom:** `this.resizeObserver.disconnect()` is called in `destroy`, but
  if a queued ResizeObserver callback runs after the instance is marked
  `destroyed = true`, it still touches `self.opened` which is harmless in
  this build but doesn't gate the work.
* **Fix:** add `if (self.destroyed) return;` at the top of the observer
  callback.

### BUG-017 — `Number.prototype.toLocaleString` size check in tests is sensitive to CRLF
* **Where:** `scripts/test.mjs` lines 425-426.
* **Symptom:** the build guide reports bytes including trailing newline but
  `fs.statSync(...).size` reports raw bytes; on Windows CRLF merges vs. LF
  cause off-by-one drift. That's the root cause of BUG-001/BUG-002.
* **Fix:** regenerate `docs/build.md` automatically from the test loop or
  via a script invoked after `npm run build`.

### BUG-018 — `_renderDropdown()` writes `data-zs-option` index without bounds-check
* **Where:** `zidan-form.js` lines 1636-1686.
* **Symptom:** `id: self.id + '-opt-' + index` uses the *visible* index, so
  `aria-activedescendant` can collide with the static id of an earlier
  render. Harmless for accessibility in current builds because the dropdown
  is rebuilt every render, but a serious trap during incremental DOM update
  refactors.
* **Fix:** include `this.asyncPage`/query in the id.

### BUG-019 — `addFiles` deduplication key does not include `webkitRelativePath`
* **Where:** `zidan-form.js` lines 3697-3700 (`fileKey`) and 3938-3956.
* **Symptom:** two files dropped from different folders that share
  `name|size|lastModified|type` are treated as duplicates. Rare in practice
  but documented in some browsers.
* **Fix:** append `webkitRelativePath || ''` to the key.

### BUG-020 — Upload progress can stick at 99% if no completion is signalled
* **Where:** `zidan-form.js` line 4399 (`state.progress = value;` clamps to
  99 inside `_setProgress`).
* **Symptom:** a `fetch`-style uploader that never calls `complete()` leaves
  the bar at 99 forever. There is no timeout fall-back to `error`.
* **Fix:** add an `uploadStalled` timeout option, or at least emit a warning
  via `onError`.

### BUG-021 — Phone formatter mutates input value when digits are absent
* **Where:** `zidan-form.js` lines 5074-5101 (`_applyPhoneFormat`).
* **Symptom:** if `digitsOnly(raw)` is empty and `raw` contains `+`, the
  function wipes the input to `'+'` while returning `this`, but the event
  listener fires again from the input event. After one blur/format cycle the
  user cannot type anything but `+`.
* **Fix:** early-return without modifying `input.value` when digits are
  absent; let the formatter leave the raw input untouched.

---

## Low

### BUG-022 — Misleading `__zidanCustomError` cache on shared input
* **Where:** `zidan-form.js` lines 4954-4961.
* **Symptom:** `_setCustomValidity` stores the message on the underlying
  `input.__zidanCustomError`. If the same `<input>` is wrapped twice (e.g.,
  zidanField called twice with different options), the second wrapper reads
  the first wrapper's cached message and skips the `setCustomValidity`
  update.
* **Fix:** scope the cache on the field instance, not the native input.

### BUG-023 — `_normalizeItems` does not deduplicate identical objects
* **Where:** `zidan-form.js` lines 1033-1064.
* **Symptom:** passing the same `Array.isArray(...)` group structure twice
  yields duplicate children. Cosmetic, but visible when the same options are
  passed to two selects and JSON-stringified for telemetry.
* **Fix:** keep a Set or accept duplicates per intent.

### BUG-024 — `iconSvgFromMarkup` swallows `parseerror` quietly
* **Where:** `zidan-form.js` lines 213-244.
* **Symptom:** `parsererror` is only checked at root level. Nested
  `parseerror` inside `<svg>` (e.g., unclosed `<rect>`) is not detected.
* **Fix:** walk the parsed tree and reject any node whose `nodeName` starts
  with `parsererror`.

### BUG-025 — `close()` does not reset `asyncQuery` / `asyncPage`
* **Where:** `zidan-form.js` lines 1788-1808.
* **Symptom:** after closing a remote select the `getAsyncState()` payload
  still reports the last fetched query and page. Cosmetic but misleading in
  logs.
* **Fix:** reset them inside `close()`.

### BUG-026 — `_renderChips` calls `.split(/\s+/)` on whitespace-only class names via `addClass`
* **Where:** `zidan-form.js` lines 72-78.
* **Symptom:** `addClass(node, '   ')` produces `['', '', '', '']` after the
  split, which we then iterate; each empty token falls into `if (c) ...` and
  no class is added. No actual bug, but iterating an extra empty array is
  wasteful.
* **Fix:** pre-filter truthy tokens once.

### BUG-027 — `inheritedAttr` doesn't return a normalised value
* **Where:** `zidan-form.js` lines 567-578.
* **Symptom:** returns `value` directly which may include leading/inner
  whitespace; downstream calls `pickList` etc. should normalise, but the raw
  value is sometimes used for `themes` ad hoc.
* **Fix:** trim before returning.

### BUG-028 — `setOptions` does not reset `this.activeIndex` to first enabled after items change
* **Where:** `zidan-form.js` lines 2574-2607.
* **Symptom:** if the previously active item is removed via a `setOptions`
  call, the dropdown can become stuck on a stale highlight arrow.
  `activeIndex = -1` is set but the open() flow at line 1770 firstEnabled
  only runs on next `open()`. So between calls there is no visible first
  highlight.
* **Fix:** call `_firstEnabledIndex()` and assign.

### BUG-029 — `initFieldList` returns early if `node.__zidanField` is set, ignoring `force` option
* **Where:** `zidan-form.js` lines 5370-5387 vs. line 5325.
* **Symptom:** `createField` respects `opts.force`, but the init path does
  not forward any `force` flag, so manual re-init is impossible.
* **Fix:** plumb `{force: options && options.force}` through and let
  `initFieldList/createField` short-circuit accordingly.

### BUG-030 — `liveEl` text changes do not trigger SR re-announce reliably
* **Where:** `zidan-form.js` line 2725-2729 (`announce`).
* **Symptom:** setting `liveEl.textContent = ''` immediately followed by the
  same string is a no-op on some screen readers. There is no debounced
  re-announce.
* **Fix:** only write a new message after a microtask, or use two
  alternating live regions.

---

## Deduplicated summary

| #   | Severity | Title                                                                |
|-----|----------|----------------------------------------------------------------------|
| 001 | High     | `docs/build.md` zidan-form.js byte size off by one                   |
| 002 | High     | `docs/build.md` zidan-select.js byte size off by one                 |
| 003 | High     | Radio group `deselectable` emits `change` twice                       |
| 004 | High     | `setOptions` does not clear `this.error` after `clearCache()`         |
| 005 | High     | Multi-select removal strips `data` from chip                          |
| 006 | Medium   | `_handleFormReset` doesn't pre-stringify tag values                   |
| 007 | Medium   | Unused `savedInputText` state                                         |
| 008 | Medium   | Dead branch in plain `<select>` click handler                         |
| 009 | Medium   | `addTag()` fires `_render` twice                                      |
| 010 | Medium   | `_renderInputValue` redundant empty-string set                        |
| 011 | Medium   | `_selectItem` lacks `deselect` event                                  |
| 012 | Medium   | Native `<select>` `setOptions` leaves gap before `_syncNative`        |
| 013 | Medium   | `clear({silent:true})` ignored for non-tags paths                     |
| 014 | Medium   | `cancelUpload` may invoke `_canceledUpload` twice                     |
| 015 | Medium   | `setValue` change payload doesn't preserve input shape                |
| 016 | Medium   | Resize observer can fire after destroy                                |
| 017 | Medium   | Build-guide bytes drift off CRLF/LF                                   |
| 018 | Medium   | `data-zs-option` ids collide across re-renders                        |
| 019 | Medium   | File dedup key misses `webkitRelativePath`                            |
| 020 | Medium   | Stalled upload can stick at 99%                                        |
| 021 | Medium   | Phone formatter wipes non-digit input                                 |
| 022 | Low      | `_setCustomValidity` cache stored on shared native input              |
| 023 | Low      | `_normalizeItems` doesn't dedupe                                       |
| 024 | Low      | `iconSvgFromMarkup` only checks root `parseerror`                     |
| 025 | Low      | `close()` does not reset async query/page                             |
| 026 | Low      | `addClass` iterates empty tokens                                      |
| 027 | Low      | `inheritedAttr` returns untrimmed value                               |
| 028 | Low      | `setOptions` leaves stale `activeIndex`                                |
| 029 | Low      | Force-style re-init not plumbed through `initFieldList`               |
| 030 | Low      | `announce` cannot re-trigger SR on identical text                     |

Total: **30 findings**, 6 high, 18 medium, 6 low.

---

## Resolution status

Re-checked against the v2.5.0 working tree. `npm test` passes (88 DOM tests),
including the size check that was failing when this audit was written. The
working tree already carried the BUG-001/002/003 fixes before the pass.

### v2.5.0 regression re-check

| Area | Verdict | Notes |
|------|---------|-------|
| Select `setTheme()` | Fixed | A select only exposed `setLayout()` / `setFramework()`; `setTheme('auto')` now updates the resolved theme, tracks OS changes and untracks when a fixed theme is applied. |
| Tag inline edit | Fixed | Renaming now enforces `minTagLength`, `maxTagLength`, duplicates, `formatTag` and `validateTag`; the editor also receives `maxlength`. Invalid edits keep the old label and report through `onTagEdit` / `zidan:error`. |
| Tag move/edit events | Fixed | `zidan:tag-move` and `zidan:tag-edit` now feed the demo console, and the API lab observes both callbacks. |
| Phone country picker | Fixed | Opening the picker with an empty query highlights the current country instead of the first row, so Enter keeps the selection. |
| Error payloads | Fixed | Tag and callback errors consistently expose `{ error, message, callback?, instance }`; `zidan:validate` carries `{ valid, form, fields }`. |
| Auto theme demos | Fixed | Header selectors, the homepage showcase and the API lab expose `auto`; page chrome and components re-resolve on a live `prefers-color-scheme` change. |
| New option coverage | Fixed | The API lab inventories `phoneCountrySearchText`, `phoneCountryEmptyText`, the six `downscale*` aliases, `getUnmaskedValue()`, `refreshAutogrow()` and the `validate` event; the playground generates the matching attributes and JavaScript. |
| Downscale documentation | Fixed | Homepage now ships a working 2400 × 1600 sample that reports original and resized dimensions/bytes; `docs/options.md` documents every alias. |
| README tag claim | Fixed | The trade-offs section no longer says drag-reorder tag editors are missing; it names the remaining limitation (virtualised remote tag editors). |

### Original v2.4.2 findings

| # | Verdict | Notes |
|---|---------|-------|
| 001 | Already fixed | the guide already said 230,221 B and the file was 230,221 B — the audit figure was stale |
| 002 | Already fixed | 117,760 B matched the built select bundle |
| 003 | Already fixed | the deselect handler no longer emits `change`; the native listener reports it once |
| 004 | Fixed | `setOptions()` clears `this.error` alongside `loadMoreError` |
| 005 | Not a bug | the filter keeps whole `{value,label,data}` objects, so `data` is not stripped |
| 006 | Fixed | `_handleFormReset` stringifies tags the way `_setInitialValue` does |
| 007 | Fixed | `savedInputText` and its only write removed |
| 008 | Fixed | unreachable early return in `onControlClick` removed |
| 009 | Fixed | `addTag()` returns `_addTagObject()`, which already re-renders |
| 010 | Fixed | redundant second empty-string assignment removed |
| 011 | Documented | `docs/options.md` now records that removal reports through `change` only |
| 012 | Fixed | rebuilt native options carry `selected` before `_syncNative()` runs |
| 013 | Fixed | `clear(config)` forwards `silent` |
| 014 | Fixed | `cancelUpload()` finishes the state from a single path |
| 015 | No change | `setValue()` normalises input on purpose; the payload reports `getValue()` |
| 016 | Fixed | resize callback returns early once the instance is destroyed |
| 017 | Fixed | new `scripts/sizes.mjs` plus `npm run sizes` rewrites the documented figures |
| 018 | Deferred | ids are rebuilt on every dropdown render; the collision needs an incremental-DOM refactor to matter |
| 019 | Fixed | dedupe key includes `webkitRelativePath` |
| 020 | No change | 99% is intentional until `complete()`; a stall timeout would be a new option |
| 021 | Fixed | the phone formatter leaves digit-less input untouched |
| 022 | Fixed | custom-validity cache moved from the native input to the field instance |
| 023 | No change | duplicate groups are passed through on purpose |
| 024 | Not a bug | `sanitizeIcon` already rejects any `parsererror` in the parsed tree |
| 025 | Not a bug | resetting `asyncPage` in `close()` breaks page continuation; the pagination test pins the current behaviour |
| 026 | No change | `addClass` already skips empty tokens |
| 027 | Fixed | `inheritedAttr` trims its result |
| 028 | Fixed | `setOptions()` restores `activeIndex` to the first enabled option |
| 029 | Fixed | `initFieldList` forwards `force` |
| 030 | Fixed | an identical announcement is repeated on the next tick |

For the original 30 findings: 18 code fixes, 1 documentation fix, 3 already
fixed before the pass, 6 confirmed not defects or intentional behaviour (#005,
#020, #023, #024, #025, #026) and 1 deferred with rationale (#018). The v2.5.0
re-check above adds eight more code/documentation fixes.

## Quality-lab follow-up (v2.5.0 working tree)

The four repository labs found four more defects and three documentation
defects. All are fixed; the original 30-finding tally above is left untouched
as the audit trail.

### BUG-031 — Opening a selected combobox starts on the placeholder
* **Severity:** Medium.
* **Where:** `zidan-form.js` `ZidanSelect.prototype.open()`.
* **Symptom:** `setValue('b')` followed by `ArrowDown` + `Enter` cleared the
  selection, because `open()` made the first enabled option (the placeholder)
  active instead of the selected option. This is silent value loss for
  keyboard users.
* **Fix:** `open()` now scans the visible items for the first enabled selected
  value and falls back to `_firstEnabledIndex()` only when there is no
  selection. The regression test checks the active descendant and the value
  after `Enter`.
* **Regression:** `scripts/dom/reliability.mjs` — regression BUG-031.

### BUG-032 — `zidanField()` returns `[]` for an already-enhanced field
* **Severity:** Low.
* **Where:** `zidan-form.js` `zidanField()`.
* **Symptom:** The second `zidanField('#field')` call skipped the existing
  instance and returned an empty array. Callers that cache the result or use a
  shared initialiser saw a different return shape on repeat initialisation.
* **Fix:** When the node already owns an instance and `force` is not set, the
  existing instance is pushed into the result. `force: true` still destroys
  and replaces it through `createField()`.
* **Regression:** `scripts/dom/reliability.mjs` — regression BUG-032.

### BUG-033 — CMS tags example has no accessible name
* **Severity:** Medium.
* **Where:** `index.html`, “Tags — class + JSON” CMS example.
* **Symptom:** The tags `<select multiple>` was preceded by a visual
  `<p>`, not a label, so its combobox had no accessible name. The Demo Lab
  reported `ZS-DEMO-A11Y-NAMES` as a failure.
* **Fix:** Added `aria-label="CMS tags — marker class and JSON options"`.
* **Regression:** Demo Lab `ZS-DEMO-A11Y-NAMES` (real Chrome).

### BUG-034 — Mobile control text is 15px and triggers iOS input zoom
* **Severity:** Low.
* **Where:** `plugin-core.css` / `plugin-theme.css` `--zs-font-size`.
* **Symptom:** The compact 15px default is below the 16px threshold at which
  Mobile Safari zooms a focused control, so tapping a control shifted the
  layout. The Demo Lab measured 15px at a 390px viewport.
* **Fix:** A `max-width: 640px` media query sets `--zs-font-size: 1rem` for
  roots, fields and radio groups in both the structural and theme layers;
  desktop keeps 15px. The lab check now reports `FAIL` (not
  `INCONCLUSIVE`) when the measurement is below 16px.
* **Regression:** Demo Lab `ZS-DEMO-MOBILE-TYPE`.

### Documentation-lab follow-up

| Defect | Fix |
|--------|-----|
| README quick-start loaded `zidan-select@2` while the rest of the page pinned 2.5.0 | Three CDN URLs now use `@2.5.0`. |
| README linked `#whats-new-in-215` but GitHub generates `#whats-new-in-2125` | Link corrected to `#whats-new-in-2125`. |
| `docs/html-and-wordpress.md` and `docs/frameworks.md` used GitHub double-hyphen anchors that the generated pages render with single hyphens | Headings now use a colon and “and” so both slug rules agree; the Markdown, generated HTML and README site links point at the same single-hyphen ids. |
