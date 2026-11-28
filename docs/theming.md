# Theming

`plugin-core.css` contains structure only: layout, positioning, the 1×1 px native-input
mechanism and visibility rules. Every colour, border, shadow and skin is in
`plugin-theme.css`, driven by `--zs-*` custom properties.

Load order:

```html
<link rel="stylesheet" href="plugin-core.css">
<link rel="stylesheet" href="plugin-theme.css">
<link rel="stylesheet" href="my-theme.css">   <!-- optional overrides -->
```

## Resolution order

| Level | Wins over |
| --- | --- |
| `style="--zs-primary: …"` | everything |
| `data-zs-theme` / `data-zs-framework` on the control wrapper | ancestors |
| Wrapper (`form`, section) attributes | `<html>` |
| `<html data-zs-theme="dark" data-zs-framework="bootstrap">` | theme defaults |

Themes and frameworks resolve independently: you can combine `dark` + `bootstrap`.

## Presets

```html
<form data-zs-theme="dark">
```

| Preset | Character |
| --- | --- |
| `default` | Neutral greys, indigo `#4f6bed`, 10px radius. |
| `modern` | Softer indigo, 12px radius, layered shadows. |
| `minimal` | Near-black borders, 4px radius, no shadows. |
| `dark` | `#161a23` surfaces, `#7c8cff` accent, light text, dark-native pickers. |
| `glass` | Translucent white, blurred surfaces, works over imagery. |

## Tokens

### Typography & geometry

| Token | Default |
| --- | --- |
| `--zs-font-family` | `inherit` |
| `--zs-font-size` | `0.9375rem` |
| `--zs-line-height` | `1.4` |
| `--zs-label-size` | `0.8125rem` |
| `--zs-height` | `44px` |
| `--zs-radius` | `10px` |
| `--zs-chip-radius` | `8px` |
| `--zs-border-width` | `1px` |
| `--zs-padding-x` / `--zs-padding-y` | `12px` / `5px` |
| `--zs-gap` | `6px` |
| `--zs-dropdown-radius` / `--zs-dropdown-border-width` | `12px` / `1px` |
| `--zs-option-radius` | `8px` |
| `--zs-option-padding-y` / `--zs-option-padding-x` | `9px` / `12px` |

### Colour

| Token | Default | Used by |
| --- | --- | --- |
| `--zs-bg` | `#ffffff` | control, input shell, cards |
| `--zs-text` | `#16181d` | labels, values, options |
| `--zs-text-muted` | `#6b7280` | hints, counters, clear buttons |
| `--zs-placeholder` | `#9aa1ac` | placeholders |
| `--zs-border-color` | `#dfe3e8` | idle borders |
| `--zs-border-color-hover` | `#c3c9d2` | hover |
| `--zs-border-color-focus` | `#4f6bed` | focus |
| `--zs-border-color-invalid` / `--zs-border-color-valid` | `#dc3545` / `#198754` | validation |
| `--zs-primary` / `--zs-primary-contrast` | `#4f6bed` / `#fff` | checked, focus, accents |
| `--zs-primary-soft` | `#eef1fd` | card checked, hover wash |
| `--zs-focus-ring` / `--zs-focus-ring-width` | `rgba(79,107,237,.22)` / `3px` | focus ring |
| `--zs-chip-bg` / `-text` / `-border` | `#eef1fd` / `#33407a` / `#dfe5fb` | tags |
| `--zs-dropdown-bg` / `-border` / `-shadow` | white / `#e6e9ee` / layered shadow | listbox |
| `--zs-option-hover-bg` / `-active-bg` / `-active-text` | greys/indigo | listbox options |
| `--zs-option-selected-bg` / `-selected-text` | indigo tints | selected options |
| `--zs-group-text` | `#8b93a1` | listbox groups |

### Field tokens

| Token | Default |
| --- | --- |
| `--zs-check-size` | `20px` |
| `--zs-check-radius` | `6px` |
| `--zs-check-gap` | `10px` |
| `--zs-check-bg` / `--zs-check-border` | `#fff` / `#c3c9d2` |
| `--zs-check-mark` | `#fff` |
| `--zs-check-checked-bg` / `-checked-border` | `#4f6bed` / `#4f6bed` |
| `--zs-switch-width` / `-height` | `40px` / `22px` |
| `--zs-switch-off` / `--zs-switch-knob` | `#d6dae1` / `#fff` |
| `--zs-radio-size` | `18px` |
| `--zs-radio-border` / `--zs-radio-gap` | `#c3c9d2` / `10px` |
| `--zs-file-drop-bg` / `--zs-file-drop-border` | `#f8f9fc` / `#cfd5de` |
| `--zs-file-thumb-bg` / `-text` | `#eef1fd` / `#4a5590` |
| `--zs-field-gap` | `6px` |

### Input icons, stepper, phone, range & upload

| Token | Default | Used by |
| --- | --- | --- |
| `--zs-icon-color` / `--zs-icon-hover-bg` | muted text / primary-soft | input icons, upload glyph |
| `--zs-stepper-color` / `--zs-stepper-hover-bg` | text / primary-soft | − / + buttons |
| `--zs-phone-border` | border colour | country `<select>` separator |
| `--zs-switch-width-lg` / `-height-lg` | larger track | material/square/labeled styles |
| `--zs-switch-on-text` / `--zs-switch-off-text` | white / muted | labeled & icon switches |
| `--zs-radius-pill` | `999px` | button checkbox/radio variants |
| `--zs-avatar-size` | `96px` | avatar file variant |
| `--zs-avatar-bg` / `--zs-avatar-border` | primary-soft / border | avatar target & preview fallback |
| `--zs-range-track` / `--zs-range-fill` | border / primary | default & minimal range |
| `--zs-range-gradient` | linear-gradient | gradient variant |
| `--zs-range-thumb-bg` / `-thumb-border` | white / primary | range thumbs |
| `--zs-range-tick` / `--zs-range-tick-text` | border / muted | tick marks and labels |
| `--zs-range-bubble-bg` / `-bubble-text` | text / white | value bubble |
| `--zs-upload-track` / `--zs-upload-bar` / `--zs-upload-success` | border / primary / green | progress bar and states |

### Variant hooks

Variants are selected per control and can be restyled with attribute selectors — no JS:

```css
/* checkbox pill */
.zs-field[data-zs-variant="button"] .zs-check { --zs-pill-bg: #ecfdf3; }
/* radio tiles */
.zs-radio-group[data-zs-variant="tile"] .zs-radio { border-radius: 14px; }
/* switch skins */
.zs-field[data-zs-switch-style="ios"] .zs-switch-track::after { box-shadow: 0 1px 3px rgba(0,0,0,.3); }
/* file variants */
.zs-field[data-zs-file-variant="avatar"] { --zs-avatar-size: 128px; }
.zs-field[data-zs-file-variant="gallery"] .zs-file-list { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
/* range skins */
.zs-range[data-zs-range="gradient"] { --zs-range-gradient: linear-gradient(90deg, #22c55e, #eab308); }
```

`data-zs-file-variant` is set on the field root; the drop target also carries
`zs-file-drop--<variant>`. `data-zs-range` is set on `.zs-range`, and validation-driven
icons/progress are keyed off `[data-zs-validation]` and `data-zs-upload-state`.


### Scrollbar

`--zs-scrollbar-size`, `--zs-scrollbar-thumb`, `--zs-scrollbar-thumb-hover`,
`--zs-scrollbar-thumb-reveal` (hover variant), `--zs-scrollbar-track`.

## Custom theme

```css
.my-brand {
  --zs-primary: #e11d48;
  --zs-primary-soft: #fff1f4;
  --zs-border-color-focus: #e11d48;
  --zs-focus-ring: rgba(225, 29, 72, 0.22);
  --zs-check-checked-bg: #e11d48;
  --zs-check-checked-border: #e11d48;
  --zs-radius: 14px;
  --zs-dropdown-radius: 16px;
}
```

```html
<form class="my-brand">…</form>
```

No JS change is needed when the tokens apply to a wrapper class. For a named preset that also
works with `data-zs-theme="brand"` and `setTheme('brand')`, register the name first:

```js
ZidanForm.themes.push('brand');   // register before fields initialise
```

```html
<form data-zs-theme="brand">…</form>
```

```css
[data-zs-theme="brand"] { /* tokens */ }
```

`ZidanForm.themes` is the live list the plugin validates against, so a pushed name survives
initialisation and is written to the field root as `data-zs-theme`. Names that were never
registered fall back to `default`; pushing after fields exist only affects `setTheme()` calls
made afterwards.

## Automatic dark mode

`theme: 'auto'` (or `data-zs-theme="auto"`) resolves to `dark` when the OS prefers dark and to
`default` otherwise:

```js
zidanSelect('#city', { theme: 'auto' });
```

One shared `matchMedia('(prefers-color-scheme: dark)')` listener updates every auto root live;
`setTheme('auto')` re-arms it and `destroy()` removes the tracking. `auto` is resolved in JS, so
there is no `[data-zs-theme="auto"]` CSS block — the root carries the resolved `dark`/`default`
name. To drive it yourself instead, set the attribute before init:

```html
<script>
  if (matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-zs-theme', 'dark');
  }
</script>
```

`setTheme()` on an instance does the same for one field.

## Select layouts

| Layout | Notes |
| --- | --- |
| `classic-clean` | 10px radius, standard height, soft dropdown shadow. |
| `floating-label` | Label starts as placeholder, lifts on focus/value. |
| `soft-pill` | Pill trigger and chips, tinted surface. |
| `bordered-brutalist` | 2px black border, zero radius, offset shadow, yellow accent. |
| `glass-elevated` | Blur, translucency, elevated shadows, solid fallback without `backdrop-filter`. |

## Field layouts

| Layout | Notes |
| --- | --- |
| `stacked` | Label, control, hint vertically. |
| `inline` | Label and control on one row. |
| `compact` | 34px control height, smaller label. |
| `floating` | Label lives inside the shell and lifts when filled/focused. |
| `outlined` | Like floating, with the label notching the border. |
| `card` | Adds a padded card surface around the field. |

`grid` is not a field layout value — the grid lives on the wrapper:

```html
<div class="zs-form-grid">
  <input data-zidan="input" data-zidan-label="First name">
  <input data-zidan="input" data-zidan-label="Last name">
  <textarea data-zidan="textarea" data-zidan-label="Notes" class="zs-full"></textarea>
</div>
```

`--zs-grid-min` / `--zs-grid-gap` control the auto-fit columns.

## Framework adapters

`data-zs-framework` (or the `framework` option; `themeFramework` is a deprecated alias)
accepts `none`, `bootstrap`, `tailwind`, `bulma` and `foundation`. The legacy value `vanilla` is
accepted and behaves exactly like `none`. Adapters only remap tokens plus a few structural
compat rules (Bootstrap `input-group`, for example). Nothing depends on the framework's
JavaScript.

```html
<html data-zs-framework="bootstrap">   <!-- whole page -->
<form data-zs-framework="tailwind">    <!-- one form -->
```

## Scrollbar variants

```html
<select data-zidan-select="combobox" data-zidan-scrollbar="fancy">
```

| Value | Chromium / Safari | Firefox |
| --- | --- | --- |
| `default` | 8px rounded thumb | thin native gutter, `scrollbar-color` |
| `thin` | 6px | thin native |
| `fancy` | gradient thumb on tinted track | flat accent thumb (no gradients possible) |
| `hover` | invisible until hover/focus, soft 0.3 then 0.45 on the thumb | soft 0.3 on listbox hover only |
| `hidden` | no visible bar, still scrollable | `scrollbar-width: none` |

## Reduced motion & forced colours

Both are handled in the stylesheets. Keep animations in custom themes behind
`@media (prefers-reduced-motion: no-preference)`.
