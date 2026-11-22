# Framework integration

The library owns the visible chrome but never the form state: native inputs remain the
source of truth. In component frameworks that means:

1. initialise after the DOM exists (mounted / hydrated),
2. push external state down with `setValue()` (and `setIndeterminate()`),
3. read user changes from `onChange` / `zidan:change`,
4. `destroy()` before the nodes disappear.

Do not let the framework re-render the same input element with different `data-zidan*`
attributes; recreate the field instead.

## React 18

```jsx
import { useEffect, useRef, useState } from 'react';
import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

export default function ProfileForm() {
  const host = useRef(null);
  const [plan, setPlan] = useState('pro');

  useEffect(() => {
    initZidanSelects(host.current);
    initZidanForms(host.current);
    const radios = ZidanForm.fields.find(f => f.kind === 'radio-group' && host.current.contains(f.root));
    radios?.onChange = ({ value }) => setPlan(value);

    return () => {
      ZidanForm.fields
        .filter(f => host.current?.contains(f.el))
        .forEach(f => f.destroy());
      ZidanSelect.instances
        .filter(s => host.current?.contains(s.el))
        .forEach(s => s.destroy());
    };
  }, []);

  useEffect(() => {
    const radios = ZidanForm.fields.find(f => f.kind === 'radio-group');
    if (radios && radios.getValue() !== plan) radios.setValue(plan);
  }, [plan]);

  return (
    <form ref={host}>
      <input name="email" data-zidan="input" data-zidan-label="Email" required />
      <fieldset data-zidan="radio-group" data-zidan-variant="inline">
        <legend>Plan</legend>
        <label><input type="radio" name="plan" value="pro" defaultChecked /> Pro</label>
        <label><input type="radio" name="plan" value="basic" /> Basic</label>
      </fieldset>
    </form>
  );
}
```

React re-renders can be blocked by `key` changes: when the markup changes structurally,
destroy in the effect cleanup and recreate in the next effect (the cleanup above runs before
the DOM is removed).

## Next.js (App Router)

- Import the CSS in `app/layout.js` or `app/globals.css`.
- Keep the component `'use client'`; the library touches `document`.
- `zidan-form.js` / `zidan-form.mjs` are safe to import during SSR (no DOM is touched at
  import time), but initialise only in `useEffect`.

```js
// app/layout.js
import 'zidan-select/css/core';
import 'zidan-select/css/theme';
```

```jsx
'use client';
import { useEffect, useRef } from 'react';
import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';

export default function CheckoutForm() {
  const ref = useRef(null);

  useEffect(() => {
    initZidanSelects(ref.current);
    initZidanForms(ref.current);
    return () => {
      ZidanForm.fields.filter(f => ref.current?.contains(f.el)).forEach(f => f.destroy());
      ZidanSelect.instances.filter(s => ref.current?.contains(s.el)).forEach(s => s.destroy());
    };
  }, []);

  return <form ref={ref}>{/* data-zidan markup */}</form>;
}
```

If you need the library only in the browser:

```js
useEffect(() => {
  let api;
  import('zidan-select').then(mod => {
    api = mod;
    mod.initZidanForms(ref.current);
  });
  return () => api?.ZidanForm.destroyAll();
}, []);
```

Pages Router works the same; keep the form in a client component and avoid importing CSS
inside a server-only module.

## Vue 3

```vue
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

const host = ref(null);

onMounted(() => {
  initZidanSelects(host.value);
  initZidanForms(host.value);
});

onBeforeUnmount(() => {
  ZidanForm.fields
    .filter(field => host.value?.contains(field.el))
    .forEach(field => field.destroy());
  ZidanSelect.instances
    .filter(instance => host.value?.contains(instance.el))
    .forEach(instance => instance.destroy());
});
</script>

<template>
  <form ref="host">
    <input name="email" data-zidan="input" data-zidan-label="Email" />
    <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
      <option>France</option>
    </select>
  </form>
</template>
```

For two-way binding, read `zidan:change` in `onMounted`:

```js
host.value.addEventListener('zidan:change', event => {
  model.value = event.detail.value;
});
```

and push back with `field.setValue(model.value)` in a `watch()`.

## Angular

```ts
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';

@Component({ selector: 'app-profile', templateUrl: './profile.component.html' })
export class ProfileComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLFormElement>;

  ngAfterViewInit() {
    initZidanSelects(this.host.nativeElement);
    initZidanForms(this.host.nativeElement);
  }

  ngOnDestroy() {
    ZidanForm.fields
      .filter(field => this.host.nativeElement.contains(field.el))
      .forEach(field => field.destroy());
    ZidanSelect.instances
      .filter(instance => this.host.nativeElement.contains(instance.el))
      .forEach(instance => instance.destroy());
  }
}
```

Angular strips unknown attributes from templates only when using property binding; plain
`data-zidan` attributes render normally. With reactive forms, the native control still carries
the value, so `FormControl` continues to receive `input`/`change` events. For a custom
`ControlValueAccessor`, call `field.setValue(value)` in `writeValue()` and `onChange` from the
field's `onChange` callback.

## CSS frameworks

Set the adapter once — on the form, a wrapper or `<html>`:

```html
<form data-zs-framework="bootstrap" data-zs-theme="default">
```

| Adapter | What changes |
| --- | --- |
| `none` / `vanilla` | Plugin's own tokens. |
| `bootstrap` | Maps `--bs-*` colours/radius, `.form-control`/`.form-select` sizing, input-group corners, is-valid/is-invalid. |
| `tailwind` | Slate/indigo palette, 0.5rem radius, tighter shadows. |
| `bulma` | `--bulma-*` palette, 4px radius, Bulma shadow. |
| `foundation` | Square corners, Foundation blue, `#cacaca` borders. |

Bootstrap 5 example:

```html
<div class="input-group">
  <span class="input-group-text">@</span>
  <select class="form-select" data-zidan-select="combobox" data-zs-framework="bootstrap">…</select>
</div>
```

Tailwind users can still pass utility strings through the select's `customClasses`:

```js
zidanSelect('#tags', {
  customClasses: { control: 'shadow-sm ring-1 ring-slate-200', root: 'max-w-md' }
});
```

## State-sync rules of thumb

| Need | API |
| --- | --- |
| External value → control | `setValue()` (select/field/radio), `setIndeterminate()`, `clear()` (file) |
| Control → state | `onChange` callback or `zidan:change` event |
| Re-render with same instances | `update()` / `ZidanForm.refresh(scope)` |
| New nodes from a list re-render | `ZidanForm.observe(scope)` — additions/removals inside the scope; call `destroy()` first when removing the scope itself |
| Unmount | `destroy()`, or `ZidanForm.destroyAll()` for a page |
| Programmatic validation | `setValidation('valid' \| 'invalid' \| null)` |
