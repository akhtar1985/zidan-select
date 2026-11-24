# Changelog

Notable changes to `zidan-select`, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions use
[semantic versioning](https://semver.org/).

Write your notes under `## [Unreleased]`, then run `npm run release -- patch` (or
`minor` / `major`). The release script moves that section under a dated version
heading, bumps every version site in the repository, commits and tags. See
[`docs/build.md`](docs/build.md#releasing).

## [Unreleased]

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
