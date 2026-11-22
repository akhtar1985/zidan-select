# Validation compatibility

ZidanForm wraps controls but never removes them. The native input keeps its
`name`, `value`, `checked`, `files`, `required`, `disabled` and validity state, which is why
native validation, `FormData` and third-party validators keep working.

> **Runnable test bench:** [`validation.html`](validation.html) loads jQuery Validation,
> JustValidate and Parsley from a CDN next to a native form and the same plugin markup. Open
> it via a local server (`npm run dev` → `/docs/validation.html`) and submit each empty form.

## How state is mirrored

| Signal | Written by | Used for |
| --- | --- | --- |
| `input.validity` | the browser | source of truth |
| `aria-invalid` | plugin (`setValidation`) or your validator | screen readers and CSS |
| `.zs-field--invalid` / `.zs-field--valid` | plugin | theme states |
| `data-zs-validation="valid\|invalid"` | plugin | attribute-based styling |

The plugin marks a field invalid when:

1. `invalid` fires on the native control, or
2. the control is blurred with `validity.valid === false`, or
3. you call `field.setValidation('invalid')`.

It clears the state on `input`/`change` once validity passes, on `form.reset()`, and whenever
`setValidation(null)` is called. `data-zidan-validation="invalid"` forces the state without
native validity.

## The hidden-input trap

jQuery Validation's default `ignore: ":hidden"` checks `offsetWidth`/`offsetHeight`.
The plugin's native controls are positioned at 1×1 px with `opacity: 0` and `clip-path`, never
`display: none`, so they stay measurable and are validated. If your configuration or a
wrapper still hides them, use an explicit ignore list:

```js
$('#form').validate({
  ignore: ':hidden:not(.zs-native-input)',   // or simply: ignore: []
});
```

## Native HTML5

```html
<form id="native-form" novalidate>
  <input required minlength="3" data-zidan="input" data-zidan-label="Name">
  <input type="email" required data-zidan="input" data-zidan-label="Email">
  <fieldset data-zidan="radio-group" data-zidan-variant="inline">
    <legend>Plan</legend>
    <label><input type="radio" name="plan" value="pro" required> Pro</label>
    <label><input type="radio" name="plan" value="basic"> Basic</label>
  </fieldset>
  <input type="file" required data-zidan="file">
  <button>Send</button>
</form>
```

```js
const form = document.getElementById('native-form');

form.addEventListener('submit', event => {
  event.preventDefault();
  form.querySelectorAll('[data-zidan], [data-zidan-select]').forEach(node => {
    const field = node.__zidanField || node.__zidanSelect;
    if (field) field.update();
  });

  if (!form.checkValidity()) {
    form.querySelector(':invalid')?.focus();
    return;
  }
  submit(new FormData(form));
});
```

Radio groups: validity belongs to the radios. `field.setValidation('invalid')` marks every
radio, which paints the group border through the theme.

## jQuery Validation

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/jquery-validation@1.20.0/dist/jquery.validate.min.js"></script>
```

```js
$('#form').validate({
  ignore: [],
  rules: {
    email: { required: true, email: true }
  },
  errorPlacement(error, element) {
    const field = element.closest('.zs-field');
    if (field) field.appendChild(error);
    else element.after(error);
  },
  highlight(element) {
    element.attr('aria-invalid', 'true');
    element.closest('.zs-field')?.classList.add('zs-field--invalid');
  },
  unhighlight(element) {
    element.removeAttr('aria-invalid');
    element.closest('.zs-field')?.classList.remove('zs-field--invalid');
  }
});
```

- Put the plugin's native controls where jQuery can see them (default markup does).
- Do not call `field.destroy()` inside validation callbacks; the field keeps working while
  jQuery toggles classes.
- `$('form').valid()` works unchanged.

## JustValidate

```js
import JustValidate from 'just-validate';

const validator = new JustValidate('#form', {
  errorFieldCssClass: 'zs-field--invalid',
  errorLabelStyle: { fontSize: '0.75rem', color: 'var(--zs-border-color-invalid)' },
  errorsContainer: '#form-errors'
});

validator
  .addField('#email', [{ rule: 'required' }, { rule: 'email' }])
  .addField('#notes', [{ rule: 'maxLength', value: 240 }])
  .onSuccess(event => {
    event.preventDefault();
    console.log(Object.fromEntries(new FormData(event.target)));
  });
```

JustValidate adds its class to the native control; give your theme a matching rule if you want
the wrapper painted:

```css
.zs-field:has(> .zs-input-shell > .zs-field--invalid) .zs-input-shell { border-color: red; }
```

(The built-in `data-zs-validation` state from `onValidation` is usually enough.)

## Parsley

```html
<input name="email" type="email" required
       data-zidan="input" data-zidan-label="Email"
       data-parsley-required data-parsley-type="email">
```

```js
$('#form').parsley({
  errorsContainer(parsleyField) {
    return parsleyField.$element.closest('.zs-field');
  },
  errorClass: 'zs-field--invalid',
  successClass: 'zs-field--valid'
});
```

Parsley appends error `<ul>` elements after the input. When the input is wrapped by the plugin,
they land inside `.zs-input-shell`; the `errorsContainer` override above places them under the
field instead.

## Preventing double submits

The plugin deliberately does not submit or block forms. Use an idempotent guard:

```js
const form = document.getElementById('form');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (form.dataset.busy === '1') return;
  form.dataset.busy = '1';
  try {
    await fetch(form.action, { method: form.method, body: new FormData(form) });
  } finally {
    delete form.dataset.busy;
  }
});
```

For buttons, also set `disabled` while pending — the plugin mirrors `disabled` onto every
control after `field.update()`.

## Reset and dynamic content

`form.reset()` restores native values; every field listens for `reset` and re-renders one tick
later, clearing validation classes. When you replace form markup (framework re-render):

```js
ZidanForm.observe(form);      // initialise added nodes automatically
ZidanForm.refresh(form);      // re-sync existing fields without recreating them
```

## Manual validation API

```js
const field = ZidanForm.get(document.getElementById('email'));
field.setValidation('invalid');   // classes + aria-invalid
field.setValidation('valid');
field.setValidation(null);        // clean
field.getValidation();            // 'valid' | 'invalid' | null
```

`zidan:validation` bubbles from the wrapper for analytics or summary lists.

## Checklist

- [ ] Core control still has `name` and appears in `new FormData(form)`.
- [ ] `form.checkValidity()` returns `false` with an empty required field.
- [ ] Submitting invalid does not double-fire (busy guard).
- [ ] `aria-invalid` is present on the native input, not only on the wrapper.
- [ ] After `form.reset()`, values and error classes are cleared.
- [ ] `destroy()` leaves a working plain form.
