# Zidan Select 2.6.0

**Release date:** 2026-11-28
**Type:** minor — backward-compatible additions and declaration cleanup
**Baseline:** 2.5.1

2.6.0 makes the public surface easier to trust: the missing `deselectable` field option is
declared, a declaration-only phantom option is removed, and the docs now include a full option
type index, method/static signatures and a documented CSS styling boundary. The demo event
console covers every public event.

## Added

- `zidan:deselect` and `onDeselect` for user-driven removal from a multi-select or a selected
  chip. `zidan:change` still follows. Programmatic `setValue()`, `clear()` and
  `deselectAll()` stay silent.
- `deselectable` in `FieldOptions`; radio groups can opt into click-to-clear without a
  TypeScript cast.
- `framework` as the documented select option, matching fields and `data-zs-framework`.
  `themeFramework` remains as a deprecated alias.
- Documentation: complete option/callback type index, method/static signature index, static
  registry tables and a public CSS styling contract.
- Repository governance and the master release workflow.
- All 33 public events in the demo console, with safe nested payload rendering.

## Changed

- Virtual windowing defaults to `virtual: 'auto'`, enabling from 150 rows.
- Unknown values passed to `setLayout()`, `setFramework()`, `setScrollbar()`, `setTheme()`
  or `setVariant()` no longer throw; the setter keeps the current value and logs one warning.
- Disabled controls and drop zones keep a flat token fallback before `color-mix()`.
- `sitemap.xml` lists all 16 public pages; `lab.html` ships with the site.

## Removed

- The never-implemented `previews` declaration in `FileFieldOptions`. Use `showPreview` for
  image previews. There was no runtime `previews` behavior to remove.

## Upgrade notes

- No migration is required for normal use.
- If you referenced `previews` only to satisfy TypeScript, delete the property and use
  `showPreview`.
- TypeScript consumers using radio click-to-clear can now set `deselectable: true` directly.

## Verification

93 DOM tests, TypeScript checks for bundler and node16 consumers, lint, package checks and all
four quality labs pass. The packed tarball is 40 files / 407,128 bytes and resolves all 33
export targets.

## Known limits

This release does not claim complete demo coverage. The 616-row demo matrix remains at
**0 COMPLETE** (477 PARTIAL, 114 MISSING, 24 N/A, 1 UNSUPPORTED); per-component A–I pages and
broader callback coverage remain follow-up work.
