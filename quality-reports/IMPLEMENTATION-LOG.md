# Demo implementation log

Baseline audit: [DEMO-AUDIT.md](DEMO-AUDIT.md) · matrix [DEMO-COVERAGE-MATRIX.csv](DEMO-COVERAGE-MATRIX.csv).
Baseline commit: `e969423` · branch `chore/p3-repo-hygiene` · package 2.5.1.

## Stage 1 — shared option metadata in the playground (2026-11-28)

Branch `chore/p3-repo-hygiene` · starting HEAD `e969423`.

### Delivered

- New `playground-meta.js`: one description per playground option (108 keys), loaded before `playground.js`.
- `playground.js`: each visible option now renders
  - its label and the exact option name;
  - a short explanation;
  - accepted type and accepted values;
  - declared default and a live current value;
  - `aria-describedby` wiring to the description and metadata.
- Option filter (`#pg-option-search`) with a live match count (`#pg-option-count`); filtering matches label, option name and description.
- Reset clears the filter. Changing control family also clears it.
- New shared styles in `playground.css` for the metadata rows, filter and empty state.
- New regression check in `scripts/test.mjs`: every playground option key must have a description, the metadata script must load first, and metadata/filter elements must exist.
- Removed two overbroad playground claims (“Full documented option set”, “toggle every option”); the page now describes what it actually shows.

### Evidence

- `node --check playground.js` and `node --check playground-meta.js`: pass.
- `node scripts/lint.mjs`: pass.
- `node scripts/test.mjs`: exit 0 (DOM/static checks, including the new metadata check).
- Browser (local `node scripts/serve.mjs`, 932×851 viewport):
  - 14 select controls and 26 file controls render metadata rows;
  - filtering `maxDropdownHeight` returns “1 of 14 shown”;
  - changing `maxDropdownHeight` to 360 updates the current value and rebuilds the preview;
  - no page console errors observed in the checked interactions.
- Browser check is an interaction smoke test, not a full responsive/a11y pass.

### Not done in this stage

- No dedicated A–I component page yet; the playground is still a configurator, not a complete reference.
- Advanced select options (fetch, render hooks, virtualisation, locale, tags) still lack controls in the playground.
- Docs, registry freshness, lab expected arrays and the coverage matrix are unchanged by this stage.

No commit, push, deploy, publish or version bump was made.

## Stage 2 — 2.6.0 release truth (2026-11-28)

- Version bumped to 2.6.0 across package, lockfile, runtime, banners, docs, demos and CDN pins.
- Added `deselectable` to the field declarations; removed the never-implemented `previews` declaration.
- Added the 33-event demo console and recursive payload formatting.
- Added the A–I review map and responsive width control to `playground.html`; added API/AJAX copy buttons.
- Added the full option type index, static registry tables and method/static signature index to `docs/options.md`.
- Added governance files and the master release workflow.
- Labeled simulated uploads, the API mock and the framework-class-only showcase.
- The 2.6.0 release commit includes this stage; it has not been pushed, tagged, deployed or published.
