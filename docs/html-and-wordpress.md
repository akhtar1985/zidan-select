# Static HTML & WordPress cookbook

Copy-paste recipes for hand-written HTML pages, WordPress sites and page builders. Every example
below is a **complete working page or block** — no build tools, no npm, no framework required.
If you only need the reference, see [Options & data attributes](options.md) and the
[JavaScript API](https://github.com/akhtar1985/zidan-select#javascript-api).

Contents:

1. [Pick the files first](#1-pick-the-files-first)
2. [Five ways to switch a control on](#2-five-ways-to-switch-a-control-on)
3. [Complete static page: full build](#3-complete-static-page-full-build)
4. [Complete select-only page](#4-complete-select-only-page)
5. [Complete file-only page](#5-complete-file-only-page)
6. [Enhance by ID or class from JavaScript](#6-enhance-by-id-or-class-from-javascript)
7. [WordPress](#7-wordpress)
8. [Other hosts and website builders](#8-other-hosts-and-website-builders)
9. [Shopify](#9-shopify)
10. [Copy-paste recipes](#10-copy-paste-recipes)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Pick the files first

Load **one** build per page. Each build is standalone; a subset is not an add-on to the full
bundle. Both CSS files are always needed: `plugin-core.css` carries layout and mechanics (no
colours), `plugin-theme.css` carries colours, presets and skins.

| Your page needs… | Load these files |
| --- | --- |
| Selects / combobox / tags only | `dist/select/zidan-select.js` + `plugin-select-core.css` + `plugin-select-theme.css` |
| File uploads only | `dist/file/zidan-file.js` + `plugin-file-core.css` + `plugin-file-theme.css` |
| Several control types together | `zidan-form.js` + `plugin-core.css` + `plugin-theme.css` |

Pinned CDN URLs (replace `2.6.0` when you upgrade):

| Build | JavaScript | CSS |
| --- | --- | --- |
| Full | `https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/zidan-form.js` | `…@2.6.0/plugin-core.css` + `…@2.6.0/plugin-theme.css` |
| Select-only | `https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/select/zidan-select.js` | `…@2.6.0/dist/select/plugin-select-core.css` + `…plugin-select-theme.css` |
| File-only | `https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/file/zidan-file.js` | `…@2.6.0/dist/file/plugin-file-core.css` + `…plugin-file-theme.css` |

Prefer self-hosting? Download the same files (`npm pack zidan-select@2.6.0`, or the raw files
from GitHub) and keep them next to your page:

```
my-site/
├─ index.html
└─ assets/zidan/
   ├─ zidan-form.js
   ├─ plugin-core.css
   └─ plugin-theme.css
```

Then use relative paths: `assets/zidan/plugin-core.css`. `.min` copies exist inside `dist/`
(`dist/zidan-form.min.js`, `dist/plugin-core.min.css`, `dist/plugin-theme.min.css`) if you
prefer minified files.

> **Never load the full build and a subset on the same page.** The second copy is ignored
> (the library keeps the first initialised instance), and you would not get the API you expect.

---

## 2. Five ways to switch a control on

Nothing is touched unless it opts in. Pick the one that matches your situation.

| Situation | What to use | Where it runs |
| --- | --- | --- |
| You control the markup and want **zero JavaScript** | `data-zidan*` attributes and marker classes | Automatic, on `DOMContentLoaded` |
| Enhance **every select and file input** inside one form | `<form class="zidan-form">` (or `data-zidan-form`) | Automatic |
| You only have **IDs or classes** (CMS, page builder) | `window.ZIDAN_FORM_CONFIG` targets | Automatic, before the script |
| Enhance **one specific field** | `zidanSelect('#id', {…})` / `zidanField('#id', {…})` | Your own `<script>` |
| Page content is **rendered later** (AJAX, SPA, builder) | `ZidanForm.refresh(scope)` or `ZidanForm.observe(scope)` | Your own `<script>` |

### 2a. Attributes and marker classes (no JavaScript)

```html
<select name="country" class="zidan-select"
        data-zidan-options='{"mode":"combobox","placeholder":"Search a country…"}'>…</select>

<select name="tags" class="zidan-select" multiple
        data-zidan-options='{"mode":"tags","maxTags":3}'>…</select>

<input type="text" class="zidan-field" data-zidan-icon="mail" data-zidan-clear>
<input type="file" class="zidan-field" data-zidan-options='{"variant":"dropzone"}'>
<input type="checkbox" class="zidan-field" data-zidan-variant="switch">
```

`data-zidan="select"` works the same as the `zidan-select` class, and
`data-zidan="checkbox|file|input|textarea|radio-group"` works the same as `zidan-field`.
The JSON attribute carries any literal option; callbacks and upload functions need a small JS
block instead.

### 2b. Form scope

```html
<form class="zidan-form" method="post">
  <!-- every <select> and every <input type="file"> here is enhanced, marked or not -->
  <select name="plan">…</select>
  <input type="file" name="cv" accept=".pdf">
  <!-- other inputs still need an attribute or the zidan-field class -->
  <input type="email" name="email" data-zidan="input">
</form>
```

### 2c. Config targets by ID or class (no inline `zidanSelect` call)

Define the config **before** the library script. IDs, classes and full selectors are accepted:

```html
<script>
  window.ZIDAN_FORM_CONFIG = {
    targets: ['#country', 'select.product-variants',
              { selector: '#brands', options: { mode: 'tags', maxTags: 3 } }],
    fieldTargets: [
      { selector: '#email', options: { icon: 'mail', clearable: true } },
      { selector: '#avatar', options: { variant: 'avatar' } }
    ],
    formTargets: ['#checkout']
  };
</script>
<script src="assets/zidan/zidan-form.js"></script>
```

### 2d. Direct call by ID or class

```html
<select id="country">…</select>
<select class="product-select">…</select>

<script src="assets/zidan/zidan-form.js"></script>
<script>
  // one select by ID
  var country = zidanSelect('#country', { mode: 'combobox', placeholder: 'Search…' });

  // every select with that class (returns an array when several match)
  var products = zidanSelect('.product-select', { mode: 'select', clearable: true });

  // a plain input with JS-only options
  zidanField('#email', { icon: 'mail', clearable: true, counter: 80 });
</script>
```

### 2e. Content rendered after page load

```html
<script src="assets/zidan/zidan-form.js"></script>
<script>
  // after injecting new markup: pass the element, not a selector
  var scope = document.querySelector('#checkout');
  ZidanForm.refresh(scope);            // enhance new nodes + update existing ones

  // or keep a container in sync automatically:
  ZidanForm.observe(scope);            // MutationObserver; destroys removed instances
</script>
```

---

## 3. Complete static page: full build

Save this as `index.html` and open it in a browser (double-clicking the file works). Every
control is enhanced automatically; the script at the bottom only pretends to submit so you can
see the native `FormData`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ZidanForm static example</title>

  <!-- structure first, theme second -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/plugin-core.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/plugin-theme.css">
</head>
<body>

  <main style="max-width:560px;margin:40px auto;padding:0 20px">
    <h1>Booking request</h1>

    <form class="zidan-form" method="post" action="/thanks.html">
      <p>
        <label for="country">Country</label>
        <select id="country" name="country" required data-zidan-select="combobox">
          <option value="">Choose a country…</option>
          <option>United Kingdom</option>
          <option>United States</option>
          <option>Japan</option>
        </select>
      </p>

      <p>
        <label for="email">Email</label>
        <input id="email" type="email" name="email" required
               data-zidan="input" data-zidan-auto-icon="true" data-zidan-clear>
      </p>

      <p>
        <label for="phone">Phone</label>
        <input id="phone" type="tel" name="phone"
               data-zidan="input" data-zidan-phone="true"
               data-zidan-phone-country="GB" data-zidan-phone-format="international">
      </p>

      <p>
        <label for="guests">Guests</label>
        <input id="guests" type="number" name="guests" min="1" max="8" value="2"
               data-zidan="input" data-zidan-stepper="stacked">
      </p>

      <p>
        <label for="budget">Budget</label>
        <input id="budget" type="range" name="budget" min="0" max="1000" step="50" value="500"
               data-zidan="input" data-zidan-output="#budget-out">
        <output id="budget-out">500</output>
      </p>

      <p>
        <label>
          <input type="checkbox" name="news" value="yes"
                 data-zidan="checkbox" data-zidan-variant="switch"
                 data-zidan-label="Email me offers">
        </label>
      </p>

      <fieldset data-zidan="radio-group" data-zidan-variant="inline">
        <legend>Contact preference</legend>
        <label><input type="radio" name="contact" value="email" checked> Email</label>
        <label><input type="radio" name="contact" value="phone"> Phone</label>
      </fieldset>

      <p>
        <label for="message">Message</label>
        <textarea id="message" name="message" rows="4" maxlength="300"
                  data-zidan="textarea" data-zidan-counter="300"></textarea>
      </p>

      <p>
        <label for="docs">Documents</label>
        <input id="docs" type="file" name="docs" multiple accept="image/*,.pdf"
               data-zidan="file" data-zidan-max-files="3" data-zidan-max-size-mb="5"
               data-zidan-title="Drop files here"
               data-zidan-simulate-upload="true">
      </p>

      <button type="submit">Send request</button>
    </form>
  </main>

  <script src="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/zidan-form.js"></script>
  <script>
    // Demo only: show the native FormData instead of navigating away.
    document.querySelector('.zidan-form').addEventListener('submit', function (event) {
      event.preventDefault();                     // remove this line to post for real
      var data = new FormData(event.currentTarget);
      console.log(Array.from(data.entries()));
      alert('Captured ' + Array.from(data.keys()).length + ' fields — see the console.');
    });
  </script>
</body>
</html>
```

What is happening:

- `class="zidan-form"` enhances the two selects and any file input inside; the other controls
  carry `data-zidan` attributes or the `zidan-field` class.
- `data-zidan-simulate-upload="true"` fakes progress so the upload UI works with no server.
  Point `data-zidan-upload-url="/upload"` at a real endpoint when you have one.
- No JS call is needed for enhancement; the script's auto-init runs once when the page is parsed.
- `required` still blocks an empty submit, and the posted `FormData` contains the real values.

---

## 4. Complete select-only page

Only selects on this page? Load the trimmed build. It exposes `zidanSelect`, `initZidanSelects`
and `ZidanSelect`; `zidanField` does not exist here.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Select-only example</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/select/plugin-select-core.css">
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/select/plugin-select-theme.css">
</head>
<body style="max-width:520px;margin:40px auto;padding:0 20px">

  <label for="country">Country</label>
  <select id="country" name="country">
    <option value="">Choose…</option>
    <option>France</option>
    <option>Germany</option>
    <option>Japan</option>
  </select>

  <p>
    <label for="sku">Product</label>
    <select id="sku" name="sku">
      <option value="basic">Basic</option>
      <option value="pro">Pro</option>
    </select>
  </p>

  <script src="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/select/zidan-select.js"></script>
  <script>
    zidanSelect('#country', {
      mode: 'combobox',
      placeholder: 'Search a country…',
      clearable: true
    });
    zidanSelect('#sku', { mode: 'select', layout: 'soft-pill' });
  </script>
</body>
</html>
```

Class-based auto-init also works without any call:
`<select class="zidan-select">` is enhanced on load by the same build.

---

## 5. Complete file-only page

Only uploads on this page? Load the file-only build. It exposes `zidanField`,
`initZidanForms` and the field classes; `zidanSelect` / `initZidanSelects` do not exist here.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>File upload example</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/file/plugin-file-core.css">
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/file/plugin-file-theme.css">
</head>
<body style="max-width:520px;margin:40px auto;padding:0 20px">

  <form id="app" method="post">
    <label for="cv">CV (PDF, max 5 MB)</label>
    <input id="cv" type="file" name="cv" accept=".pdf">

    <label for="shots">Screenshots</label>
    <input id="shots" type="file" name="shots" multiple accept="image/*">
  </form>

  <script src="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/dist/file/zidan-file.js"></script>
  <script>
    zidanField('#cv', {
      variant: 'dropzone',
      title: 'Drop your CV here',
      maxFiles: 1,
      maxSizeMB: 5,
      simulateUpload: true        // demo progress; use uploadUrl or upload() for real uploads
    });

    zidanField('#shots', { variant: 'gallery', maxFiles: 6 });
  </script>
</body>
</html>
```

Real upload endpoint instead of the fake progress:

```js
zidanField('#cv', {
  uploadUrl: '/upload.php',     // XHR multipart, one request per file
  maxFiles: 1,
  maxSizeMB: 5
});
```

---

## 6. Enhance by ID or class from JavaScript

`zidanSelect()` and `zidanField()` both accept a CSS selector, an element, or a NodeList.
A selector that matches once returns an instance; several matches return an array.

```html
<!-- selects -->
<select id="country">…</select>
<select class="variant-select" data-sku="a1">…</select>
<select class="variant-select" data-sku="b2">…</select>

<!-- fields -->
<input id="email" type="email">
<fieldset id="delivery">
  <legend>Delivery</legend>
  <label><input type="radio" name="delivery" value="home" checked> Home</label>
  <label><input type="radio" name="delivery" value="locker"> Locker</label>
</fieldset>
```

```js
// by ID
zidanSelect('#country', { mode: 'combobox' });

// by class — returns an array when there is more than one match
var variants = zidanSelect('.variant-select', { layout: 'floating-label' });

// a radio group must be attached to its <fieldset>
zidanField('#delivery', { variant: 'tile' });

// read values later; the native controls always hold the truth
ZidanSelect.get('#country').getValue();
ZidanForm.get('#email').getValue();
document.querySelector('#email').value;
```

If the script sits in `<head>`, wait for the DOM (or use `defer`):

```html
<script src="assets/zidan/zidan-form.js" defer></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    zidanSelect('#country', { mode: 'tags' });
  });
</script>
```

If the markup is injected later (AJAX, modal, template engine), call one of:

```js
ZidanForm.init(scope);        // enhance anything new inside scope
ZidanForm.refresh(scope);     // enhance + update sizes of existing instances
ZidanForm.observe(scope);     // keep watching a container automatically
```

Each of these takes an **element** (`document.querySelector('#checkout')`), not a selector
string. For a page-wide pass use `document.body`.

---

## 7. WordPress

WordPress needs two things: the four files reachable from the browser, and a block/template
with the markup. Use a **child theme** (or a tiny must-use plugin) so theme updates do not wipe
the files.

### 7a. Put the files in place

Upload with FTP/SFTP or the hosting file manager:

```
wp-content/themes/your-child-theme/
└─ assets/zidan/
   ├─ zidan-form.js
   ├─ plugin-core.css
   └─ plugin-theme.css
```

### 7b. Enqueue them from `functions.php`

```php
<?php
// wp-content/themes/your-child-theme/functions.php
add_action('wp_enqueue_scripts', function () {
    // Load only on the pages that contain the form.
    if (!is_page(array('contact', 'get-a-quote'))) {
        return;
    }

    $base = get_stylesheet_directory_uri() . '/assets/zidan';

    wp_enqueue_style('zidan-core', $base . '/plugin-core.css', array(), '2.6.0');
    wp_enqueue_style('zidan-theme', $base . '/plugin-theme.css', array('zidan-core'), '2.6.0');
    wp_enqueue_script('zidan-form', $base . '/zidan-form.js', array(), '2.6.0', true);

    // Optional: configure fields by ID/class without inline HTML scripts.
    wp_add_inline_script('zidan-form', "window.ZIDAN_FORM_CONFIG = {
        targets: ['#country'],
        fieldTargets: [
            { selector: '#email', options: { icon: 'mail', clearable: true } }
        ]
    };", 'before');
});
```

Prefer a CDN? Replace the three `$base . '…'` URLs with the pinned jsDelivr URLs from
[section 1](#1-pick-the-files-first); the enqueue calls stay the same.

### 7c. Add the form markup

Paste this into a **Custom HTML block** (Gutenberg) or an Elementor **HTML widget**:

```html
<form class="zidan-form" method="post" action="/contact-thanks/">
  <label for="country">Country</label>
  <select id="country" name="country" required>
    <option value="">Choose…</option>
    <option>United Kingdom</option>
    <option>Germany</option>
  </select>

  <label for="email">Email</label>
  <input id="email" type="email" name="email" required data-zidan="input">

  <label for="cv">CV</label>
  <input id="cv" type="file" name="cv" accept=".pdf"
         data-zidan="file" data-zidan-max-size-mb="5">

  <button type="submit">Send</button>
</form>
```

`class="zidan-form"` is enough to enhance the select and the file input; the email input needs
its `data-zidan="input"` attribute. No script goes into the page itself — the enqueued file
auto-initialises.

### 7d. WordPress caveats

- **Plugin/theme already loads ZidanForm?** Do not enqueue a second copy. The guard keeps the
  first one, but duplicate files double the download.
- **Caching/optimisation plugins** (Autoptimize, WP Rocket, LiteSpeed) may combine or defer the
  script. If nothing is enhanced, check the page source for `zidan-form`; exclude the three
  files from combination/minification while debugging.
- **Contact Form 7 / Gravity Forms / WPForms** generate their own markup and CSS. ZidanForm can
  lift selects inside those forms with `formTargets: ['#their-form-id']`, but visual conflicts
  are likely; test one form before applying it site-wide.
- **Page builders** usually preserve `data-*` attributes. If a builder strips them, keep the
  element IDs and initialise through `ZIDAN_FORM_CONFIG.targets` instead.
- **CSS order**: framework CSS → `plugin-core.css` → `plugin-theme.css` → child-theme overrides.
  On Bootstrap/Tailwind sites also set `data-zidan-framework="bootstrap"` (or `"tailwind"`) on
  `<html>` or the form.

---

## 8. Other hosts and website builders

**Netlify, Vercel, GitHub Pages, plain shared hosting** — nothing special: keep the HTML and
`assets/zidan/` in the same folder tree and use relative paths, exactly as in section 3.

**Blogger, Squarespace, Wix, Webflow** — add the `<script src>` and
CSS links inside their "code injection" area (site-wide) or a single embed block, then place the
markup in the page. If the platform only allows one embed block, put the `<script src>` call
**after** the markup in that same block; a `<script>` tag in an embed runs normally.
Shopify has its own section: [9. Shopify](#9-shopify).

```html
<!-- inside one embed block: markup first, script last -->
<select class="zidan-select" data-zidan-options='{"mode":"combobox"}'>…</select>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/plugin-core.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/plugin-theme.css">
<script src="https://cdn.jsdelivr.net/npm/zidan-select@2.6.0/zidan-form.js"></script>
```

For the single-select case, the select-only build is smaller: swap in the
`dist/select/` files from section 4.

---

## 9. Shopify

ZidanForm works in **storefront theme templates** — product pages, contact forms, newsletter
signups, cart notes. It does **not** work on the Shopify checkout (custom scripts are blocked
there; use Checkout UI Extensions) or in the Shopify admin (that uses Polaris).

A runnable mock product page lives at
<https://akhtar1985.github.io/zidan-select/shopify.html> — variant combobox, quantity stepper,
gift-wrap switch, tile radios and an upload dropzone, with the Liquid snippets below on the page.

### 9a. Add the files to the theme

1. Online Store → Themes → **Edit code** → **Assets** → **Add a new asset**, upload
   `zidan-form.js`, `plugin-core.css` and `plugin-theme.css` (or the select-only build if only
   selects are needed).
2. Reference them in `layout/theme.liquid`, after the theme's base stylesheet:

```liquid
{{ 'plugin-core.css' | asset_url | stylesheet_tag }}
{{ 'plugin-theme.css' | asset_url | stylesheet_tag }}
<script src="{{ 'zidan-form.js' | asset_url }}" defer></script>
```

`asset_url` serves the files from Shopify's CDN, so no external host is required. CSS order:
theme base styles → `plugin-core.css` → `plugin-theme.css` → your overrides.

### 9b. Product form

Liquid renders the variants; ZidanForm only upgrades the control. The real `<select>` stays in
the DOM, so `change` listeners (Dawn's price/availability updates) keep working.

```liquid
<form action="{{ routes.cart_add_url }}" method="post" class="zidan-form">
  <input type="hidden" name="form_type" value="product">
  <input type="hidden" name="utf8" value="✓">

  <label for="variant-select">Size</label>
  <select id="variant-select" name="id" class="zidan-select"
          data-zidan-options='{"mode":"combobox","placeholder":"Choose a size…"}'>
    {% for variant in product.variants %}
      <option value="{{ variant.id }}"
        {% if variant == product.selected_or_first_available_variant %}selected{% endif %}
        {% unless variant.available %}disabled{% endunless %}>
        {{ variant.title }} — {{ variant.price | money }}
      </option>
    {% endfor %}
  </select>

  <label for="quantity">Quantity</label>
  <input id="quantity" type="number" name="quantity" value="1" min="1" max="20"
         data-zidan="input" data-zidan-stepper="stacked">

  <label>
    <input type="checkbox" name="properties[Gift wrap]" value="Yes"
           data-zidan="checkbox" data-zidan-variant="switch"
           data-zidan-label="Gift wrap">
  </label>

  <button type="submit" name="add">Add to cart</button>
</form>
```

> **Dawn users:** Dawn's `variant-selects` component owns its markup and JS. Use this markup in
> a custom section, or remove Dawn's variant picker before adding yours — do not run both on the
> same select. Line-item properties (`properties[...]`) are ordinary form fields and post with
> the form.

### 9c. Contact and newsletter forms

```liquid
{% form 'contact', class: 'zidan-form' %}
  <input type="email" name="contact[email]" required
         data-zidan="input" data-zidan-auto-icon="true" data-zidan-clear>
  <textarea name="contact[body]" rows="4" maxlength="400"
            data-zidan="textarea" data-zidan-counter="400"></textarea>
  <button type="submit">Send</button>
{% endform %}

{% form 'customer', class: 'zidan-form' %}
  <input type="hidden" name="contact[tags]" value="newsletter">
  <input type="email" name="contact[email]" required
         data-zidan="input" data-zidan-clear>
  <button type="submit">Subscribe</button>
{% endform %}
```

### 9d. Field theme from the theme editor

Expose the preset in a section setting so merchants can switch it without editing code:

```liquid
{% schema %}
{
  "name": "ZidanForm style",
  "settings": [
    {
      "type": "select",
      "id": "zidan_theme",
      "label": "Field theme",
      "options": [
        {"value": "default", "label": "Default"},
        {"value": "modern", "label": "Modern"},
        {"value": "minimal", "label": "Minimal"},
        {"value": "dark", "label": "Dark"},
        {"value": "glass", "label": "Glass"}
      ],
      "default": "modern"
    }
  ]
}
{% endschema %}

<div data-zidan-theme="{{ section.settings.zidan_theme }}">
  {% comment %} your form markup {% endcomment %}
</div>
```

### 9e. File uploads: app proxy plus a hidden property

Shopify's cart and order forms cannot carry a file. Upload through an **app proxy**
(`/apps/your-app/upload` forwards to your server), then put the resulting URL into a line-item
property so it reaches the order:

```liquid
<input type="file" id="artwork" data-zidan="file"
       data-zidan-max-size-mb="8" data-zidan-title="Drop your artwork">
<input type="hidden" name="properties[Artwork URL]" id="artwork-url">
```

```js
zidanField('#artwork', {
  upload: function (file, context) {
    var body = new FormData();
    body.append('file', file);
    fetch('/apps/your-app/upload', { method: 'POST', body: body, signal: context.signal })
      .then(function (response) {
        return response.ok ? response.json() : Promise.reject(response.status);
      })
      .then(function (json) {
        context.complete(json);
        document.getElementById('artwork-url').value = json.url;
      })
      .catch(context.fail);
  }
});
```

Never mark the upload as `autoUpload` on a price-bearing form unless the upload endpoint is
ready — the property field stays empty until the upload completes.

### 9f. Headless storefronts (Hydrogen, Remix, Next.js)

Use the npm package and the framework lifecycle patterns from [frameworks.md](frameworks.md):

```jsx
import { useEffect, useRef } from 'react';
import { zidanSelect } from 'zidan-select';
import 'zidan-select/css/core';
import 'zidan-select/css/theme';

export function VariantPicker() {
  const ref = useRef(null);
  useEffect(() => {
    const instance = zidanSelect(ref.current, { mode: 'combobox' });
    return () => instance.destroy();
  }, []);
  return <select ref={ref} name="id">{/* variant options */}</select>;
}
```

### 9g. Shopify caveats

- **Checkout is off-limits.** Theme code cannot run there. For Plus stores, `checkout.liquid` is
  deprecated — use Checkout UI Extensions.
- **Shipping to many merchants?** Package the assets in a theme app extension's app-embed block
  instead of editing each theme; the embed block can inject the CSS/JS on the storefront.
- **Two copies of the library**: some apps ship ZidanForm themselves. Check
  `window.ZidanForm` in the console before enqueuing your own copy.
- **CSP and asset URLs** are not an issue for theme assets served by `asset_url`.

---

## 10. Copy-paste recipes

Change the theme for one area (or set it on `<html>` for the whole site):

```html
<html data-zidan-theme="modern">
<!-- or -->
<form class="zidan-form" data-zidan-theme="dark" data-zidan-layout="floating">
```

Match an existing CSS framework:

```html
<html data-zidan-framework="bootstrap">    <!-- or tailwind / bulma / foundation -->
```

Searchable combobox:

```html
<select name="city" class="zidan-select"
        data-zidan-options='{"mode":"combobox","searchable":true,"clearable":true}'>…</select>
```

Tags input (Enter commits, Backspace removes the last tag):

```html
<select name="skills" class="zidan-select" multiple
        data-zidan-options='{"mode":"tags","maxTags":5,"placeholder":"Type a skill…"}'>…</select>
```

Phone input with country selector:

```html
<input type="tel" name="phone" data-zidan="input" data-zidan-phone="true"
       data-zidan-phone-country="US" data-zidan-phone-format="national">
```

Number stepper with a hold-to-repeat button:

```html
<input type="number" name="qty" min="1" max="20" value="1" data-zidan="input"
       data-zidan-stepper="split" data-zidan-stepper-long-press="true">
```

Range with a live output:

```html
<input type="range" name="budget" min="0" max="500" step="10" value="200"
       data-zidan="input" data-zidan-output="#budget-out">
<output id="budget-out">200</output>
```

Text field with prefix, suffix, counter and clear button:

```html
<input type="text" name="amount" maxlength="12"
       data-zidan="input" data-zidan-prefix="$" data-zidan-suffix="USD"
       data-zidan-counter="12" data-zidan-clear>
```

Switch and card-style checkbox:

```html
<input type="checkbox" name="news" data-zidan="checkbox" data-zidan-variant="switch">

<label>
  <input type="checkbox" name="plan" value="pro" data-zidan="checkbox"
         data-zidan-variant="card" data-zidan-label="Pro plan"
         data-zidan-description="Unlimited projects">
</label>
```

Card-style radio group (put the attributes on the `<fieldset>`):

```html
<fieldset data-zidan="radio-group" data-zidan-variant="tile">
  <legend>Plan</legend>
  <label><input type="radio" name="plan" value="starter" checked> Starter</label>
  <label><input type="radio" name="plan" value="pro"> Pro</label>
</fieldset>
```

File uploads: dropzone with limits, avatar, gallery:

```html
<input type="file" name="docs" multiple accept=".pdf,image/*" data-zidan="file"
       data-zidan-max-files="3" data-zidan-max-size-mb="5"
       data-zidan-title="Drop documents here">

<input type="file" name="avatar" accept="image/*" data-zidan="file"
       data-zidan-file-variant="avatar">

<input type="file" name="shots" multiple accept="image/*" data-zidan="file"
       data-zidan-file-variant="gallery">
```

Upload to your own endpoint (no JS needed):

```html
<input type="file" name="cv" data-zidan="file" data-zidan-upload-url="/upload.php"
       data-zidan-max-size-mb="5">
```

Custom uploader in JS (fetch, with abort and progress):

```js
zidanField('#cv', {
  upload: function (file, context) {
    fetch('/api/upload', {
      method: 'POST',
      body: context.formData,
      signal: context.signal
    }).then(function (response) {
      return response.ok ? response.json() : Promise.reject(response.status);
    }).then(context.complete).catch(context.fail);
  }
});
```

---

## 11. Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Controls still look native | CSS 404 — open DevTools → Network and check both stylesheets load. `plugin-core.css` alone is not enough. |
| Nothing is enhanced, console is clean | Script 404, or the file was loaded twice and ignored. Check the `src` path and search the page source for a second copy. |
| `ZidanSelect: target element not found` | The call ran before the markup, or the selector is wrong (IDs are case-sensitive). Move the script to the end of `<body>`, add `defer`, or wrap in `DOMContentLoaded`. |
| Some fields work, others do not | The untouched ones lack `data-zidan*`/`zidan-field`. Unmarked file inputs are only picked up inside `.zidan-form`. Compare with section 2. |
| `data-zidan-options` is ignored | Use single quotes for the attribute and double quotes inside the JSON. Only literal values are allowed; check the console for the warning. |
| Posted value is empty | Give the native control a `name`. The visible widget mirrors the real `<select>`/`<input>`. |
| File upload stays at 0% | No endpoint configured. Add `data-zidan-upload-url` / `uploadUrl`, or `simulateUpload: true` for demos. |
| Styles clash with Bootstrap/Tailwind | Set `data-zidan-framework="bootstrap"` (or `tailwind`) on `<html>` or the form; load theme CSS after the framework CSS. |
| WordPress: nothing loads | A caching/optimisation plugin moved or combined the files. View the page source for `zidan-form`; exclude the files and purge the cache. |
| WordPress: form plugin styles fight back | Start with `formTargets: ['#form-id']` on one form instead of site-wide marker classes. |
| Shopify: controls stay native | The theme asset is not referenced in `layout/theme.liquid`, or a theme-cache/CDN is serving an old layout. Check the page source for `asset_url` output and the three files. |

---

## What next

- Every option and data attribute: [options.md](options.md)
- Native, jQuery Validation, JustValidate and Parsley: [validation.md](validation.md)
- Tokens, presets, layouts and adapters: [theming.md](theming.md)
- React, Next.js, Vue/Nuxt, Svelte/SvelteKit and Angular, including SSR and reactive forms: [frameworks.md](frameworks.md)
- Click through one control at a time: [field playground](https://akhtar1985.github.io/zidan-select/playground.html)
- More trimmed-build details: [build.md](build.md#select-only-and-file-only-builds)
