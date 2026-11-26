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
| `input.setCustomValidity()` | plugin | phone length, weekends, blocked dates, custom `validate`, file limits |
| `aria-invalid` | plugin (`setValidation`) or your validator | screen readers and CSS |
| `.zs-field--invalid` / `.zs-field--valid` | plugin | theme states |
| `.zs-field--pending` / `aria-busy` | plugin | in-flight async rule |
| `data-zs-validation="valid\|invalid\|pending"` | plugin | attribute-based styling |

The plugin marks a field invalid when:

1. `invalid` fires on the native control, or
2. the control is blurred with `validity.valid === false`, or
3. you call `field.setValidation('invalid')`.

It clears the state on `input`/`change` once validity passes, on `form.reset()`, and whenever
`setValidation(null)` is called. `data-zidan-validation="invalid"` forces the state without
native validity.

A state set through the public `setValidation('invalid')` (and a preset
`data-zidan-validation="invalid"`) is **pinned against re-renders**: `update()`, `refresh()`
and internal validity mirrors or async re-checks do not clear it. The pin is released by the
next `input`, `change` or `blur`, or by `setValidation(null)` / `setValidation('valid')`.
Programmatic value helpers can release it too: field `setValue()` / `setChecked()` dispatch
`change`, and applying a non-empty select value clears the select's invalid option. Internal
mirrors pass a second argument (`setValidation(state, true)`) so they never pin a state.

## Built-in rules (written into native validity)

These rules call `input.setCustomValidity(message)`, so `form.checkValidity()`,
`:invalid`, `validationMessage` and third-party validators that read native validity all see
them. Clearing the value (or fixing it) clears the message.

| Control | Rule | Enable with | Message key |
| --- | --- | --- | --- |
| `tel` | Length per country (10–11 digits for GB, 10 for US, …) | `data-zidan-phone`, `phone.validate !== false` | `messages.phone` (`{country}`, `{min}`, `{max}`) |
| `date` | Sat/Sun blocked | `data-zidan-disable-weekends` | `messages.weekend` |
| `date` | Specific ISO dates blocked | `data-zidan-disabled-dates="2026-12-25,…"` or `disabledDates` function | `messages.dateDisabled` |
| `date` | Custom date rule | JS `validateDate(value, date, field)` | `messages.date` or the returned string |
| text / textarea | Custom rule | JS `validate(value, field)` | `messages.generic` or the returned string |
| file | Count / size / type | `maxFiles`, `maxSize` (or `maxSizeMB`), `accept` | `messages.fileCount`, `fileSize`, `fileType` |

```js
zidanField('#start', {
  disableWeekends: true,
  disabledDates: ['2026-12-25', '2027-01-01'],
  validateDate(value, date) {
    return date < new Date('2026-11-01') ? 'Pick a date after 1 November.' : true;
  }
});
```

Override any message globally before initialising:

```js
Object.assign(ZidanForm.messages, {
  phone: 'Enter a valid {country} number ({min}–{max} digits).',
  weekend: 'We are closed at weekends — pick a weekday.',
  fileSize: '“{name}” is {size}; the limit is {limit}.'
});
```

## Async rules

`validate` and `validateDate` may return a Promise. The field then:

1. shows a `.zs-field--pending` spinner and `aria-busy="true"`,
2. writes `messages.pending` (`Checking…`) into native validity, so `form.checkValidity()`
   and any submit handler wait for the answer,
3. aborts the previous request when the value changes and ignores stale resolutions,
4. resolves `validate()` to `true`/`false` instead of a boolean,
5. emits `zidan:async-validation` with `{ valid, message }`.

Validators receive an `AbortSignal` as their third argument (after `value`/`checked` and the
field) and may reject — the rejection message is shown as the error.

```js
const email = zidanField('#email', {
  alwaysValidate: true,
  showValidState: true,
  validate: async (value, field, { signal }) => {
    if (!value) return true;
    const res = await fetch('/api/check-email?e=' + encodeURIComponent(value), { signal });
    const { taken } = await res.json();
    return taken ? 'This address is already registered.' : true;
  }
});

await email.validate();      // Promise<boolean>
email.isPending();           // true while the request is in flight
```

Submission is blocked while pending because the native control carries the pending message;
listen for `zidan:async-validation` if you need your own spinner or toast. `destroy()` aborts
any in-flight check, and `form.reset()` clears the pending state.

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

The plugin never submits forms. It mirrors state and writes custom rules into native validity,
so your submit handler stays in charge. Use an idempotent guard:

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

### Whole-form validation and serialization

```js
const form = document.querySelector('#signup');
const data = ZidanForm.serialize(form);       // repeated names become arrays
const ok = await ZidanForm.validate(form);    // runs field rules + native constraints
if (ok) await fetch('/signup', { method: 'POST', body: JSON.stringify(data) });
```

`ZidanForm.validate(form, { focus: false })` skips focusing the first invalid control.
`zidan:validate` bubbles with `{ valid, form, fields }` once all checks settle.

## Checklist

- [ ] Core control still has `name` and appears in `new FormData(form)`.
- [ ] `form.checkValidity()` returns `false` with an empty required field.
- [ ] Submitting invalid does not double-fire (busy guard).
- [ ] `aria-invalid` is present on the native input, not only on the wrapper.
- [ ] After `form.reset()`, values and error classes are cleared.
- [ ] `destroy()` leaves a working plain form.
