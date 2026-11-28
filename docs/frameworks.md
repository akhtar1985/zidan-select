# Framework integration

ZidanForm is framework-agnostic: it enhances native form controls and never replaces the
framework's state. There is no React/Vue/Svelte component package to keep in sync. Every
integration follows the same four-step contract:

1. initialise after the DOM exists (mounted, hydrated or `ngAfterViewInit`),
2. push external state down with `setValue()`, `setIndeterminate()` or `setPhoneCountry()`,
3. read user changes from `onChange`, `zidan:change` or the native `change` event,
4. tear down with `destroy()` before the framework removes the nodes.

The sections below cover React 18/19, Next.js App and Pages Router, Vue 3/Nuxt, Svelte 5 and
SvelteKit, Angular standalone/reactive forms/SSR, plus shared lifecycle, events, upload and
validation patterns. CSS-framework adapters (Bootstrap, Tailwind, Bulma, Foundation) are a
separate feature; see [CSS frameworks are separate](#css-frameworks-are-separate).

## Contents

- [Install once](#install-once)
- [The shared mount contract](#the-shared-mount-contract)
- [State, events and cleanup](#state-events-and-cleanup)
- [Forms, validation and uploads](#forms-validation-and-uploads)
- [React](#react)
- [Next.js](#nextjs)
- [Vue 3](#vue-3)
- [Svelte](#svelte)
- [Angular](#angular)
- [SSR and hydration matrix](#ssr-and-hydration-matrix)
- [TypeScript](#typescript)
- [CSS frameworks are separate](#css-frameworks-are-separate)
- [Troubleshooting](#troubleshooting)

## Install once

~~~bash
npm install zidan-select
~~~

~~~js
import { ZidanForm, ZidanSelect, zidanField, zidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';
~~~

For a page that only needs a select or only needs file uploads, import the smaller entry point
and its matching CSS:

~~~js
// select-only
import { zidanSelect, initZidanSelects } from 'zidan-select/select';
import 'zidan-select/select/css/core';
import 'zidan-select/select/css/theme';

// file-only
import { zidanField, initZidanForms } from 'zidan-select/file';
import 'zidan-select/file/css/core';
import 'zidan-select/file/css/theme';
~~~

The package also ships minified entries and browser globals. [build.md](build.md) lists every
CDN and npm path. The examples below use the full bundle unless a snippet says otherwise.

## The shared mount contract

Initialise selects first (a field may contain a native select), then fields. Return one cleanup
that only touches this subtree.

~~~js
import { ZidanForm, initZidanForms, initZidanSelects } from 'zidan-select';

export function mountZidan(root, options = {}) {
  const selects = initZidanSelects(root);
  const fields = initZidanForms(root, options);
  return {
    selects,
    fields,
    destroy: () => ZidanForm.destroy(root)
  };
}
~~~

`ZidanForm.destroy(root)` restores every field and select whose native control is inside
`root` and returns how many instances were removed. The other teardown helpers remain:

| Helper | Scope | Use it for |
| --- | --- | --- |
| `field.destroy()` / `select.destroy()` | one instance | A component that owns exactly one control. |
| `ZidanForm.destroy(root)` | a subtree | React effect cleanup, Vue unmount, Svelte action, Angular `ngOnDestroy`, a modal or route panel. |
| `ZidanSelect.destroy(root)` | selects only | Select-only pages and custom select wrappers. |
| `ZidanForm.destroyAll()` | whole document | Leaving a page or a legacy integration. |
| `ZidanForm.observe(root)` | future nodes | A long-lived page whose framework appends/removes controls. |

`ZidanForm.destroy()` with no argument means the whole document, like `destroyAll()`, but it
returns a count instead of the `ZidanForm` object. Calling it twice is safe; already restored
controls are simply not counted again.

## State, events and cleanup

The native control is the source of truth. The plugin only owns the visible chrome, so
`FormData`, `form.reset()`, `required`, `:invalid`, browser autofill and framework form
libraries keep working without a hidden mirror.

| Need | API |
| --- | --- |
| Read a field/select value | `getValue()`, `getFiles()`, `getUploadState()` |
| Write an external value | `setValue(value, { silent: true })` for select/field/radio/range |
| Step or phone-specific state | `stepUp()`, `stepDown()`, `setPhoneCountry()`, `setPhoneFormat()` |
| File selection | `addFiles()`, `replaceFiles()`, `removeFile()`, `removeFiles()` |
| Start/cancel uploads | `uploadAll()`, `uploadFile()`, `cancelUpload()`, `cancelAll()`, `retryUpload()`, `retryAll()` |
| Wait for the queue | `await field.whenUploaded()` |
| Validation state | `setValidation('valid' \| 'invalid' \| null)` |
| Re-sync native attributes | `update()`; full re-render with `refresh()` |
| New nodes appended by the UI | `ZidanForm.observe(root)` or call the init functions again |

Use `{ silent: true }` when state is pushed *from* the framework. It updates the native control
and the rendered chrome without firing `zidan:change`/calling `onChange`, so a two-way binding
does not echo the same value back.

| Event | Detail |
| --- | --- |
| `zidan:change` | `{ instance, kind, value }`, `{ checked }` or `{ files }` |
| `zidan:validation` | `{ instance, state, message? }` |
| `zidan:async-validation` | `{ valid, message }` when a Promise rule settles |
| `zidan:upload-start` / `-progress` / `-success` / `-error` / `-cancel` | File, progress, result or error payload |
| `zidan:upload-queued` / `zidan:upload-retry` | Queue position or retry attempt/delay |
| `zidan:select` / `zidan:remove` / `zidan:clear` | Selection and file/field clearing |
| `zidan:load-more` | `{ page, query }` for remote select pagination |
| `zidan:step`, `zidan:phone-country`, `zidan:phone-format`, `zidan:picker` | Specialised control events |
| `zidan:init` / `zidan:destroy` / `zidan:error` | Lifecycle and caught callback/upload errors |

All events bubble from the enhanced root, so one listener on the form can handle a whole
subtree:

~~~js
const onChange = event => {
  if (event.target.name === 'plan') plan.value = event.detail.value;
};
root.addEventListener('zidan:change', onChange);
// cleanup
root.removeEventListener('zidan:change', onChange);
~~~

## Forms, validation and uploads

Use `ZidanForm.serialize()` for a plain object and `ZidanForm.validate()` when every enhanced
rule plus native constraints should run before submit.

~~~js
const data = ZidanForm.serialize(form);
if (await ZidanForm.validate(form)) {
  await fetch('/api/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}
~~~

File uploads use the same instance in every framework:

~~~js
const field = zidanField('#docs', {
  variant: 'dropzone',
  maxFiles: 4,
  uploadUrl: '/api/files',
  uploadField: 'file',
  uploadMethod: 'POST',
  uploadHeaders: { 'X-Requested-With': 'ZidanForm' },
  onUploadProgress: ({ file, progress }) => {
    console.log(file.name, progress + '%');
  }
});

await field.uploadAll();
const states = await field.whenUploaded();
console.log(states.filter(state => state.status === 'done').length, 'uploaded');
~~~

Use a custom `upload(file, context)` handler when the server needs a completely custom
request. `context.signal` aborts with `cancelUpload()`; call `context.complete(result)` or
`context.fail(error)` when the request settles. The complete option list is in
[options.md](options.md#file-upload-variants-uploading-and-rendering).

## React

React must not re-render the enhanced native subtree while the plugin owns it. Keep the markup
stable, initialise in `useEffect`, and capture the root before returning cleanup.

~~~jsx
import { useEffect, useRef, useState } from 'react';
import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

export default function ProfileForm() {
  const host = useRef(null);
  const [plan, setPlan] = useState('pro');
  const [country, setCountry] = useState('France');

  useEffect(() => {
    const root = host.current;
    if (!root) return undefined;

    initZidanSelects(root);
    initZidanForms(root, {
      onChange: ({ instance, value }) => {
        if (instance.kind === 'radio-group') setPlan(value);
      }
    });

    const onChange = event => {
      if (event.target.name === 'country') setCountry(event.detail.value);
    };
    root.addEventListener('zidan:change', onChange);

    return () => {
      root.removeEventListener('zidan:change', onChange);
      ZidanForm.destroy(root);
    };
  }, []);

  useEffect(() => {
    const select = host.current && ZidanSelect.instances.find(
      item => item.el.getAttribute('name') === 'country'
    );
    if (select && select.getValue() !== country) select.setValue(country, { silent: true });
  }, [country]);

  return (
    <form ref={host}>
      <input name="email" data-zidan="input" data-zidan-label="Email" required />
      <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
        <option>France</option>
        <option>Germany</option>
        <option>Japan</option>
      </select>
      <fieldset data-zidan="radio-group" data-zidan-variant="inline">
        <legend>Plan</legend>
        <label><input type="radio" name="plan" value="pro" defaultChecked /> Pro</label>
        <label><input type="radio" name="plan" value="basic" /> Basic</label>
      </fieldset>
    </form>
  );
}
~~~

Key rules:

- Use `defaultValue`/`defaultChecked` on controls the plugin enhances. A React `value` prop that
  changes on every keystroke fights the plugin; push changes with `setValue()` instead.
- A changing `key` destroys and recreates the DOM. That is fine, but the effect must run again
  for the new subtree; do not reuse the old instance.
- React StrictMode runs effect setup/cleanup twice in development. Scoped `destroy()` plus fresh
  init on the second setup makes this safe.
- React Hook Form's `register()` works for ordinary fields because the native control still
  emits `change`. For a select whose value is changed by code, call the instance `setValue()`
  and the form library's `setValue()` together.
- Memoise an options object passed to a custom hook; an inline object in the dependency array
  re-initialises every render.

A reusable hook with stable callbacks:

~~~jsx
import { useEffect, useRef } from 'react';
import { ZidanForm, initZidanForms, initZidanSelects } from 'zidan-select';

export function useZidanForm(options = {}) {
  const ref = useRef(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    initZidanSelects(root);
    initZidanForms(root, optionsRef.current);
    return () => ZidanForm.destroy(root);
  }, []);

  return ref;
}
~~~

The ref keeps callbacks current without re-initialising. If the *markup* changes, key the
component and let the effect run for the new root.

## Next.js

Next.js is React plus a server/client boundary. Only the component that touches the DOM needs
`'use client'`; the page can stay a server component.

### App Router

Put the stylesheets in the root layout, before the component renders:

~~~js
// app/layout.js
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
~~~

~~~jsx
// app/contact/contact-form.js
'use client';

import { useEffect, useRef } from 'react';
import { ZidanForm, initZidanForms, initZidanSelects } from 'zidan-select';

export default function ContactForm() {
  const host = useRef(null);

  useEffect(() => {
    const root = host.current;
    if (!root) return undefined;
    initZidanSelects(root);
    initZidanForms(root);
    return () => ZidanForm.destroy(root);
  }, []);

  return (
    <form ref={host}>
      <input name="email" type="email" data-zidan="input" required />
      <select name="topic" data-zidan-select="combobox" data-zidan-label="Topic">
        <option>Sales</option>
        <option>Support</option>
      </select>
    </form>
  );
}
~~~

~~~jsx
// app/contact/page.js (server component)
import ContactForm from './contact-form';

export default function ContactPage() {
  return <main><h1>Contact</h1><ContactForm /></main>;
}
~~~

The package is safe to import during SSR: it does not touch `document` at module load time.
Initialisation belongs in `useEffect` or a dynamic import. Never call `zidanField()` or
`zidanSelect()` in a server component.

For a component that should never render on the server:

~~~jsx
// app/contact/contact-form-loader.js
'use client';
import dynamic from 'next/dynamic';

const ContactForm = dynamic(() => import('./contact-form'), { ssr: false });

export default function ContactFormLoader() {
  return <ContactForm />;
}
~~~

`ssr: false` is allowed only inside a client component in the App Router. ZidanForm itself only
needs the browser in an effect, so this is usually not required.

### Pages Router

`pages/_app.js` is the right place for the CSS imports:

~~~js
// pages/_app.js
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
~~~

The component example above works unchanged under `pages/`; keep it mounted on the client and
initialise in `useEffect`.

### Upload route handler

~~~js
// app/api/files/route.js
export async function POST(request) {
  const data = await request.formData();
  const file = data.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing file' }, { status: 400 });
  }
  // save the file, then return what uploadResponsePath expects
  return Response.json({ url: '/uploads/' + encodeURIComponent(file.name) });
}
~~~

Pair it with `uploadUrl: '/api/files', uploadResponsePath: 'url'`. The browser sends the
multipart body; do not add a JSON `Content-Type` header by hand.

### Hydration checklist

- Keep server-rendered markup identical to the first client render. The plugin adds chrome in an
  effect, after hydration.
- Do not branch markup on `typeof window` during render; use an effect or `next/dynamic`.
- Import CSS once in the root layout/`_app`, not in every form component.
- If client navigation unmounts the form, the effect cleanup must call
  `ZidanForm.destroy(root)`.

## Vue 3

Use `onMounted` for initialisation, `onBeforeUnmount` for cleanup and `watch` for external model
changes. The native select remains the form value; the instance is the presentation layer.

~~~vue
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

const host = ref(null);
const country = ref('France');
const plan = ref('pro');
let select;
let root;

const onChange = event => {
  if (event.target.name === 'country') country.value = event.detail.value;
  if (event.target.name === 'plan') plan.value = event.detail.value;
};

onMounted(() => {
  root = host.value;
  initZidanSelects(root);
  initZidanForms(root, {
    onChange: ({ instance, value }) => {
      if (instance.kind === 'radio-group') plan.value = value;
    }
  });
  select = ZidanSelect.get(root.querySelector('select[name="country"]'));
  root.addEventListener('zidan:change', onChange);
});

watch(country, value => {
  if (select && select.getValue() !== value) select.setValue(value, { silent: true });
});

onBeforeUnmount(() => {
  if (root) {
    root.removeEventListener('zidan:change', onChange);
    ZidanForm.destroy(root);
  }
});
</script>

<template>
  <form ref="host">
    <input name="email" type="email" data-zidan="input" data-zidan-label="Email" required />
    <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
      <option>France</option>
      <option>Germany</option>
      <option>Japan</option>
    </select>
    <fieldset name="plan" data-zidan="radio-group" data-zidan-variant="inline">
      <legend>Plan</legend>
      <label><input v-model="plan" type="radio" name="plan" value="pro" /> Pro</label>
      <label><input v-model="plan" type="radio" name="plan" value="basic" /> Basic</label>
    </fieldset>
  </form>
</template>
~~~

`v-model` on the radios is safe because the plugin does not replace the radio inputs. For the
select, do **not** bind `:value` directly after initialisation; use the `watch()` plus
`setValue()` pattern above. If you use `v-model` on a native select in a wrapper, listen for the
native `change` event as usual and mirror it into the instance only when another source changes
it.

### Nuxt

Nuxt renders the component on the server first. Keep the same markup and initialise in
`onMounted`, which only runs in the browser:

~~~js
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['zidan-select/css/core', 'zidan-select/css/theme']
});
~~~

~~~vue
<template>
  <ClientOnly>
    <ProfileForm />
  </ClientOnly>
</template>
~~~

`<ClientOnly>` is optional for ZidanForm itself because `onMounted` is already browser-only.
Use it when a parent renders a different structure on server and client, or when a third-party
plugin reads `window` during render. In code, use `import.meta.client` rather than
`typeof window` in a template.

### Options API

The lifecycle is the same: `mounted()` runs after the template exists, `beforeUnmount()` runs
before Vue removes it. Capture `this.$refs.host` in a local variable for cleanup and call
`ZidanForm.destroy(root)`.

## Svelte

Actions are the cleanest fit: the action runs when the node mounts and its `destroy()` runs when
Svelte removes it.

~~~js
// lib/zidan.js
import { ZidanForm, initZidanForms, initZidanSelects } from 'zidan-select';

export function zidan(node, options = {}) {
  initZidanSelects(node);
  initZidanForms(node, options);

  return {
    destroy() {
      ZidanForm.destroy(node);
    }
  };
}
~~~

~~~svelte
<script>
  import { zidan } from '$lib/zidan.js';
  import 'zidan-select/css/core';
  import 'zidan-select/css/theme';
</script>

<form use:zidan>
  <input name="email" type="email" data-zidan="input" data-zidan-label="Email" required />
  <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
    <option>France</option>
    <option>Germany</option>
    <option>Japan</option>
  </select>
</form>
~~~

The action is intentionally init-only: it accepts options once and never re-initialises on a
re-render. For two-way state, use the runes example below or key the form when its structure
changes.

Svelte 5 runes with an explicit effect for external state:

~~~svelte
<script>
  import { onMount } from 'svelte';
  import { ZidanForm, ZidanSelect, initZidanForms, initZidanSelects } from 'zidan-select';

  let host;
  let country = $state('France');
  let select = $state(null);

  onMount(() => {
    initZidanSelects(host);
    initZidanForms(host);
    select = ZidanSelect.get(host.querySelector('select[name="country"]'));

    const onChange = event => {
      if (event.target.name === 'country') country = event.detail.value;
    };
    host.addEventListener('zidan:change', onChange);

    return () => {
      host.removeEventListener('zidan:change', onChange);
      ZidanForm.destroy(host);
    };
  });

  $effect(() => {
    if (select && select.getValue() !== country) {
      select.setValue(country, { silent: true });
    }
  });
</script>

<form bind:this={host}>
  <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
    <option>France</option>
    <option>Germany</option>
  </select>
</form>
~~~

Svelte 4 uses `onMount` and a store or reactive statement instead of `$state`/`$effect`. The
same cleanup contract applies.

### SvelteKit

- Import the CSS in `src/routes/+layout.svelte` (or a global stylesheet imported there).
- Initialise in `onMount`/`$effect`, never at module top level.
- Server-rendered form markup must match the first client render. The plugin adds chrome after
  mount, so hydration is unaffected.
- Use `import { browser } from '$app/environment'` when you need an explicit guard:

~~~js
import { browser } from '$app/environment';

$effect(() => {
  if (!browser) return;
  // safe to touch document here
});
~~~

- Do not wrap the enhanced form in `{#key}` on every keystroke; that destroys the instance.
  Key on a route/id, not on the form value.

## Angular

Angular's lifecycle maps directly to the contract: `ngAfterViewInit` after the template exists,
`ngOnDestroy` before Angular removes it.

~~~ts
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { ZidanForm, initZidanForms, initZidanSelects } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

@Component({
  selector: 'app-profile',
  standalone: true,
  templateUrl: './profile.component.html'
})
export class ProfileComponent implements AfterViewInit, OnDestroy {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLFormElement>;

  ngAfterViewInit(): void {
    const root = this.host.nativeElement;
    initZidanSelects(root);
    initZidanForms(root);
  }

  ngOnDestroy(): void {
    ZidanForm.destroy(this.host.nativeElement);
  }
}
~~~

~~~html
<form #host>
  <input name="email" type="email" data-zidan="input" data-zidan-label="Email" required />
  <select name="country" data-zidan-select="combobox" data-zidan-label="Country">
    <option>France</option>
    <option>Germany</option>
  </select>
</form>
~~~

Angular templates keep plain `data-zidan*` attributes. Angular only strips attributes when you
bind them as properties with an unknown name; static attributes render normally.

### Reactive forms and ControlValueAccessor

The native `<select>` still emits `change`, so a `FormControl` receives ordinary user selection
without a custom accessor. When code calls `patchValue()`/`setValue()`, Angular updates the
native control but the plugin's visible trigger does not know. Call the instance `setValue()` as
well, or wrap the control in a `ControlValueAccessor`.

A minimal accessor for a select:

~~~ts
import { AfterViewInit, Directive, ElementRef, forwardRef, inject, OnDestroy } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ZidanSelect, zidanSelect } from 'zidan-select';

@Directive({
  selector: 'select[data-zidan-select][formControlName], select[data-zidan-select][formControl]',
  standalone: true,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => ZidanSelectAccessor),
    multi: true
  }]
})
export class ZidanSelectAccessor implements AfterViewInit, OnDestroy, ControlValueAccessor {
  private host = inject<ElementRef<HTMLSelectElement>>(ElementRef);
  private instance?: ZidanSelect;
  private pending: string | null = null;
  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.instance = zidanSelect(this.host.nativeElement, {
      onChange: ({ value }) => {
        this.onChange((value as string) ?? null);
        this.onTouched();
      }
    }) as ZidanSelect;
    if (this.pending !== null) this.instance.setValue(this.pending, { silent: true });
  }

  writeValue(value: string | null): void {
    this.pending = value;
    if (this.instance) this.instance.setValue(value, { silent: true });
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    if (!this.instance) return;
    if (disabled) this.instance.disable();
    else this.instance.enable();
  }

  ngOnDestroy(): void {
    this.instance?.destroy();
  }
}
~~~

Import the directive in the standalone component and do not also run `initZidanSelects()` over
the same select. One owner per instance keeps teardown predictable.

For a **zoneless** Angular app, updates from plugin callbacks still work if they write signals.
If a callback updates a plain field rendered by the default change detector, wrap the UI update
in `NgZone.run()` or move the state into a signal.

### Angular SSR

Guard DOM work with the platform check:

~~~ts
import { AfterViewInit, Component, ElementRef, PLATFORM_ID, ViewChild, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ZidanForm, initZidanForms, initZidanSelects } from 'zidan-select';

@Component({ /* ... */ })
export class ProfileComponent implements AfterViewInit {
  @ViewChild('host', { static: true }) host!: ElementRef<HTMLElement>;
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    initZidanSelects(this.host.nativeElement);
    initZidanForms(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) ZidanForm.destroy(this.host.nativeElement);
  }
}
~~~

The server HTML contains the same native controls; the plugin's chrome appears after hydration.
Do not initialise in the constructor or a field initialiser.

## SSR and hydration matrix

| Framework | Initialise in | Cleanup | CSS entry point | SSR note |
| --- | --- | --- | --- | --- |
| React 18/19 | `useEffect` | effect cleanup, `ZidanForm.destroy(root)` | root entry/layout | Effects never run on the server. |
| Next.js App Router | client component `useEffect` | effect cleanup | `app/layout.js` | Page can stay a server component; dynamic `ssr:false` only in a client component. |
| Next.js Pages Router | `useEffect` | effect cleanup | `pages/_app.js` | Same browser-only lifecycle. |
| Vue 3 | `onMounted` | `onBeforeUnmount` | component or main entry | Use `setValue()` in a `watch`, not a template value binding. |
| Nuxt | `onMounted` | `onBeforeUnmount` | `nuxt.config.ts` `css` | Optional `<ClientOnly>` for client-only markup. |
| Svelte 5 | action or `onMount` | action `destroy`/mount cleanup | root layout/component | `$effect` must guard a null instance. |
| SvelteKit | `onMount`/`$effect` | returned cleanup | `+layout.svelte` | Use `browser` from `$app/environment` if needed. |
| Angular | `ngAfterViewInit` | `ngOnDestroy` | component or `styles.css` | Check `isPlatformBrowser` before DOM calls. |

## TypeScript

The package ships declarations for the full bundle and both subsets. Import the instance types
when you keep a reference in component state:

~~~ts
import type { FieldOptions, ZidanFieldBase, ZidanSelect } from 'zidan-select';
import { zidanField, zidanSelect } from 'zidan-select';

const options: FieldOptions = { label: 'Email', validate: value => String(value).includes('@') };
const field: ZidanFieldBase | null = zidanField('#email', options);
const select: ZidanSelect | ZidanSelect[] | null = zidanSelect('#country', { mode: 'combobox' });
~~~

`zidanSelect()` returns one instance for one match and an array for multiple matches. Use
`ZidanSelect.get(element)` when you need the instance attached to a native select, and
`ZidanForm.get(input)` for a field.

Events are typed too. `ZidanSelect#on()` narrows the handler for every `zidan:*` name, and the
DOM event map is augmented, so `addEventListener('zidan:change', …)` receives a `CustomEvent`
with the right detail. `ZidanEventMap`, `ZidanEventName`, `ZidanFormEventMap` and the per-event
detail interfaces are exported.

~~~ts
select.on('zidan:change', event => {
  const value = event.detail.value;   // string | string[] | null for selects
  const owner = event.detail.instance; // ZidanSelect
  void value; void owner;
});
field.root.addEventListener('zidan:validation', event => {
  const state = event.detail.state;    // 'valid' | 'invalid' | null | undefined
  void state;
});
~~~
The declarations cover the file queue: `getFileState()`, `removeFiles()`, `isUploading()`,
`whenUploaded()`, `setUploadUrl()`, `setUploadOptions()`, `retryAll()` and the upload/validation
options. See [options.md](options.md#instance-methods).

## CSS frameworks are separate

The JavaScript framework guides above are about component lifecycles. **CSS-framework
adapters** are a different feature: set the `framework` option (or `data-zs-framework` /
`data-zidan-framework`) to `bootstrap`, `tailwind`, `bulma`, `foundation` or `none` on a form or a
parent. `themeFramework` is a deprecated alias; `vanilla` behaves like `none`. They map tokens and
control sizing, not component state.

~~~html
<form data-zs-framework="bootstrap" data-zs-theme="default">
  <input class="form-control" name="email" data-zidan="input" />
  <select class="form-select" name="country" data-zidan-select="combobox">…</select>
</form>
~~~

Load the framework stylesheet first, then `plugin-core.css` and `plugin-theme.css`. File drops,
rows and action buttons also follow the selected adapter. The adapter table and token reference
live in [theming.md](theming.md).

## Troubleshooting

- **The control renders twice or callbacks run twice.** The subtree was initialised by both
  auto-init and an explicit call. Use one path; check `ZidanForm.get(input)` or
  `ZidanSelect.get(select)` before creating another instance.
- **The visible select does not follow state.** Native `select.value = ...` bypasses the plugin.
  Call the instance `setValue(value, { silent: true })`.
- **The page throws `document is not defined`.** Initialisation ran during SSR. Move it into
  `useEffect`/`onMounted`/action/`ngAfterViewInit` and guard with the platform check.
- **React warns about a controlled input.** Use `defaultValue`/`defaultChecked` for enhanced
  controls, or keep React state and push it through the instance.
- **Vue/Svelte updates do not reach the chrome.** The native element changed without an event.
  Call the instance setter after the framework writes the native value.
- **Styles are missing after a route change.** Import both CSS files once in the app shell; a
  component-scoped import can be applied after the first paint.
- **The old page still shows a dropdown after navigation.** Cleanup was not scoped to the removed
  subtree. Use `ZidanForm.destroy(root)` in the component's unmount hook.
- **Markup re-renders erase the plugin.** Keep the enhanced subtree stable; key it only when the
  structure really changes, and re-initialise in the next effect/hook.
- **A custom file upload never finishes.** Call `context.complete(result)` or
  `context.fail(error)`; returning a Promise is not enough unless the handler explicitly settles.

## What next

- Every option and data attribute: [options.md](options.md)
- Initialisation, precedence and upload pipeline: [advanced.html](../advanced.html)
- Validation library integration: [validation.md](validation.md)
- Themes, layouts and CSS adapters: [theming.md](theming.md)
- Build, subset and CDN paths: [build.md](build.md)
