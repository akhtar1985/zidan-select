# Options & data attributes

Everything is opt-in. A control is enhanced only when it carries a `data-zidan*` attribute,
is matched by `initZidanSelects()` / `initZidanForms()`, or is passed to `zidanSelect()` /
`zidanField()`. `zidanField()` itself accepts any supported `<input>`/`<textarea>`, with or
without a `data-zidan*` attribute, which is how JS-only options are applied.

## Field options

Applies to `ZidanCheckbox`, `ZidanRadioGroup`, `ZidanFileUpload`, `ZidanTextField`.

| JS option | Data attribute | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `variant` | `data-zidan-variant` | string | `default` | Checkbox: `default`, `switch`, `card`. Radio: `stacked`, `inline`, `card`. |
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

Checkbox adds `setIndeterminate(bool)` and `isChecked()`; file adds `clear()` and
`getFiles()`.

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
| `zidan:remove` | `{ instance, file }` (file upload) |
| `zidan:destroy` | `{ instance }` |
| `zidan:error` | `{ error, callback, instance }` |
