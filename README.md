# ZidanForm

Zero-dependency form enhancement for the browser. Upgrade native `<select>`, checkbox,
switch, radio, file and text inputs **in place** — real form values, `FormData`,
`form.reset()` and constraint validation keep working, while structure and theme live in
two separate stylesheets.

[![demo](https://img.shields.io/badge/demo-live-4f6bed)](https://akhtar1985.github.io/zidan-select/)
[![npm](https://img.shields.io/badge/npm-zidan--select-cb3837)](https://www.npmjs.com/package/zidan-select)
[![license](https://img.shields.io/badge/license-MIT-22c55e)](LICENSE)

- **One file of JS** — `zidan-form.js` (classic script, UMD-ish) + `zidan-form.mjs` (ESM wrapper).
- **Split CSS** — `plugin-core.css` (structure only) and `plugin-theme.css` (tokens, presets, skins).
- **Opt-in per control** — nothing is touched unless it carries a `data-zidan*` attribute or is
  passed to the API.
- **Native-first** — the real input stays in the DOM at 1×1 px (never `display:none`), so
  `FormData`, `reset()`, `required`, `:invalid` and jQuery Validation's `:hidden` ignore behave.
- **5 themes** `default · modern · minimal · dark · glass`.
- **5 select layouts** `classic-clean · floating-label · soft-pill · bordered-brutalist · glass-elevated`.
- **Field layouts** `stacked · inline · compact · floating · outlined · card`.
- **Framework adapters** standalone, Bootstrap 5, Tailwind CSS, Bulma, Foundation.
- WAI-ARIA labels, focus management, keyboard support throughout, `prefers-reduced-motion`.

---

## Why ZidanForm

Most form libraries fix one control. ZidanForm upgrades the whole form with the same API,
the same two stylesheets and no dependencies.

| | ZidanForm | Select2 | Choices.js | Tom Select | Slim Select |
| --- | --- | --- | --- | --- | --- |
| Runtime dependencies | **None** | jQuery | None | None | None |
| Controls covered | **Select, checkbox, switch, radio, file, text** | Select / tags | Select, text, tags | Select / tags | Select |
| Drag & drop file upload | **Built in** | — | — | — | — |
| Split structure / theme CSS | **Yes** | Partial | Partial | Partial | Partial |
| Validation coexistence tested | **Native, jQuery Validation, JustValidate, Parsley** | — | — | — | — |
| CSS-framework adapters | **Bootstrap, Tailwind, Bulma, Foundation** | — | — | — | — |

**Benefits**

- **One library for every control** — no mix of Select2 + Dropzone + custom checkbox CSS.
- **Native behavior survives** — `FormData`, `reset()`, `required`, `:invalid` and
  `input.files` keep working because the real control is never `display:none`.
- **Themeable without forking** — structure lives in `plugin-core.css`, colours and skins in
  `plugin-theme.css`; five presets plus your own tokens.
- **Fits existing validation** — jQuery Validation, JustValidate, Parsley and native HTML5 are
  documented and tested, with `aria-invalid` sync and double-submit guards.
- **Opt-in and reversible** — enhance only `data-zidan*` controls; `destroy()` restores markup.
- **No build step** — classic script, ESM wrapper and plain CSS.

**Trade-offs:** smaller community than Select2, no React/Vue component package, and advanced
remote-search plugins are better served by Select2 or Tom Select. Full matrix, honest
limitations and migration notes: **[`docs/comparison.md`](docs/comparison.md)**.

---

## Contents

1. [Install](#install)
2. [Why ZidanForm](#why-zidanform)
3. [Quick start](#quick-start)
4. [Input types](#input-types)
5. [Options & data attributes](#options--data-attributes)
6. [JavaScript API](#javascript-api)
7. [Themes, layouts & frameworks](#themes-layouts--frameworks)
8. [Validation libraries](#validation-libraries)
9. [Form lifecycle & state sync](#form-lifecycle--state-sync)
10. [React, Next.js, Vue, Angular](#react-nextjs-vue-angular)
11. [Build & publish](#build--publish)
12. [Browser support](#browser-support)
13. [Migrating from 1.x](#migrating-from-1x)

---

## Install

### npm

```bash
npm install zidan-select
```

```js
// ESM
import ZidanForm, { initZidanForms, initZidanSelects, zidanField } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';
```

```js
// CommonJS
const { ZidanForm, initZidanForms, initZidanSelects } = require('zidan-select');
```

### CDN

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zidan-select@2/plugin-core.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zidan-select@2/plugin-theme.css">
<script src="https://cdn.jsdelivr.net/npm/zidan-select@2/zidan-form.js"></script>
```

`plugin-core.css` must come first. Load your own theme file *after* `plugin-theme.css` to
override presets.

### Files

| File | Purpose |
| --- | --- |
| `zidan-form.js` | All controls. Classic `<script>` → `window.ZidanForm` (+ legacy `window.ZidanSelect`). |
| `zidan-form.mjs` | ES module wrapper around the same file. |
| `plugin-core.css` | Layout, positioning, native-input handling, mechanics. **No colours, shadows or skins.** |
| `plugin-theme.css` | Tokens, colours, states, presets, layout skins, framework adapters. |
| `index.html`, `demo.css`, `demo.js` | The tabbed demo / theme showcase (not shipped logic). |
| `docs/` | Comparison, options, validation, frameworks, theming and build guides. |

---

## Quick start

```html
<link rel="stylesheet" href="plugin-core.css">
<link rel="stylesheet" href="plugin-theme.css">

<form>
  <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
    <option value="">Choose…</option>
    <option>France</option>
    <option>Japan</option>
  </select>

  <label>
    <input type="checkbox" name="news" data-zidan="checkbox" data-zidan-variant="switch"
           data-zidan-label="Newsletter">
  </label>

  <fieldset data-zidan="radio-group" data-zidan-variant="inline">
    <legend>Plan</legend>
    <label><input type="radio" name="plan" value="starter" checked> Starter</label>
    <label><input type="radio" name="plan" value="pro"> Pro</label>
  </fieldset>

  <input type="file" name="docs" data-zidan="file" multiple>
  <input type="text" name="email" data-zidan="input" data-zidan-label="Email" data-zidan-clear>
</form>

<script src="zidan-form.js"></script>
<script>
  initZidanSelects(document);
  initZidanForms(document);
</script>
```

Auto-init runs on `DOMContentLoaded` for `[data-zidan-select]` and `[data-zidan*]` unless
disabled:

```html
<html data-zidan-auto-init="false">
```

```js
window.ZIDAN_SELECT_CONFIG = { autoInit: false };
```

Windows/macOS keyboard behaviour, grouping, search and all select features live in
[`docs/options.md`](docs/options.md).

---

## Input types

### Select / combobox / tags

```html
<select data-zidan-select="select" data-zidan-label="Team" multiple>…</select>
<select data-zidan-select="combobox" data-zidan-searchable="true" data-zidan-clearable="true">…</select>
<select data-zidan-select="tags" data-zidan-max-tags="3" data-zidan-allow-free-text="true">…</select>
```

`optgroup` becomes listbox groups, `disabled` options stay disabled, and the native
`<select>` keeps the value so `FormData` and `form.reset()` are untouched. Scrollbars:
`default · thin · fancy · hover · hidden` via `data-zidan-scrollbar`.

### Checkbox, switch & card

```html
<label><input type="checkbox" data-zidan="checkbox" data-zidan-label="Remember me"></label>
<label><input type="checkbox" data-zidan="checkbox" data-zidan-variant="switch" data-zidan-label="Dark mode"></label>
<label><input type="checkbox" data-zidan="checkbox" data-zidan-variant="card" data-zidan-label="Daily backup"></label>
<label><input type="checkbox" data-zidan="checkbox" data-zidan-indeterminate data-zidan-label="Select all"></label>
```

`indeterminate` is native: set it in markup or with
`input.indeterminate = true; input.__zidanField.update()` / `field.setIndeterminate(true)`.
The mixed state paints a bar and clears as soon as the user clicks, exactly like a native
checkbox.

### Radio groups

```html
<fieldset data-zidan="radio-group" data-zidan-variant="card" data-zidan-label="Seat">
  <legend>Seat</legend>
  <label><input type="radio" name="seat" value="window" required> Window</label>
  <label><input type="radio" name="seat" value="aisle"> Aisle</label>
</fieldset>
```

Variants: `stacked`, `inline`, `card`. Radios share a native `name`, so arrow keys, Home/End
and Space keep browser semantics; the wrapper adds `role="radiogroup"` when missing.

### File upload

```html
<input type="file" name="docs" multiple accept="image/*,.pdf"
       data-zidan="file"
       data-zidan-max-files="3"
       data-zidan-max-size="1048576"
       data-zidan-title="Drop documents here">
```

- Native `input.files` is the source of truth; removing a file rebuilds it with `DataTransfer`.
- Drag & drop, click to pick, thumbnails for images, extension badges otherwise.
- `maxFiles`, `maxSize` (bytes) / `maxSizeMB`, `accept` are validated with a live status message.
- `required` works: an empty file input fails native validation as usual.

### Text inputs & textarea

```html
<input type="text" data-zidan="input" data-zidan-label="Amount"
       data-zidan-prefix="$" data-zidan-suffix="USD" data-zidan-clear>

<input type="password" data-zidan="input" data-zidan-label="Password" data-zidan-reveal>

<textarea data-zidan="textarea" data-zidan-label="Message" maxlength="140"
          data-zidan-counter="140" data-zidan-clear></textarea>

<input type="text" data-zidan="input" data-zidan-layout="floating" data-zidan-label="Company">
<input type="range" data-zidan="input" data-zidan-label="Budget" data-zidan-output="#budget-out">
```

Supported types: `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`,
`time`, `datetime-local`, `month`, `week`, `range`, `color`, plus `<textarea>`.
Range inputs can mirror their value into any element with `data-zidan-output`.

---

## Options & data attributes

### Field options

| Option | Data attribute | Type | Default | Description |
| --- | --- | --- | --- | --- |
| `variant` | `data-zidan-variant` | string | `default` | Checkbox `default/switch/card`; radio `stacked/inline/card`. |
| `layout` | `data-zidan-layout` | string | `stacked` | `stacked`, `inline`, `compact`, `floating`, `outlined`, `card`. |
| `theme` | `data-zidan-theme` | string | `default` | `default`, `modern`, `minimal`, `dark`, `glass`. |
| `framework` | `data-zidan-framework` | string | `none` | `none`, `bootstrap`, `tailwind`, `bulma`, `foundation`. |
| `label` | `data-zidan-label` | string | — | Label when no `<label>` exists. |
| `hint` | `data-zidan-hint` | string | — | Helper text; linked with `aria-describedby`. |
| `validation` | `data-zidan-validation` | `valid` \| `invalid` | — | Initial state. |
| `indeterminate` | `data-zidan-indeterminate` | boolean | `false` | Start mixed. |
| `clearable` | `data-zidan-clear` | boolean | `search` only | Clear button. |
| `reveal` | `data-zidan-reveal` | boolean | `false` | Password show/hide. |
| `prefix` / `suffix` | `data-zidan-prefix` / `-suffix` | string | — | Static adornments. |
| `counter` | `data-zidan-counter` | number | `maxlength` | Character limit for the counter; overrides `maxlength`. |
| `output` | `data-zidan-output` | selector | — | Range value is mirrored into this element. |
| `title` | `data-zidan-title` | string | `Choose a file` | File dropzone title. |
| `dropHint` | `data-zidan-drop-hint` | string | — | File dropzone subtitle. |
| `maxFiles` | `data-zidan-max-files` | number | — | File count limit. |
| `maxSize` | `data-zidan-max-size` | number | — | Bytes per file. |
| `maxSizeMB` | `data-zidan-max-size-mb` | number | — | Per-file limit in megabytes; `2` = 2 MB, decimals allowed. Ignored when `maxSize` is set. |
| `accept` | native `accept` | string | — | Validated on top of the native picker filter and shown in the drop hint. |
| `alwaysValidate` | — | boolean | `false` | Show invalid state without waiting for blur. |

### Select options

See [`docs/options.md`](docs/options.md) for the complete table (`mode`, `layout`,
`themeFramework`, `searchable`, `clearable`, `multiple`, `maxTags`, `suggestions`,
`fetchOptions`, `debounce`, `minChars`, callbacks, `customClasses`, `scrollbar`, …).

Validation state options on both layers: **the plugin never submits or blocks a form** — it
mirrors state and lets your validator decide.

---

## JavaScript API

```js
initZidanSelects(scope?, options?) → ZidanSelect[]
initZidanForms(scope?, options?)    → Field[]
zidanField(target, options?)        → Field | Field[]
ZidanForm.init(scope, options)      → Field[]
ZidanForm.field(target, options)    → Field | Field[]
ZidanForm.get(input)                → Field | null
ZidanForm.refresh(scope?)           → Field[]     // re-scan + sync
ZidanForm.observe(scope, options?)  → MutationObserver
ZidanForm.destroyAll()
```

`zidanField()` also accepts a plain `<input>`/`<textarea>` of a supported type, so JS-only
options such as `output` and `counter` work without any data attribute.

`ZidanForm.themes`, `.fieldLayouts` are live registries: `ZidanForm.themes.push('brand')`
adds a valid name (do it before fields initialise). `.frameworks` lists the built-in adapters.
`ZidanSelect.layouts`, `.frameworks`, `.scrollbars`, `.instances`, `.get()`,
`.destroyAll()` remain available.

Per-select instance: `open()`, `close()`, `toggle()`, `isOpen()`, `getValue()`,
`setValue(v)`, `clear()`, `setOptions(items)`, `enable()`, `disable()`, `setLayout()`,
`setFramework()`, `setScrollbar()`, `setValidation()`, `refresh()`, `on()`, `off()`,
`destroy()`.

Per-field instance: `getValue()`, `setValue(v)`, `update()`, `refresh()`,
`setValidation(state)`, `getValidation()`, `setTheme()`, `setFramework()`, `setLayout()`,
`destroy()`, plus `setIndeterminate()`/`isChecked()` (checkbox), `setValue()` (radio group),
and `clear()` (file).

Events bubble from the wrapper as `zidan:change`, `zidan:validation`, `zidan:init`,
`zidan:destroy`, `zidan:error`:

```js
document.addEventListener('zidan:change', event => {
  console.log(event.detail.kind, event.detail.value || event.detail.checked);
});
```

---

## Themes, layouts & frameworks

```html
<form data-zs-theme="dark" data-zs-framework="bootstrap">
  <select data-zidan-select="combobox" data-zidan-layout="floating-label">…</select>
  <input data-zidan="input" data-zidan-layout="outlined" data-zidan-label="Workspace">
</form>
```

Themes and frameworks resolve **per element → ancestor → `<html>`**. Set them once on a
form or on `<html>`; set them per instance to mix.

```js
ZidanForm.init(document, { theme: 'modern', framework: 'tailwind', layout: 'compact' });
```

Custom theme — no build step, core never changes:

```css
.my-brand {
  --zs-primary: #e11d48;
  --zs-primary-soft: #fff1f4;
  --zs-focus-ring: rgba(225, 29, 72, 0.22);
  --zs-radius: 14px;
  --zs-check-checked-bg: #e11d48;
  --zs-check-checked-border: #e11d48;
}
```

Token list, preset details and layout notes: [`docs/theming.md`](docs/theming.md).

### Layouts

| Layer | Values |
| --- | --- |
| Select | `classic-clean`, `floating-label`, `soft-pill`, `bordered-brutalist`, `glass-elevated` |
| Fields | `stacked`, `inline`, `compact`, `floating`, `outlined`, `card` |
| Containers | wrap fields in `.zs-form-grid` for an auto-fit grid; `.zs-full` spans a row |

---

## Validation libraries

The native control is never hidden from the accessibility tree, `FormData` or validators,
so most setups need no configuration. `aria-invalid`, `.zs-field--invalid` / `.zs-field--valid`
and `data-zs-validation` stay in sync with both native validity and manual state.

### Native HTML5

```html
<form novalidate>
  <input required minlength="3" data-zidan="input" data-zidan-label="Name">
</form>
```

```js
form.addEventListener('submit', event => {
  ZidanForm.refresh(form);
  if (!form.checkValidity()) {
    event.preventDefault();
    form.querySelector(':invalid').focus();
  }
});
```

### jQuery Validation

Default `ignore: ":hidden"` does **not** skip the plugin's 1×1 px controls. If your version
or a wrapper hides them, use:

```js
$('#form').validate({
  ignore: [],                        // or: ':hidden:not(.zs-native-input)'
  errorPlacement(error, element) {
    var field = element.closest('.zs-field');
    (field || element.parent()).append(error);
  },
  highlight(element) {
    element.closest('.zs-field')?.classList.add('zs-field--invalid');
    element.attr('aria-invalid', 'true');
  },
  unhighlight(element) {
    element.closest('.zs-field')?.classList.remove('zs-field--invalid');
    element.removeAttr('aria-invalid');
  }
});
```

### JustValidate

```js
const validator = new JustValidate('#form', {
  errorFieldCssClass: 'zs-field--invalid',
  errorLabelStyle: { color: 'var(--zs-border-color-invalid)' }
});
validator.addField('#email', [{ rule: 'required' }, { rule: 'email' }]);
```

### Parsley

```html
<input data-zidan="input" data-parsley-required data-parsley-type="email">
```

```js
$('#form').parsley({
  errorsContainer(parsleyField) {
    return parsleyField.$element.closest('.zs-field');
  }
});
```

### Avoiding double submits

```js
form.addEventListener('submit', event => {
  if (form.dataset.busy === '1') { event.preventDefault(); return; }
  if (!form.checkValidity()) return;
  form.dataset.busy = '1';
  event.preventDefault();
  save(new FormData(form)).finally(() => { delete form.dataset.busy; });
});
```

Full recipes: [`docs/validation.md`](docs/validation.md). A runnable page that loads all three
libraries next to a native form ships as [`docs/validation.html`](docs/validation.html).

---

## Form lifecycle & state sync

| Requirement | How it works |
| --- | --- |
| Values | Native controls are never cloned: `input.value`, `.checked`, `.files` stay authoritative. |
| `FormData` | Works as-is; wrappers have no `name`. |
| `form.reset()` | Fields listen to `reset`, wait one tick and re-render from the native state. |
| Required/disabled/readonly/multiple | Mirrored at build time and on `update()`. |
| Dynamic DOM | `ZidanForm.observe(container)` initialises added nodes; `refresh()` re-syncs. |
| Teardown | `destroy()` restores the original input and removes every listener and node. `destroyAll()` for the whole page. |

```js
const observer = ZidanForm.observe(document.body);
// later
observer.disconnect();
ZidanForm.destroyAll();
```

The observer reacts to nodes added **or removed inside** the observed container. If you remove
the container itself, call `field.destroy()` (or `ZidanForm.destroyAll()`) first — the observer
cannot see a mutation above its own root.

---

## React, Next.js, Vue, Angular

Short version: initialise after mount, call `destroy()` before unmount, push state down with
`setValue()` and read it back from `onChange`/`zidan:change`. Native `<select>` values should
be controlled through the instance, because the plugin owns the visible trigger.

Complete, copy-pasteable examples (React 18, Next.js App Router with SSR-safe imports, Vue 3
`onMounted`, Angular `ngAfterViewInit` + `ControlValueAccessor` notes): [`docs/frameworks.md`](docs/frameworks.md).

Next.js CSS imports:

```js
// app/layout.js
import 'zidan-select/css/core';
import 'zidan-select/css/theme';
```

```jsx
'use client';
import { useEffect, useRef } from 'react';
import { initZidanForms, initZidanSelects } from 'zidan-select';

export default function Form() {
  const ref = useRef(null);
  useEffect(() => {
    initZidanSelects(ref.current);
    initZidanForms(ref.current);
    return () => {
      ZidanForm.fields.forEach(f => { if (ref.current?.contains(f.el)) f.destroy(); });
      ZidanSelect.instances.forEach(s => { if (ref.current?.contains(s.el)) s.destroy(); });
    };
  }, []);
  return <form ref={ref}>…</form>;
}
```

---

## Build & publish

The repo is dependency-free and works from source; `npm run build` only assembles `dist/`.

```bash
npm run dev     # static server → http://localhost:4173
npm test        # syntax + split-CSS + API checks (no browser, no deps)
npm run lint    # node --check on every script
npm run build   # dist/ (+ .min files when esbuild is installed)
```

| Command | What it does |
| --- | --- |
| `scripts/serve.mjs` | No-dependency demo server on port 4173 (`PORT=8080 npm run dev`). |
| `scripts/build.mjs` | Cleans `dist/`, copies the four assets, writes `dist/zidan-form.cjs`, and minifies with esbuild **if** it is installed. |
| `scripts/test.mjs` | Verifies syntax, that core CSS carries no colour literals, that all presets/adapters exist and the public API is exported. |

Publishing:

```bash
npm version minor      # or patch/major — tags the release
npm run build
npm publish            # `files` limits the tarball to JS, CSS, dist, docs, README, LICENSE
git push --follow-tags
```

GitHub Pages serves the repo root: the demo is `index.html` (no build needed), docs live in
`docs/`. Release notes should list theme/layout additions and any token renames.

Full checklist, folder tree and release automation notes: [`docs/build.md`](docs/build.md).

---

## Browser support

| Engine | Version | Notes |
| --- | --- | --- |
| Chrome / Edge | 105+ | Full theme + scrollbar control. |
| Firefox | 121+ | All controls; scrollbars keep the native thin gutter and `scrollbar-color` (no gradients, no thumb hover). |
| Safari / iOS Safari | 15.4+ | All controls; overlay scrollbars follow OS settings. |
| Node / SSR | 18+ | Import is side-effect free without a DOM; initialise after hydration. |

`prefers-reduced-motion` and `forced-colors` are respected. `:has()` is not required.

---

## Migrating from 1.x

| 1.x | 2.0 |
| --- | --- |
| `ZidanSelect.js` | `zidan-form.js` (same select engine inside; `window.ZidanSelect` kept as alias) |
| `ZidanSelect.mjs` | `zidan-form.mjs` |
| `ZidanSelect.css` | `plugin-core.css` + `plugin-theme.css` |
| `initZidanSelects()` | unchanged, plus `initZidanForms()` for the new controls |
| `zidanSelect()` | unchanged, plus `zidanField()` |

Update the two `<link>` tags, rename the `<script src>`, and keep the existing
`data-zidan-select` markup — it is unchanged.

---

MIT © akhtar1985 · [GitHub](https://github.com/akhtar1985/zidan-select) ·
[npm](https://www.npmjs.com/package/zidan-select)
