# Options & data attributes

Everything is opt-in. A control is enhanced only when it carries a `data-zidan*` attribute,
carries a marker class, sits inside a form scope, is matched by a configured target, or is
passed to `initZidanSelects()` / `initZidanForms()` / `zidanSelect()` / `zidanField()`.
`zidanField()` itself accepts any supported `<input>`/`<textarea>`, with or without a
`data-zidan*` attribute, which is how JS-only options are applied.

> **Prefer to click through the options?** The
> [field playground](https://akhtar1985.github.io/zidan-select/playground.html) exposes every
> option for one control at a time and copies both the HTML attribute form and the vanilla
> JavaScript object shown below.

## Direct init by ID or class

The first argument of `zidanSelect()` accepts a CSS selector, an element, or a NodeList. Plain
selects are not auto-initialised, so you can enhance exactly the field you want. For complete
copy-paste pages (static HTML, WordPress, page builders) see the
[static HTML & WordPress cookbook](html-and-wordpress.md).

```html
<select id="mymov">…</select>
<select class="mymovclass">…</select>
<select class="mymovclass">…</select>
```

```js
const picker = zidanSelect('#mymov', {
  mode: 'combobox',
  label: 'Movie',
  placeholder: 'Search a movie…',
  searchable: true,
  clearable: true
});

const pickers = zidanSelect('.mymovclass', { mode: 'select', layout: 'soft-pill' });
// one match → instance, several → array
```

`initZidanSelects(scope, options)` still bulk-enhances every `[data-zidan-select]` and
`.zidan-select` inside a scope; use it when the markup can carry attributes. `zidanSelect()`
is the targeted form for IDs, classes and elements you already have a reference to.

### Read values and option details

```js
picker.getValue();                 // selected value; array for multiple/tags
picker.setValue('dune');
picker.getTags();                  // tags mode

const native = picker.el;          // the original <select>
native.selectedOptions;            // selected <option> elements
Array.from(native.options).map(option => ({
  value: option.value,
  label: option.text,
  disabled: option.disabled,
  group: option.parentElement.tagName === 'OPTGROUP' ? option.parentElement.label : null
}));

picker.setOptions([                // rebuilds listbox and native <option>s
  { value: 'inception', label: 'Inception' },
  { value: 'dune', label: 'Dune', group: 'Villeneuve' },
  { value: 'arrival', label: 'Arrival', disabled: true }
]);
```

Listen to the library callback in the options (`onChange: ({ instance, value }) => …`) or to the
native `change` event; the native `<select>` always holds the current value.

## No-JS init (IDs, classes, selectors, JSON)

For CMS templates where attributes are limited and custom scripts are unwelcome, init can be
entirely declarative. The same rules apply to the full build, the select-only bundle and the
file-only bundle.

| Path | Markup | What is enhanced |
| --- | --- | --- |
| Marker class | `<select class="zidan-select">` | That select, or a mount `<div>`. Mode comes from `data-zidan-options` / `data-zidan-mode`. |
| Marker class | `<input class="zidan-field">` | A checkbox, file or text/textarea input. Put it on the `<fieldset>` for a radio group. |
| Form wrapper | `<form class="zidan-form">` or `data-zidan-form` on any element | Every `<select>` and every `<input type="file">` inside, marked or not. |
| Config targets | `window.ZIDAN_FORM_CONFIG` (alias `ZIDAN_SELECT_CONFIG`) | Anything matched by an ID, class or full CSS selector. |

### `data-zidan-options` JSON

Plain options as JSON on the element itself, for selects and every field type:

```html
<select class="zidan-select" multiple
        data-zidan-options='{"mode":"tags","maxTags":3,"placeholder":"Add a tag…"}'>…</select>

<input type="file" class="zidan-field"
       data-zidan-options='{"variant":"gallery","maxFiles":4,"title":"Add images"}'>
```

Values must be literal JSON; callbacks, upload functions and raw SVG icon markup still need a
small JS block. Invalid JSON is ignored with one console warning.

### `window.ZIDAN_FORM_CONFIG`

| Key | Type | Effect |
| --- | --- | --- |
| `autoInit` | boolean | `false` disables every automatic pass (`data-zidan-auto-init="false"` does the same). |
| `targets` / `selectors` | string or array | CSS selectors, or `{ selector, options }` entries, initialised as selects. |
| `fieldTargets` | string or array | Selectors initialised as fields; plain text inputs and textareas are accepted. |
| `formTargets` | string or array | Extra form scopes: every select and file input inside is initialised. |
| `options` | object | Shared select options for the attribute scan and for targets. |
| `fieldOptions` | object | Shared field options for the scan and for targets. |
| `fields` | object | Legacy alias of `fieldOptions`. |
| `selector` | string | Legacy: initialise only these selects and skip the attribute scan. |

```js
window.ZIDAN_FORM_CONFIG = {
  targets: ['#country', 'select.product-variants',
            { selector: '#brands', options: { mode: 'tags', maxTags: 3 } }],
  fieldTargets: [
    { selector: '#avatar', options: { variant: 'avatar' } },
    { selector: 'input[name="email"]', options: { icon: 'mail' } }
  ],
  formTargets: ['#checkout']
};
```

Precedence for any single option: per-target `options` → `data-zidan-options` JSON →
`data-zidan-*` attribute → default. Config is read during the `DOMContentLoaded` pass, so set it
before the library script (or call `initZidanSelects()` / `initZidanForms()` yourself with the
same values). Explicit targets run first so their options win over the generic scan.

## Field options

Applies to `ZidanCheckbox`, `ZidanRadioGroup`, `ZidanFileUpload`, `ZidanTextField`.

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `variant` | `data-zidan-variant` | string | `default` | Checkbox: `default`, `switch`, `card`, `button`, `minimal`. Radio: `stacked`, `inline`, `card`, `button`, `tile`. File: `dropzone`, `button`, `avatar`, `gallery`, `compact`. Range: `default`, `gradient`, `stepped`, `minimal`. |
| `layout` | `data-zidan-layout` | string | `stacked` | `stacked`, `inline`, `compact`, `floating`, `outlined`, `card`. |
| `theme` | `data-zidan-theme`, `data-zs-theme` | string | `default` | `default`, `modern`, `minimal`, `dark`, `glass`. Resolves element → ancestor → `<html>`. |
| `framework` | `data-zidan-framework`, `data-zs-framework` | string | `none` | `none`, `bootstrap`, `tailwind`, `bulma`, `foundation`, `vanilla`. |
| `label` | `data-zidan-label` | string | — | Used when the markup has no `<label>`; a generated label is `<label for>`. If the markup already has a `<label>`, the generated one replaces it and the original is hidden until `destroy()`. |
| `hint` | `data-zidan-hint` | string | — | Rendered under the control and linked via `aria-describedby`. |
| `validation` | `data-zidan-validation` | `valid` \| `invalid` | — | Initial state; later states come from validity or `setValidation()`. |
| `alwaysValidate` | — | boolean | `false` | Mark invalid as soon as native validity fails instead of on blur. |
| `indeterminate` | `data-zidan-indeterminate` | boolean | `false` | Checkbox starts mixed. |
| `clearable` | `data-zidan-clear` | boolean | `search` only | Clear button for text inputs and textarea. |
| `reveal` | `data-zidan-reveal` | boolean | `false` | Password show/hide toggle. |
| `prefix` | `data-zidan-prefix` | string | — | Static text before the input. |
| `suffix` | `data-zidan-suffix` | string | — | Static text after the input. |
| `counter` | `data-zidan-counter` | number | `maxlength` | Counter maximum; wins over the `maxlength` default. |
| `output` | `data-zidan-output` | selector | — | Range display value (formatted when `rangeFormat` is set) is mirrored into this element. |
| `title` | `data-zidan-title` | string | `Choose a file` | Dropzone headline. |
| `dropHint` | `data-zidan-drop-hint` | string | — | Dropzone subtitle. |
| `accept` | native `accept` | string | — | Validated on top of the native picker filter and shown in the dropzone hint. |
| `maxFiles` | `data-zidan-max-files` | number | — | Extra files are trimmed and reported. |
| `maxSize` | `data-zidan-max-size` | number | — | Bytes per file. |
| `maxSizeMB` | `data-zidan-max-size-mb` | number | — | Megabytes per file; `2` = 2 MB, decimals allowed. Ignored when `maxSize` is set. |
| `labels` | — | object | — | Radio group: `{ value: 'Label' }` fallback labels. |
| `clearLabel` | — | string | `Clear all` / `Clear field` | Button text/aria-label. |
| `showPasswordLabel` | — | string | `Show` | Password toggle labels. |
| `hidePasswordLabel` | — | string | `Hide` | Password toggle labels. |

### Field callbacks

| Callback | Payload |
| --- | --- |
| `onInit` | `{ instance, variant?, type? }` |
| `onChange` | `{ instance, value }` (text/radio), `{ instance, checked, value }` (checkbox), `{ instance, files }` (file) |
| `onValidation` | `{ instance, state }` where `state` is `valid`, `invalid` or `null` |
| `onRemove` | `{ instance, file }` |

DOM events with the same information: `zidan:init`, `zidan:change`, `zidan:validation`,
`zidan:remove`, `zidan:reveal`, `zidan:clear`, `zidan:destroy`, `zidan:error`.

## Checkbox, switch & radio variants

| Control | Option / attribute | Values | Notes |
| --- | --- | --- | --- |
| Checkbox / switch | `variant` / `data-zidan-variant` | `default`, `switch`, `card`, `button`, `minimal` | `button` is a filter-style pill; `minimal` removes the border for dense lists. |
| Switch | `switchStyle` / `data-zidan-switch-style` | `ios`, `material`, `square`, `labeled`, `icon` | Skin only — combine with `variant="switch"`. |
| Switch | `onLabel` / `data-zidan-on-label` | string | `labeled` and `icon` styles: checked text. |
| Switch | `offLabel` / `data-zidan-off-label` | string | `labeled` and `icon` styles: unchecked text. |
| Checkbox / radio | `description` / `data-zidan-description` | string | Second line under the label (card, tile, button, minimal). |
| Radio group | `variant` / `data-zidan-variant` | `stacked`, `inline`, `card`, `button`, `tile` | Applies to the `<fieldset>`. |
| Radio group | `deselectable` / `data-zidan-deselectable` | boolean | Clicking the selected radio clears the group. |

`ZidanForm.variants` exposes the accepted names:
`{ checkbox: [...], switch: [...], radio: [...], file: [...], range: [...] }`.

## Text input: icons

Supports `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `date`, `time`,
`datetime-local`, `month`, `week`, `range`, `color` and `<textarea>`.

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `autoIcon` | `data-zidan-auto-icon` | boolean | `false` | Uses the built-in icon for the input type (`mail`, `phone`, `calendar`, `clock`, `search`, `link`, `hash`, `palette`). |
| `icon` | `data-zidan-icon` | string | — | Any registered name, a raw `<path>`/SVG string, or `"auto"` (same as `autoIcon`). |
| `iconPosition` | `data-zidan-icon-position` | `left` \| `right` | `left` | Right icons sit after suffix/actions. |
| `iconClickable` | `data-zidan-icon-clickable` | boolean | `false` | Renders a `<button>` and emits `zidan:icon-click`. Date/time pickers are always clickable. |
| `iconLabel` | `data-zidan-icon-label` | string | — | Accessible name for a decorative/custom icon. |
| `validationIcon` | `data-zidan-validation-icon` | boolean | `false` | Adds check/alert glyphs driven by `[data-zs-validation]`. |

```html
<!-- type-based icon -->
<input type="email" data-zidan="input" data-zidan-auto-icon="true" data-zidan-clear>

<!-- custom icon, right side, clickable -->
<input type="url" data-zidan="input" data-zidan-icon="link"
       data-zidan-icon-position="right" data-zidan-icon-clickable="true"
       data-zidan-icon-label="Open website">
```

```js
// register your own icon (path markup or a full <svg>), then use its name anywhere
ZidanForm.registerIcon('sparkle', '<path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17Z"/>');
window.registerZidanIcon('heart', '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z"/>');

// or configure a plain input entirely from JavaScript
zidanField('#brand', {
  icon: 'palette',
  iconPosition: 'right',
  iconClickable: true,
  iconLabel: 'Pick a brand colour'
});
```

Built-in names: `text`, `mail`, `phone`, `user`, `lock`, `search`, `calendar`, `clock`, `link`,
`hash`, `palette`, `sliders`, `file`, `upload`, `eye`, `eye-off`, `check`, `x`, `plus`, `minus`,
`chevron-down`, `chevron-up`, `chevron-left`, `chevron-right`, `alert`, `info`, `globe`,
`map-pin`, `image`, `refresh`, `trash`. `icon` also accepts raw `<path>` or `<svg>` markup.

Icons are sanitised with `DOMParser`: only SVG shape elements and safe attributes survive.

## Number stepper (− / +)

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `stepper` | `data-zidan-stepper` | boolean \| mode | `false` | `true` = `stacked`; or `stacked`, `split`, `inline`. Any value except `false`/`"false"` enables it. |
| `stepperPosition` | `data-zidan-stepper-position` | `left` \| `right` | `right` | `inline` mode only. |
| `stepperWrap` | `data-zidan-stepper-wrap` | boolean | `false` | Adds a wrapping border around the field (theme hook). |
| `stepperLongPress` | `data-zidan-stepper-long-press` | boolean | `true` | Press and hold repeats. |
| `stepperDelay` | `data-zidan-stepper-delay` | number | `420` | Hold delay before repeating, ms. |
| `stepperInterval` | `data-zidan-stepper-interval` | number | `90` | Repeat interval, ms. |
| `stepperUpLabel` | `data-zidan-stepper-up-label` | string | `Increase value` | Aria-label of “+”. |
| `stepperDownLabel` | `data-zidan-stepper-down-label` | string | `Decrease value` | Aria-label of “−”. |

```html
<input type="number" min="0" max="10" value="3" data-zidan="input"
       data-zidan-stepper="stacked">
<input type="number" min="0" max="99" data-zidan="input"
       data-zidan-stepper="split">
<input type="number" step="0.5" data-zidan="input"
       data-zidan-stepper="inline" data-zidan-stepper-position="left">
```

Methods: `stepUp(times = 1)`, `stepDown(times = 1)`, `setStepper(enabled)`.
Event: `zidan:step` → `{ value, direction, instance }`.

## Phone formatting

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `phone` | `data-zidan-phone` | boolean \| object | `false` | Enables formatting. Object form: `{ country, format, showCountry, countries, validate }`. |
| `phoneCountry` | `data-zidan-phone-country` | ISO-2 | `US` | One of `ZidanForm.phoneCountries`. |
| `phoneFormat` | `data-zidan-phone-format` | `national` \| `international` \| `e164` | `national` | Three styles per country. |
| `phoneCountrySelect` | `data-zidan-phone-country-select` | boolean | `true` | Show the native country `<select>`. |
| `phoneCountries` | `data-zidan-phone-countries` | list | common set | Comma-separated ISO codes for the selector. |
| `phoneCountryLabel` | — | string | `Country code` | Aria-label for the selector. |
| `phone.validate` | — | boolean | `true` | Length check per country (uses `messages.phone`). |

```html
<input type="tel" data-zidan="input" data-zidan-phone="true"
       data-zidan-phone-country="GB" data-zidan-phone-format="international"
       data-zidan-phone-country-select="false">
```

Methods: `getPhoneCountry()`, `setPhoneCountry('GB')`, `setPhoneFormat('e164')`,
`formatPhone(value?)`.
Events: `zidan:phone-country` → `{ country }`, `zidan:phone-format` → `{ format }`.

Static helpers:

```js
ZidanForm.formatPhone('2025550134', 'US', 'e164');        // +12025550134
ZidanForm.detectPhoneCountry('+44 7700 900123');          // 'GB'
```

Formatting is caret-safe: digits are re-masked around the caret while typing, and a leading
national `0` is dropped in international/E.164 output.

## Range inputs

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `rangeVariant` | `data-zidan-range-variant` | `default` \| `gradient` \| `stepped` \| `minimal` | `default` | Visual skin. |
| `rangeBubble` | `data-zidan-range-bubble` | boolean | `true` | Master switch for the floating value bubble. |
| `rangeBubbleMode` | `data-zidan-range-bubble-mode` | `always` \| `active` \| `never` | `always` | `active` shows the bubble only on hover, focus or drag. |
| `rangeBubblePosition` | `data-zidan-range-bubble-position` | `top` \| `bottom` | `top` | Bubble above the track or below the ticks/scale. |
| `rangeFill` | `data-zidan-range-fill` | boolean | `true` | Coloured progress fill; `false` keeps the neutral track (gradient skin keeps its gradient). |
| `rangeMinMax` | `data-zidan-range-minmax` | boolean | `true` | Min/max scale under the track. Hidden automatically when labeled ticks cover both ends, so 0 and the max print once. |
| `rangeMinLabel` / `rangeMaxLabel` | `data-zidan-range-min-label` / `-range-max-label` | string | — | Custom text for the scale ends (e.g. `Low` / `High`); `rangeFormat` is used when unset. |
| `rangeTicks` | `data-zidan-range-ticks` | number \| array \| string | `0` | Count, JS array, JSON array or comma list (`0,250,500`). Values are absolute and out-of-range ones sit at the nearest end. |
| `rangeTickLabels` | `data-zidan-range-tick-labels` | boolean | `false` | Text labels on ticks. Labels at both ends replace the min/max scale. |
| `rangeLabels` | — | object | — | Map `{ value: 'Label' }` used with labeled ticks. |
| `rangeFormat` | `data-zidan-range-format` | string \| function | — | Template with `{value}`, `{min}`, `{max}` (or `%s`), or `function(value, field)` in JS. |
| `output` | `data-zidan-output` | selector | — | Mirrors the display value (formatted when `rangeFormat` is set) into a `<output>`/element; `input.value` keeps the raw value. |

```html
<input type="range" min="0" max="1000" step="50" value="400"
       data-zidan="input" data-zidan-range-variant="minimal"
       data-zidan-range-minmax="false" data-zidan-output="#budget">
```

```js
zidanField('#price', {
  rangeVariant: 'gradient',
  rangeTicks: [0, 250, 500, 750, 1000],
  rangeTickLabels: true,
  rangeLabels: { 0: 'Free', 1000: 'Top' },
  rangeFormat: value => '€' + Number(value).toLocaleString('en-US')
});

zidanField('#delivery', {
  rangeBubbleMode: 'active',      // 'always' | 'active' | 'never'
  rangeBubblePosition: 'bottom',  // 'top' | 'bottom'
  rangeFill: false,               // neutral track, no progress colour
  rangeTicks: '0,10,20,30',       // count, array, JSON or comma list
  rangeTickLabels: true,
  rangeMinLabel: 'Low',
  rangeMaxLabel: 'High'
});
```

The range keeps `input.value` native; only the visual chrome and bubble are added. Instance
properties `range`, `rangeBubble`, `rangeTicksEl` and `rangeScale` are exposed if you need to
re-render custom ticks.

Labeled ticks and the scale do not stack: when `rangeTickLabels` is on and the tick values
include both `min` and `max`, the scale row (`.zs-range-scale`) gets `zs-range-scale--hidden`
and the tick labels are the single endpoint readout. `rangeLabels` entries win over
`rangeFormat` for that value. Endpoint labels carry `zs-range-tick--start` / `--end` and the
bubble gets `zs-range-bubble--start` / `--end`, so both stay inside the track at 0 and max,
including in RTL. Without a scale row (`.zs-range--labels-no-scale`) the label height is
reserved so labels cannot overlap the next element.

Bubble behaviour is controlled by `rangeBubbleMode` (`always` / `active` / `never`) and
`rangeBubblePosition` (`top` / `bottom`), the coloured progress by `rangeFill`, and the scale
ends by `rangeMinLabel` / `rangeMaxLabel`. `rangeFill: false` keeps the neutral track but not
the gradient skin, and `rangeFormat` also feeds `aria-valuetext` so assistive tech reads the
formatted value.

## Date & time pickers

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `pickerButton` | `data-zidan-picker-button` | boolean | `false` | Adds a picker button when no icon is present. |
| `pickerIcon` | `data-zidan-picker-icon` | string | per type | Any registered icon (default `calendar`/`clock`). |
| `pickerLabel` | — | string | `Open <type> picker` | Aria-label for the picker button. |
| `disableWeekends` | `data-zidan-disable-weekends` | boolean | `false` | Sat/Sun fail validation with `messages.weekend`. |
| `disabledDates` | `data-zidan-disabled-dates` | list \| function | — | Comma-separated ISO dates, array, or `(value, date, field) => true` in JS. |
| `validateDate` | — | function | — | `(value, date, field) => boolean \| string`; return `false` for `messages.date` or a custom string. |

```html
<input type="date" value="2026-11-23" data-zidan="input"
       data-zidan-icon="calendar" data-zidan-icon-position="left"
       data-zidan-disable-weekends="true">
<input type="datetime-local" data-zidan="input" data-zidan-picker-button="true"
       data-zidan-picker-icon="calendar">
```

Methods: `openPicker()` / `showPicker()`. Event: `zidan:picker` → `{ type }`.

The native picker is used via `input.showPicker()` when available; icons keep the native input
reachable, so form values and validation stay native.

## File upload: variants, uploading & rendering

Variants are set with `fileVariant` / `data-zidan-file-variant` (defaults to `dropzone`):

| Variant | Design |
| --- | --- |
| `dropzone` | Full-width dashed target; thumbnail or extension badge in the list. |
| `button` | Entire target is a compact button, one row. |
| `avatar` | Circular 96 px target with a single-image preview (`--zs-avatar-size` to resize). |
| `gallery` | Wrap target plus a responsive thumbnail grid. |
| `compact` | One-line target for sidebars; combine with `showFileMeta: false`. |

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `fileVariant` | `data-zidan-file-variant` | string | `dropzone` | `dropzone`, `button`, `avatar`, `gallery`, `compact`. |
| `uploadIcon` | `data-zidan-upload-icon` | string | `upload` | Icon in the drop target (any registered name or `icon`). |
| `upload` / `uploadHandler` | — | function | — | Custom uploader, see contract below. |
| `uploadUrl` | `data-zidan-upload-url` | string | — | XHR endpoint; `POST` multipart. |
| `uploadField` | `data-zidan-upload-field` | string | `file` | FormData field name. |
| `uploadData` | — | object \| function | — | Extra FormData fields (`(file, field) => object`). |
| `withCredentials` | `data-zidan-with-credentials` | boolean | `false` | XHR credentials. |
| `uploadHeaders` / `headers` | — | object \| function | — | Extra request headers (`(file, field) => object`). |
| `simulateUpload` | `data-zidan-simulate-upload` | boolean | `false` | Visual upload only; files never leave the browser. |
| `simulateDuration` | `data-zidan-simulate-duration` | number | `900` | Simulation length, ms (min 120). |
| `autoUpload` | `data-zidan-auto-upload` | boolean | `true` | Start uploading as soon as files are picked. |
| `showFileMeta` | `data-zidan-show-file-meta` | boolean | `true` | Name + size line per file. |
| `showPreview` / `preview` | `data-zidan-preview` | boolean | `true` | Avatar preview for images. |
| `replaceTitle` | — | string | `Change image` | Avatar title once a preview exists. |
| `progressTemplate` | — | string | `Uploading {percent}%` | Progress text template. |
| `uploadedLabel` | — | string | `Uploaded` | Per-file success text. |
| `failedLabel` | — | string | `Upload failed` | Per-file error prefix. |
| `canceledLabel` | — | string | `Upload canceled` | Per-file canceled text. |
| `cancelLabel` / `retryLabel` | — | string | `Cancel` / `Retry` | Per-file action labels. |
| `renderFile` | — | function | — | `(itemElement, { file, index, state, field })` after the default row renders. |

### Every file option in one object

```js
const upload = zidanField('#files', {
  /* Target by ID, class or element; no data-* attribute required */

  /* Variant & copy */
  variant: 'dropzone',              // dropzone | button | avatar | gallery | compact
  uploadIcon: 'upload',             // any registered icon name or SVG markup
  title: 'Choose a file',
  dropHint: 'Drag & drop or browse',
  layout: 'stacked',                // stacked | inline | compact | floating | outlined | card
  theme: 'default',
  framework: 'none',
  label: 'Attachments',
  hint: 'PDF or images up to 5 MB.',

  /* Rules */
  accept: 'image/*,.pdf',           // shown in the hint, checked against the picker
  maxFiles: 4,
  maxSizeMB: 5,                     // or maxSize: 5242880 (bytes)
  showFileMeta: true,
  showPreview: true,
  replaceTitle: 'Change image',

  /* Upload pipeline */
  // upload: function (file, context) { … }, // custom uploader, contract below
  // uploadUrl: '/api/files',                // or XHR endpoint
  uploadField: 'file',
  // uploadData: function (file, field) { return { folder: 'avatars' }; },
  // uploadHeaders: function (file, field) { return { 'X-Token': '…' }; },
  withCredentials: false,
  autoUpload: true,
  simulateUpload: false,            // visual-only pipeline
  simulateDuration: 900,            // ms

  /* Per-file UI */
  progressTemplate: 'Uploading {percent}%',
  uploadedLabel: 'Uploaded',
  failedLabel: 'Upload failed',
  canceledLabel: 'Upload canceled',
  cancelLabel: 'Cancel',
  retryLabel: 'Retry',
  // renderFile: function (itemElement, state) { … },

  /* Callbacks — also zidan:upload-start/progress/success/error/cancel */
  onUploadStart: function (event) { console.log('start', event.file); },
  onUploadProgress: function (event) { console.log(event.progress); },
  onUploadSuccess: function (event) { console.log('done', event.result); },
  onUploadError: function (event) { console.log('failed', event.error); },
  onUploadCancel: function (event) { console.log('canceled', event.file); }
});
```

Custom uploader contract:

```js
zidanField('#files', {
  upload(file, context) {
    // file: the File being uploaded
    // context: { file, field, formData, signal, onProgress, complete, fail }
    const xhr = new XMLHttpRequest();
    // ...or return a promise / call context.complete(result) / context.fail(error)
    context.onProgress(40);              // 0–99 while working
    fetch('/upload', { method: 'POST', body: context.formData, signal: context.signal })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => context.complete(data))
      .catch(err => context.fail(err));
  }
});
```

- A returned thenable resolves the upload; a non-`undefined` return value becomes the result.
- Returning nothing means *you* will call `context.complete()` / `context.fail()`.
- `context.signal` aborts when the user cancels or the field is destroyed.
- `input.files` is always authoritative; `DataTransfer` rebuilds it on remove/clear.

Methods: `getFiles()`, `getUploadState()` (`[{ file, name, size, status, progress, error, result }]`),
`addFiles(files)`, `replaceFiles(files)`, `removeFile(fileNameOrIndex)`, `clear()`,
`setVariant(name)`, `setUploader(fnOrUrl)`, `uploadAll()`, `uploadFile(file)`,
`cancelUpload(file)`, `cancelAll()`, `retryUpload(file)`.

Events: `zidan:upload-start` `{ file, name, size }`, `zidan:upload-progress`
`{ file, name, progress }`, `zidan:upload-success` `{ file, name, result }`,
`zidan:upload-error` `{ file, name, error, message }`, `zidan:upload-cancel` `{ file, name }`,
plus the shared `zidan:change`, `zidan:remove` (`{ file, index }`) and `zidan:clear`.

Callbacks: `onUploadStart`, `onUploadProgress`, `onUploadSuccess` / `onUpload`,
`onUploadError`, `onUploadCancel`.

## Select options

`ZidanSelect` keeps its full 1.x option set.

### Core

| Option | Data attribute | Default | Description |
| --- | --- | --- | --- |
| `mode` | `data-zidan-select`, `data-zidan-mode` | `select` | `select`, `combobox`, `tags`. |
| `layout` | `data-zidan-layout` | `classic-clean` | Five select layouts (see theming doc). |
| `themeFramework` | `data-zidan-framework` | `auto` | `auto`, `none`, `vanilla`, `bootstrap`, `tailwind`, `bulma`, `foundation`. |
| `theme` | `data-zidan-theme` | `default` | Colour preset. |
| `id` | — | generated | Root id prefix. |
| `name` | `data-zidan-name` | native name | Name for hidden mirror input in mount mode. |
| `disabled` | `data-zidan-disabled` | native | Mirrors the native `disabled`. |
| `required` | — | native | Mirrors native `required`. |
| `validation` | `data-zidan-validation` | `null` | `valid` \| `invalid`. |
| `scrollbar` | `data-zidan-scrollbar` | `default` | `default`, `thin`, `fancy`, `hover`, `hidden`. |
| `customClasses` | — | `{}` | Map of `root/control/input` → class names. |

### Data

| Option | Data attribute | Description |
| --- | --- | --- |
| `options` | — | Array of strings or `{value,label,disabled,group}`. |
| `suggestions` | — | Tags suggestions. |
| `value` | — | Initial value(s). |
| `label` | `data-zidan-label` | Floating label text. An author `<label>` for the same control is hidden while the field is enhanced and restored by `destroy()`. |
| `placeholder` | `data-zidan-placeholder` | Trigger placeholder. |

### Behaviour

| Option | Data attribute | Default | Description |
| --- | --- | --- | --- |
| `multiple` | `data-zidan-multiple` | from `multiple` | Multi-select. |
| `searchable` | `data-zidan-searchable` | `true` except plain select | Type-to-filter. |
| `clearable` | `data-zidan-clearable` | `false` | Clear button. |
| `closeOnSelect` | — | single: `true` | Close after choosing. |
| `maxDropdownHeight` | — | `280` | Listbox max height in px. |
| `noResultsText` | — | `No results found` | Empty search message. |
| `emptyText` | — | `No options` | Empty source message. |
| `loadingText` | — | `Searching…` | Async loading message. |
| `clearText` | — | `Clear selection` | Clear button label. |

### Combobox / async

| Option | Default | Description |
| --- | --- | --- |
| `fetchOptions(query, signal, context)` | — | Return an array of items, or a page `{ items, hasMore }` (or `{ items, total }`). `signal` aborts stale requests; `context` is `{ page, pageSize, append, instance }`. |
| `fetchPageSize` | `0` | Page size handed to `fetchOptions`. `0` keeps the legacy single-request behaviour. |
| `autoLoadMore` | `true` | Scrolling near the dropdown bottom fetches the next page automatically. |
| `loadMoreText` | `Load more` | Label of the footer button rendered while `hasMore` is true. |
| `cacheResults` | `true` | Cache pages per query + page. Clear with `select.clearCache()`. |
| `onLoadMore` | — | Called when a follow-up page starts loading: `{ page, query, instance }`. |
| `debounce` | `250` | Async debounce in ms. |
| `minChars` | `0` | Characters before fetching. |
| `allowFreeText` | tags only | Allow values not in the list. |
| `searchValues` | `true` | Match against values as well as labels. |

Remote results are **not** filtered again on the client, so a server that already applied
the query is never double-filtered. Use `renderOption` for custom rows; keep values stable
across pages so the merge can de-duplicate them.

```js
const users = zidanSelect('#owner', {
  mode: 'combobox',
  fetchPageSize: 20,
  fetchOptions: async (query, signal, { page, pageSize }) => {
    const res = await fetch('/api/users?q=' + encodeURIComponent(query)
      + '&page=' + page + '&size=' + pageSize, { signal });
    const data = await res.json();
    return {
      items: data.rows.map(u => ({ value: u.id, label: u.name })),
      hasMore: data.page + 1 < data.pages
    };
  },
  onLoadMore: ({ page }) => console.log('loaded page', page)
});

users.loadMore();                 // manual next page
users.hasMoreResults();           // boolean
users.getAsyncState();            // { query, page, hasMore, loading, fetchingMore, error }
users.refreshOptions();           // clears the cache and refetches page 0
users.clearCache();               // drop cached pages only
```

`fetchOptions` may also reject: the current list stays on screen, the footer shows the error
and clicking it retries. Appended fetches emit `zidan:load-more` with `{ page, query }`;
failures emit the usual `zidan:error`.

The cache size is global: `ZidanSelect.cacheLimit = 50` pages (least-recently-used eviction).

### Tags

| Option | Data attribute | Default |
| --- | --- | --- |
| `maxTags` | `data-zidan-max-tags` | `Infinity` |
| `minTagLength` | `data-zidan-min-tag-length` | `1` |
| `maxTagLength` | `data-zidan-max-tag-length` | `Infinity` |
| `caseSensitive` | `data-zidan-case-sensitive` | `false` |
| `allowFreeText` | `data-zidan-allow-free-text` | `true` |
| `delimiters` | — | `[',']` |
| `commitOnTab` / `commitOnBlur` | — | `false` |
| `valueDelimiter` | — | `,` |

### Rendering hooks

| Option | Signature |
| --- | --- |
| `filterOption(item, query)` | return boolean |
| `renderOption(item, index)` | HTML string or element |
| `renderSelected(value)` | HTML string or element |
| `renderTag(tag)` | HTML string or element |
| `validateTag(tag)` | boolean or message string |
| `formatTag(tag)` | display string |

### Select callbacks

`onInit`, `onChange`, `onSelect`, `onOpen`, `onClose`, `onTagAdd`, `onTagRemove`, `onLoadMore`, `onError`.
Every callback receives a single payload object with `instance` and the relevant value(s).

### Every select option in one object

Copy the block, delete what you do not need. Values shown are the defaults; only clauses that
change the shape of the result (options, value, callbacks) are commented out.

```js
const picker = zidanSelect('#mymov', {
  /* Core */
  mode: 'combobox',                 // 'select' | 'combobox' | 'tags' (default 'select')
  layout: 'classic-clean',          // 5 select layouts, see theming.md
  themeFramework: 'none',           // 'auto' | 'none' | 'vanilla' | 'bootstrap' | 'tailwind' | 'bulma' | 'foundation'
  theme: 'default',                 // 'default' | 'modern' | 'minimal' | 'dark' | 'glass'
  // id: 'mymov',                   // root id prefix; leave unset for class targets
  // name: 'movie',                 // defaults to the native name
  disabled: false,
  required: false,
  validation: null,                 // 'valid' | 'invalid' | null
  scrollbar: 'default',             // 'default' | 'thin' | 'fancy' | 'hover' | 'hidden'
  customClasses: { root: '', control: '', input: '' },

  /* Data — omit to use the native <option>s */
  // options: [
  //   { value: 'inception', label: 'Inception' },
  //   { value: 'dune', label: 'Dune', group: 'Villeneuve' },
  //   { value: 'arrival', label: 'Arrival', disabled: true }
  // ],
  // suggestions: ['Interstellar', 'Oppenheimer'],
  // value: 'inception',            // string, or array for multiple/tags
  label: 'Movie',
  placeholder: 'Search a movie…',

  /* Behaviour */
  multiple: false,                  // mirrors native multiple by default
  searchable: true,                 // false in plain 'select' mode
  clearable: true,
  closeOnSelect: true,              // single mode
  maxDropdownHeight: 280,           // px
  noResultsText: 'No results found',
  emptyText: 'No options',
  loadingText: 'Searching…',
  clearText: 'Clear selection',

  /* Combobox / async */
  // fetchOptions: function (query, signal, context) {
  //   return fetch('/api/movies?q=' + encodeURIComponent(query) + '&page=' + context.page, { signal: signal })
  //     .then(function (response) { return response.json(); }); // items[] or { items, hasMore }
  // },
  fetchPageSize: 0,                 // >0 enables paged responses, load-more and scroll auto-load
  autoLoadMore: true,
  cacheResults: true,               // ZidanSelect.cacheLimit = 50 pages, LRU
  loadMoreText: 'Load more',
  debounce: 250,                    // ms
  minChars: 0,
  searchValues: true,               // match labels and values

  /* Tags (mode: 'tags') */
  maxTags: Infinity,
  minTagLength: 1,
  maxTagLength: Infinity,
  caseSensitive: false,
  allowFreeText: true,
  delimiters: [','],
  commitOnTab: false,
  commitOnBlur: false,
  valueDelimiter: ',',

  /* Rendering hooks */
  // filterOption: function (item, query) { return item.label.toLowerCase().includes(query.toLowerCase()); },
  // renderOption: function (item) { return '<strong>' + item.label + '</strong>'; },
  // renderSelected: function (value) { return value; },
  // renderTag: function (tag) { return tag; },
  // validateTag: function (tag) { return tag.length <= 24 || 'Use 24 characters or fewer'; },
  // formatTag: function (tag) { return tag.toUpperCase(); },

  /* Callbacks — also: onSelect, onOpen, onClose, onTagAdd, onTagRemove, onLoadMore, onError */
  onInit: function (event) { console.log('init', event.instance); },
  onChange: function (event) { console.log('value', event.value); }
});
```

Methods for paged data: `loadMore()`, `hasMoreResults()`, `getAsyncState()`,
`refreshOptions()`, `clearCache()`.

Data attributes remain available as a 1:1 fallback; the tables above list the matching
`data-zidan-*` name for each option, and `data-zidan-options` accepts any literal-value subset
as JSON.

### DOM data attributes

`data-zidan-select`, `data-zidan-mode`, `data-zidan-layout`, `data-zidan-framework`,
`data-zidan-theme`, `data-zidan-placeholder`, `data-zidan-label`, `data-zidan-name`,
`data-zidan-multiple`, `data-zidan-searchable`, `data-zidan-clearable`, `data-zidan-disabled`,
`data-zidan-allow-free-text`, `data-zidan-max-tags`, `data-zidan-min-tag-length`,
`data-zidan-max-tag-length`, `data-zidan-case-sensitive`, `data-zidan-validation`,
`data-zidan-scrollbar`, and the JSON escape hatch `data-zidan-options` (any JS option that
takes a literal value). Marker classes: `zidan-select`, `zidan-field`, `zidan-form`.

## Defaults

```js
ZidanForm.themes          // ['default','modern','minimal','dark','glass']
ZidanForm.frameworks      // ['auto','none','vanilla','bootstrap','tailwind','bulma','foundation']
ZidanForm.fieldLayouts    // ['stacked','inline','card','compact','floating','outlined']
ZidanForm.variants        // { checkbox, switch, radio, file, range } accepted names
ZidanForm.stepperModes    // ['stacked','split','inline']
ZidanForm.phoneFormats    // ['national','international','e164']
ZidanForm.phoneCountries  // { US: { dial, mask, groups, min, max }, … }
ZidanForm.icons           // live icon registry (name → SVG markup)
ZidanForm.messages        // default validation messages
ZidanSelect.layouts       // five select layouts
ZidanSelect.scrollbars    // ['default','thin','fancy','hover','hidden']
```

`themes` and `fieldLayouts` are live arrays, so `ZidanForm.themes.push('brand')` registers a
custom preset that `theme` / `setTheme()` will accept (register before initialising fields).

`grid` is not a field layout value: add `class="zs-form-grid"` to the wrapper (and `zs-full`
to any field that should span the row) rather than putting it on a single field.

## Instance methods

### Fields

| Method | Description |
| --- | --- |
| `getValue()` | Text/textarea value, checked value, radio value or selected files. |
| `setValue(v)` | Writes to the native control and re-renders. |
| `update()` / `refresh()` | Re-read native state (checked, disabled, validity, value). |
| `setValidation('valid'\|'invalid'\|null)` | Mirrors state to classes and `aria-invalid`. |
| `getValidation()` | Current validation state. |
| `setTheme(name)`, `setFramework(name)`, `setLayout(name)` | Scoped restyling. |
| `destroy()` | Restores the original DOM and removes every listener. |

Checkbox adds `setIndeterminate(bool)` and `isChecked()`.

Text inputs add `stepUp(times?)`, `stepDown(times?)`, `setStepper(bool)`,
`getPhoneCountry()`, `setPhoneCountry(iso)`, `setPhoneFormat(format)`, `formatPhone(value?)`
and `openPicker()` / `showPicker()`.

File adds `getFiles()`, `getUploadState()`, `addFiles()`, `replaceFiles()`, `removeFile()`,
`clear()`, `setVariant()`, `setUploader()`, `uploadAll()`, `uploadFile()`, `cancelUpload()`,
`cancelAll()` and `retryUpload()`.

### Select

`open()`, `close()`, `toggle()`, `isOpen()`, `getValue()`, `setValue()`, `clear()`,
`setOptions(items)`, `addTag()`, `removeTag()`, `getTags()`, `enable()`, `disable()`,
`setLayout()`, `setFramework()`, `setScrollbar()`, `setValidation()`, `refresh()`,
`on(event, handler)`, `off(event, handler)`, `announce(message)`, `destroy()`.

## Events

| Event | Detail |
| --- | --- |
| `zidan:init` | `{ instance, kind \| mode }` |
| `zidan:change` | `{ instance, value }`, `{ checked }`, `{ files }` |
| `zidan:validation` | `{ instance, state, message? }` |
| `zidan:remove` | `{ instance, file, index? }` (file upload) |
| `zidan:input` | `{ instance, value }` (text/range) |
| `zidan:step` | `{ instance, value, direction }` (number stepper) |
| `zidan:phone-country` | `{ instance, country }` |
| `zidan:phone-format` | `{ instance, format }` |
| `zidan:icon-click` | `{ instance, icon, position }` |
| `zidan:picker` | `{ instance, type }` |
| `zidan:upload-start` | `{ instance, file, name, size }` |
| `zidan:upload-progress` | `{ instance, file, name, progress }` |
| `zidan:upload-success` | `{ instance, file, name, result }` |
| `zidan:upload-error` | `{ instance, file, name, error, message }` |
| `zidan:upload-cancel` | `{ instance, file, name }` |
| `zidan:clear` | `{ instance }` |
| `zidan:destroy` | `{ instance }` |
| `zidan:error` | `{ error, callback, instance }` |
