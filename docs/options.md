# Options & data attributes

Everything is opt-in. A control is enhanced only when it carries a `data-zidan*` attribute,
carries a marker class, sits inside a form scope, is matched by a configured target, or is
passed to `initZidanSelects()` / `initZidanForms()` / `zidanSelect()` / `zidanField()`.
`zidanField()` itself accepts any supported `<input>`/`<textarea>`, with or without a
`data-zidan*` attribute, which is how JS-only options are applied.

> **Prefer to click through the options?** The
> [field playground](https://akhtar1985.github.io/zidan-select/playground.html) exposes the main
> options for one control at a time and copies both supported HTML attributes and vanilla
> JavaScript. The [API lab](https://akhtar1985.github.io/zidan-select/#lab) exercises the complete
> option, callback, method and event inventory.

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
| `variant` | `data-zidan-variant` | string | `default` | Checkbox: `default`, `switch`, `card`, `button`, `minimal`. Radio: `stacked`, `inline`, `card`, `button`, `tile`. File: `dropzone`, `button`, `avatar`, `gallery`, `compact`. Range uses `rangeVariant`. |
| `layout` | `data-zidan-layout` | string | `stacked` | `stacked`, `inline`, `compact`, `floating`, `outlined`, `card`. |
| `theme` | `data-zidan-theme`, `data-zs-theme` | string | `default` | `default`, `modern`, `minimal`, `dark`, `glass`. Resolves element → ancestor → `<html>`. |
| `framework` | `data-zidan-framework`, `data-zs-framework` | string | `none` | `none`, `bootstrap`, `tailwind`, `bulma`, `foundation`, `vanilla`. |
| `label` | `data-zidan-label` | string | — | Used when the markup has no `<label>`; a generated label is `<label for>`. If the markup already has a `<label>`, the generated one replaces it and the original is hidden until `destroy()`. |
| `hint` | `data-zidan-hint` | string | — | Rendered under the control and linked via `aria-describedby`. |
| `description` | `data-zidan-description` | string | — | Second line for card, tile, button and minimal checkbox/radio variants. |
| `descriptions` | — | object | — | Radio group: `{ value: 'Description' }` fallback descriptions. |
| `messages` | — | object | — | Override built-in validation messages, including `required`, `phone`, `weekend` and `generic`. |
| `validate(value, field, context)` | — | function | — | Custom rule for text, checkbox, radio or file fields. Return `true`, `false`, a message string, Error or Promise; `context` is `{ signal, field, instance }`. |
| `showValidState` | — | boolean | `false` | Show a positive state after a successful async rule. |
| `validation` | `data-zidan-validation` | `valid` \| `invalid` | — | Initial state; later states come from validity or `setValidation()`. A preset `invalid` survives `update()` / `refresh()` and internal mirrors until user input/change/blur or `setValidation(null)`; programmatic value helpers that dispatch `change`, and a non-empty select value, also clear it. |
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
| `onInput` | `{ instance, value }` (text/range) |
| `onValidation` | `{ instance, state, message? }` where `state` is `valid`, `invalid` or `null` |
| `onIconClick` | `{ instance, icon, position }` |
| `onStep` | `{ instance, value, direction }` |
| `onPicker` | `{ instance, type }` |
| `onPhoneCountry` | `{ instance, country }` |
| `onPhoneFormat` | `{ instance, format }` |
| `onRemove` | `{ instance, file, index }` |
| `onUploadStart` / `onUploadProgress` / `onUploadSuccess` | `{ instance, file, name, ... }` with size, progress or result |
| `onUpload` | Alias of `onUploadSuccess`. |
| `onUploadError` / `onUploadCancel` | `{ instance, file, name, error?, message? }` |

DOM events with the same information: `zidan:init`, `zidan:change`, `zidan:input`,
`zidan:validation`, `zidan:async-validation`, `zidan:remove`, `zidan:reveal`, `zidan:clear`,
`zidan:icon-click`, `zidan:step`, `zidan:picker`, `zidan:phone-country`, `zidan:phone-format`,
`zidan:upload-*`, `zidan:destroy` and `zidan:error`.

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
ZidanSelect.registerIcon('heart', '<path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9Z"/>');
window.registerZidanIcon('star', '<path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8-6.1-3.2L5.9 21 7.1 14.2l-5-4.9 6.9-1Z"/>');

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
| `stepperStep` | — | number | native `step` | Increment used by the stepper buttons and `stepUp()` / `stepDown()`. |

```html
<input type="number" min="0" max="10" value="3" data-zidan="input"
       data-zidan-stepper="stacked">
<input type="number" min="0" max="99" data-zidan="input"
       data-zidan-stepper="split">
<input type="number" step="0.5" data-zidan="input"
       data-zidan-stepper="inline" data-zidan-stepper-position="left">
```

Methods: `stepUp(times = 1)`, `stepDown(times = 1)`, `setStepper(enabled)`.
`setStepper()` toggles the source attribute; destroy and reinitialise the field to add or remove
the generated stepper buttons.
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
| `required` | `data-zidan-required` | native | Mirrors native `required`; mount mode gets a submit guard. |
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
| `ariaLabel` | `data-zidan-aria-label` | Accessible name for the generated combobox input; defaults to `label`. |
| `placeholder` | `data-zidan-placeholder` | Trigger placeholder. |

### Behaviour

| Option | Data attribute | Default | Description |
| --- | --- | --- | --- |
| `multiple` | `data-zidan-multiple` | from `multiple` | Multi-select. |
| `searchable` | `data-zidan-searchable` | `true` except plain select | Type-to-filter. With `searchable: false` in `select` mode the text field is `readOnly`, so typing can never filter or hide the list — open it with a click, `Space`, `Enter` or `↓`. |
| `clearable` | `data-zidan-clearable` | `false` | Clear button. |
| `closeOnSelect` | `data-zidan-close-on-select` | single: `true` | Close after choosing; defaults to open for multi-select and tags. |
| `maxDropdownHeight` | — | `280` | Listbox max height in px. |
| `noResultsText` | — | `No results found` | Empty search message. |
| `emptyText` | — | `No options` | Empty source message. |
| `loadingText` | — | `Searching…` | Async loading message. |
| `clearText` | — | `Clear selection` | Clear button label. |

### Combobox / async

| Option | Default | Description |
| --- | --- | --- |
| `fetchOptions(query, signal, context)` | — | Return an array of items, or a page `{ items, hasMore }` (or `{ items, total }`). `signal` aborts stale requests; `context` is `{ page, pageSize, append, instance }`, with a zero-based `page` (`0` is the first request). |
| `fetchPageSize` | `0` | Page size handed to `fetchOptions`. `0` keeps the legacy single-request behaviour. |
| `fetchUrl` | `null` | **Declarative AJAX.** GET this URL and the select builds its own `fetchOptions` — no JavaScript needed. Attribute: `data-zidan-fetch-url`. |
| `fetchQueryParam` | `'q'` | Query-string parameter that receives the search term (`''` omits it). |
| `fetchPageParam` | `'page'` | 1-based page number sent with every request (`''` omits it). |
| `fetchSkipParam` | `null` | Send `skip = page × pageSize` instead of `fetchPageParam`, for APIs that page by offset (dummyjson, Laravel, many REST APIs). |
| `fetchPageSizeParam` | `'limit'` | Parameter that receives `fetchPageSize`. |
| `fetchItemsPath` | `null` | Dot path to the array of rows in the JSON body (`products`, `data.items`). Without it the plugin looks for `items`, `data`, `results`, `options`, `rows`, `products` or `records`. |
| `fetchTotalPath` | `null` | Dot path to the total row count; with `fetchPageSize` it decides `hasMore`. Falls back to a top-level `total`. |
| `fetchHasMorePath` | `null` | Dot path to a boolean instead of a count. |
| `fetchMethod` | `'GET'` | HTTP method for `fetchUrl`; attribute: `data-zidan-fetch-method`. |
| `fetchHeaders` | `null` | JSON object of request headers; attribute: `data-zidan-fetch-headers='{"X-Tenant":"north"}'`. |
| `fetchCredentials` | `'same-origin'` | `omit`, `same-origin` or `include`; attribute: `data-zidan-fetch-credentials`. |
| `autoLoadMore` | `true` | Scrolling near the dropdown bottom fetches the next page automatically. |
| `loadMoreText` | `Load more` | Label of the footer button rendered while `hasMore` is true. |
| `cacheResults` | `true` | Cache pages per query + page. Clear with `select.clearCache()`. |
| `onLoadMore` | — | Called when a follow-up page starts loading: `{ page, query, instance }`. `page` is zero-based (`1` is the second request); only the declarative `fetchPageParam` is converted to a one-based request value. |
| `debounce` | `250` | Async debounce in ms. |
| `minChars` | `0` | Characters before fetching. |
| `allowFreeText` | tags: `true`; other modes: `false` | Allow values not in the list. |
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

`fetchOptions` may also reject: an initial failure shows an error state and
`getAsyncState().error` keeps the message; call `refreshOptions()` to retry. If an appended page
fails, the rows already loaded stay visible and the footer shows the error; clicking it retries.
Appended fetches emit `zidan:load-more` with `{ page, query }`; failures emit the usual
`zidan:error`.

The cache size is global: `ZidanSelect.cacheLimit = 50` pages (least-recently-used eviction).

### AJAX from markup only

One URL is enough to turn a combobox into a remote search. The plugin sends the query, page
and page size, reads the rows out of the JSON, and keeps every other behaviour (debounce,
abort, cache, load-more, errors) identical to a hand-written `fetchOptions`.

```html
<select id="product" name="product"
        data-zidan-select="combobox"
        data-zidan-fetch-url="/api/products/search"
        data-zidan-fetch-items-path="data.items"
        data-zidan-fetch-total-path="data.total"
        data-zidan-fetch-skip-param="skip"
        data-zidan-fetch-page-size="20">
</select>
```

That markup calls `GET /api/products/search?q=…&limit=20&skip=0`, then `skip=20` for the next
page, and stops when `skip + limit >= data.total`. Rows map automatically: `value` / `label`, or
`id` / `slug` / `code` for the value and `name` / `title` / `full_name` for the label. A live page
with both modes, against a real API and a static JSON file, ships as
[`ajax.html`](https://akhtar1985.github.io/zidan-select/ajax.html).

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

With `allowFreeText: false` a tag you type must match an option or a `suggestions` entry by
value or label (`caseSensitive` respected). Anything else is rejected: no tag is added and the
control shows `"…" is not in the list.` through the tag error slot. Leave the option at its
`true` default for free-form tags.

### Rendering hooks

| Option | Signature |
| --- | --- |
| `filterOption(item, query)` | return boolean |
| `renderOption(item, context)` | HTML string or element; `context` is `{ index, selected, active, query, instance }`. |
| `renderSelected(item, context)` | HTML string or element; `context` is `{ index, instance }`. |
| `renderTag(item, context)` | HTML string or element; `context` is `{ index, instance, disabled }`. |
| `validateTag(tag, tags, context)` | boolean or message string; `tag` is the formatted string, `tags` is the current tag list. |
| `formatTag(tag, context)` | display string; `context` is `{ instance, tags }`. |

### Select callbacks

| Callback | Payload |
| --- | --- |
| `onInit` | `{ instance, mode, value }` |
| `onChange` | `{ instance, value, previousValue? }` |
| `onSelect` | `{ instance, value, item }` |
| `onOpen` / `onClose` | `{ instance }` |
| `onTagAdd` | `{ instance, tag, value }` |
| `onTagRemove` | `{ instance, tag, value }` |
| `onLoadMore` | `{ instance, page, query }`; `page` is zero-based. |
| `onError` | `{ instance, message, error?, callback? }`; fetch failures include `error`, and callback exceptions include `error` plus the callback name. |

Every callback receives a single payload object.

### Every select option in one object

Copy the block, delete what you do not need. Values reflect the combobox shown, except the
tag-only section, which reflects tags mode; clauses that change the shape of the result
(options, value, callbacks) are commented out.

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
  ariaLabel: 'Choose a movie',
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
  fetchUrl: null,                   // declarative AJAX endpoint; no fetchOptions needed
  fetchQueryParam: 'q',             // '' omits the search parameter
  fetchPageParam: 'page',           // 1-based; '' omits it
  fetchSkipParam: null,             // e.g. 'skip' sends page × fetchPageSize
  fetchPageSizeParam: 'limit',      // '' omits the page-size parameter
  fetchItemsPath: null,             // e.g. 'data.items'; common array names are auto-detected
  fetchTotalPath: null,             // row count used to calculate hasMore
  fetchHasMorePath: null,           // boolean path used instead of a total
  fetchMethod: 'GET',
  fetchHeaders: null,               // e.g. { Authorization: 'Bearer …' }
  fetchCredentials: 'same-origin',  // 'omit' | 'same-origin' | 'include'
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
  allowFreeText: true,              // tags default; combobox/select default false
  delimiters: [','],
  commitOnTab: false,
  commitOnBlur: false,
  valueDelimiter: ',',

  /* Rendering hooks */
  // filterOption: function (item, query) { return item.label.toLowerCase().includes(query.toLowerCase()); },
  // renderOption: function (item, context) {
  //   return (context.selected ? '✓ ' : '') + item.label;
  // },
  // renderSelected: function (item, context) { return '◉ ' + item.label; },
  // renderTag: function (item, context) { return String(item.label).toUpperCase(); },
  // validateTag: function (tag, tags, context) { return tag.length <= 24 || 'Use 24 characters or fewer'; },
  // formatTag: function (tag, context) { return tag.toUpperCase(); },

  /* Callbacks */
  onInit: function (event) { console.log('init', event.instance); },
  onChange: function (event) { console.log('value', event.value); },
  // onSelect: function (event) { console.log('selected', event.item); },
  // onOpen: function (event) { console.log('opened', event.instance); },
  // onClose: function (event) { console.log('closed', event.instance); },
  // onTagAdd: function (event) { console.log('tag added', event.tag); },
  // onTagRemove: function (event) { console.log('tag removed', event.tag); },
  // onLoadMore: function (event) { console.log('loading page', event.page); },
  // onError: function (event) { console.log('error', event.message); }
});
```

Methods for paged data: `loadMore()`, `hasMoreResults()`, `getAsyncState()`,
`refreshOptions()`, `clearCache()`.

Data attributes remain available as a 1:1 fallback; the tables above list the matching
`data-zidan-*` name for each option, and `data-zidan-options` accepts any literal-value subset
as JSON.

### DOM data attributes

`data-zidan-select`, `data-zidan-mode`, `data-zidan-layout`, `data-zidan-framework`,
`data-zidan-theme`, `data-zidan-placeholder`, `data-zidan-label`, `data-zidan-aria-label`,
`data-zidan-name`, `data-zidan-required`, `data-zidan-multiple`, `data-zidan-searchable`,
`data-zidan-clearable`, `data-zidan-close-on-select`, `data-zidan-disabled`,
`data-zidan-allow-free-text`, `data-zidan-max-tags`, `data-zidan-min-tag-length`,
`data-zidan-max-tag-length`, `data-zidan-case-sensitive`, `data-zidan-validation`,
`data-zidan-scrollbar`, `data-zidan-fetch-url`, `data-zidan-fetch-method`,
`data-zidan-fetch-headers`, `data-zidan-fetch-credentials`, `data-zidan-fetch-query-param`,
`data-zidan-fetch-page-param`, `data-zidan-fetch-skip-param`,
`data-zidan-fetch-page-size`, `data-zidan-fetch-page-size-param`, `data-zidan-fetch-items-path`,
`data-zidan-fetch-total-path`, `data-zidan-fetch-has-more-path`, and the JSON escape hatch
`data-zidan-options` (any JS option that takes a literal value). Marker classes:
`zidan-select`, `zidan-field`, `zidan-form`.

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
ZidanSelect.icons         // live icon registry (also available in the select-only build)
ZidanSelect.registerIcon(name, markup)
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
| `validationTargets()` | Native element(s) whose constraints are mirrored. |
| `setValidation('valid'\|'invalid'\|null)` | Mirrors state to classes and `aria-invalid`. A public `'invalid'` call survives `update()` / `refresh()` and internal mirrors; user input/change/blur, value helpers that dispatch `change`, a non-empty select value, or another public state call clears/replaces it. |
| `getValidation()` | Current validation state. |
| `setError(message)` / `clearError()` | Set or clear the rendered error and invalid state. |
| `checkAsync()` | Promise resolving to the custom-rule result; runs pending state and stale guards. |
| `validate()` | Promise resolving to overall validity after native and custom rules. |
| `isPending()` | Whether an async rule is currently running. |
| `setTheme(name)`, `setFramework(name)`, `setLayout(name)` | Scoped restyling. |
| `destroy()` | Restores the original DOM and removes every listener. |

Checkbox adds `setIndeterminate(bool)`, `setChecked(bool)` and `isChecked()`.

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
`loadMore()`, `hasMoreResults()`, `getAsyncState()`, `refreshOptions()`, `clearCache()`,
`on(event, handler)`, `off(event, handler)`, `announce(message)`, `destroy()`.

## Events

Removing an already-selected option from a multi-select (or a tag from a tag
field) reports only via `change`, not `select`: the removal is not a new
selection, so there is no matching `zidan:select` for it.

| Event | Detail |
| --- | --- |
| `zidan:init` | `{ instance, kind \| mode, ... }` |
| `zidan:change` | `{ instance, value, previousValue? }`, `{ checked }`, `{ files }` |
| `zidan:input` | `{ instance, value }` (text/range) |
| `zidan:validation` | `{ instance, state, message? }` |
| `zidan:async-validation` | `{ instance, valid, message, error? }` |
| `zidan:open` / `zidan:close` | `{ instance }` (select) |
| `zidan:select` | `{ instance, value, item }` (select) |
| `zidan:no-results` | `{ instance, query }` (select) |
| `zidan:tag-add` / `zidan:tag-remove` | `{ instance, tag, value }` (select tags) |
| `zidan:load-more` | `{ instance, page, query }` (select pagination) |
| `zidan:reveal` | `{ instance, visible }` (password) |
| `zidan:remove` | `{ instance, file, index? }` (file upload) |
| `zidan:step` | `{ instance, value, direction, step }` (number stepper) |
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
