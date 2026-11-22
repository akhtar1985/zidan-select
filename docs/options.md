# Options & data attributes

Everything is opt-in. A control is enhanced only when it carries a `data-zidan*` attribute,
is matched by `initZidanSelects()` / `initZidanForms()`, or is passed to `zidanSelect()` /
`zidanField()`. `zidanField()` itself accepts any supported `<input>`/`<textarea>`, with or
without a `data-zidan*` attribute, which is how JS-only options are applied.

## Field options

Applies to `ZidanCheckbox`, `ZidanRadioGroup`, `ZidanFileUpload`, `ZidanTextField`.

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `variant` | `data-zidan-variant` | string | `default` | Checkbox: `default`, `switch`, `card`, `button`, `minimal`. Radio: `stacked`, `inline`, `card`, `button`, `tile`. File: `dropzone`, `button`, `avatar`, `gallery`, `compact`. Range: `default`, `gradient`, `stepped`, `minimal`. |
| `layout` | `data-zidan-layout` | string | `stacked` | `stacked`, `inline`, `compact`, `floating`, `outlined`, `card`. |
| `theme` | `data-zidan-theme`, `data-zs-theme` | string | `default` | `default`, `modern`, `minimal`, `dark`, `glass`. Resolves element → ancestor → `<html>`. |
| `framework` | `data-zidan-framework`, `data-zs-framework` | string | `none` | `none`, `bootstrap`, `tailwind`, `bulma`, `foundation`, `vanilla`. |
| `label` | `data-zidan-label` | string | — | Used when the markup has no `<label>`; a generated label is `<label for>`. |
| `hint` | `data-zidan-hint` | string | — | Rendered under the control and linked via `aria-describedby`. |
| `validation` | `data-zidan-validation` | `valid` \| `invalid` | — | Initial state; later states come from validity or `setValidation()`. |
| `alwaysValidate` | — | boolean | `false` | Mark invalid as soon as native validity fails instead of on blur. |
| `indeterminate` | `data-zidan-indeterminate` | boolean | `false` | Checkbox starts mixed. |
| `clearable` | `data-zidan-clear` | boolean | `search` only | Clear button for text inputs and textarea. |
| `reveal` | `data-zidan-reveal` | boolean | `false` | Password show/hide toggle. |
| `prefix` | `data-zidan-prefix` | string | — | Static text before the input. |
| `suffix` | `data-zidan-suffix` | string | — | Static text after the input. |
| `counter` | `data-zidan-counter` | number | `maxlength` | Counter maximum; wins over the `maxlength` default. |
| `output` | `data-zidan-output` | selector | — | Range value is mirrored into this element. |
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
```

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
| `rangeBubble` | `data-zidan-range-bubble` | boolean | `true` | Floating value bubble above the thumb. |
| `rangeMinMax` | `data-zidan-range-minmax` | boolean | `true` | Min/max scale under the track. |
| `rangeTicks` | `data-zidan-range-ticks` | number \| array | `0` | Count (data attribute) or array of values (JS option). |
| `rangeTickLabels` | `data-zidan-range-tick-labels` | boolean | `false` | Text labels on ticks. |
| `rangeLabels` | — | object | — | Map `{ value: 'Label' }` used with labeled ticks. |
| `rangeFormat` | `data-zidan-range-format` | string \| function | — | Template with `{value}`, `{min}`, `{max}` (or `%s`), or `function(value, field)` in JS. |
| `output` | `data-zidan-output` | selector | — | Mirrors the raw value into a `<output>`/element. |

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
```

The range keeps `input.value` native; only the visual chrome and bubble are added. Instance
properties `range`, `rangeBubble`, `rangeTicksEl` and `rangeScale` are exposed if you need to
re-render custom ticks.

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

Custom uploader contract:

```js
zidanField('#files', {
  upload(context) {
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
| `label` | `data-zidan-label` | Floating label text. |
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
| `fetchOptions(query, signal)` | — | Return a promise of items; an `AbortController` signal is provided. |
| `debounce` | `250` | Async debounce in ms. |
| `minChars` | `0` | Characters before fetching. |
| `allowFreeText` | tags only | Allow values not in the list. |
| `searchValues` | `true` | Match against values as well as labels. |

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

`onInit`, `onChange`, `onSelect`, `onOpen`, `onClose`, `onTagAdd`, `onTagRemove`, `onError`.
Every callback receives a single payload object with `instance` and the relevant value(s).

### DOM data attributes

`data-zidan-select`, `data-zidan-mode`, `data-zidan-layout`, `data-zidan-framework`,
`data-zidan-theme`, `data-zidan-placeholder`, `data-zidan-label`, `data-zidan-name`,
`data-zidan-multiple`, `data-zidan-searchable`, `data-zidan-clearable`, `data-zidan-disabled`,
`data-zidan-allow-free-text`, `data-zidan-max-tags`, `data-zidan-min-tag-length`,
`data-zidan-max-tag-length`, `data-zidan-case-sensitive`, `data-zidan-validation`,
`data-zidan-scrollbar`.

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
