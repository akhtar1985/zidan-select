# How ZidanForm compares

ZidanForm is not a drop-in replacement for every form library. It targets one job: making
**native form controls look and feel modern without giving up native form behavior**, across
selects, checkboxes, switches, radios, file inputs and text fields, with the same API and the
same two stylesheets.

## At a glance

| | ZidanForm | Select2 | Choices.js | Tom Select | Slim Select | Bootstrap 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Runtime dependencies | **None** | jQuery | None | None | None | Bootstrap CSS/JS |
| Scope | Select, checkbox, switch, radio, file, text, phone, stepper, range, date/time | Select / tags | Select, text, tags | Select / tags | Select | Styling of native controls |
| Input icons & adornments | **Auto, custom SVG, left/right, clickable** | — | — | — | — | Markup (`input-group`) |
| Phone number formatting | **Per country, 3 styles each** | — | — | — | — | — |
| Number stepper | **Stacked, split, inline, hold-to-repeat** | — | — | — | — | Markup only |
| Range slider skins | **Gradient, stepped, minimal, formatter functions** | — | — | — | — | Styled native range |
| File upload UI | **Built in** (dropzone, button, avatar, gallery, compact, progress, previews, limits) | — | — | — | — | Styled input only |
| Text input utilities | **Clear, reveal, prefix/suffix, counter, floating labels** | — | — | — | — | Markup (`input-group`) |
| Date/time picker customization | **Icon as picker button, left/right, labels, date rules** | — | — | — | — | — |
| Built-in validation rules | **Every type, weekend/blocked dates, validation icons** | — | — | — | — | Styles only |
| Async field validation | **Promise rules, pending state, abort, stale guards** | — | — | — | — | — |
| Remote paginated options | **Paged, cached, load-more + scroll auto-load** | AJAX adapter | — | `load()` callback | — | — |
| RTL | **Logical properties, mirrored transforms** | Yes | Yes | Yes | Partial | Yes |
| TypeScript declarations | **Full build + both subsets** | Community | Bundled | Bundled | Bundled | Bundled |
| Checkbox / switch / radio UI | **Built in** | — | — | — | — | Native only |
| Native `value` / `checked` / `files` kept | **Yes** | Yes | Yes | Yes | Yes | Yes |
| No-JS init by ID, class or JSON | **Config targets, marker classes, `data-zidan-options` JSON** | JS selector | JS selector | JS selector | JS selector | JS selector |
| Split structure / theme CSS | **Yes** (`plugin-core.css` + `plugin-theme.css`) | Partial | Partial | Partial | Partial | Yes (Sass tokens) |
| Select-only / file-only bundles | **Yes — trimmed JS + matching CSS** | Core is select-only | Core is select + text | Core is select-only | Core is select-only | Whole framework |
| Built-in themes | **5** + custom tokens | Themes via CSS | Themes via CSS | Themes via CSS | Themes via CSS | 1 (Bootstrap) |
| CSS-framework adapters | **Bootstrap, Tailwind, Bulma, Foundation** | — | — | — | — | n/a |
| Validation coexistence tests | **jQuery Validation, JustValidate, Parsley, native** | — | — | — | — | Native + framework |
| Framework support | **React, Next.js, Vue, Angular guides** | Community wrappers | Community wrappers | Community wrappers | Community wrappers | Framework kits |
| Weight | ≈298 kB raw JS + two CSS files | larger, plus jQuery | moderate | moderate | small | large (whole framework) |

Feature claims above describe each project's *core* package. Plugins and community add-ons can
close some gaps — check the other project's current docs before deciding.

## What you get with ZidanForm

- **One dependency-free file for every control.** Select2/Choices/Tom Select/Slim Select solve
  the select problem; ZidanForm also replaces checkboxes, switches, radios, file pickers and
  text inputs, and adds input icons, phone masks, number steppers, range skins and date rules,
  so a form does not need three libraries and three visual languages.
- **Nothing breaks underneath.** The real control stays in the DOM (1×1 px, never
  `display:none`), so `FormData`, `form.reset()`, `required`, `:invalid`, `input.files` and
  jQuery Validation's `:hidden` ignore keep working.
- **Structure and skin are separate.** `plugin-core.css` has no colours; teams can ship a brand
  theme in `plugin-theme.css` or their own file without forking layout code.
- **Works with the validators you already use.** Documented and covered by the jsdom test
  suite alongside native HTML5, jQuery Validation, JustValidate and Parsley, including
  `aria-invalid` sync, async rules and double-submit guards.
- **Matches your CSS framework.** Standalone, Bootstrap 5, Tailwind, Bulma and Foundation
  adapters are selected per instance or inherited from an ancestor / `<html>`.
- **Opt-in, reversible.** Only `data-zidan*` controls are touched, and `destroy()` restores the
  original DOM — useful when adopting it on one form at a time.
- **No build step.** Classic script + ESM wrapper + plain CSS; no compiler, bundler or runtime.

## Trade-offs to know

- **Not a data-grid or tokenization platform.** Select2 and Tom Select still have larger
  plugin ecosystems for drag-reorder tag editors, data grids and query builders. ZidanForm's
  remote loading covers cached, load-more lists with request aborting, not a full query DSL.
- **Smaller community.** Fewer Stack Overflow answers and third-party themes than Select2 or
  Bootstrap.
- **No framework components.** React/Vue/Angular integration is lifecycle wiring around the
  vanilla API, not a native component library.
- **Newer.** Version 2.x is a rename/expansion of `zidan-select`; pin a version and read the
  migration notes.

## Choose ZidanForm when…

- You want a consistent, modern look across **all** native controls, not just selects.
- Native form submission, reset and validation must keep working unchanged.
- You need theme tokens and framework adapters without a build pipeline.
- You are already using jQuery Validation, JustValidate or Parsley and do not want to replace it.

## Choose another library when…

- You need advanced AJAX/remote data selects with a mature plugin ecosystem → **Select2** or
  **Tom Select**.
- You only need a multi-select and want the smallest possible addition → **Slim Select**.
- You want components generated by a full design system → **Bootstrap**, **MUI**, etc.

## Migrating between them

ZidanForm enhances the same native elements the other libraries start from, so migration is
usually: remove the old library's init call and CSS, add `data-zidan` attributes (or call
`initZidanForms()`), then keep your existing `<select>` markup. Values, names and validation
attributes do not change — see [Migrating from 1.x](https://github.com/akhtar1985/zidan-select/blob/main/README.md#migrating-from-1x) for the
in-library upgrade path.
