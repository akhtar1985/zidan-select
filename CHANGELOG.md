# Changelog

Notable changes to `zidan-select`, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions use
[semantic versioning](https://semver.org/).

Write your notes under `## [Unreleased]`, then run `npm run release -- patch` (or
`minor` / `major`). The release script moves that section under a dated version
heading, bumps every version site in the repository, commits and tags. See
[`docs/build.md`](docs/build.md#releasing).

## [Unreleased]

## [2.6.0] - 2026-11-28

### Added

- `deselectable` is now declared in `FieldOptions`; radio groups can opt into click-to-clear
  without a TypeScript cast. The declaration-parity test now scans field option readers as well
  as `opts.*`, so this class of drift cannot pass silently.
- `docs/options.md` now ends with a complete option type index (235 public options and
  callbacks) and a method/static signature index.
- The demo event console listens to all 33 public events, including `deselect`,
  `upload-queued` and `upload-retry`, and renders nested object payloads safely.
- Repository governance: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, a pull
  request template and bug/feature/config issue forms. The release workflow is documented in
  `ZIDAN-SELECT-RELEASE-DOCUMENTATION-GITHUB-NPM-WORKFLOW.md`.
- `zidan:deselect` (plus the `onDeselect` callback) fires when a user removes an option from
  a multi-select or clicks a selected chip; `zidan:change` follows as before. Programmatic
  `setValue()`, `clear()` and `deselectAll()` stay silent, so the event keeps reporting intent.
- `framework` is now the select's documented option name, matching fields and
  `data-zs-framework`. `themeFramework` keeps working as a deprecated alias, and `vanilla` is
  documented as identical to `none`.

### Changed

- The never-implemented `previews` declaration was removed from `FileFieldOptions`; use
  `showPreview` for image previews. This is a type-surface cleanup, not a runtime removal.
- The package check now requires `CHANGELOG.md`, the README, the license, the root
  declarations, the ESM entry and `docs/options.md` in the packed tarball.
- Virtual windowing is on by default: `virtual: 'auto'` windows lists from 150 rows, which
  drops a 5 000-option render from ~614 ms to ~13 ms. Pass `virtual: false` to opt out.
- `npm run lint` now syntax-checks every first-party `.js`/`.mjs` file (40 files across the
  root pages, `scripts/` and `quality-labs/`) through `scripts/lint.mjs`; `npm test` imports
  the same list instead of keeping its own.
- Disabled controls and drop zones declare a flat token fallback before their `color-mix()`
  tint, so engines older than Chrome 111 / Safari 16.2 / Firefox 113 still get a themed
  surface instead of a transparent one.
- `sitemap.xml` lists all 16 public pages (seven demo pages, nine documentation pages)
  instead of eight.
- The testing lab (`lab.html`) is published with the demo site, linked from every page's
  navigation, and served from the same workflow that builds the select-only and file-only
  bundles it switches between.
- `setLayout()`, `setFramework()`, `setScrollbar()`, `setTheme()` and `setVariant()` no longer
  throw on an unknown value: they keep the current setting and log one `console.warn`, matching
  the other setters.

## [2.5.1] - 2026-11-28

### Added

- Declarative `fetchParams` (`data-zidan-fetch-params`) merges extra query parameters into
  every remote request; `null` and `undefined` values are skipped.
- Declarative `fetchBody` (`data-zidan-fetch-body`) sends a JSON-serialised object/array, or a
  raw string, on `POST`/`PUT`/`PATCH` requests. Objects add `Content-Type: application/json`
  unless a content type was supplied; `GET`/`HEAD` ignore the body.
- `api.html` request lab: live GET headers/params against DummyJSON, a deterministic JSON POST
  mock with an exact request inspector, and buttons for the remote instance methods.
- File uploads gained a configurable AJAX transport (`uploadMethod`, `uploadParams`,
  `uploadHeaders`, `uploadTimeout`, `uploadResponsePath`, `uploadErrorPath`,
  `withCredentials`), automatic retries, a concurrency queue, `whenUploaded()` and
  `upload-queued` / `upload-retry` events.
- File selection validates `minFiles`, `maxTotalSize` and `maxTotalSizeMB`; `getFileState()`,
  `removeFiles()`, `retryAll()`, `setUploadUrl()` and `setUploadOptions()` complete the
  programmatic API, while `show*` flags, `allowPaste` and `statusFormat` control the UI.
- The separate file-only JS and CSS builds include the upload queue, AJAX transport and
  file-specific Bootstrap, Tailwind, Bulma and Foundation adapter rules.

### Fixed

- The release version bump now updates the `api.html` brand version as well as the other demo
  pages, so the shared-UI check stays green across releases.
- The ESM entry test compares against `package.json` instead of a hard-coded version, so a
  release bump cannot make every ESM entry look broken.
- GitHub Release bodies are written with an explicit UTF-8 `--output` path instead of a shell
  redirect, so a notes file produced in Windows PowerShell (UTF-16LE) can no longer publish
  mojibake; `scripts/changelog-section.mjs` gained `--output <file>` and strips a UTF-8 BOM.
- CSS-framework adapters now inherit `data-zs-framework` from a wrapper or `<html>` when
  the select itself has no `themeFramework` option; before this only auto-detection ran.
- Bootstrap `input-group` selects shrink to fit beside addons instead of overflowing, and
  their corner rules are scoped to the Bootstrap adapter so Bulma and Foundation layouts
  are not affected.
- Adapter controls now derive their inner input height from each framework's control
  height, matching Bootstrap 38px, Bulma 40px, Foundation 39px and Tailwind 42px controls.
- Bulma, Tailwind and Foundation adapters now map chip colours and selected-option colours,
  and Bulma and Tailwind map dropdown/chip radii, instead of leaving the default indigo.
- The demo's framework buttons call `setFramework()`, so Bootstrap `.form-control`,
  `.form-select` and badge classes are added and removed when switching adapters.
- File `clear()` now empties the native input through `DataTransfer` and falls back to
  `input.value = ''`, so programmatic clears cannot leave stale files behind.
- Opening a select now highlights the current value instead of the placeholder, so
  `ArrowDown` + `Enter` keeps a keyboard user's selection rather than clearing it.
- `zidanField()` returns the existing instance when a field is initialised twice; `force: true`
  still replaces it, and repeat init no longer stacks a second wrapper.
- Mobile control text is 16px on screens up to 640px, preventing Mobile Safari from zooming
  the page when a control receives focus; desktop keeps the compact 15px token.

### Documentation

- `docs/options.md` and the README document both new options with data-attribute and POST
  examples, and link the new request lab.
- `docs/frameworks.md` documents stylesheet load order and no longer claims a fixed 4px
  Bulma radius; the adapter follows `--bulma-radius`.
- Corrected stale select-only and file-only minified sizes in the README, `docs/build.md`
  and the advanced build table; `npm run sizes` now keeps those CDN rows and CSS figures
  in sync with the built files.
- README quick-start CDN URLs now pin `2.5.0` like the rest of the page, the “What's new”
  anchor matches GitHub's generated slug, and the cookbook/options headings use punctuation
  that produces the same anchor on GitHub and on the generated documentation pages.
- The CMS tags example has an accessible name, so its combobox is no longer unnamed.

## [2.5.0] - 2026-11-26

### Added

- Virtual window for large local lists (`virtual`, `virtualThreshold`, `itemHeight`), with
  `aria-setsize` / `aria-posinset` and keyboard navigation that scrolls the window.
- Diacritic-insensitive search (`accentInsensitive`) and `<mark class="zs-match">` highlighting
  (`highlightMatches`) for matched slices.
- Native-style type-ahead in non-searchable selects (`typeAhead`, `typeAheadTimeout`), including
  repeated-letter cycling while the list is open.
- Locale packs (`locale`, `ZidanSelect.locales`, `ZidanForm.locales`) for `en`, `es`, `fr`,
  `de` and `ar`, plus automatic `<html lang>` detection and a matching root `lang`.
- `theme: 'auto'` follows `prefers-color-scheme` through one shared listener and tracks every
  auto root, including fields and `setTheme()`.
- Option groups expose `role="group"` with an `aria-labelledby` header instead of
  `role="presentation"`.
- `requiredText` customises the required-submit message.
- Input masks (`mask`, `data-zidan-mask`) with `#` digit, `A` letter and `*` alphanumeric
  tokens, auto-inserted literals, caret preservation, and `ZidanForm.mask` / `unmask` helpers.
- Tag reordering (`reorderable`) by drag or Alt+Arrow, and in-place renaming (`editable`) with
  double-click/F2, plus `moveTag()` / `editTag()` and `zidan:tag-move` / `zidan:tag-edit`.
- Multiple-select helpers `getSelectedItems()`, `selectAll()`, `deselectAll()`, `toggleAll()`
  and `areAllSelected()`, all limited to non-disabled options.
- `ZidanForm.serialize(form)` (repeated names become arrays) and `ZidanForm.validate(form)`
  (field rules + native constraints, first-invalid focus, `zidan:validate`).
- Searchable phone country picker replacing the cramped native list, with keyboard navigation,
  a hidden native value holder, and `phoneCountrySearchText` / `phoneCountryEmptyText`.
- Textarea autogrow (`autogrow`, `autogrowMax`, `refreshAutogrow()`).
- Browser-side image downscale before upload (`downscale` option and
  `ZidanForm.downscaleImage(file, options)`), keeping the original upload row and field name.
- Tests and documentation for every new option; the API lab gains a 240-row search & scale demo.

### Fixed

- Inline tag rename now saves on Enter/blur and cancels on Escape; the editor had bound its
  listeners through the public custom-event API, so the keys never reached it.
- Type `getTags()` as `string[]` — it always returned tag values, not `SelectItem` objects.

- Read `closeOnSelect`, `ariaLabel`, `required`, `fetchHeaders` and `fetchCredentials` from
  declarative attributes, and expose the resolved default theme through `ZidanSelect.defaults`.
- Report callback exceptions through `onError` with the error and callback name, and expose
  `ZidanSelect.registerIcon` / `ZidanSelect.icons` in the full and select-only builds.
- Clarify zero-based pagination contexts, mode-dependent `allowFreeText` defaults and the
  declarative AJAX attribute contract.
- Fix `setOptions()` leaving a stale fetch error and a dead active option, and keep the native
  select's value in place while its options are rebuilt.
- Fix `addTag()` rendering twice, `clear({ silent: true })` still emitting `change`, and the
  unreachable branch in the control click handler.
- Fix the multi-select remove path reporting through `change` only, and document it in the
  events table.
- Fix the phone formatter rewriting digit-less input, the custom-validity cache living on the
  shared native input, and a resize callback running after `destroy()`.
- Fix `webkitRelativePath` being ignored when deduplicating uploads, and `cancelUpload()`
  finishing its state from two paths.
- Fix the dead `savedInputText` state, the redundant assignment in `_renderInputValue`, the
  untrimmed `inheritedAttr` and the tag reset path skipping `String()`.
- Fix `initFieldList` ignoring `force`, and identical live-region announcements not
  re-triggering screen readers.
- Throw a clear error when a field is enhanced before it has a parent element, and type
  `ZidanSelect#getValue()` as `string | string[] | null` so an empty single select is honest.
- Add `npm run sizes` to regenerate the documented asset sizes from the built files, so the
  build guide cannot drift from `dist/`.

## [2.4.2] - 2026-11-24

### Changed

- Fix documentation UI and complete API coverage

## [2.4.1] - 2026-11-24

### Changed

- Fix documentation UI and complete API coverage

## [2.4.0] - 2026-11-24

### Added

- **Declarative AJAX** — `data-zidan-fetch-url` (or the `fetchUrl` option) turns a select into a
  remote search with no JavaScript. The plugin builds the request (`fetchQueryParam`,
  `fetchPageParam`, `fetchPageSizeParam`, or `fetchSkipParam` for offset APIs), maps rows from a
  dot path (`fetchItemsPath`), decides paging from `fetchTotalPath` / `fetchHasMorePath`, and
  keeps debounce, abort, caching and the load-more footer from the existing `fetchOptions`
  pipeline. `fetchMethod`, `fetchHeaders` and `fetchCredentials` tune the request.
- **`ajax.html` demo** — a new page runs both modes against real HTTP endpoints: an
  attribute-only combobox over a public API and a hand-written `fetchOptions` over a static
  JSON file, with the async state, load-more and cache on screen.
- **HTML documentation pages** — `scripts/docs.mjs` renders the Markdown guides into styled
  pages during the Pages build, so the docs index and README link pages on the site instead of
  GitHub `.md` files.

### Docs

- `docs/options.md` documents every `fetch*` option with a markup-only example.

## [2.3.1] - 2026-11-24

### Fixed

- A preset validation state (`data-zidan-preset-validation` / the `validation` option) now
  survives construction and `update()`. Previously the first render overwrote it, so a select
  opened already marked invalid only after the user touched it.
- A select with `searchable: false` is now `readOnly` instead of merely ignoring keystrokes, so
  mobile keyboards and screen readers no longer offer to filter a list that cannot be filtered.
- Tags with `allowFreeText: false` now reject typed values that are not in the list, with
  `"…" is not in the list.`, instead of silently accepting them.
- Lifecycle, validation-mirroring and accessibility fixes across fields and selects, including
  `destroy()` restoring author markup for every field type.

### Added

- **Controls reference** on the demo page (`#controls`): all nine control families with the
  options you reach for most, both initialisation styles and copyable examples, linked from the
  documentation index and the README.
- **Rebuilt playground** with eleven control tabs, live preview and copyable HTML or JavaScript.

### Docs

- Documented `allowFreeText: false` rejection, non-searchable (read-only) selects, preset
  validation state, and the released-by-user-input rule for pinned validation.

## [2.3.0] - 2026-11-23

### Added

- **Async validation** — `validate` / `validateDate` may return a Promise. Fields get a pending
  state and `aria-busy`, block submission through native validity, abort the in-flight check when
  the value changes, ignore stale responses, receive an `AbortSignal` and emit
  `zidan:async-validation`. `validate()` returns `boolean | Promise<boolean>`.
- **Remote select pagination** — `fetchOptions(query, signal, { page, pageSize, append })` with an
  LRU cache, **Load more** footer and scroll-to-end paging, plus `loadMore()`,
  `hasMoreResults()`, `getAsyncState()`, `refreshOptions()` and `clearCache()`.
- **RTL support** — logical CSS properties, mirrored transforms and a `--zs-range-angle` hook;
  component roots follow the nearest `dir` attribute.
- **TypeScript declarations** — `zidan-form.d.ts` plus declarations for both subset builds,
  wired into the exports map.
- **Minified bundles** — `npm run build` emits `.min.js` and `.min.css` for all three builds.
- **Behaviour tests** — jsdom suites covering select, fields, uploads, validation, pagination,
  RTL and teardown, including the subset and minified bundles.

## [2.2.4] - 2026-11-22

### Fixed

- The version banner in `plugin-core.css` and `plugin-theme.css` (and their `dist/` copies) still
  reported 2.2.0. No selectors, declarations or JavaScript behaviour changed.

## [2.2.3] - 2026-11-22

### Changed

- Metadata-only release: author profile URL, expanded keywords (`form-validation`, `phone-input`,
  `range-slider`, `theming`) and an explicit `publishConfig.access`.

## [2.2.2] - 2026-11-22

### Added

- **Field playground** — pick one control, toggle its options, preview it live and copy either the
  `data-*` markup or the equivalent vanilla JavaScript.
- jsDelivr `.min` URLs for all three builds.

### Docs

- Stated in the README, the demo and the build guide that a select-only or file-only build is
  complete on its own — the full bundle is only for forms that enhance several input types.

## [2.2.1] - 2026-11-22

### Added

- **Declarative init** — `zidan-select` / `zidan-field` marker classes, `zidan-form` scopes,
  `data-zidan-options` JSON and `window.ZIDAN_FORM_CONFIG` targets, in the full build and both
  subsets.

### Fixed

- `getValue()` / `setValue()` restored on every field.
- Required-select invalid state is mirrored to the visible control.
- `setOptions()` rebuilds native options; programmatic range values update `data-zidan-output`.

## [2.2.0] - 2026-11-22

### Added

- **Select-only and file-only builds** — trimmed JS plus matching core and theme CSS in
  `dist/select/` and `dist/file/`, keeping all five preset themes, the layouts and the Bootstrap,
  Tailwind, Bulma and Foundation adapters.
- Icon demo card (auto, built-in, registered and JavaScript-only icons).

### Fixed

- Duplicate calendar/clock indicator on date, time, datetime-local, month and week fields when a
  custom icon or picker button is used.

## [2.1.2] - 2026-11-22

### Docs

- Documentation-only patch: README, GitHub Pages deployment, demo screenshots and copyable CDN
  URLs. No JavaScript or CSS behaviour changed.
