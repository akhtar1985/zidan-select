/*!
 * ZidanForm v2.5.1
 * Zero-dependency form enhancement library: select / combobox / tags,
 * checkboxes, switches, radio groups, file upload with drag & drop and
 * upload progress, text / number / phone / date / range inputs and textarea.
 * Structure and theming are split into plugin-core.css and plugin-theme.css.
 *
 * https://github.com/akhtar1985/zidan-select
 * MIT License © akhtar1985
 *
 * Works as a classic <script> (adds window.ZidanForm plus the legacy
 * window.ZidanSelect / zidanSelect / initZidanSelects names) and as an ES
 * module (see zidan-form.mjs, which re-exports this file).
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof window !== 'undefined') {
    window.ZidanForm = api.ZidanForm;
    if (api.ZidanSelect) {
      window.ZidanSelect = api.ZidanSelect;
      window.zidanSelect = api.zidanSelect;
      window.initZidanSelects = api.initZidanSelects;
    }
    if (api.zidanField) window.zidanField = api.zidanField;
    if (api.initZidanForms) window.initZidanForms = api.initZidanForms;
    if (api.registerIcon) window.registerZidanIcon = api.registerIcon;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this, function (global) {
  'use strict';

  var VERSION = '2.5.1';

  // Loading the file twice (classic script + module wrapper, or two bundles)
  // must not replace the classes and orphan the live instances.
  if (global && global.ZidanForm && global.ZidanForm.__zidanFormGuard === VERSION) {
    return global.ZidanForm.api;
  }

  var doc = typeof document !== 'undefined' ? document : null;

  /* @zidan-build:shared */
  /* ------------------------------------------------------------------ *
   * Constants & tiny helpers
   * ------------------------------------------------------------------ */

  var LAYOUTS = ['classic-clean', 'floating-label', 'soft-pill', 'bordered-brutalist', 'glass-elevated'];
  var FRAMEWORKS = ['auto', 'none', 'vanilla', 'bootstrap', 'tailwind', 'bulma', 'foundation'];
  var THEMES = ['default', 'modern', 'minimal', 'dark', 'glass', 'auto'];
  var FIELD_LAYOUTS = ['stacked', 'inline', 'card', 'compact', 'floating', 'outlined'];
  var FIELD_KINDS = ['checkbox', 'radio', 'radio-group', 'file', 'input', 'textarea'];
  var FIELDS_SELECTOR = '[data-zidan], [data-zidan-checkbox], [data-zidan-switch], [data-zidan-radio], ' +
    '[data-zidan-radio-group], [data-zidan-file], [data-zidan-input], [data-zidan-textarea], .zidan-field';
  var SELECT_SELECTOR = '[data-zidan-select], .zidan-select';
  var FORM_SCOPE_SELECTOR = '[data-zidan-form], .zidan-form';
  var SCROLLBARS = ['default', 'thin', 'fancy', 'hover', 'hidden'];
  var EVENT_PREFIX = 'zidan:';
  var uidSeq = 0;

  function uid(prefix) {
    uidSeq += 1;
    return (prefix || 'zs') + '-' + uidSeq.toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function hasClass(node, cls) {
    return !!(node && node.classList && node.classList.contains(cls));
  }

  function addClass(node, cls) {
    if (!node || !cls) return node;
    cls.split(/\s+/).forEach(function (c) {
      if (c) node.classList.add(c);
    });
    return node;
  }

  function el(tag, className, attrs, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        var value = attrs[key];
        if (value === null || value === undefined || value === false) return;
        if (key === 'text') node.textContent = String(value);
        else node.setAttribute(key, value === true ? '' : String(value));
      });
    }
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function toArray(value) {
    if (value === null || value === undefined || value === '') return [];
    return Array.isArray(value) ? value.slice() : [value];
  }

  function isThenable(value) {
    return !!(value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function');
  }

  /* true when the element renders right-to-left, following the nearest dir attribute */
  function isRtl(element) {
    if (!element) return false;
    var host = element.closest ? element.closest('[dir]') : null;
    var dir = host ? host.getAttribute('dir') : '';
    if (!dir && doc && doc.documentElement) dir = doc.documentElement.getAttribute('dir') || '';
    if (dir) return String(dir).toLowerCase() === 'rtl';
    try {
      return !!(global.getComputedStyle && global.getComputedStyle(element).direction === 'rtl');
    } catch (err) {
      return false;
    }
  }

  function isElement(value) {
    return !!(value && typeof value === 'object' && value.nodeType === 1);
  }

  /* resolve a document/element/selector cleanup scope; null means "nothing to do" */
  function scopeRoot(scope) {
    if (scope === undefined) return doc;
    if (!scope) return null;
    if (typeof scope === 'string') return doc.querySelector(scope);
    if (scope === doc || scope.nodeType === 9) return scope;
    return isElement(scope) ? scope : null;
  }

  function inScope(root, node) {
    if (!root || root.nodeType === 9) return true;
    if (root === node) return true;
    return !!(root.contains && root.contains(node));
  }

  function readBoolAttr(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    var v = String(value).toLowerCase();
    return !(v === 'false' || v === '0' || v === 'no' || v === 'off');
  }

  /* copy own keys from each source; later sources win */
  function mergeOptions() {
    var out = {};
    for (var i = 0; i < arguments.length; i++) {
      (function (source) {
        if (!source || typeof source !== 'object') return;
        Object.keys(source).forEach(function (key) {
          if (source[key] !== undefined) out[key] = source[key];
        });
      })(arguments[i]);
    }
    return out;
  }

  /* data-zidan-options='{"mode":"tags",...}' — options for CMS/JSON-only setups */
  function parseOptionsAttr(node) {
    if (!node || !node.getAttribute) return null;
    var raw = node.getAttribute('data-zidan-options');
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[ZidanForm] ignoring invalid data-zidan-options JSON on', node, error);
      }
      return null;
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function fillTemplate(template, vars) {
    return String(template).replace(/\{(\w+)\}/g, function (match, key) {
      return vars && vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : match;
    });
  }

  /* ---------------- opt-in icon presets ---------------- */

  var ICON_PATHS = {
    text: '<path d="M4 7h16M4 12h10M4 17h13"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h4a5 5 0 0 0 0-10Z"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="8" cy="14" r="1"/>',
    sliders: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2.5"/><circle cx="15" cy="17" r="2.5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    upload: '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="m3 3 18 18"/><path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.1 3.6"/><path d="M6.4 6.7C3.5 8.4 2 12 2 12s3.5 6 10 6c1.7 0 3.2-.4 4.5-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    check: '<path d="m4 12.5 5 5L20 6.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-up': '<path d="m6 15 6-6 6 6"/>',
    'chevron-left': '<path d="m15 6-6 6 6 6"/>',
    'chevron-right': '<path d="m9 6 6 6-6 6"/>',
    alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z"/>',
    'map-pin': '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3.9L3 10"/><path d="M3 5v5h5"/><path d="M4 13a8 8 0 0 0 14.9 3.9L21 14"/><path d="M21 19v-5h-5"/>',
    trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>'
  };

  var ICON_REGISTRY = {};
  Object.keys(ICON_PATHS).forEach(function (key) { ICON_REGISTRY[key] = ICON_PATHS[key]; });
  var ICON_NAMESPACE = 'http://www.w3.org/2000/svg';

  var ICON_ALLOWED = {
    svg: 1, g: 1, path: 1, circle: 1, rect: 1, line: 1, polyline: 1,
    polygon: 1, ellipse: 1, title: 1, defs: 1, clipPath: 1, clippath: 1, mask: 1
  };

  function sanitizeIcon(markup) {
    if (typeof markup !== 'string' || !markup.trim()) return '';
    var parsed;
    try {
      if (typeof global.DOMParser === 'undefined') return '';
      parsed = new global.DOMParser().parseFromString(markup, 'image/svg+xml');
    } catch (err) {
      return '';
    }
    if (!parsed || !parsed.documentElement) return '';
    var svg = parsed.documentElement;
    if (String(svg.nodeName).toLowerCase() !== 'svg') return '';
    if (parsed.getElementsByTagName('parsererror').length) return '';
    var walk = function (node) {
      Array.prototype.slice.call(node.children || []).forEach(function (child) {
        var tag = String(child.nodeName);
        if (tag !== tag.toLowerCase()) tag = tag.toLowerCase();
        if (!ICON_ALLOWED[tag]) {
          child.parentNode.removeChild(child);
          return;
        }
        Array.prototype.slice.call(child.attributes || []).forEach(function (attr) {
          var name = String(attr.name).toLowerCase();
          if (name.indexOf('on') === 0) child.removeAttribute(attr.name);
          if ((name === 'href' || name === 'xlink:href') && !/^#/.test(attr.value)) child.removeAttribute(attr.name);
          if (/url\s*\(\s*['"]?\s*(?:https?:|\/\/)/i.test(attr.value)) child.removeAttribute(attr.name);
        });
        walk(child);
      });
    };
    walk(svg);
    return svg.outerHTML;
  }

  function iconSvgFromMarkup(markup) {
    var paths = markup;
    if (/^\s*</.test(paths) && !/^\s*<svg/i.test(paths)) {
      paths = '<svg xmlns="' + ICON_NAMESPACE + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
    } else if (!/^\s*<svg/i.test(paths)) {
      paths = '';
    }
    return sanitizeIcon(paths);
  }

  function iconNode(spec, className) {
    var markup = '';
    var name = '';
    if (typeof spec === 'string' && spec) {
      name = spec;
      if (/^\s*</.test(spec)) {
        markup = iconSvgFromMarkup(spec) || iconSvgFromMarkup('<path d="M4 12h16"/>');
      } else if (ICON_REGISTRY[spec]) {
        markup = iconSvgFromMarkup(ICON_REGISTRY[spec]) || '';
      }
    } else if (spec && typeof spec === 'object' && spec.name) {
      name = spec.name;
      markup = iconSvgFromMarkup(ICON_REGISTRY[spec.name] || '');
    }
    if (!markup) return null;
    var node = doc.createElement('span');
    if (className) node.className = className;
    node.setAttribute('data-zs-icon', name || 'custom');
    try {
      node.innerHTML = markup;
    } catch (err) {
      return null;
    }
    var svg = node.firstChild;
    if (svg) {
      svg.setAttribute('focusable', 'false');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('width', '18');
      svg.setAttribute('height', '18');
    }
    return node;
  }

  var TYPE_ICONS = {
    text: 'text',
    email: 'mail',
    password: 'lock',
    number: 'hash',
    tel: 'phone',
    url: 'link',
    search: 'search',
    date: 'calendar',
    time: 'clock',
    'datetime-local': 'calendar',
    month: 'calendar',
    week: 'calendar',
    range: 'sliders',
    color: 'palette'
  };

  function iconForType(type) {
    return TYPE_ICONS[type] || '';
  }

  function registerIcon(name, markup) {
    if (typeof ZidanSelect !== 'undefined' && (!name || typeof markup !== 'string')) return ZidanSelect;
    if (name && typeof markup === 'string') ICON_REGISTRY[String(name)] = markup;
    return typeof ZidanSelect !== 'undefined' ? ZidanSelect : ZidanForm;
  }

  /* ---------------- field options (JS options + data-* attributes) ---------------- */

  function fieldOption(node, options, key, attr, fallback) {
    if (options && options[key] !== undefined && options[key] !== null) return options[key];
    if (node && attr && node.getAttribute) {
      var value = node.getAttribute('data-zidan-' + attr);
      if (value !== null && value !== '') return value;
    }
    return fallback;
  }

  function fieldBool(node, options, key, attr, fallback) {
    if (options && options[key] !== undefined && options[key] !== null) return !!options[key];
    if (node && attr && node.getAttribute) {
      var value = node.getAttribute('data-zidan-' + attr);
      if (value !== null) return readBoolAttr(value, fallback);
    }
    return fallback;
  }

  function fieldNumber(node, options, key, attr, fallback) {
    var value = fieldOption(node, options, key, attr, fallback);
    if (value === null || value === undefined || value === '') return fallback;
    var number = parseFloat(value);
    return isFinite(number) ? number : fallback;
  }

  function fieldList(node, options, key, attr, fallback) {
    var value = fieldOption(node, options, key, attr, null);
    if (value === null || value === undefined || value === '') return fallback;
    if (Array.isArray(value)) return value.slice();
    return String(value).split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  }

  /* ---------------- validation messages ---------------- */

  var FIELD_MESSAGES = {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    url: 'Enter a valid URL.',
    pattern: 'The value does not match the expected format.',
    min: 'Value must be at least {min}.',
    max: 'Value must be at most {max}.',
    step: 'Value must be a multiple of {step}.',
    minlength: 'Use at least {minlength} characters.',
    maxlength: 'Use at most {maxlength} characters.',
    badInput: 'Enter a valid value.',
    phone: 'Enter a valid phone number for {country}.',
    integer: 'Enter a whole number.',
    date: 'Enter a valid date.',
    weekend: 'Weekends are not available — pick a weekday.',
    dateDisabled: 'This date is not available.',
    fileType: 'This file type is not allowed.',
    fileSize: 'This file is too large.',
    fileCount: 'Too many files.',
    fileMin: 'Select at least {min} files.',
    fileTotalSize: 'The selected files exceed {limit}.',
    pending: 'Checking…',
    generic: 'Please check this field.'
  };

  function validityMessage(input, messages) {
    if (!input || !input.validity || input.validity.valid) return '';
    var v = input.validity;
    var map = messages || FIELD_MESSAGES;
    var type = String(input.type || '').toLowerCase();
    var key = '';
    var vars = { min: input.getAttribute('min'), max: input.getAttribute('max'), step: input.getAttribute('step') };
    if (v.valueMissing) key = 'required';
    else if (v.typeMismatch) key = type === 'email' ? 'email' : (type === 'url' ? 'url' : 'generic');
    else if (v.patternMismatch) key = 'pattern';
    else if (v.rangeUnderflow) key = 'min';
    else if (v.rangeOverflow) key = 'max';
    else if (v.stepMismatch) key = 'step';
    else if (v.tooShort) {
      key = 'minlength';
      vars.minlength = input.getAttribute('minlength');
    } else if (v.tooLong) {
      key = 'maxlength';
      vars.maxlength = input.getAttribute('maxlength');
    } else if (v.badInput || v.customError) key = 'badInput';
    if (!key) return input.validationMessage || map.generic;
    return fillTemplate(map[key] || FIELD_MESSAGES[key] || map.generic, vars);
  }

  var NATIVE_VALIDITY_FLAGS = ['valueMissing', 'typeMismatch', 'patternMismatch', 'rangeUnderflow',
    'rangeOverflow', 'stepMismatch', 'tooShort', 'tooLong', 'badInput', 'fileMissing'];

  /* customError is the library mirroring its own message onto the input, so re-reading it
     would turn a pending/custom check into a phantom native constraint failure */
  function hasNativeValidityError(input) {
    var v = input && input.validity;
    if (!v) return false;
    for (var i = 0; i < NATIVE_VALIDITY_FLAGS.length; i += 1) {
      if (v[NATIVE_VALIDITY_FLAGS[i]]) return true;
    }
    return false;
  }

  /* @zidan-build:phone */
  /* ---------------- phone formatting ---------------- */

  var PHONE_COUNTRIES = {
    US: { flag: '🇺🇸', name: 'United States', dial: '1', mask: '(###) ###-####', groups: [3, 3, 4], min: 10, max: 10 },
    CA: { flag: '🇨🇦', name: 'Canada', dial: '1', mask: '(###) ###-####', groups: [3, 3, 4], min: 10, max: 10 },
    GB: { flag: '🇬🇧', name: 'United Kingdom', dial: '44', mask: '##### ######', groups: [5, 6], intlGroups: [4, 6], min: 10, max: 11 },
    DE: { flag: '🇩🇪', name: 'Germany', dial: '49', mask: '#### #######', groups: [4, 7], min: 10, max: 11 },
    FR: { flag: '🇫🇷', name: 'France', dial: '33', mask: '# ## ## ## ##', groups: [1, 2, 2, 2, 2], min: 9, max: 10 },
    IN: { flag: '🇮🇳', name: 'India', dial: '91', mask: '##### #####', groups: [5, 5], min: 10, max: 10 },
    PK: { flag: '🇵🇰', name: 'Pakistan', dial: '92', mask: '### #######', groups: [3, 7], min: 10, max: 10 },
    AE: { flag: '🇦🇪', name: 'United Arab Emirates', dial: '971', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 9 },
    SA: { flag: '🇸🇦', name: 'Saudi Arabia', dial: '966', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 9 },
    AU: { flag: '🇦🇺', name: 'Australia', dial: '61', mask: '### ### ###', groups: [3, 3, 3], min: 9, max: 9 },
    BR: { flag: '🇧🇷', name: 'Brazil', dial: '55', mask: '(##) #####-####', groups: [2, 5, 4], min: 10, max: 11 },
    CN: { flag: '🇨🇳', name: 'China', dial: '86', mask: '### #### ####', groups: [3, 4, 4], min: 11, max: 11 },
    JP: { flag: '🇯🇵', name: 'Japan', dial: '81', mask: '## #### ####', groups: [2, 4, 4], min: 10, max: 11 },
    RU: { flag: '🇷🇺', name: 'Russia', dial: '7', mask: '### ###-##-##', groups: [3, 3, 2, 2], min: 10, max: 10 },
    ZA: { flag: '🇿🇦', name: 'South Africa', dial: '27', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 9 },
    NG: { flag: '🇳🇬', name: 'Nigeria', dial: '234', mask: '### ### ####', groups: [3, 3, 4], min: 10, max: 10 },
    EG: { flag: '🇪🇬', name: 'Egypt', dial: '20', mask: '## #### ####', groups: [2, 4, 4], min: 10, max: 10 },
    TR: { flag: '🇹🇷', name: 'Türkiye', dial: '90', mask: '### ### ## ##', groups: [3, 3, 2, 2], min: 10, max: 10 },
    ID: { flag: '🇮🇩', name: 'Indonesia', dial: '62', mask: '### ### ####', groups: [3, 3, 4], min: 9, max: 12 },
    MY: { flag: '🇲🇾', name: 'Malaysia', dial: '60', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 10 },
    PH: { flag: '🇵🇭', name: 'Philippines', dial: '63', mask: '### ### ####', groups: [3, 3, 4], min: 10, max: 10 },
    BD: { flag: '🇧🇩', name: 'Bangladesh', dial: '880', mask: '#### ######', groups: [4, 6], min: 10, max: 10 },
    IT: { flag: '🇮🇹', name: 'Italy', dial: '39', mask: '### ### ####', groups: [3, 3, 4], min: 9, max: 10 },
    ES: { flag: '🇪🇸', name: 'Spain', dial: '34', mask: '### ## ## ##', groups: [3, 2, 2, 2], min: 9, max: 9 },
    MX: { flag: '🇲🇽', name: 'Mexico', dial: '52', mask: '## #### ####', groups: [2, 4, 4], min: 10, max: 10 },
    AR: { flag: '🇦🇷', name: 'Argentina', dial: '54', mask: '## #### ####', groups: [2, 4, 4], min: 10, max: 10 },
    NZ: { flag: '🇳🇿', name: 'New Zealand', dial: '64', mask: '## ### ####', groups: [2, 3, 4], min: 8, max: 10 },
    SG: { flag: '🇸🇬', name: 'Singapore', dial: '65', mask: '#### ####', groups: [4, 4], min: 8, max: 8 },
    HK: { flag: '🇭🇰', name: 'Hong Kong', dial: '852', mask: '#### ####', groups: [4, 4], min: 8, max: 8 },
    KR: { flag: '🇰🇷', name: 'South Korea', dial: '82', mask: '## #### ####', groups: [2, 4, 4], min: 9, max: 10 },
    TH: { flag: '🇹🇭', name: 'Thailand', dial: '66', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 9 },
    VN: { flag: '🇻🇳', name: 'Vietnam', dial: '84', mask: '### ### ####', groups: [3, 3, 4], min: 9, max: 10 },
    NL: { flag: '🇳🇱', name: 'Netherlands', dial: '31', mask: '# ## ## ## ##', groups: [1, 2, 2, 2, 2], min: 9, max: 9 },
    BE: { flag: '🇧🇪', name: 'Belgium', dial: '32', mask: '### ## ## ##', groups: [3, 2, 2, 2], min: 9, max: 9 },
    CH: { flag: '🇨🇭', name: 'Switzerland', dial: '41', mask: '## ### ## ##', groups: [2, 3, 2, 2], min: 9, max: 9 },
    SE: { flag: '🇸🇪', name: 'Sweden', dial: '46', mask: '## ### ## ##', groups: [2, 3, 2, 2], min: 9, max: 9 },
    NO: { flag: '🇳🇴', name: 'Norway', dial: '47', mask: '### ## ###', groups: [3, 2, 3], min: 8, max: 8 },
    DK: { flag: '🇩🇰', name: 'Denmark', dial: '45', mask: '## ## ## ##', groups: [2, 2, 2, 2], min: 8, max: 8 },
    FI: { flag: '🇫🇮', name: 'Finland', dial: '358', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 10 },
    PL: { flag: '🇵🇱', name: 'Poland', dial: '48', mask: '### ### ###', groups: [3, 3, 3], min: 9, max: 9 },
    PT: { flag: '🇵🇹', name: 'Portugal', dial: '351', mask: '### ### ###', groups: [3, 3, 3], min: 9, max: 9 },
    IE: { flag: '🇮🇪', name: 'Ireland', dial: '353', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 9 },
    GR: { flag: '🇬🇷', name: 'Greece', dial: '30', mask: '### ### ####', groups: [3, 3, 4], min: 10, max: 10 },
    UA: { flag: '🇺🇦', name: 'Ukraine', dial: '380', mask: '## ### ####', groups: [2, 3, 4], min: 9, max: 9 },
    IL: { flag: '🇮🇱', name: 'Israel', dial: '972', mask: '##-###-####', groups: [2, 3, 4], min: 9, max: 9 },
    QA: { flag: '🇶🇦', name: 'Qatar', dial: '974', mask: '#### ####', groups: [4, 4], min: 8, max: 8 },
    KW: { flag: '🇰🇼', name: 'Kuwait', dial: '965', mask: '#### ####', groups: [4, 4], min: 8, max: 8 },
    BH: { flag: '🇧🇭', name: 'Bahrain', dial: '973', mask: '#### ####', groups: [4, 4], min: 8, max: 8 },
    OM: { flag: '🇴🇲', name: 'Oman', dial: '968', mask: '#### ####', groups: [4, 4], min: 8, max: 8 }
  };

  var PHONE_DEFAULT_COUNTRIES = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IN', 'PK', 'AE', 'SA', 'BR', 'CN', 'JP', 'RU', 'ZA', 'NG', 'TR', 'ID', 'MY', 'PH', 'BD', 'ES', 'IT', 'MX', 'NL', 'PL', 'PT', 'SE', 'CH', 'IE'];
  var PHONE_FORMATS = ['national', 'international', 'e164'];

  function digitsOnly(value) {
    return String(value === null || value === undefined ? '' : value).replace(/\D+/g, '');
  }

  function formatWithMask(digits, mask) {
    var out = '';
    var index = 0;
    for (var i = 0; i < mask.length; i += 1) {
      if (mask.charAt(i) === '#') {
        if (index >= digits.length) break;
        out += digits.charAt(index);
        index += 1;
      } else {
        out += mask.charAt(i);
      }
    }
    if (index < digits.length) out += digits.slice(index);
    return out;
  }

  function groupDigits(digits, groups) {
    var out = [];
    var index = 0;
    (groups || []).forEach(function (size) {
      if (index < digits.length) {
        out.push(digits.slice(index, index + size));
        index += size;
      }
    });
    if (index < digits.length) out.push(digits.slice(index));
    return out;
  }

  function formatPhone(value, countryIso, format) {
    var country = PHONE_COUNTRIES[countryIso] || PHONE_COUNTRIES.US;
    var mode = PHONE_FORMATS.indexOf(String(format)) === -1 ? 'national' : String(format);
    var digits = digitsOnly(value);
    if (mode !== 'national' && /^\s*\+/.test(String(value || ''))) {
      // a pasted +<dial> value is normalized to the selected country
      var detected = detectPhoneCountry(value);
      if (detected) digits = digits.slice(PHONE_COUNTRIES[detected].dial.length);
    }
    if (mode !== 'national' && digits.indexOf(country.dial) === 0 && digits.length > country.max) {
      digits = digits.slice(country.dial.length);
    }
    if (mode !== 'national' && digits.charAt(0) === '0') digits = digits.slice(1);
    digits = digits.slice(0, country.max);
    if (!digits) return '';
    if (mode === 'e164') return '+' + country.dial + digits;
    if (mode === 'international') return '+' + country.dial + ' ' + groupDigits(digits, country.intlGroups || country.groups).join(' ');
    return formatWithMask(digits, country.mask);
  }

  function phoneDigitsForCountry(value, countryIso, format) {
    var country = PHONE_COUNTRIES[countryIso] || PHONE_COUNTRIES.US;
    var digits = digitsOnly(value);
    if (format !== 'national' && /^\s*\+/.test(String(value || ''))) {
      var detected = detectPhoneCountry(value);
      if (detected) digits = digits.slice(PHONE_COUNTRIES[detected].dial.length);
    } else if (format !== 'national' && digits.indexOf(country.dial) === 0 && digits.length > country.max) {
      digits = digits.slice(country.dial.length);
    }
    if (format !== 'national' && digits.charAt(0) === '0') digits = digits.slice(1);
    return digits;
  }

  function detectPhoneCountry(value) {
    var digits = digitsOnly(value);
    if (!/^\s*\+/.test(String(value || ''))) return '';
    var best = '';
    Object.keys(PHONE_COUNTRIES).forEach(function (iso) {
      var dial = PHONE_COUNTRIES[iso].dial;
      if (digits.indexOf(dial) === 0 && dial.length > (PHONE_COUNTRIES[best] ? PHONE_COUNTRIES[best].dial.length : 0)) best = iso;
    });
    return best;
  }

  function digitsBefore(text, position) {
    return (String(text).slice(0, position).match(/\d/g) || []).length;
  }

  function caretAfterDigits(text, count) {
    if (count <= 0) return 0;
    var seen = 0;
    for (var i = 0; i < text.length; i += 1) {
      if (/\d/.test(text.charAt(i))) {
        seen += 1;
        if (seen === count) return i + 1;
      }
    }
    return text.length;
  }

  /* @zidan-build:shared2 */
  /* first non-empty value of any of `names`, walking up the tree */
  function inheritedAttr(node, names) {
    var current = node;
    while (current && current.nodeType === 1) {
      for (var i = 0; i < names.length; i += 1) {
        var value = current.getAttribute(names[i]);
        if (value) return value.trim();
      }
      current = current.parentElement;
    }
    return '';
  }

  function pickList(value, list, fallback) {
    var candidate = String(value || '').toLowerCase();
    return list.indexOf(candidate) === -1 ? fallback : candidate;
  }

  /* rangeTicks: JS array, JSON array, comma list or a tick count */
  function parseRangeTicks(value) {
    if (Array.isArray(value)) return value.slice();
    if (typeof value === 'string') {
      var raw = value.trim();
      if (raw.charAt(0) === '[') {
        try {
          var parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) return parsed;
        } catch (err) { /* fall back to the tick count */ }
      } else if (raw.indexOf(',') !== -1) {
        return raw.split(',').map(function (part) { return Number(part.trim()); })
          .filter(function (number) { return isFinite(number); });
      }
    }
    return value;
  }

  /* system theme + locale catalogs ---------------------------------- */

  /* 'auto' follows prefers-color-scheme; the root keeps data-zs-theme synced
     with the resolved light/dark theme so the plain CSS themes keep working. */
  var prefersDarkQuery = null;
  var autoThemeRoots = [];

  function systemPrefersDark() {
    if (!global.matchMedia) return false;
    if (!prefersDarkQuery) {
      try { prefersDarkQuery = global.matchMedia('(prefers-color-scheme: dark)'); } catch (error) { return false; }
    }
    return !!prefersDarkQuery.matches;
  }

  function resolveThemeName(name) {
    return name === 'auto' ? (systemPrefersDark() ? 'dark' : 'default') : name;
  }

  function syncAutoThemes() {
    for (var i = autoThemeRoots.length - 1; i >= 0; i -= 1) {
      var node = autoThemeRoots[i];
      if (!node || !node.isConnected) { autoThemeRoots.splice(i, 1); continue; }
      node.setAttribute('data-zs-theme', prefersDarkQuery && prefersDarkQuery.matches ? 'dark' : 'default');
    }
  }

  function trackAutoTheme(node) {
    if (!node || autoThemeRoots.indexOf(node) !== -1) return;
    node.setAttribute('data-zs-theme', resolveThemeName('auto'));
    autoThemeRoots.push(node);
    if (systemPrefersDark() || prefersDarkQuery) syncAutoThemes();
    if (prefersDarkQuery && !prefersDarkQuery.__zsBound) {
      prefersDarkQuery.__zsBound = true;
      if (prefersDarkQuery.addEventListener) prefersDarkQuery.addEventListener('change', syncAutoThemes);
      else if (prefersDarkQuery.addListener) prefersDarkQuery.addListener(syncAutoThemes);
    }
  }

  function untrackAutoTheme(node) {
    var index = autoThemeRoots.indexOf(node);
    if (index !== -1) autoThemeRoots.splice(index, 1);
  }

  /* Built-in strings. Extend at runtime through ZidanForm.locales. */
  var LOCALES = {
    en: { noResultsText: 'No results found', emptyText: 'No options', loadingText: 'Searching…', clearText: 'Clear selection', loadMoreText: 'Load more', placeholder: 'Select an option…', requiredText: 'Please select an option.' },
    es: { noResultsText: 'No se encontraron resultados', emptyText: 'Sin opciones', loadingText: 'Buscando…', clearText: 'Borrar selección', loadMoreText: 'Cargar más', placeholder: 'Selecciona una opción…', requiredText: 'Selecciona una opción.' },
    fr: { noResultsText: 'Aucun résultat', emptyText: 'Aucune option', loadingText: 'Recherche…', clearText: 'Effacer la sélection', loadMoreText: 'Charger plus', placeholder: 'Sélectionnez une option…', requiredText: 'Veuillez sélectionner une option.' },
    de: { noResultsText: 'Keine Ergebnisse', emptyText: 'Keine Optionen', loadingText: 'Suche…', clearText: 'Auswahl löschen', loadMoreText: 'Mehr laden', placeholder: 'Option auswählen…', requiredText: 'Bitte wählen Sie eine Option.' },
    ar: { noResultsText: 'لا توجد نتائج', emptyText: 'لا توجد خيارات', loadingText: 'جارٍ البحث…', clearText: 'مسح التحديد', loadMoreText: 'تحميل المزيد', placeholder: 'اختر خيارًا…', requiredText: 'يرجى اختيار خيار.' }
  };

  function parseVirtual(value) {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean' || typeof value === 'number') return value;
    var text = String(value).toLowerCase().trim();
    if (text === 'auto') return 'auto';
    if (text === 'true' || text === 'on') return true;
    if (text === 'false' || text === 'off') return false;
    var parsed = parseInt(text, 10);
    return isNaN(parsed) ? undefined : parsed;
  }

  /* theme/framework/layout resolution shared by every field and the select */
  function resolveScope(node, options) {
    var opts = options || {};
    var theme = opts.theme || inheritedAttr(node, ['data-zidan-theme', 'data-zs-theme']);
    if (!theme && doc) theme = doc.documentElement.getAttribute('data-zs-theme') || '';
    var framework = opts.framework || inheritedAttr(node, ['data-zidan-framework', 'data-zs-framework']);
    if (!framework && doc) framework = doc.documentElement.getAttribute('data-zs-framework') || '';
    var layout = opts.layout || inheritedAttr(node, ['data-zidan-layout', 'data-zs-layout']);
    return {
      theme: pickList(theme, THEMES, 'default'),
      framework: pickList(framework, FRAMEWORKS, 'none'),
      layout: layout ? String(layout).toLowerCase() : ''
    };
  }

  function debounce(fn, wait) {
    var timer = null;
    function debounced() {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(null, args);
      }, wait);
    }
    debounced.cancel = function () {
      clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }

  /* @zidan-build:select-defaults */
  /* ------------------------------------------------------------------ *
   * Defaults
   * ------------------------------------------------------------------ */

  var DEFAULTS = {
    /* core */
    mode: null,                // 'select' | 'combobox' | 'tags'
    layout: 'classic-clean',
    theme: 'default',
    themeFramework: 'auto',    // 'auto' | 'vanilla' | 'bootstrap' | 'tailwind'
    id: null,
    name: null,
    disabled: false,
    required: false,
    /* data */
    options: null,
    value: null,
    label: null,               // floating label text (falls back to placeholder)
    ariaLabel: null,
    placeholder: null,
    /* behaviour */
    multiple: false,
    searchable: null,
    clearable: false,
    closeOnSelect: null,
    maxDropdownHeight: 280,
    noResultsText: 'No results found',
    emptyText: 'No options',
    loadingText: 'Searching…',
    clearText: 'Clear selection',
    requiredText: 'Please select an option.',
    /* combobox / async */
    fetchOptions: null,
    debounce: 250,
    minChars: 0,
    allowFreeText: true,
    searchValues: true,
    fetchPageSize: 0,          // >0 enables paged fetchOptions({items, hasMore})
    autoLoadMore: true,
    cacheResults: true,
    loadMoreText: 'Load more',
    fetchUrl: null,            // declarative AJAX: GET this endpoint instead of writing fetchOptions
    fetchMethod: 'GET',
    fetchQueryParam: 'q',
    fetchPageParam: 'page',    // 1-based page number sent with every request
    fetchSkipParam: null,      // when set, send skip = page * pageSize instead of fetchPageParam
    fetchPageSizeParam: 'limit',
    fetchParams: null,         // extra static query parameters merged into every request
    fetchBody: null,           // POST/PUT/PATCH body; objects serialise to JSON
    fetchItemsPath: null,      // dot path to the array in the JSON body ('data.items')
    fetchTotalPath: null,      // dot path to the number of rows available
    fetchHasMorePath: null,    // dot path to a boolean
    fetchHeaders: null,
    fetchCredentials: 'same-origin',
    /* tags */
    maxTags: Infinity,
    minTagLength: 1,
    maxTagLength: Infinity,
    reorderable: false,        // drag chips (or Alt+Arrow) to reorder tags
    editable: false,           // double-click a chip to rename its label
    caseSensitive: false,
    delimiters: [','],
    commitOnTab: false,
    commitOnBlur: false,
    suggestions: null,
    valueDelimiter: ',',
    /* styling */
    customClasses: {},
    validation: null,          // null | 'valid' | 'invalid'
    scrollbar: 'default',      // 'default' | 'thin' | 'fancy' | 'hover' | 'hidden'
    /* search, scale & i18n */
    accentInsensitive: true,   // fold diacritics so "cafe" matches "Café"
    highlightMatches: false,   // wrap the matching label substring in <mark>
    virtual: false,            // false | true | 'auto' | minimum row count
    virtualThreshold: 150,     // row count used by virtual: 'auto'
    itemHeight: 0,             // fixed row height for virtualization (0 = measure)
    typeAhead: true,           // jump to options by typing in a non-searchable select
    typeAheadTimeout: 600,
    locale: null,              // 'en' | 'es' | 'fr' | 'de' | 'ar' | { ... }
    /* callbacks */
    filterOption: null,
    renderOption: null,
    renderSelected: null,
    renderTag: null,
    validateTag: null,
    formatTag: null,
    onInit: null,
    onChange: null,
    onSelect: null,
    onOpen: null,
    onClose: null,
    onTagAdd: null,
    onTagRemove: null,
    onLoadMore: null,
    onError: null
  };

  /* @zidan-build:select */
  /* ------------------------------------------------------------------ *
   * ZidanSelect
   * ------------------------------------------------------------------ */

  /* ---------------- declarative AJAX (fetchUrl) ---------------- */

  function readDotPath(source, path) {
    if (!path) return undefined;
    return String(path).split('.').reduce(function (node, key) {
      return node === null || node === undefined ? undefined : node[key];
    }, source);
  }

  function firstRemoteArray(body) {
    if (Array.isArray(body)) return body;
    if (!body || typeof body !== 'object') return [];
    var keys = ['items', 'data', 'results', 'options', 'rows', 'products', 'records'];
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(body[keys[i]])) return body[keys[i]];
    }
    return [];
  }

  /* Map common API shapes ({id,title}, {value,label}, plain strings) to select items. */
  function remoteItem(raw) {
    if (raw === null || raw === undefined) return null;
    if (typeof raw !== 'object') {
      var text = String(raw);
      return { value: text, label: text };
    }
    var value = raw.value !== undefined ? raw.value
      : raw.id !== undefined ? raw.id
        : raw.slug !== undefined ? raw.slug
          : raw.code !== undefined ? raw.code
            : raw.key !== undefined ? raw.key : undefined;
    var label = raw.label !== undefined ? raw.label
      : raw.name !== undefined ? raw.name
        : raw.title !== undefined ? raw.title
          : raw.full_name !== undefined ? raw.full_name
            : raw.text !== undefined ? raw.text : undefined;
    if (label === undefined) label = value === undefined ? '' : value;
    if (value === undefined) value = label;
    return { value: value, label: label, disabled: !!raw.disabled };
  }

  /*
   * Turns fetchUrl + fetch* options into the same promise fetchOptions would return:
   * { items, hasMore, total }. Honours AbortSignal and the paging context the
   * select passes in, so caching, debounce and "Load more" work unchanged.
   */
  function createRemoteFetcher(opts) {
    return function (query, signal, context) {
      if (typeof fetch !== 'function') {
        return Promise.reject(new Error('This environment has no fetch().'));
      }
      var page = context && context.page ? context.page : 0;
      var pageSize = opts.fetchPageSize > 0 ? opts.fetchPageSize : 0;
      var url;
      try {
        url = new URL(opts.fetchUrl, (typeof location !== 'undefined' && location.href) || undefined);
      } catch (error) {
        return Promise.reject(new Error('Invalid fetchUrl: ' + opts.fetchUrl));
      }
      if (opts.fetchParams && typeof opts.fetchParams === 'object' && !Array.isArray(opts.fetchParams)) {
        Object.keys(opts.fetchParams).forEach(function (key) {
          var value = opts.fetchParams[key];
          if (value === null || value === undefined) return;
          url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
        });
      }
      if (opts.fetchQueryParam) url.searchParams.set(opts.fetchQueryParam, query || '');
      if (pageSize > 0 && opts.fetchPageSizeParam) {
        url.searchParams.set(opts.fetchPageSizeParam, String(pageSize));
      }
      if (opts.fetchSkipParam) {
        if (pageSize > 0) url.searchParams.set(opts.fetchSkipParam, String(page * pageSize));
      } else if (opts.fetchPageParam) {
        url.searchParams.set(opts.fetchPageParam, String(page + 1));
      }

      var headers = { Accept: 'application/json' };
      if (opts.fetchHeaders && typeof opts.fetchHeaders === 'object') {
        Object.keys(opts.fetchHeaders).forEach(function (key) {
          headers[key] = opts.fetchHeaders[key];
        });
      }

      var method = String(opts.fetchMethod || 'GET').toUpperCase();
      var init = {
        method: method,
        headers: headers,
        signal: signal,
        credentials: opts.fetchCredentials || 'same-origin'
      };
      if (opts.fetchBody !== null && opts.fetchBody !== undefined && method !== 'GET' && method !== 'HEAD') {
        if (typeof opts.fetchBody === 'string') {
          init.body = opts.fetchBody;
        } else {
          try {
            init.body = JSON.stringify(opts.fetchBody);
          } catch (error) {
            return Promise.reject(new Error('fetchBody must be JSON-serialisable.'));
          }
          var hasContentType = Object.keys(headers).some(function (key) {
            return key.toLowerCase() === 'content-type';
          });
          if (!hasContentType) headers['Content-Type'] = 'application/json';
        }
      }

      return fetch(url.toString(), init).then(function (response) {
        if (!response.ok) {
          throw new Error('Request failed (' + response.status + ' ' + (response.statusText || 'error') + ')');
        }
        return response.json();
      }).then(function (body) {
        var rows = opts.fetchItemsPath ? readDotPath(body, opts.fetchItemsPath) : firstRemoteArray(body);
        if (!Array.isArray(rows)) rows = rows === undefined || rows === null ? [] : [rows];
        var items = rows.map(remoteItem).filter(Boolean);

        var hasMore;
        if (opts.fetchHasMorePath) hasMore = !!readDotPath(body, opts.fetchHasMorePath);
        var rawTotal = opts.fetchTotalPath ? readDotPath(body, opts.fetchTotalPath)
          : (body && typeof body === 'object' ? body.total : undefined);
        var total = rawTotal === undefined || rawTotal === null ? NaN : Number(rawTotal);
        if (hasMore === undefined && isFinite(total) && pageSize > 0) {
          hasMore = (page + 1) * pageSize < total;
        }
        if (hasMore === undefined) hasMore = pageSize > 0 && items.length >= pageSize;

        return { items: items, hasMore: hasMore, total: isFinite(total) ? total : undefined };
      });
    };
  }

  function ZidanSelect(target, options) {
    if (!(this instanceof ZidanSelect)) return new ZidanSelect(target, options);
    if (!doc) throw new Error('ZidanSelect requires a DOM environment.');

    var element = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!isElement(element)) throw new Error('ZidanSelect: target element not found.');
    if (element.__zidanSelect instanceof ZidanSelect) {
      element.__zidanSelect.destroy();
    }

    this.el = element;
    this.opts = this._normalizeOptions(options || {});
    this.mode = this.opts.mode;
    this.layout = this.opts.layout;
    this.id = this.opts.id || uid('zs');
    this.isMount = /^(DIV|SPAN|SECTION|ARTICLE|FORM-FIELD)$/i.test(element.tagName) ||
      (element.hasAttribute('data-zidan-select') || hasClass(element, 'zidan-select')) &&
      !/^(SELECT|INPUT|TEXTAREA)$/i.test(element.tagName);
    this.native = this.isMount ? null : element;
    this.syncEl = null;

    this.items = [];
    this.value_ = [];
    this.tags = [];
    this.activeIndex = -1;
    this.opened = false;
    this.loading = false;
    this.error = null;
    this.query = '';
    this.rendered = [];
    this.listeners = new Map();
    this.asyncController = null;
    this.asyncItems = null;
    this.asyncQuery = '';
    this.asyncPage = 0;
    this.hasMore = false;
    this.fetchingMore = false;
    this.loadMoreError = null;
    this._fetchCache = Object.create(null);
    this._cacheKeys = [];
    this.timer = null;

    this.disabled_ = !!this.opts.disabled;
    this.destroyed = false;
    this.resizeObserver = null;

    this._prepareData();
    this._build();
    this._prepareSync();
    this._bind();
    this._setInitialValue();
    this._render();
    this._observeResize();

    element.__zidanSelect = this;
    this.emit('init', { instance: this, mode: this.mode, layout: this.layout, framework: this.framework });
    this.call('onInit', { instance: this, mode: this.mode, value: this.getValue() });
  }

  /* ---------------- option normalisation ---------------- */

  ZidanSelect.prototype._normalizeOptions = function (options) {
    options = mergeOptions(parseOptionsAttr(this.el), options);
    var d = this.el.dataset || {};
    var isNativeSelect = this.el.tagName === 'SELECT';
    var isTagsMount = /tags/i.test(d.zidanSelect || '') || /tags/i.test(d.zidanMode || '');

    var mode = options.mode || d.zidanMode || d.zidanSelect || (isTagsMount ? 'tags' : 'select');
    mode = String(mode).toLowerCase();
    if (mode === 'multi' || mode === 'multiselect') mode = 'select';
    if (['select', 'combobox', 'tags'].indexOf(mode) === -1) mode = 'select';

    var nativeMultiple = isNativeSelect ? this.el.multiple : false;

    var framework = options.themeFramework || d.zidanFramework || 'auto';
    framework = String(framework).toLowerCase();
    if (FRAMEWORKS.indexOf(framework) === -1) framework = 'auto';

    var layout = options.layout || d.zidanLayout || 'classic-clean';
    layout = String(layout).toLowerCase();
    if (LAYOUTS.indexOf(layout) === -1) layout = 'classic-clean';

    var scrollbar = options.scrollbar || d.zidanScrollbar || DEFAULTS.scrollbar;
    scrollbar = String(scrollbar).toLowerCase();
    if (SCROLLBARS.indexOf(scrollbar) === -1) scrollbar = DEFAULTS.scrollbar;

    var pick = function (key, fallback) {
      return options[key] !== undefined && options[key] !== null ? options[key] : fallback;
    };

    var placeholderDefault = mode === 'tags' ? 'Add a tag…' : (mode === 'combobox' ? 'Type to search…' : 'Select an option…');
    var fetchHeaders = null;
    if (d.zidanFetchHeaders) {
      try {
        var parsedHeaders = JSON.parse(d.zidanFetchHeaders);
        if (parsedHeaders && typeof parsedHeaders === 'object' && !Array.isArray(parsedHeaders)) fetchHeaders = parsedHeaders;
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) console.warn('ZidanSelect: data-zidan-fetch-headers must be a JSON object.');
      }
    }
    var fetchParams = null;
    if (d.zidanFetchParams) {
      try {
        var parsedParams = JSON.parse(d.zidanFetchParams);
        if (parsedParams && typeof parsedParams === 'object' && !Array.isArray(parsedParams)) fetchParams = parsedParams;
      } catch (error) {
        if (typeof console !== 'undefined' && console.warn) console.warn('ZidanSelect: data-zidan-fetch-params must be a JSON object.');
      }
    }
    var fetchBody = null;
    if (d.zidanFetchBody !== undefined && d.zidanFetchBody !== '') {
      try {
        fetchBody = JSON.parse(d.zidanFetchBody);
      } catch (error) {
        fetchBody = d.zidanFetchBody;
      }
    }

    var merged = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      merged[key] = DEFAULTS[key];
    });

    merged.mode = mode;
    merged.layout = layout;
    merged.themeFramework = framework;
    merged.multiple = mode === 'tags' ? true : pick('multiple', nativeMultiple || readBoolAttr(d.zidanMultiple, false));
    merged.searchable = pick('searchable', readBoolAttr(d.zidanSearchable, mode !== 'select'));
    merged.clearable = pick('clearable', readBoolAttr(d.zidanClearable, false));
    merged.closeOnSelect = pick('closeOnSelect', readBoolAttr(d.zidanCloseOnSelect, null));
    merged.disabled = pick('disabled', readBoolAttr(d.zidanDisabled, isNativeSelect ? this.el.disabled : false));
    merged.required = pick('required', readBoolAttr(d.zidanRequired, isNativeSelect ? this.el.required : false));
    merged.placeholder = pick('placeholder',
      d.zidanPlaceholder || (this.el.getAttribute && this.el.getAttribute('placeholder')) || placeholderDefault);
    merged.label = pick('label', d.zidanLabel || null);
    merged.ariaLabel = pick('ariaLabel', d.zidanAriaLabel || null);
    merged.name = pick('name', d.zidanName || (this.el.getAttribute && this.el.getAttribute('name')) || null);
    merged.allowFreeText = pick('allowFreeText', readBoolAttr(d.zidanAllowFreeText, mode === 'tags'));
    merged.maxTags = pick('maxTags', d.zidanMaxTags ? parseInt(d.zidanMaxTags, 10) || Infinity : DEFAULTS.maxTags);
    merged.minTagLength = pick('minTagLength', d.zidanMinTagLength ? parseInt(d.zidanMinTagLength, 10) || 1 : DEFAULTS.minTagLength);
    merged.maxTagLength = pick('maxTagLength', d.zidanMaxTagLength ? parseInt(d.zidanMaxTagLength, 10) || Infinity : DEFAULTS.maxTagLength);
    merged.reorderable = pick('reorderable', readBoolAttr(d.zidanReorderable, false));
    merged.editable = pick('editable', readBoolAttr(d.zidanEditable, false));
    merged.caseSensitive = pick('caseSensitive', readBoolAttr(d.zidanCaseSensitive, false));
    merged.validation = pick('validation', d.zidanValidation || null);
    merged.options = pick('options', null);
    merged.suggestions = pick('suggestions', null);
    merged.fetchPageSize = pick('fetchPageSize', d.zidanFetchPageSize ? parseInt(d.zidanFetchPageSize, 10) || 0 : DEFAULTS.fetchPageSize);
    merged.autoLoadMore = pick('autoLoadMore', readBoolAttr(d.zidanAutoLoadMore, DEFAULTS.autoLoadMore));
    merged.cacheResults = pick('cacheResults', readBoolAttr(d.zidanCacheResults, DEFAULTS.cacheResults));
    merged.loadMoreText = pick('loadMoreText', d.zidanLoadMoreText || DEFAULTS.loadMoreText);
    merged.fetchUrl = pick('fetchUrl', d.zidanFetchUrl || null);
    merged.fetchMethod = pick('fetchMethod', d.zidanFetchMethod || DEFAULTS.fetchMethod);
    merged.fetchHeaders = pick('fetchHeaders', fetchHeaders);
    merged.fetchCredentials = pick('fetchCredentials', d.zidanFetchCredentials || DEFAULTS.fetchCredentials);
    merged.fetchParams = pick('fetchParams', fetchParams);
    merged.fetchBody = pick('fetchBody', fetchBody);
    merged.fetchQueryParam = pick('fetchQueryParam', d.zidanFetchQueryParam !== undefined ? d.zidanFetchQueryParam : DEFAULTS.fetchQueryParam);
    merged.fetchPageParam = pick('fetchPageParam', d.zidanFetchPageParam !== undefined ? d.zidanFetchPageParam : DEFAULTS.fetchPageParam);
    merged.fetchSkipParam = pick('fetchSkipParam', d.zidanFetchSkipParam || null);
    merged.fetchPageSizeParam = pick('fetchPageSizeParam', d.zidanFetchPageSizeParam !== undefined ? d.zidanFetchPageSizeParam : DEFAULTS.fetchPageSizeParam);
    merged.fetchItemsPath = pick('fetchItemsPath', d.zidanFetchItemsPath || null);
    merged.fetchTotalPath = pick('fetchTotalPath', d.zidanFetchTotalPath || null);
    merged.fetchHasMorePath = pick('fetchHasMorePath', d.zidanFetchHasMorePath || null);
    merged.accentInsensitive = pick('accentInsensitive', readBoolAttr(d.zidanAccentInsensitive, DEFAULTS.accentInsensitive));
    merged.highlightMatches = pick('highlightMatches', readBoolAttr(d.zidanHighlightMatches, DEFAULTS.highlightMatches));
    merged.typeAhead = pick('typeAhead', readBoolAttr(d.zidanTypeAhead, DEFAULTS.typeAhead));
    merged.typeAheadTimeout = pick('typeAheadTimeout', d.zidanTypeAheadTimeout ? parseInt(d.zidanTypeAheadTimeout, 10) || DEFAULTS.typeAheadTimeout : DEFAULTS.typeAheadTimeout);
    merged.virtual = pick('virtual', parseVirtual(d.zidanVirtual));
    merged.virtualThreshold = pick('virtualThreshold', d.zidanVirtualThreshold ? parseInt(d.zidanVirtualThreshold, 10) || DEFAULTS.virtualThreshold : DEFAULTS.virtualThreshold);
    merged.itemHeight = pick('itemHeight', d.zidanItemHeight ? parseInt(d.zidanItemHeight, 10) || 0 : DEFAULTS.itemHeight);
    merged.locale = pick('locale', d.zidanLocale || (doc && doc.documentElement ? doc.documentElement.lang : null) || DEFAULTS.locale);

    // carry over every explicitly-passed option (callbacks, custom classes, ...)
    Object.keys(options).forEach(function (key) {
      if (options[key] !== undefined) merged[key] = options[key];
    });

    // these three are authoritative after the merge
    merged.mode = mode;
    merged.layout = layout;
    merged.themeFramework = framework;
    merged.scrollbar = scrollbar;
    merged.theme = pick('theme', d.zidanTheme || d.zsTheme || DEFAULTS.theme);
    if (mode === 'combobox') merged.searchable = true;
    if (mode === 'tags' && merged.searchable === false) merged.searchable = true;
    if (mode === 'tags') merged.multiple = true;

    /* locale packs fill in built-in copy unless the caller overrode it */
    var localeSetting = merged.locale;
    var localeName = typeof localeSetting === 'string' ? String(localeSetting).slice(0, 2).toLowerCase() : '';
    var localePack = localeSetting && typeof localeSetting === 'object' ? localeSetting : LOCALES[localeName];
    if (localePack) {
      ['noResultsText', 'emptyText', 'loadingText', 'clearText', 'loadMoreText'].forEach(function (key) {
        if (merged[key] === DEFAULTS[key] && localePack[key]) merged[key] = localePack[key];
      });
      if (merged.requiredText === DEFAULTS.requiredText && localePack.requiredText) merged.requiredText = localePack.requiredText;
      if (merged.placeholder === placeholderDefault && localePack.placeholder) merged.placeholder = localePack.placeholder;
      merged.locale = typeof localeSetting === 'object' ? localeSetting : localeName;
    } else {
      merged.locale = null;
    }

    // declarative AJAX: one URL is enough to opt into remote loading
    if (merged.fetchUrl && typeof merged.fetchOptions !== 'function') {
      merged.fetchOptions = createRemoteFetcher(merged);
    }
    return merged;
  };

  ZidanSelect.prototype._prepareData = function () {
    var source = this.opts.options;
    if (!source && this.el.tagName === 'SELECT') source = this._optionsFromSelect(this.el);
    if (!source) source = this.opts.suggestions || [];
    this.items = this._normalizeItems(source);
    if (this.mode === 'tags') {
      var suggestionSource = this.opts.suggestions || this.opts.options;
      if (!suggestionSource && this.el.tagName === 'SELECT') suggestionSource = this._optionsFromSelect(this.el);
      this.suggestions = this._normalizeItems(suggestionSource || []);
    }
  };

  ZidanSelect.prototype._optionsFromSelect = function (select) {
    var out = [];
    Array.prototype.slice.call(select.children || []).forEach(function (node) {
      if (node.tagName === 'OPTGROUP') {
        var groupLabel = node.label || '';
        Array.prototype.slice.call(node.children).forEach(function (opt) {
          if (opt.tagName !== 'OPTION') return;
          out.push({
            value: opt.value,
            label: opt.textContent.trim(),
            group: groupLabel,
            disabled: opt.disabled
          });
        });
      } else if (node.tagName === 'OPTION') {
        out.push({
          value: node.value,
          label: node.textContent.trim(),
          disabled: node.disabled
        });
      }
    });
    return out;
  };

  ZidanSelect.prototype._normalizeItems = function (input) {
    var list = toArray(input);
    var out = [];
    var self = this;

    list.forEach(function (item, index) {
      if (item === null || item === undefined) return;
      if (typeof item === 'string' || typeof item === 'number') {
        out.push({ value: String(item), label: String(item), group: null, disabled: false });
        return;
      }
      if (typeof item === 'object' && Array.isArray(item.options)) {
        var groupName = item.label !== undefined ? String(item.label) : (item.group || '');
        self._normalizeItems(item.options).forEach(function (child) {
          child.group = groupName;
          out.push(child);
        });
        return;
      }
      if (typeof item === 'object') {
        var value = item.value !== undefined ? item.value : item.label !== undefined ? item.label : index;
        out.push({
          value: String(value),
          label: item.label !== undefined ? String(item.label) : String(value),
          group: item.group !== undefined ? String(item.group) : null,
          disabled: !!item.disabled,
          data: item.data
        });
      }
    });
    return out;
  };

  /* ---------------- DOM building ---------------- */

  ZidanSelect.prototype._resolveFramework = function () {
    if (this.opts.themeFramework && this.opts.themeFramework !== 'auto') return this.opts.themeFramework;
    if (!doc) return 'vanilla';
    var declared = inheritedAttr(this.el, ['data-zidan-framework', 'data-zs-framework']);
    if (!declared) declared = doc.documentElement.getAttribute('data-zs-framework') || '';
    declared = declared ? String(declared).toLowerCase() : '';
    if (declared && declared !== 'auto' && FRAMEWORKS.indexOf(declared) !== -1) return declared;
    try {
      var rootStyle = global.getComputedStyle(doc.documentElement);
      var bsBg = rootStyle.getPropertyValue('--bs-body-bg');
      if (bsBg && bsBg.trim()) return 'bootstrap';
      var sheets = doc.styleSheets || [];
      for (var i = 0; i < sheets.length; i += 1) {
        var href = sheets[i].href || '';
        if (/bootstrap(\.min)?\.css/i.test(href)) return 'bootstrap';
        if (/tailwind/i.test(href)) return 'tailwind';
      }
      if (doc.body && global.getComputedStyle(doc.body).getPropertyValue('--tw-ring-offset-shadow') !== '') return 'tailwind';
      if (doc.querySelector('.btn-primary, .form-select, .form-control, .navbar')) return 'bootstrap';
    } catch (err) { /* ignore: cross-origin or no CSSOM */ }
    return 'vanilla';
  };

  ZidanSelect.prototype._applyCustomClass = function (node, key) {
    var map = this.opts.customClasses || {};
    var value = map[key];
    if (value) addClass(node, value);
    return node;
  };

  ZidanSelect.prototype._toggleCustomClass = function (node, key, on) {
    var map = this.opts.customClasses || {};
    var value = map[key];
    if (!value) return node;
    String(value).split(/\s+/).forEach(function (cls) {
      if (!cls) return;
      if (on) node.classList.add(cls);
      else node.classList.remove(cls);
    });
    return node;
  };

  ZidanSelect.prototype._build = function () {
    var self = this;
    var opts = this.opts;
    this.framework = this._resolveFramework();

    var existingWrapper = this.el.parentNode && this.el.parentNode.classList &&
      this.el.parentNode.classList.contains('zs-root--mount');

    var scope = resolveScope(this.el, { theme: opts.theme, framework: opts.themeFramework, layout: opts.layout });
    this.themeMode = scope.theme;
    this.theme = resolveThemeName(scope.theme);

    var rootEl = el('div', 'zs-root');
    rootEl.id = this.id + '-root';
    rootEl.setAttribute('data-zs-theme', this.theme);
    if (typeof opts.locale === 'string' && opts.locale) rootEl.setAttribute('lang', opts.locale);
    rootEl.setAttribute('data-zs-layout', this.layout);
    rootEl.setAttribute('data-zs-framework', this.framework);
    rootEl.setAttribute('data-zs-mode', this.mode);
    rootEl.setAttribute('data-zs-scrollbar', opts.scrollbar || 'default');
    if (isRtl(this.el)) rootEl.setAttribute('dir', 'rtl');
    rootEl.classList.add('zs-root--' + this.mode);
    if (this.mode === 'tags') rootEl.classList.add('zs-root--multiple');
    if (opts.multiple && this.mode === 'select') rootEl.classList.add('zs-root--multiple');
    if (this.layout === 'floating-label') rootEl.classList.add('zs-root--labeled');
    this._applyCustomClass(rootEl, 'root');

    /* control ------------------------------------------------------- */
    var control = el('div', 'zs-control');
    if (this.framework === 'bootstrap') {
      control.classList.add('form-control', 'zs-bootstrap-control');
      if (this.el.tagName === 'SELECT') control.classList.add('form-select');
    }
    this._applyCustomClass(control, 'control');

    var chips = el('div', 'zs-chips');
    chips.hidden = true;

    var input = doc.createElement('input');
    input.type = 'text';
    input.className = 'zs-input';
    input.id = this.id + '-input';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', this.id + '-listbox');
    input.setAttribute('aria-autocomplete', (opts.searchable || this.mode !== 'select') ? 'list' : 'none');
    input.setAttribute('aria-haspopup', 'listbox');
    /* a plain select is not type-to-filter: keep its text field read-only so
       typing cannot filter or hide the options */
    if (this.mode === 'select' && !opts.searchable) input.readOnly = true;
    if (opts.ariaLabel || opts.label) input.setAttribute('aria-label', opts.ariaLabel || opts.label);
    /* the native control is hidden, so carry its own accessible name over */
    if (!opts.ariaLabel && !opts.label && this.el.getAttribute) {
      var nativeAriaLabel = this.el.getAttribute('aria-label');
      if (nativeAriaLabel) input.setAttribute('aria-label', nativeAriaLabel);
    }
    /* the combobox is a new <input>, so an author <label for="select-id"> no
       longer names it; point aria-labelledby at that label instead */
    if (!input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby') && this.el.labels && this.el.labels[0]) {
      var sourceLabel = this.el.labels[0];
      if (!sourceLabel.id) sourceLabel.id = this.id + '-label';
      input.setAttribute('aria-labelledby', sourceLabel.id);
    }
    if (opts.disabled) input.disabled = true;
    this._applyCustomClass(input, 'input');

    var labelEl = null;
    if (opts.label) {
      labelEl = el('label', 'zs-label', { for: input.id });
      labelEl.textContent = opts.label;
      if (this.layout !== 'floating-label') rootEl.classList.add('zs-root--has-static-label');

      // Hide the author's <label>: this label replaces it, and showing both
      // would print the same text twice above the control.
      var authorLabel = this.el.labels && this.el.labels[0] ? this.el.labels[0] : null;
      if (authorLabel && authorLabel.closest && authorLabel.closest('.zs-root')) authorLabel = null;
      this._authorLabel = authorLabel || null;
      if (authorLabel) {
        authorLabel.hidden = true;
        authorLabel.setAttribute('data-zs-hidden-label', 'true');
      }
    }

    var clearBtn = el('button', 'zs-clear', {
      type: 'button',
      tabindex: '-1',
      'aria-label': opts.clearText,
      title: opts.clearText
    });
    clearBtn.innerHTML = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true" focusable="false"><path d="M3 3l10 10M13 3L3 13" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    clearBtn.hidden = true;

    var arrow = el('span', 'zs-arrow', { 'aria-hidden': 'true' });
    arrow.innerHTML = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    control.appendChild(chips);
    control.appendChild(input);
    control.appendChild(clearBtn);
    control.appendChild(arrow);

    if (labelEl) {
      if (this.layout === 'floating-label') control.insertBefore(labelEl, chips);
      else rootEl.appendChild(labelEl);
    }

    /* dropdown ------------------------------------------------------ */
    var dropdown = el('div', 'zs-dropdown');
    dropdown.id = this.id + '-listbox';
    dropdown.setAttribute('role', 'listbox');
    dropdown.setAttribute('aria-multiselectable', String(!!(opts.multiple || this.mode === 'tags')));
    this._applyCustomClass(dropdown, 'dropdown');

    var live = el('div', 'zs-live', { 'aria-live': 'polite', 'aria-atomic': 'true' });

    rootEl.appendChild(control);
    rootEl.appendChild(dropdown);
    rootEl.appendChild(live);

    if (this.framework === 'bootstrap') {
      if (opts.validation === 'invalid') control.classList.add('is-invalid');
      if (opts.validation === 'valid') control.classList.add('is-valid');
      if (this.mode === 'tags' || opts.multiple) rootEl.classList.add('zs-root--bootstrap');
    }

    /* mount into DOM ------------------------------------------------ */
    if (this.isMount) {
      if (!existingWrapper) this.el.classList.add('zs-root--mount');
      this.el.appendChild(rootEl);
    } else {
      this.el.parentNode.insertBefore(rootEl, this.el);
    }

    this.root = rootEl;
    if (this.themeMode === 'auto') trackAutoTheme(rootEl);
    this.controlEl = control;
    this.chipsEl = chips;
    this.input = input;
    this.dropdown = dropdown;
    this.clearBtn = clearBtn;
    this.arrowEl = arrow;
    this.labelEl = labelEl;
    this.liveEl = live;
  };

  ZidanSelect.prototype.setTheme = function (name) {
    var next = pickList(name, THEMES, this.themeMode);
    this.themeMode = next;
    this.opts.theme = next;
    this.theme = resolveThemeName(next);
    if (this.root) {
      if (next === 'auto') trackAutoTheme(this.root);
      else {
        untrackAutoTheme(this.root);
        this.root.setAttribute('data-zs-theme', next);
      }
    }
    return this;
  };

  ZidanSelect.prototype._prepareSync = function () {
    var self = this;
    var opts = this.opts;

    if (this.native) {
      if (this.native.tagName === 'SELECT') {
        this.syncEl = this.native;
        if (this.native.multiple) {
          this.opts.multiple = true;
          this.root.classList.add('zs-root--multiple');
        }
        this.native.hidden = true;
        this.native.classList.add('zs-native');
        this.native.setAttribute('tabindex', '-1');
        this.native.setAttribute('aria-hidden', 'true');
      } else {
        this.syncEl = this.native;
        this.native.hidden = true;
        this.native.setAttribute('tabindex', '-1');
        this.native.setAttribute('aria-hidden', 'true');
      }
      if (opts.required) this.input.setAttribute('aria-required', 'true');
      this.form = this.native.closest ? this.native.closest('form') : null;
    } else {
      if (opts.name) {
        var hidden = el('input', 'zs-hidden', { type: 'hidden', name: opts.name });
        this.root.appendChild(hidden);
        this.syncEl = hidden;
        this.form = this.el.closest ? this.el.closest('form') : null;
      } else {
        this.form = this.el.closest ? this.el.closest('form') : null;
      }
    }

    if (this.form) {
      this.onFormReset = function () {
        setTimeout(function () { self._handleFormReset(); }, 0);
      };
      this.form.addEventListener('reset', this.onFormReset);
    }

    /* `required` is a JS-only option as well as a native attribute. A native
       select can carry it directly; a mount-mode div needs a submit guard. */
    if (opts.required && this.native && this.native.tagName === 'SELECT' && !this.native.required) {
      this.native.required = true;
      this._nativeRequiredAdded = true;
    } else if (opts.required && !this.native && this.form) {
      this.onFormSubmit = function (event) {
        if (self.value_.length) return;
        event.preventDefault();
        self.setValidation('invalid');
        if (self.input && self.input.focus) self.input.focus();
        self.announce(self.opts.requiredText || 'Please select an option.');
      };
      this.form.addEventListener('submit', this.onFormSubmit);
    }
    return this.syncEl;
  };

  /* ---------------- initial value ---------------- */

  ZidanSelect.prototype._setInitialValue = function () {
    var opts = this.opts;
    var initial = opts.value;

    if (initial === null || initial === undefined) {
      if (this.native && this.native.tagName === 'SELECT') {
        initial = this.native.multiple
          ? Array.prototype.filter.call(this.native.options, function (o) { return o.selected; }).map(function (o) { return o.value; })
          : this.native.value;
      } else if (this.native) {
        initial = this.native.value;
      }
    }

    if (this.mode === 'tags') {
      var raw = initial;
      if (typeof raw === 'string' && raw && !Array.isArray(raw) && this.syncEl && this.syncEl.tagName !== 'SELECT') {
        raw = raw.split(opts.valueDelimiter);
      }
      toArray(raw).forEach(function (tag) { this._addTagObject(String(tag), { silent: true }); }, this);
      return;
    }

    if (initial === null || initial === undefined || initial === '') return;
    this._setValueInternal(initial, { silent: true });
  };

  ZidanSelect.prototype._handleFormReset = function () {
    var initial;
    if (this.native && this.native.tagName === 'SELECT') {
      initial = this.native.multiple
        ? Array.prototype.filter.call(this.native.options, function (o) { return o.selected; }).map(function (o) { return o.value; })
        : this.native.value;
    } else if (this.native) {
      initial = this.native.value;
    } else if (this.opts.value !== null && this.opts.value !== undefined) {
      initial = this.opts.value;
    }

    if (this.mode === 'tags') {
      this.value_ = [];
      toArray(initial).forEach(function (tag) { this._addTagObject(String(tag), { silent: true }); }, this);
      this._render();
      this._syncNative();
      return;
    }
    this._setValueInternal(initial, { silent: true });
    this._render();
  };

  /* ---------------- value helpers ---------------- */

  ZidanSelect.prototype._hasValue = function (value) {
    var needle = this.opts.caseSensitive ? String(value) : String(value).toLowerCase();
    for (var i = 0; i < this.value_.length; i += 1) {
      var current = this.opts.caseSensitive ? this.value_[i].value : this.value_[i].value.toLowerCase();
      if (current === needle) return true;
    }
    return false;
  };

  ZidanSelect.prototype._itemFor = function (value) {
    var needle = String(value);
    for (var i = 0; i < this.items.length; i += 1) {
      if (this.items[i].value === needle) return this.items[i];
    }
    for (var j = 0; j < this.value_.length; j += 1) {
      if (this.value_[j].value === needle) return this.value_[j];
    }
    return { value: needle, label: needle };
  };

  ZidanSelect.prototype._setValueInternal = function (input, config) {
    var cfg = config || {};
    var previous = this.getValue();
    var self = this;
    var values = toArray(input);
    var next = [];

    values.forEach(function (value) {
      if (value === null || value === undefined || value === '') return;
      if (typeof value === 'object') {
        next.push({ value: String(value.value !== undefined ? value.value : value.label), label: String(value.label !== undefined ? value.label : value.value), data: value.data });
        return;
      }
      var str = String(value);
      var match = null;
      for (var i = 0; i < self.items.length; i += 1) {
        if (self.items[i].value === str) { match = self.items[i]; break; }
      }
      next.push(match ? { value: match.value, label: match.label, data: match.data } : { value: str, label: str });
    });

    if (!this.opts.multiple && this.mode !== 'tags') next = next.slice(0, 1);
    this.value_ = next;
    /* a preset/manual invalid state is only cleared by a real value change, not
       by the initial value applied during construction */
    if (next.length && this.opts.validation === 'invalid' && !cfg.silent) this.opts.validation = null;
    this._render();
    this._syncNative();
    if (!cfg.silent) {
      var current = this.getValue();
      if (current !== previous && JSON.stringify(current) !== JSON.stringify(previous)) {
        this.emit('change', { value: current, previousValue: previous, instance: this });
        this.call('onChange', { value: current, previousValue: previous, instance: this });
      }
    }
    return this;
  };

  ZidanSelect.prototype._syncNative = function () {
    var sel = this.syncEl;
    if (!sel) return;
    var values = this.value_.map(function (v) { return v.value; });

    if (sel.tagName === 'SELECT') {
      var i;
      if (sel.multiple) {
        for (i = 0; i < sel.options.length; i += 1) {
          sel.options[i].selected = values.indexOf(sel.options[i].value) !== -1;
        }
        var existing = Array.prototype.map.call(sel.options, function (o) { return o.value; });
        values.forEach(function (value) {
          if (existing.indexOf(value) === -1) {
            var option = doc.createElement('option');
            option.value = value;
            option.textContent = value;
            option.selected = true;
            sel.appendChild(option);
          }
        });
      } else {
        var target = values[0];
        if (target === undefined) {
          sel.value = '';
        } else {
          var found = false;
          for (i = 0; i < sel.options.length; i += 1) {
            if (sel.options[i].value === target) { found = true; break; }
          }
          if (!found) {
            var newOption = doc.createElement('option');
            newOption.value = target;
            newOption.textContent = this._itemFor(target).label;
            sel.appendChild(newOption);
          }
          sel.value = target;
        }
      }
    } else {
      sel.value = (this.opts.multiple || this.mode === 'tags')
        ? values.join(this.opts.valueDelimiter)
        : (values[0] || '');
    }
  };

  /* ---------------- rendering ---------------- */

  ZidanSelect.prototype._render = function () {
    var opts = this.opts;
    var hasValue = this.value_.length > 0;

    this.root.classList.toggle('zs-root--has-value', hasValue);
    this.root.classList.toggle('zs-root--open', this.opened);
    this.root.classList.toggle('zs-root--disabled', !!this.disabled_);
    this.root.classList.toggle('zs-root--invalid', opts.validation === 'invalid');
    this.root.classList.toggle('zs-root--valid', opts.validation === 'valid');
    if (opts.validation === 'invalid') this.root.setAttribute('data-zs-validation', 'invalid');
    else if (opts.validation === 'valid') this.root.setAttribute('data-zs-validation', 'valid');
    else this.root.removeAttribute('data-zs-validation');
    if (opts.validation === 'invalid') this.input.setAttribute('aria-invalid', 'true');
    else if (opts.validation === 'valid') this.input.setAttribute('aria-invalid', 'false');
    else this.input.removeAttribute('aria-invalid');
    if (this.el.required || opts.required) this.input.setAttribute('aria-required', 'true');

    if (opts.validation === 'invalid') this.controlEl.classList.add('is-invalid');
    else this.controlEl.classList.remove('is-invalid');
    if (opts.validation === 'valid') this.controlEl.classList.add('is-valid');
    else this.controlEl.classList.remove('is-valid');
    this._toggleCustomClass(this.controlEl, 'invalid', opts.validation === 'invalid');

    this._renderChips();
    this._renderInputValue();

    var showClear = opts.clearable && hasValue && !this.disabled_;
    this.clearBtn.hidden = !showClear;
    this.clearBtn.tabIndex = showClear ? 0 : -1;

    this.input.disabled = !!this.disabled_;
    this.input.setAttribute('aria-expanded', String(this.opened));
    this.root.classList.toggle('zs-root--placeholder', !this.input.value && !hasValue);

    return this;
  };

  ZidanSelect.prototype._renderChips = function () {
    var self = this;
    var multi = this.mode === 'tags' || !!this.opts.multiple;
    var chips = this.chipsEl;

    chips.textContent = '';
    chips.hidden = !multi;
    if (!multi) return;

    this.value_.forEach(function (item, index) {
      var chip = el('span', 'zs-chip', { 'data-zs-index': index });
      if (self.framework === 'bootstrap') addClass(chip, 'badge rounded-pill');
      self._applyCustomClass(chip, 'chip');
      if (self.mode === 'tags' && self.opts.reorderable) {
        chip.setAttribute('draggable', 'true');
        chip.setAttribute('tabindex', '0');
        chip.setAttribute('title', 'Drag to reorder — or Alt+Left/Right');
        addClass(chip, 'zs-chip--reorderable');
      } else if (self.mode === 'tags' && self.opts.editable) {
        chip.setAttribute('tabindex', '0');
      }
      if (self.mode === 'tags' && self.opts.editable) {
        chip.setAttribute('title', 'Double-click to edit');
        addClass(chip, 'zs-chip--editable');
      }

      var labelNode;
      var custom = typeof self.opts.renderTag === 'function' && self.mode === 'tags'
        ? self.opts.renderTag({ value: item.value, label: item.label }, { index: index, instance: self, disabled: self.disabled_ })
        : null;

      if (self.mode === 'select' && typeof self.opts.renderSelected === 'function') {
        custom = self.opts.renderSelected({ value: item.value, label: item.label }, { index: index, instance: self });
      }

      if (custom) {
        if (isElement(custom)) {
          labelNode = custom;
          chip.appendChild(labelNode);
        } else {
          var holder = el('span', 'zs-chip-label');
          holder.innerHTML = String(custom);
          chip.appendChild(holder);
        }
      } else {
        labelNode = el('span', 'zs-chip-label', null, item.label);
        chip.appendChild(labelNode);
      }

      var removeBtn = el('button', 'zs-chip-remove', {
        type: 'button',
        'aria-label': 'Remove ' + item.label,
        title: 'Remove ' + item.label,
        'data-zs-remove': index
      });
      removeBtn.innerHTML = '<svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true" focusable="false"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      self._applyCustomClass(removeBtn, 'chipRemove');
      chip.appendChild(removeBtn);
      chips.appendChild(chip);
    });

    this.root.classList.toggle('zs-root--has-value', this.value_.length > 0);
  };

  ZidanSelect.prototype._renderInputValue = function () {
    var single = this.mode !== 'tags' && !this.opts.multiple;
    if (!single) {
      this.input.placeholder = this.value_.length ? '' : (this.opts.placeholder || '');
      if (this.opened) {
        this.input.value = this.query;
      } else {
        this.input.value = '';
      }
      return;
    }

    if (this.opened && this.opts.searchable) {
      this.input.value = this.query;
      this.input.placeholder = this.opts.placeholder || '';
      return;
    }
    if (this.opened && !this.opts.searchable) {
      this.input.value = this.value_.length ? this.value_[0].label : '';
      this.input.placeholder = this.opts.placeholder || '';
      return;
    }
    this.input.value = this.value_.length ? this.value_[0].label : '';
    this.input.placeholder = this.opts.placeholder || '';

  };

  /* ---------------- dropdown ---------------- */

  ZidanSelect.prototype._sourceItems = function () {
    if (this.mode === 'tags') return this.suggestions || [];
    if (typeof this.opts.fetchOptions === 'function' && this.asyncItems) return this.asyncItems;
    return this.items;
  };

  /* Diacritic folding: "Cafe" matches "Café", "Zurich" matches "Zürich".
     NFKD + combining-mark strip keeps the comparison length stable for the
     common Latin cases; highlight() falls back when it is not. */
  function foldText(value, keepCase) {
    var text = String(value === null || value === undefined ? '' : value);
    if (text.normalize) {
      try { text = text.normalize('NFKD').replace(/[̀-ͯ]/g, ''); } catch (error) { /* keep text */ }
    }
    return keepCase ? text : text.toLowerCase();
  }

  ZidanSelect.prototype._visibleItems = function () {
    var self = this;
    var query = this.query.trim();
    var source = this._sourceItems();
    var isCaseSensitive = !!this.opts.caseSensitive;
    var accent = !!this.opts.accentInsensitive;
    var remote = typeof this.opts.fetchOptions === 'function' && !!this.asyncItems;

    if (!query) return source.slice();
    // the server already filtered this page; only an explicit filterOption re-checks it
    if (remote && typeof self.opts.filterOption !== 'function') return source.slice();

    var normalize = function (value) {
      return accent ? foldText(value, isCaseSensitive) : (isCaseSensitive ? String(value) : String(value).toLowerCase());
    };
    var needle = normalize(query);

    return source.filter(function (item) {
      if (typeof self.opts.filterOption === 'function') {
        return !!self.opts.filterOption(item, query, {
          instance: self,
          mode: self.mode,
          caseSensitive: isCaseSensitive,
          selected: self._hasValue(item.value)
        });
      }
      if (normalize(item.label).indexOf(needle) !== -1) return true;
      if (self.opts.searchValues && normalize(item.value).indexOf(needle) !== -1) return true;
      return false;
    });
  };

  ZidanSelect.prototype._virtualWindow = function (items, scrollOffset, viewportOverride) {
    var setting = this.opts.virtual;
    var threshold;
    if (setting === true) threshold = 1;
    else if (typeof setting === 'number') threshold = setting;
    else if (setting === 'auto') threshold = this.opts.virtualThreshold || 150;
    else return null;
    /* custom row renderers and paged lists can change row heights / append
       footers, so only flat, fully-local lists are windowed */
    if (this.hasMore || typeof this.opts.renderOption === 'function') return null;
    if (items.length < threshold) return null;
    for (var g = 0; g < items.length; g += 1) {
      if (items[g].group) return null;
    }
    var viewport = typeof viewportOverride === 'number' ? viewportOverride : this.dropdown.clientHeight;
    if (!viewport) return null;
    /* opening animations and re-renders measure a shrunken box; the configured
       cap is the height the list will settle at, so it must cover the viewport */
    if (this.opts.maxDropdownHeight) viewport = Math.max(viewport, this.opts.maxDropdownHeight);
    var rowHeight = this.opts.itemHeight || this._rowHeight || 38;
    var pad = 4;
    var count = Math.max(1, Math.ceil(viewport / rowHeight));
    /* the caller clears the list before rendering, which resets the live
       scrollTop, so re-renders must pass the position they saved first */
    var offset = typeof scrollOffset === 'number' ? scrollOffset : this.dropdown.scrollTop;
    var start = Math.max(0, Math.floor(offset / rowHeight) - pad);
    /* filtering can shrink the list under an old scroll position; clamping keeps
       the window populated instead of slicing past the end */
    start = Math.min(start, Math.max(0, items.length - (count + pad * 2)));
    var end = Math.min(items.length, start + count + pad * 2);
    return {
      start: start,
      end: end,
      top: start * rowHeight,
      bottom: (items.length - end) * rowHeight,
      rowHeight: rowHeight
    };
  };

  /* Keyboard navigation must move the scroll position itself: the window is
     derived from scrollTop, so a far jump (End, type-ahead) would otherwise
     render a slice that does not contain the new active row. */
  ZidanSelect.prototype._revealActiveRow = function () {
    if (!this._virtualState || this.activeIndex < 0) return;
    var rowHeight = this._virtualState.rowHeight;
    var viewport = this.dropdown.clientHeight;
    if (!viewport) return;
    if (this.opts.maxDropdownHeight) viewport = Math.max(viewport, this.opts.maxDropdownHeight);
    var top = this.activeIndex * rowHeight;
    var current = this.dropdown.scrollTop;
    if (top < current) this.dropdown.scrollTop = top;
    else if (top + rowHeight > current + viewport) this.dropdown.scrollTop = top + rowHeight - viewport;
  };

  ZidanSelect.prototype._virtualSpacer = function (height) {
    var spacer = el('div', 'zs-virtual-space', { 'aria-hidden': 'true' });
    spacer.style.height = Math.max(0, height) + 'px';
    return spacer;
  };

  ZidanSelect.prototype._labelNode = function (item, query) {
    var label = el('span', 'zs-option-label');
    var text = item.label === null || item.label === undefined ? '' : String(item.label);
    if (!this.opts.highlightMatches || !query) {
      label.textContent = text;
      return label;
    }
    var folded = foldText(text);
    var needle = foldText(query);
    var at = folded.length === text.length ? folded.indexOf(needle) : -1;
    if (at === -1) at = text.toLowerCase().indexOf(String(query).toLowerCase());
    if (at === -1 || !needle) {
      label.textContent = text;
      return label;
    }
    label.appendChild(doc.createTextNode(text.slice(0, at)));
    label.appendChild(el('mark', 'zs-match', null, text.slice(at, at + String(query).length)));
    label.appendChild(doc.createTextNode(text.slice(at + String(query).length)));
    return label;
  };

  ZidanSelect.prototype._renderDropdown = function () {
    var self = this;
    if (!this.opened) return;

    var scrollTop = this.dropdown.scrollTop;
    var viewport = this.dropdown.clientHeight;
    this.dropdown.textContent = '';
    this.rendered = [];
    this._virtualState = null;

    if (this.loading) {
      var loading = el('div', 'zs-state zs-state--loading', { role: 'status' });
      loading.appendChild(el('span', 'zs-spinner', { 'aria-hidden': 'true' }));
      loading.appendChild(el('span', 'zs-state-text', null, this.opts.loadingText));
      this.dropdown.appendChild(loading);
    } else if (this.error) {
      var errorEl = el('div', 'zs-state zs-state--error', { role: 'status' }, this.error.message || 'Something went wrong.');
      this.dropdown.appendChild(errorEl);
    } else {
      var items = this._visibleItems();

      if (!items.length) {
        var emptyText = this.query ? this.opts.noResultsText : this.opts.emptyText;
        this.dropdown.appendChild(el('div', 'zs-state zs-state--empty', { role: 'status' }, emptyText));
        this.emit('no-results', { query: this.query, instance: this });
      } else {
        var virtualWindow = self._virtualWindow(items, scrollTop, viewport);
        var firstIndex = virtualWindow ? virtualWindow.start : 0;
        var lastIndex = virtualWindow ? virtualWindow.end : items.length;
        var lastGroup = null;
        var groupWrap = null;
        var groupSeq = 0;
        /* build the whole list off-document and insert it once: appending each
           option to the live dropdown forced a layout per row on large lists */
        var fragment = doc.createDocumentFragment();

        if (virtualWindow && virtualWindow.top > 0) {
          fragment.appendChild(self._virtualSpacer(virtualWindow.top));
        }

        items.slice(firstIndex, lastIndex).forEach(function (item, offset) {
          var index = firstIndex + offset;

          if (!virtualWindow) {
            if (item.group && item.group !== lastGroup) {
              groupSeq += 1;
              var groupId = self.id + '-grp-' + groupSeq;
              groupWrap = el('div', 'zs-group', { role: 'group', 'aria-labelledby': groupId });
              groupWrap.appendChild(el('div', 'zs-group-label', { id: groupId }, item.group));
              fragment.appendChild(groupWrap);
              lastGroup = item.group;
            } else if (!item.group) {
              groupWrap = null;
              lastGroup = null;
            }
          }

          var selected = self._hasValue(item.value);
          var option = el('div', 'zs-option', {
            role: 'option',
            id: self.id + '-opt-' + index,
            'data-zs-option': index
          });
          option.setAttribute('aria-selected', String(selected));
          if (virtualWindow) {
            option.setAttribute('aria-setsize', String(items.length));
            option.setAttribute('aria-posinset', String(index + 1));
          }
          if (item.disabled) {
            option.setAttribute('aria-disabled', 'true');
            option.classList.add('zs-option--disabled');
          }
          if (selected) option.classList.add('zs-option--selected');
          self._applyCustomClass(option, 'option');
          if (selected) self._applyCustomClass(option, 'selected');
          if (item.disabled) self._applyCustomClass(option, 'disabled');

          var content = null;
          if (typeof self.opts.renderOption === 'function') {
            content = self.opts.renderOption(item, {
              index: index,
              selected: selected,
              active: index === self.activeIndex,
              query: self.query,
              instance: self
            });
          }

          if (content && isElement(content)) {
            option.appendChild(content);
          } else if (content !== null && content !== undefined && content !== '') {
            option.innerHTML = String(content);
          } else {
            option.appendChild(self._labelNode(item, self.query));
          }

          if (index === self.activeIndex) {
            option.classList.add('zs-option--active');
            self._applyCustomClass(option, 'active');
          }

          self.rendered[index] = { element: option, item: item, index: index };
          (groupWrap || fragment).appendChild(option);
        });

        if (virtualWindow && virtualWindow.bottom > 0) {
          fragment.appendChild(self._virtualSpacer(virtualWindow.bottom));
        }
        self.dropdown.appendChild(fragment);
        self._virtualState = virtualWindow;
      }

      if (this.hasMore) {
        var more = el('button', 'zs-more', { type: 'button' });
        if (this.fetchingMore) {
          more.appendChild(el('span', 'zs-spinner', { 'aria-hidden': 'true' }));
          more.appendChild(el('span', null, null, this.opts.loadingText || 'Loading…'));
          more.disabled = true;
          more.setAttribute('aria-busy', 'true');
        } else {
          more.textContent = this.loadMoreError || this.opts.loadMoreText;
          if (this.loadMoreError) more.classList.add('zs-more--error');
        }
        this.dropdown.appendChild(more);
      }
    }

    if (this._virtualState) {
      var firstOption = this.dropdown.querySelector('.zs-option');
      if (firstOption && firstOption.offsetHeight && !this.opts.itemHeight) {
        this._rowHeight = firstOption.offsetHeight;
      }
    }

    this.dropdown.scrollTop = scrollTop;
    this._updateActiveDescendant(!!this._virtualState);
    if (this.opened) this._position();
  };

  ZidanSelect.prototype._updateActiveDescendant = function (scroll) {
    var active = this.rendered[this.activeIndex];
    if (active) {
      this.input.setAttribute('aria-activedescendant', active.element.id);
      if (scroll !== false) {
        var elTop = active.element.offsetTop;
        var elBottom = elTop + active.element.offsetHeight;
        if (elTop < this.dropdown.scrollTop) this.dropdown.scrollTop = elTop - 4;
        else if (elBottom > this.dropdown.scrollTop + this.dropdown.clientHeight) {
          this.dropdown.scrollTop = elBottom - this.dropdown.clientHeight + 4;
        }
      }
    } else {
      this.input.removeAttribute('aria-activedescendant');
    }
  };

  ZidanSelect.prototype._position = function () {
    if (!this.opened) return;
    var rect = this.controlEl.getBoundingClientRect();
    var viewport = global.innerHeight || doc.documentElement.clientHeight;
    var spaceBelow = viewport - rect.bottom - 12;
    var spaceAbove = rect.top - 12;
    var dropUp = spaceBelow < 160 && spaceAbove > spaceBelow;

    this.root.classList.toggle('zs-root--dropup', dropUp);
    var available = dropUp ? spaceAbove : spaceBelow;
    var maxHeight = clamp(available, 120, this.opts.maxDropdownHeight || 280);
    this.dropdown.style.maxHeight = Math.max(120, maxHeight) + 'px';

    var width = rect.width;
    this.dropdown.style.minWidth = width + 'px';
    if (this.root.classList.contains('zs-root--mount')) {
      this.dropdown.style.left = '0px';
      this.dropdown.style.right = '0px';
    }
  };

  /* ---------------- open / close ---------------- */

  ZidanSelect.prototype.open = function () {
    if (this.destroyed || this.disabled_ || this.opened) return this;

    this.opened = true;
    this.query = '';
    this.activeIndex = -1;
    this.loadMoreError = null;
    this.fetchingMore = false;

    this.root.classList.add('zs-root--open');
    this.dropdown.setAttribute('data-zs-visible', 'true');
    this._render();
    this._renderDropdown();
    this._position();
    this.emit('open', { instance: this });
    this.call('onOpen', { instance: this });

    if (typeof this.opts.fetchOptions === 'function' && (!this.asyncItems || this.asyncQuery !== '')) {
      this._fetch('');
    } else if (this.mode !== 'tags') {
      /* Opening with the keyboard or a click should start on the current
         selection, not on the placeholder. Otherwise ArrowDown + Enter can
         clear a value the user already chose. */
      var active = -1;
      var items = this._visibleItems();
      for (var i = 0; i < items.length; i += 1) {
        if (!items[i].disabled && this._hasValue(items[i].value)) { active = i; break; }
      }
      if (active === -1) active = this._firstEnabledIndex();
      if (active !== -1) {
        this.activeIndex = active;
        this._renderDropdown();
      }
    }
    if (this.opts.searchable && !this.disabled_) {
      try {
        this.input.select();
      } catch (err) {
        this.input.focus();
      }
    }
    var announceItems = this._visibleItems();
    this.announce(announceItems.length + ' option' + (announceItems.length === 1 ? '' : 's') + ' available');
    return this;
  };

  ZidanSelect.prototype.close = function () {
    if (this.destroyed || !this.opened) return this;
    this.opened = false;
    this.root.classList.remove('zs-root--open');
    this.dropdown.removeAttribute('data-zs-visible');
    this.activeIndex = -1;
    this.query = '';
    if (typeof this.opts.fetchOptions === 'function') {
      if (this.asyncController) {
        this.asyncController.abort();
        this.asyncController = null;
      }
      this.loading = false;
      this.fetchingMore = false;
      this.loadMoreError = null;
    }
    this._render();
    this.emit('close', { instance: this });
    this.call('onClose', { instance: this });
    return this;
  };

  ZidanSelect.prototype.toggle = function () {
    return this.opened ? this.close() : this.open();
  };

  ZidanSelect.prototype._firstEnabledIndex = function () {
    var items = this._visibleItems();
    for (var i = 0; i < items.length; i += 1) {
      if (!items[i].disabled) return i;
    }
    return -1;
  };

  /* ---------------- selection ---------------- */

  ZidanSelect.prototype._selectRendered = function (index) {
    var entry = this.rendered[index];
    if (!entry || entry.item.disabled) return false;
    this._selectItem(entry.item);
    return true;
  };

  ZidanSelect.prototype._selectItem = function (item) {
    if (!item || item.disabled) return this;
    var previous = this.getValue();

    if (this.mode === 'tags') {
      this.addTag(item.label);
      this.query = '';
      this._renderDropdown();
      return this;
    }

    if (this.mode === 'combobox' && this.opts.allowFreeText) {
      this._setValueInternal([item.value]);
    } else if (this.opts.multiple) {
      if (this._hasValue(item.value)) {
        this.value_ = this.value_.filter(function (v) { return v.value !== item.value; });
        this._render();
        this._syncNative();
        var current = this.getValue();
        if (JSON.stringify(current) !== JSON.stringify(previous)) {
          this.emit('change', { value: current, previousValue: previous, instance: this });
          this.call('onChange', { value: current, previousValue: previous, instance: this });
        }
        this._renderDropdown();
        return this;
      }
      this._setValueInternal(this.value_.concat([item]));
    } else {
      this._setValueInternal([item]);
    }

    this.emit('select', { value: this.getValue(), item: item, instance: this });
    this.call('onSelect', { value: this.getValue(), item: item, instance: this });

    var closeOnSelect = this.opts.closeOnSelect === null ? !this.opts.multiple : this.opts.closeOnSelect;
    if (closeOnSelect) this.close();
    else if (this.opened) this._renderDropdown();
    return this;
  };

  /* ---------------- async loading ---------------- */

  ZidanSelect.prototype._cacheKey = function (query, page) {
    return query + '\u0000' + page;
  };

  ZidanSelect.prototype._cacheGet = function (query, page) {
    if (!this.opts.cacheResults) return null;
    var key = this._cacheKey(query, page);
    var entry = this._fetchCache[key];
    if (!entry) return null;
    var index = this._cacheKeys.indexOf(key);
    if (index !== -1) {
      this._cacheKeys.splice(index, 1);
      this._cacheKeys.push(key);
    }
    return entry;
  };

  ZidanSelect.prototype._cacheSet = function (query, page, entry) {
    if (!this.opts.cacheResults) return;
    var key = this._cacheKey(query, page);
    this._fetchCache[key] = entry;
    var index = this._cacheKeys.indexOf(key);
    if (index !== -1) this._cacheKeys.splice(index, 1);
    this._cacheKeys.push(key);
    var limit = ZidanSelect.cacheLimit || 50;
    while (this._cacheKeys.length > limit) {
      delete this._fetchCache[this._cacheKeys.shift()];
    }
  };

  ZidanSelect.prototype.clearCache = function () {
    this._fetchCache = Object.create(null);
    this._cacheKeys = [];
    return this;
  };

  ZidanSelect.prototype._readFetchPayload = function (result, page, pageSize) {
    var rows = result;
    var hasMore = false;
    if (result && !Array.isArray(result) && typeof result === 'object') {
      rows = result.items || result.options || result.results || [];
      if (result.hasMore !== undefined) {
        hasMore = !!result.hasMore;
      } else if (result.total !== undefined && pageSize > 0) {
        hasMore = (page + 1) * pageSize < Number(result.total);
      } else if (pageSize > 0) {
        hasMore = toArray(rows).length >= pageSize;
      }
    } else if (pageSize > 0) {
      hasMore = toArray(rows).length >= pageSize;
    }
    return { items: this._normalizeItems(rows), hasMore: hasMore };
  };

  ZidanSelect.prototype._applyCachedPage = function (query, page, append) {
    var cached = this._cacheGet(query, page);
    if (!cached) return false;
    this.loading = false;
    this.fetchingMore = false;
    this.loadMoreError = null;
    this.error = null;
    this.asyncQuery = query;
    this.asyncPage = page;
    this.asyncItems = append ? (this.asyncItems || []).concat(cached.items) : cached.items.slice();
    this.hasMore = !!cached.hasMore;
    if (!append) this.activeIndex = -1;
    this._renderDropdown();
    return true;
  };

  /* page 0 replaces the result set; later pages append (remote pagination) */
  ZidanSelect.prototype._fetch = function (query, page, append) {
    var self = this;
    if (typeof this.opts.fetchOptions !== 'function') return Promise.resolve([]);
    query = query === undefined || query === null ? '' : String(query);
    page = page === undefined || page === null ? 0 : parseInt(page, 10) || 0;
    append = !!append;
    if (append && (this.loading || this.fetchingMore || !this.hasMore)) return Promise.resolve([]);

    var cached = this._cacheGet(query, page);
    if (cached && (append ? this.hasMore : true)) {
      if (this.asyncController) this.asyncController.abort();
      this.asyncController = null;
      this._applyCachedPage(query, page, append);
      return Promise.resolve(this._visibleItems());
    }

    if (this.asyncController) this.asyncController.abort();
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.asyncController = controller;
    this.loading = !append;
    this.fetchingMore = append;
    this.error = null;
    this.loadMoreError = null;
    if (!append) {
      this.hasMore = false;
      this.asyncPage = 0;
      this.announce(this.opts.loadingText);
    }
    this._renderDropdown();

    var settleFetch;
    var fetchPromise = new Promise(function (resolve) { settleFetch = resolve; });
    if (controller && controller.signal.addEventListener) {
      controller.signal.addEventListener('abort', function () { settleFetch([]); });
    }

    if (append) {
      this.emit('load-more', { page: page, query: query, instance: this });
      this.call('onLoadMore', { page: page, query: query, instance: this });
    }

    var pageSize = this.opts.fetchPageSize > 0 ? this.opts.fetchPageSize : 0;
    var done = function (result) {
      if (controller && controller.signal.aborted) return;
      self.loading = false;
      self.fetchingMore = false;
      self.loadMoreError = null;
      self.error = null;
      var payload = self._readFetchPayload(result, page, pageSize);
      self.asyncQuery = query;
      self.asyncPage = page;
      self.asyncItems = append ? (self.asyncItems || []).concat(payload.items) : payload.items;
      self.hasMore = payload.hasMore;
      self._cacheSet(query, page, { items: payload.items, hasMore: payload.hasMore });
      if (!append) self.activeIndex = -1;
      self._renderDropdown();
      var count = self._visibleItems().length;
      self.announce(count + ' result' + (count === 1 ? '' : 's'));
      settleFetch(self._visibleItems());
    };
    var fail = function (err) {
      if (err && err.name === 'AbortError') {
        settleFetch([]);
        return;
      }
      if (controller && controller.signal.aborted) {
        settleFetch([]);
        return;
      }
      var message = (err && err.message) || 'Unable to load options.';
      self.loading = false;
      self.fetchingMore = false;
      if (append) self.loadMoreError = message;
      else self.error = { message: message };
      self.emit('error', { error: err, message: message, instance: self });
      self.call('onError', { error: err, message: message, instance: self });
      self._renderDropdown();
      settleFetch([]);
    };

    try {
      var result = this.opts.fetchOptions(query, controller ? controller.signal : undefined, {
        page: page,
        pageSize: pageSize,
        append: append,
        instance: this
      });
      if (result && typeof result.then === 'function') {
        result.then(done).catch(fail);
      } else {
        done(result);
      }
    } catch (err) {
      fail(err);
    }
    return fetchPromise;
  };

  ZidanSelect.prototype.loadMore = function () {
    if (typeof this.opts.fetchOptions !== 'function') return this;
    if (this.loading || this.fetchingMore || !this.hasMore) return this;
    return this._fetch(this.asyncQuery || this.query || '', this.asyncPage + 1, true);
  };

  ZidanSelect.prototype.hasMoreResults = function () {
    return !!this.hasMore;
  };

  ZidanSelect.prototype.getAsyncState = function () {
    return {
      query: this.asyncQuery,
      page: this.asyncPage,
      hasMore: !!this.hasMore,
      loading: !!this.loading,
      fetchingMore: !!this.fetchingMore,
      error: this.error ? this.error.message : null
    };
  };

  ZidanSelect.prototype.refreshOptions = function () {
    this.clearCache();
    if (typeof this.opts.fetchOptions !== 'function') return this;
    this.asyncItems = null;
    this.asyncQuery = '';
    this.asyncPage = 0;
    this.hasMore = false;
    if (this.opened) return this._fetch(this.query, 0, false);
    return this;
  };

  /* ---------------- tags ---------------- */

  ZidanSelect.prototype._tagError = function (message) {
    this.announce(message);
    var detail = { error: new Error(message), message: message, instance: this };
    this.emit('error', detail);
    this.call('onError', detail);
    this.root.classList.add('zs-root--shake');
    var rootEl = this.root;
    setTimeout(function () { rootEl.classList.remove('zs-root--shake'); }, 320);
  };

  ZidanSelect.prototype._addTagObject = function (rawValue, config) {
    var cfg = config || {};
    var opts = this.opts;
    var raw = String(rawValue === null || rawValue === undefined ? '' : rawValue).trim();
    if (!raw) return false;

    if (this.value_.length >= opts.maxTags) {
      if (!cfg.silent) this._tagError('You can add up to ' + opts.maxTags + ' tags.');
      return false;
    }
    if (raw.length < opts.minTagLength) {
      if (!cfg.silent) this._tagError('Tags need at least ' + opts.minTagLength + ' character' + (opts.minTagLength === 1 ? '' : 's') + '.');
      return false;
    }
    if (raw.length > opts.maxTagLength) {
      if (!cfg.silent) this._tagError('Tags can be at most ' + opts.maxTagLength + ' characters.');
      return false;
    }
    if (this._hasValue(raw)) {
      if (!cfg.silent) this._tagError('"' + raw + '" is already added.');
      return false;
    }

    /* allowFreeText: false limits tags to the supplied option/suggestion list */
    if (this.mode === 'tags' && !opts.allowFreeText) {
      var pool = this.suggestions && this.suggestions.length ? this.suggestions : this.items;
      var needle = opts.caseSensitive ? raw : raw.toLowerCase();
      var listed = false;
      for (var s = 0; s < pool.length; s += 1) {
        var itemValue = opts.caseSensitive ? String(pool[s].value) : String(pool[s].value).toLowerCase();
        var itemLabel = opts.caseSensitive ? String(pool[s].label) : String(pool[s].label).toLowerCase();
        if (itemValue === needle || itemLabel === needle) { listed = true; break; }
      }
      if (!listed) {
        if (!cfg.silent) this._tagError('"' + raw + '" is not in the list.');
        return false;
      }
    }

    var formatted = raw;
    if (typeof opts.formatTag === 'function') {
      var formattedResult = opts.formatTag(raw, { instance: this, tags: this.getTags() });
      if (typeof formattedResult === 'string' && formattedResult) formatted = formattedResult;
    }

    if (typeof opts.validateTag === 'function') {
      var validation = opts.validateTag(formatted, this.getTags(), { instance: this });
      if (validation === false) {
        if (!cfg.silent) this._tagError('"' + formatted + '" is not allowed.');
        return false;
      }
      if (typeof validation === 'string') {
        if (!cfg.silent) this._tagError(validation);
        return false;
      }
    }

    var tag = { value: formatted, label: formatted };
    this.value_.push(tag);
    this.query = '';
    if (this.opts.validation === 'invalid') this.opts.validation = null;

    if (!cfg.silent) {
      this._render();
      this._syncNative();
      if (this.opened) this._renderDropdown();
      this.announce(formatted + ' added. ' + this.value_.length + ' tag' + (this.value_.length === 1 ? '' : 's') + ' total.');
      this.emit('tag-add', { tag: formatted, value: this.getTags(), instance: this });
      this.call('onTagAdd', { tag: formatted, value: this.getTags(), instance: this });
      this.emit('change', { value: this.getTags(), instance: this });
      this.call('onChange', { value: this.getTags(), instance: this });
    }
    return true;
  };

  ZidanSelect.prototype.addTag = function (tag) {
    /* _addTagObject already renders, syncs and re-renders the dropdown when the
       tag is accepted, so repeating those calls duplicated all of that work */
    return this._addTagObject(tag, {});
  };

  ZidanSelect.prototype.removeTag = function (tagOrIndex) {
    var index = typeof tagOrIndex === 'number'
      ? tagOrIndex
      : this.value_.findIndex(function (tag) {
        return String(tag.value) === String(tagOrIndex) || String(tag.label) === String(tagOrIndex);
      });

    if (index < 0 || index >= this.value_.length) return false;
    var removed = this.value_.splice(index, 1)[0];

    this._render();
    this._syncNative();
    if (this.opened) this._renderDropdown();
    this.announce(removed.label + ' removed. ' + this.value_.length + ' tag' + (this.value_.length === 1 ? '' : 's') + ' remaining.');
    this.emit('tag-remove', { tag: removed.value, value: this.getTags(), instance: this });
    this.call('onTagRemove', { tag: removed.value, value: this.getTags(), instance: this });
    this.emit('change', { value: this.getTags(), instance: this });
    this.call('onChange', { value: this.getTags(), instance: this });
    this.input.focus();
    return true;
  };

  ZidanSelect.prototype.getTags = function () {
    return this.value_.map(function (tag) { return tag.value; });
  };

  ZidanSelect.prototype.getSelectedItems = function () {
    return this.value_.map(function (item) {
      return { value: item.value, label: item.label };
    });
  };

  /* multiple-select helpers: they operate on every non-disabled item, not
     only on the rows currently matching a search query */
  ZidanSelect.prototype.selectAll = function (config) {
    if (!this.opts.multiple || this.mode === 'tags') return this;
    var self = this;
    var values = this.value_.map(function (item) { return item.value; });
    this.items.forEach(function (item) {
      if (!item.disabled && !self._hasValue(item.value)) values.push(item.value);
    });
    return this.setValue(values, config);
  };

  ZidanSelect.prototype.deselectAll = function (config) {
    return this.clear(config);
  };

  ZidanSelect.prototype.toggleAll = function (config) {
    if (!this.opts.multiple || this.mode === 'tags') return this;
    return this.areAllSelected() ? this.deselectAll(config) : this.selectAll(config);
  };

  ZidanSelect.prototype.areAllSelected = function () {
    if (!this.opts.multiple || this.mode === 'tags') return false;
    var self = this;
    var selectable = this.items.filter(function (item) { return !item.disabled; });
    if (!selectable.length) return false;
    return selectable.every(function (item) { return self._hasValue(item.value); });
  };

  ZidanSelect.prototype.moveTag = function (from, to) {
    if (this.mode !== 'tags') return false;
    var fromIndex = typeof from === 'number' ? from : this.value_.findIndex(function (tag) {
      return String(tag.value) === String(from) || String(tag.label) === String(from);
    });
    var toIndex = parseInt(to, 10);
    if (fromIndex < 0 || fromIndex >= this.value_.length || isNaN(toIndex)) return false;
    toIndex = Math.max(0, Math.min(this.value_.length - 1, toIndex));
    if (fromIndex === toIndex) return false;
    var moved = this.value_.splice(fromIndex, 1)[0];
    this.value_.splice(toIndex, 0, moved);
    this._render();
    this._syncNative();
    if (this.opened) this._renderDropdown();
    this.announce(moved.label + ' moved to position ' + (toIndex + 1) + '.');
    this.emit('tag-move', {
      tag: moved.value, from: fromIndex, to: toIndex, value: this.getTags(), instance: this
    });
    this.call('onTagMove', {
      tag: moved.value, from: fromIndex, to: toIndex, value: this.getTags(), instance: this
    });
    this.emit('change', { value: this.getTags(), instance: this });
    this.call('onChange', { value: this.getTags(), instance: this });
    return true;
  };

  ZidanSelect.prototype.editTag = function (tagOrIndex, label) {
    if (this.mode !== 'tags') return false;
    var index = typeof tagOrIndex === 'number'
      ? tagOrIndex
      : this.value_.findIndex(function (tag) {
        return String(tag.value) === String(tagOrIndex) || String(tag.label) === String(tagOrIndex);
      });
    if (index < 0 || index >= this.value_.length) return false;
    var next = String(label === null || label === undefined ? '' : label).trim();
    var tag = this.value_[index];
    if (!next || next === tag.label) return false;
    if (next.length < this.opts.minTagLength) {
      this._tagError('Tags need at least ' + this.opts.minTagLength + ' character' + (this.opts.minTagLength === 1 ? '' : 's') + '.');
      return false;
    }
    if (next.length > this.opts.maxTagLength) {
      this._tagError('Tags can be at most ' + this.opts.maxTagLength + ' characters.');
      return false;
    }
    var duplicate = this.value_.some(function (item, at) {
      if (at === index) return false;
      return this.opts.caseSensitive
        ? String(item.value) === next
        : String(item.value).toLowerCase() === next.toLowerCase();
    }, this);
    if (duplicate) {
      this._tagError('"' + next + '" is already added.');
      return false;
    }
    if (typeof this.opts.formatTag === 'function') {
      var formattedEdit = this.opts.formatTag(next, { instance: this, tags: this.getTags() });
      if (typeof formattedEdit === 'string' && formattedEdit) next = formattedEdit;
    }
    if (typeof this.opts.validateTag === 'function') {
      var validation = this.opts.validateTag(next, this.getTags(), { instance: this });
      if (validation === false) {
        this._tagError('"' + next + '" is not allowed.');
        return false;
      }
      if (typeof validation === 'string') {
        this._tagError(validation);
        return false;
      }
    }
    var previous = tag.label;
    tag.label = next;
    /* keep a matching source option in step so the next render does not revert */
    for (var i = 0; i < this.items.length; i += 1) {
      if (String(this.items[i].value) === String(tag.value)) {
        this.items[i].label = next;
        break;
      }
    }
    if (this.syncEl && this.syncEl.tagName === 'SELECT') {
      for (var j = 0; j < this.syncEl.options.length; j += 1) {
        if (String(this.syncEl.options[j].value) === String(tag.value)) {
          this.syncEl.options[j].textContent = next;
          break;
        }
      }
    }
    this._render();
    if (this.opened) this._renderDropdown();
    this.announce(next + ' renamed from ' + previous + '.');
    this.emit('tag-edit', {
      tag: tag.value, label: next, previousLabel: previous, index: index, instance: this
    });
    this.call('onTagEdit', {
      tag: tag.value, label: next, previousLabel: previous, index: index, instance: this
    });
    return true;
  };

  ZidanSelect.prototype._startTagEdit = function (index, chip) {
    var self = this;
    if (!this.opts.editable || this._editingTag || !chip) return this;
    var item = this.value_[index];
    if (!item) return this;
    var input = el('input', 'zs-chip-edit', { type: 'text', 'aria-label': 'Edit tag label' });
    input.value = item.label;
    if (this.opts.maxTagLength !== Infinity) input.maxLength = this.opts.maxTagLength;
    var labelNode = chip.querySelector('.zs-chip-label');
    if (labelNode) chip.replaceChild(input, labelNode);
    else chip.insertBefore(input, chip.firstChild);
    this._editingTag = true;
    var finish = function (save) {
      if (!self._editingTag) return;
      self._editingTag = false;
      if (save) {
        if (!self.editTag(index, input.value)) self._render();
      } else {
        self._render();
      }
    };
    input.focus();
    try { input.select(); } catch (err) { /* older engines */ }
    /* ZidanSelect#on() is the public custom-event API, not a DOM binder. */
    input.addEventListener('pointerdown', function (event) { event.stopPropagation(); });
    input.addEventListener('click', function (event) { event.stopPropagation(); });
    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        finish(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        finish(false);
      }
    });
    input.addEventListener('blur', function () { finish(true); });
    return this;
  };

  /* ---------------- keyboard ---------------- */

  ZidanSelect.prototype._onKeyDown = function (event) {
    if (this.destroyed) return;
    var key = event.key;
    var items = this._visibleItems();

    /* Space opens a closed combobox/listbox (WAI-ARIA), unless the user is
       already typing a search or tag query in an open control. */
    if ((key === ' ' || key === 'Spacebar') && !this.opened) {
      event.preventDefault();
      this.open();
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!this.opened) {
        this.open();
        return;
      }
      if (!items.length) return;
      var step = key === 'ArrowDown' ? 1 : -1;
      var next = this.activeIndex;
      for (var guard = 0; guard < items.length; guard += 1) {
        next += step;
        if (next < 0) next = items.length - 1;
        if (next >= items.length) next = 0;
        if (!items[next].disabled) break;
      }
      this.activeIndex = next;
      this._revealActiveRow();
      this._renderDropdown();
      return;
    }

    if (key === 'Home' || key === 'End') {
      if (!this.opened) return;
      event.preventDefault();
      var found = -1;
      var i;
      if (key === 'Home') {
        for (i = 0; i < items.length; i += 1) { if (!items[i].disabled) { found = i; break; } }
      } else {
        for (i = items.length - 1; i >= 0; i -= 1) { if (!items[i].disabled) { found = i; break; } }
      }
      this.activeIndex = found;
      this._revealActiveRow();
      this._renderDropdown();
      return;
    }

    if (key === 'Enter') {
      if (this.opened) {
        event.preventDefault();
        if (this.activeIndex >= 0) {
          this._selectRendered(this.activeIndex);
          if (this.mode === 'tags') this.query = '';
          return;
        }
        if (this.mode === 'tags') {
          this._commitTypedTag();
          return;
        }
        if ((this.mode === 'combobox' || this.mode === 'select') && this.opts.allowFreeText) {
          var text = this.query.trim();
          if (text) {
            this._setValueInternal([text]);
            this.emit('select', { value: this.getValue(), item: { value: text, label: text }, instance: this });
            this.call('onSelect', { value: this.getValue(), item: { value: text, label: text }, instance: this });
            this.close();
          }
          return;
        }
        if (items.length === 1) this._selectRendered(0);
        return;
      }
      if (this.mode === 'tags' && this.query.trim()) {
        event.preventDefault();
        this._commitTypedTag();
        return;
      }
      event.preventDefault();
      this.open();
      return;
    }

    if (key === 'Escape') {
      if (this.opened) {
        event.preventDefault();
        this.close();
      }
      return;
    }

    if (key === 'Tab') {
      if (this.mode === 'tags' && this.opts.commitOnTab && this.query.trim()) {
        this._commitTypedTag();
      }
      if (this.opened) this.close();
      return;
    }

    if (key === 'Backspace') {
      if (this.mode === 'tags' && !this.input.value && !this.query && this.value_.length) {
        event.preventDefault();
        this.removeTag(this.value_.length - 1);
        return;
      }
      if (!this.input.value && this.opened) this.close();
      return;
    }

    if (key === 'Delete' && this.opts.clearable && this.value_.length) {
      event.preventDefault();
      this.clear();
      return;
    }

    /* Native selects jump to a matching option while you type. Enhanced
       selects lost that, so restore it for the non-searchable variant. */
    if (this.mode === 'select' && !this.opts.searchable && key.length === 1 && key !== ' ' &&
        !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (this._typeAhead(key)) event.preventDefault();
    }
  };

  ZidanSelect.prototype._typeAhead = function (key) {
    if (this.opts.typeAhead === false) return false;
    var self = this;
    var items = this._visibleItems();
    if (!items.length) return false;

    var now = Date.now();
    var timeout = this.opts.typeAheadTimeout || 600;
    if (!this.typeBuffer || now - (this.typeTime || 0) > timeout) this.typeBuffer = '';
    var repeated = this.typeBuffer === key;
    this.typeBuffer = repeated ? key : this.typeBuffer + key;
    this.typeTime = now;
    clearTimeout(this.typeTimer);
    this.typeTimer = setTimeout(function () { self.typeBuffer = ''; }, timeout);

    var needle = foldText(repeated ? key : this.typeBuffer);
    var start = repeated && this.activeIndex >= 0 ? this.activeIndex + 1 : 0;

    for (var i = 0; i < items.length; i += 1) {
      var index = (start + i) % items.length;
      var item = items[index];
      if (item.disabled) continue;
      if (foldText(item.label).indexOf(needle) === 0) {
        if (!this.opened) {
          this._selectItem(item);
        } else {
          this.activeIndex = index;
          this._revealActiveRow();
          this._renderDropdown();
          this.announce(String(item.label));
        }
        return true;
      }
    }
    return false;
  };

  ZidanSelect.prototype._commitTypedTag = function () {
    var raw = this.input.value;
    var parts = this._splitTags(raw);
    var added = false;
    parts.forEach(function (part) { if (this._addTagObject(part, {})) added = true; }, this);
    this.input.value = '';
    this.query = '';
    this._render();
    this._syncNative();
    if (this.opened) this._renderDropdown();
    return added;
  };

  ZidanSelect.prototype._splitTags = function (text) {
    var value = String(text || '');
    var delimiters = this.opts.delimiters || [];
    var parts = [value];
    delimiters.forEach(function (delimiter) {
      if (!delimiter) return;
      parts = parts.reduce(function (acc, chunk) {
        return acc.concat(chunk.split(delimiter));
      }, []);
    });
    return parts.map(function (part) { return part.trim(); }).filter(Boolean);
  };

  /* ---------------- events wiring ---------------- */

  ZidanSelect.prototype._bind = function () {
    var self = this;

    this.onInput = function () {
      var value = self.input.value;
      /* plain selects are not searchable: typing must not filter the list */
      if (self.mode === 'select' && !self.opts.searchable) return;
      self.query = value;
      if (self.opened) {
        if (typeof self.opts.fetchOptions === 'function' && self.query.length >= (self.opts.minChars || 0)) {
          if (self.opts.debounce > 0) self.debouncedFetch(self.query);
          else self._fetch(self.query);
        }
        self.activeIndex = self.mode === 'tags' ? -1 : self._firstEnabledIndex();
        self._renderDropdown();
      } else {
        // typed while closed (rare race): open first, then keep the text
        self.open();
        self.query = value;
        self.input.value = value;
        self._renderDropdown();
      }
      if (self.mode === 'tags') {
        var delimiters = self.opts.delimiters || [];
        var hasDelimiter = delimiters.some(function (delimiter) { return delimiter && value.indexOf(delimiter) !== -1; });
        if (hasDelimiter) {
          self._commitTypedTag();
        }
      }
    };

    this.onKeyDown = function (event) { self._onKeyDown(event); };

    this.onFocus = function () {
      if (self.disabled_) return;
      self.root.classList.add('zs-root--focus');
      if (self.mode === 'combobox' || self.mode === 'tags' || (self.mode === 'select' && self.opts.searchable)) {
        if (!self.opened) self.open();
      }
    };

    this.onBlur = function () {
      self.root.classList.remove('zs-root--focus');
      setTimeout(function () {
        if (self.destroyed) return;
        if (self.root.contains(doc.activeElement)) return;
        if (self.mode === 'tags' && self.query.trim() && self.opts.commitOnBlur) {
          self._commitTypedTag();
        }
        if (self.mode === 'combobox' && self.opts.allowFreeText && self.query.trim()) {
          self._setValueInternal([self.query.trim()]);
        }
        self.query = '';
        self.close();
        self._render();
      }, 0);
    };

    this.onControlClick = function (event) {
      if (self.disabled_) return;
      var target = event.target;
      if (target.closest && target.closest('.zs-clear')) return;
      if (target.closest && target.closest('.zs-chip-remove')) return;
      if (self.opened) {
        /* a non-searchable select is read-only by construction, so this used to
           be an unreachable early return; closing is the only sensible action */
        if (!self.opts.searchable) self.close();
        return;
      }
      self.open();
    };

    this.onControlMouseDown = function (event) {
      if (event.target === self.input) return;
      if (event.target.closest && (event.target.closest('.zs-chip-remove') || event.target.closest('.zs-clear'))) {
        event.preventDefault();
        return;
      }
      if (event.target === self.controlEl || (event.target.closest && event.target.closest('.zs-chips'))) {
        event.preventDefault();
        self.input.focus();
      }
    };

    this.onClearClick = function (event) {
      event.preventDefault();
      event.stopPropagation();
      self.clear();
    };

    this._dragIndex = null;
    this._editingTag = false;

    this.onChipsDblClick = function (event) {
      if (!self.opts.editable) return;
      var chip = event.target.closest ? event.target.closest('.zs-chip') : null;
      if (!chip) return;
      if (event.target.closest && event.target.closest('[data-zs-remove]')) return;
      event.preventDefault();
      event.stopPropagation();
      self._startTagEdit(parseInt(chip.getAttribute('data-zs-index'), 10), chip);
    };

    this.onChipsKeyDown = function (event) {
      var chip = event.target.closest ? event.target.closest('.zs-chip') : null;
      if (!chip) return;
      var index = parseInt(chip.getAttribute('data-zs-index'), 10);
      if (isNaN(index)) return;
      if (self.opts.reorderable && event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        var target = index + (event.key === 'ArrowLeft' ? -1 : 1);
        if (self.moveTag(index, target)) {
          var moved = self.chipsEl.querySelector('[data-zs-index="' + target + '"]');
          if (moved) moved.focus();
        }
      } else if (self.opts.editable && (event.key === 'Enter' || event.key === 'F2')) {
        event.preventDefault();
        event.stopPropagation();
        self._startTagEdit(index, chip);
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        self.removeTag(index);
      }
    };

    this.onChipsDragStart = function (event) {
      var chip = event.target.closest ? event.target.closest('.zs-chip') : null;
      if (!chip) return;
      self._dragIndex = parseInt(chip.getAttribute('data-zs-index'), 10);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        try { event.dataTransfer.setData('text/plain', String(self._dragIndex)); } catch (err) { /* IE */ }
      }
    };

    this.onChipsDragOver = function (event) {
      if (self._dragIndex === null) return;
      var chip = event.target.closest ? event.target.closest('.zs-chip') : null;
      if (!chip) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    };

    this.onChipsDrop = function (event) {
      if (self._dragIndex === null) return;
      var chip = event.target.closest ? event.target.closest('.zs-chip') : null;
      if (!chip) return;
      event.preventDefault();
      var to = parseInt(chip.getAttribute('data-zs-index'), 10);
      var from = self._dragIndex;
      self._dragIndex = null;
      if (!isNaN(to)) self.moveTag(from, to);
    };

    this.onChipsDragEnd = function () { self._dragIndex = null; };

    this.onChipsClick = function (event) {
      var button = event.target.closest ? event.target.closest('[data-zs-remove]') : null;
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      var index = parseInt(button.getAttribute('data-zs-remove'), 10);
      if (isNaN(index)) return;
      if (self.mode === 'tags') self.removeTag(index);
      else {
        var item = self.value_[index];
        if (!item) return;
        var previous = self.getValue();
        self.value_.splice(index, 1);
        self._render();
        self._syncNative();
        self.emit('change', { value: self.getValue(), previousValue: previous, item: item, instance: self });
        self.call('onChange', { value: self.getValue(), previousValue: previous, item: item, instance: self });
        self.announce(item.label + ' removed.');
        if (self.opened) self._renderDropdown();
      }
    };

    this.onDropdownMouseDown = function (event) {
      event.preventDefault();
    };

    this.onDropdownClick = function (event) {
      var more = event.target.closest ? event.target.closest('.zs-more') : null;
      if (more) {
        event.preventDefault();
        event.stopPropagation();
        self.loadMore();
        return;
      }
      var option = event.target.closest ? event.target.closest('[data-zs-option]') : null;
      if (!option) return;
      event.preventDefault();
      var index = parseInt(option.getAttribute('data-zs-option'), 10);
      if (isNaN(index)) return;
      self.activeIndex = index;
      self._selectRendered(index);
      if (self.mode === 'tags') self.input.focus();
    };

    this.onDocumentPointerDown = function (event) {
      if (!self.opened) return;
      var path = event.composedPath ? event.composedPath() : [];
      if (path.indexOf(self.root) !== -1) return;
      if (self.root.contains(event.target)) return;
      self.close();
      self._render();
    };

    this.onWindowResize = function () {
      if (self.opened) self._position();
    };

    this.onDropdownScroll = function () {
      if (!self.opened) return;
      if (self.opts.virtual && !self.hasMore) {
        var windowState = self._virtualWindow(self._visibleItems());
        if (windowState && (!self._virtualState ||
            windowState.start !== self._virtualState.start ||
            windowState.end !== self._virtualState.end)) {
          self._renderDropdown();
          return;
        }
      }
      if (!self.opts.autoLoadMore || !self.hasMore) return;
      if (self.loading || self.fetchingMore) return;
      var node = self.dropdown;
      if (node.scrollTop + node.clientHeight >= node.scrollHeight - 24) self.loadMore();
    };

    this.debouncedFetch = debounce(function (query) { self._fetch(query); }, this.opts.debounce);

    if (this.el && this.el.addEventListener) {
      /* The augmented control replaces the native one visually, so the browser
         cannot focus the real <select> when it is invalid. Chrome then aborts
         the submit with "An invalid form control ... is not focusable" and says
         nothing to the user. Prevent that dead end, move focus to the visible
         combobox, announce the reason and publish the state. */
      this.onNativeInvalid = function (event) {
        if (event && event.preventDefault) event.preventDefault();
        if (self.destroyed) return;
        self.setValidation('invalid');
        if (self.input && self.input.focus) self.input.focus();
        var message = self.opts.requiredText || 'Please select an option.';
        self.announce(message);
        self.emit('validation', { instance: self, state: 'invalid', message: message });
      };
      this.el.addEventListener('invalid', this.onNativeInvalid);
    }

    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('keydown', this.onKeyDown);
    this.input.addEventListener('focus', this.onFocus);
    this.input.addEventListener('blur', this.onBlur);
    this.controlEl.addEventListener('click', this.onControlClick);
    this.controlEl.addEventListener('mousedown', this.onControlMouseDown);
    this.chipsEl.addEventListener('click', this.onChipsClick);
    this.chipsEl.addEventListener('dblclick', this.onChipsDblClick);
    this.chipsEl.addEventListener('keydown', this.onChipsKeyDown);
    this.chipsEl.addEventListener('dragstart', this.onChipsDragStart);
    this.chipsEl.addEventListener('dragover', this.onChipsDragOver);
    this.chipsEl.addEventListener('drop', this.onChipsDrop);
    this.chipsEl.addEventListener('dragend', this.onChipsDragEnd);
    this.clearBtn.addEventListener('click', this.onClearClick);
    this.dropdown.addEventListener('mousedown', this.onDropdownMouseDown);
    this.dropdown.addEventListener('click', this.onDropdownClick);
    this.dropdown.addEventListener('scroll', this.onDropdownScroll);
    doc.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    global.addEventListener('resize', this.onWindowResize);
  };

  ZidanSelect.prototype._observeResize = function () {
    if (typeof ResizeObserver === 'undefined') return;
    var self = this;
    this.resizeObserver = new ResizeObserver(function () {
      if (self.destroyed) return;
      if (self.opened) self._position();
    });
    this.resizeObserver.observe(this.controlEl);
  };

  /* ---------------- public API ---------------- */

  ZidanSelect.prototype.getValue = function () {
    if (this.mode === 'tags') return this.getTags();
    var values = this.value_.map(function (item) { return item.value; });
    if (this.opts.multiple) return values;
    return values.length ? values[0] : null;
  };

  ZidanSelect.prototype.setValue = function (value, config) {
    var cfg = config || {};
    if (this.mode === 'tags') {
      var raw = typeof value === 'string' ? this._splitTags(value) : toArray(value);
      var previous = this.getTags();
      this.value_ = [];
      raw.forEach(function (tag) { this._addTagObject(tag, { silent: true }); }, this);
      if (this.value_.length && this.opts.validation === 'invalid') this.opts.validation = null;
      this._render();
      this._syncNative();
      if (!cfg.silent) {
        var next = this.getTags();
        if (JSON.stringify(next) !== JSON.stringify(previous)) {
          this.emit('change', { value: next, previousValue: previous, instance: this });
          this.call('onChange', { value: next, previousValue: previous, instance: this });
        }
      }
      if (this.opened) this._renderDropdown();
      return this;
    }
    return this._setValueInternal(value, cfg);
  };

  ZidanSelect.prototype.clear = function (config) {
    var cfg = config || {};
    if (this.mode === 'tags') {
      if (!this.value_.length) return this;
      this.value_ = [];
      this._render();
      this._syncNative();
      this.announce('All tags removed.');
      if (!cfg.silent) {
        this.emit('change', { value: [], instance: this });
        this.call('onChange', { value: [], instance: this });
      }
      if (this.opened) this._renderDropdown();
      return this;
    }
    this._setValueInternal([], { silent: !!cfg.silent });
    this._render();
    return this;
  };

  ZidanSelect.prototype.setOptions = function (newOptions) {
    var items = this._normalizeItems(newOptions);
    if (this.mode === 'tags') {
      this.suggestions = items;
    } else {
      this.items = items;
      var self = this;
      this.value_ = this.value_.filter(function (item) {
        for (var i = 0; i < self.items.length; i += 1) {
          if (self.items[i].value === item.value) return true;
        }
        return self.opts.allowFreeText;
      });
      if (this.native && this.native.tagName === 'SELECT') {
        while (this.native.firstChild) this.native.removeChild(this.native.firstChild);
        this.items.forEach(function (item) {
          var option = doc.createElement('option');
          option.value = item.value;
          option.textContent = item.label;
          if (item.disabled) option.disabled = true;
          /* mark the preserved value straight away so select.value is never
             empty between the rebuild and the later _syncNative() pass */
          option.selected = self._hasValue(item.value);
          self.native.appendChild(option);
        });
      }
    }
    this.asyncItems = null;
    this.asyncPage = 0;
    this.hasMore = false;
    this.loadMoreError = null;
    this.error = null;
    this.clearCache();
    this.activeIndex = this._firstEnabledIndex();
    this._render();
    this._syncNative();
    if (this.opened) this._renderDropdown();
    return this;
  };

  ZidanSelect.prototype.enable = function () {
    this.disabled_ = false;
    this._render();
    return this;
  };

  ZidanSelect.prototype.disable = function () {
    this.disabled_ = true;
    this.close();
    this._render();
    return this;
  };

  ZidanSelect.prototype.setLayout = function (layoutName) {
    var next = String(layoutName || '').toLowerCase();
    if (LAYOUTS.indexOf(next) === -1) {
      throw new Error('ZidanSelect: unknown layout "' + layoutName + '". Use: ' + LAYOUTS.join(', '));
    }
    this.layout = next;
    this.opts.layout = next;
    this.root.setAttribute('data-zs-layout', next);
    this.root.classList.toggle('zs-root--labeled', next === 'floating-label');
    this._position();
    return this;
  };

  ZidanSelect.prototype.setFramework = function (frameworkName) {
    var next = String(frameworkName || '').toLowerCase();
    if (FRAMEWORKS.indexOf(next) === -1) {
      throw new Error('ZidanSelect: unknown framework "' + frameworkName + '". Use: ' + FRAMEWORKS.join(', '));
    }
    this.opts.themeFramework = next;
    this.framework = next === 'auto' ? this._resolveFramework() : next;
    this.root.setAttribute('data-zs-framework', this.framework);
    this.controlEl.classList.toggle('form-control', this.framework === 'bootstrap');
    this.controlEl.classList.toggle('zs-bootstrap-control', this.framework === 'bootstrap');
    this.controlEl.classList.toggle('form-select', this.framework === 'bootstrap' && this.el.tagName === 'SELECT');
    this._applyCustomClass(this.root, 'root');
    this._render();
    return this;
  };

  ZidanSelect.prototype.setScrollbar = function (scrollbarName) {
    var next = String(scrollbarName || '').toLowerCase();
    if (SCROLLBARS.indexOf(next) === -1) {
      throw new Error('ZidanSelect: unknown scrollbar "' + scrollbarName + '". Use: ' + SCROLLBARS.join(', '));
    }
    this.opts.scrollbar = next;
    if (this.root) this.root.setAttribute('data-zs-scrollbar', next);
    return this;
  };

  ZidanSelect.prototype.setValidation = function (state) {
    this.opts.validation = state;
    this._render();
    return this;
  };

  ZidanSelect.prototype.on = function (eventName, handler) {
    var name = this._eventName(eventName);
    this.root.addEventListener(name, handler);
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name).push(handler);
    return this;
  };

  ZidanSelect.prototype.off = function (eventName, handler) {
    var name = this._eventName(eventName);
    var handlers = this.listeners.get(name) || [];
    if (handler) {
      this.root.removeEventListener(name, handler);
      this.listeners.set(name, handlers.filter(function (h) { return h !== handler; }));
    } else {
      var rootEl = this.root;
      handlers.forEach(function (h) { rootEl.removeEventListener(name, h); });
      this.listeners.set(name, []);
    }
    return this;
  };

  ZidanSelect.prototype._eventName = function (eventName) {
    var name = String(eventName || '');
    return name.indexOf(EVENT_PREFIX) === 0 ? name : EVENT_PREFIX + name;
  };

  ZidanSelect.prototype.emit = function (name, detail) {
    if (!this.root || !doc) return this;
    var event;
    try {
      event = new CustomEvent(EVENT_PREFIX + name, {
        bubbles: true,
        cancelable: false,
        detail: detail || {}
      });
    } catch (err) {
      event = doc.createEvent('CustomEvent');
      event.initCustomEvent(EVENT_PREFIX + name, true, false, detail || {});
    }
    this.root.dispatchEvent(event);
    return this;
  };

  ZidanSelect.prototype.call = function (callbackName, payload) {
    var fn = this.opts[callbackName];
    if (typeof fn !== 'function') return undefined;
    try {
      return fn(payload);
    } catch (err) {
      var detail = { error: err, message: (err && err.message) || String(err), callback: callbackName, instance: this };
      this.emit('error', detail);
      if (callbackName !== 'onError') this.call('onError', detail);
      return undefined;
    }
  };

  ZidanSelect.prototype.announce = function (message) {
    var live = this.liveEl;
    if (!live || !message) return;
    /* Writing the same string twice in one task is a no-op for some screen
       readers, so an identical repeat is re-announced on the next tick. */
    if (live.textContent === message) {
      var self = this;
      live.textContent = '';
      setTimeout(function () { if (!self.destroyed) live.textContent = message; }, 0);
      return;
    }
    live.textContent = message;
  };

  ZidanSelect.prototype.destroy = function () {
    if (this.destroyed) return this;
    this.destroyed = true;
    if (this.root) untrackAutoTheme(this.root);
    if (this.typeTimer) clearTimeout(this.typeTimer);

    if (this.debouncedFetch) this.debouncedFetch.cancel();
    if (this.asyncController) this.asyncController.abort();
    this.clearCache();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.form && this.onFormReset) this.form.removeEventListener('reset', this.onFormReset);
    if (this.form && this.onFormSubmit) this.form.removeEventListener('submit', this.onFormSubmit);
    if (this._nativeRequiredAdded && this.native) {
      this.native.required = false;
      this._nativeRequiredAdded = false;
    }

    doc.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    global.removeEventListener('resize', this.onWindowResize);
    if (this.el && this.onNativeInvalid) this.el.removeEventListener('invalid', this.onNativeInvalid);

    this.emit('destroy', { instance: this });

    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);

    if (this._authorLabel) {
      this._authorLabel.hidden = false;
      this._authorLabel.removeAttribute('data-zs-hidden-label');
      this._authorLabel = null;
    }

    if (this.native) {
      this.native.hidden = false;
      this.native.classList.remove('zs-native');
      this.native.removeAttribute('tabindex');
      this.native.removeAttribute('aria-hidden');
    } else if (this.el.classList && this.el.classList.contains('zs-root--mount')) {
      this.el.classList.remove('zs-root--mount');
    }

    if (this.el.__zidanSelect === this) delete this.el.__zidanSelect;
    this.listeners.clear();
    var index = ZidanSelect.instances.indexOf(this);
    if (index !== -1) ZidanSelect.instances.splice(index, 1);
    return this;
  };

  ZidanSelect.prototype.isOpen = function () {
    return this.opened;
  };

  ZidanSelect.prototype.refresh = function () {
    this._render();
    if (this.opened) this._renderDropdown();
    return this;
  };

  /* @zidan-build:fields */
  /* ================================================================== *
   * Part 2 — opt-in form fields
   *
   * The real control always stays in the DOM (1×1px, never display:none),
   * so FormData, form.reset(), constraint validation and jQuery Validation's
   * ":hidden" ignore all keep working. Wrappers only mirror its state.
   * ================================================================== */

  var VALIDATION_STATES = ['valid', 'invalid'];
  var CHECKBOX_VARIANTS = ['default', 'switch', 'card', 'button', 'minimal'];
  var SWITCH_STYLES = ['ios', 'material', 'square', 'labeled', 'icon'];
  var RADIO_VARIANTS = ['stacked', 'inline', 'card', 'button', 'tile'];
  var FILE_VARIANTS = ['dropzone', 'button', 'avatar', 'gallery', 'compact'];
  var RANGE_VARIANTS = ['default', 'gradient', 'stepped', 'minimal'];
  var RANGE_BUBBLE_MODES = ['always', 'active', 'never'];
  var RANGE_BUBBLE_POSITIONS = ['top', 'bottom'];

  function textWithout(rootNode, skip) {
    var out = '';
    Array.prototype.slice.call(rootNode.childNodes).forEach(function (node) {
      if (node === skip || node.nodeType !== 3) return;
      out += node.nodeValue;
    });
    return out.replace(/\s+/g, ' ').trim();
  }

  function moveTextInto(label, target) {
    Array.prototype.slice.call(label.childNodes).forEach(function (node) {
      if (node.nodeType === 3 && node.nodeValue.trim()) target.appendChild(node);
    });
    return target;
  }

  /* ---------------- shared base ---------------- */

  function ZidanFieldBase(target, options, kind) {
    if (!doc) throw new Error('ZidanForm requires a DOM environment.');
    if (!isElement(target)) throw new Error('ZidanForm: target element not found.');
    this.el = target;
    this.kind = kind;
    this.opts = options || {};
    this.opts.messages = Object.assign({}, FIELD_MESSAGES, this.opts.messages || {});
    this.id = target.id || (target.id = uid('zf'));
    this.root = null;
    this.touched = false;
    this.validation = null;
    this.errorMessage = null;
    this.errorEl = null;
    this.pending = false;
    this._asyncToken = 0;
    this._asyncController = null;
    this.destroyed = false;
    this._listeners = [];
    this._cleanups = [];
    this._describedByBefore = [];
    this.formEl = target.form || (target.closest ? target.closest('form') : null);
    var scope = resolveScope(target, this.opts);
    this.theme = scope.theme;
    this.framework = scope.framework;
    this.layout = this.opts.layout || scope.layout;
  }

  ZidanFieldBase.prototype.on = function (node, type, handler, config) {
    if (!node || !node.addEventListener) return this;
    node.addEventListener(type, handler, config);
    this._listeners.push([node, type, handler, config]);
    return this;
  };

  ZidanFieldBase.prototype.emit = function (name, detail) {
    if (!this.root) return this;
    var payload = detail || {};
    payload.instance = this;
    payload.kind = this.kind;
    try {
      this.root.dispatchEvent(new CustomEvent(EVENT_PREFIX + name, { detail: payload, bubbles: true }));
    } catch (err) { /* CustomEvent unsupported: events are optional */ }
    return this;
  };

  ZidanFieldBase.prototype.call = function (name, payload) {
    var fn = this.opts[name];
    if (typeof fn !== 'function') return undefined;
    try { return fn(payload); } catch (err) {
      this.emit('error', { error: err, message: (err && err.message) || String(err), callback: name });
    }
    return undefined;
  };

  ZidanFieldBase.prototype._scope = function (kind) {
    var root = el('div', 'zs-field');
    root.id = this.id + '-field';
    root.setAttribute('data-zs-kind', kind);
    root.classList.add('zs-field--' + kind);
    if (isRtl(this.el)) root.setAttribute('dir', 'rtl');
    this._applyScope(root);
    this.root = root;
    return root;
  };

  ZidanFieldBase.prototype._applyScope = function (root) {
    root.setAttribute('data-zs-theme', resolveThemeName(this.theme));
    if (this.theme === 'auto') trackAutoTheme(root);
    root.setAttribute('data-zs-framework', this.framework);
    if (this.layout) root.setAttribute('data-zs-layout', this.layout);
    return root;
  };

  ZidanFieldBase.prototype.setTheme = function (name) {
    this.theme = pickList(name, THEMES, this.theme);
    if (this.root) {
      if (this.theme === 'auto') trackAutoTheme(this.root);
      else {
        untrackAutoTheme(this.root);
        this.root.setAttribute('data-zs-theme', this.theme);
      }
    }
    return this;
  };

  ZidanFieldBase.prototype.setFramework = function (name) {
    this.framework = pickList(name, FRAMEWORKS, this.framework);
    if (this.root) this.root.setAttribute('data-zs-framework', this.framework);
    return this;
  };

  ZidanFieldBase.prototype.setLayout = function (name) {
    this.layout = pickList(name, FIELD_LAYOUTS, this.layout || 'stacked');
    if (this.root) this.root.setAttribute('data-zs-layout', this.layout);
    return this;
  };

  ZidanFieldBase.prototype.validationTargets = function () {
    return [this.el];
  };

  /* field-specific cross-field / format checks; subclasses override */
  ZidanFieldBase.prototype._customError = function () {
    return '';
  };

  ZidanFieldBase.prototype._messageFor = function (input) {
    var message = validityMessage(input, this.opts.messages);
    if (message) return message;
    if (input && input.validationMessage) return input.validationMessage;
    return this.opts.messages.generic || FIELD_MESSAGES.generic;
  };

  ZidanFieldBase.prototype._nativeError = function () {
    var targets = this.validationTargets();
    for (var i = 0; i < targets.length; i += 1) {
      var input = targets[i];
      if (hasNativeValidityError(input)) return this._messageFor(input);
    }
    return '';
  };

  /* subclasses forward this context to async validators so they can abort */
  ZidanFieldBase.prototype._asyncSignal = function () {
    return this._asyncController ? this._asyncController.signal : undefined;
  };

  ZidanFieldBase.prototype._asyncContext = function () {
    return { signal: this._asyncSignal(), field: this, instance: this };
  };

  /* text inputs override this to block form submission while pending/invalid */
  ZidanFieldBase.prototype._setCustomValidity = function () {};

  ZidanFieldBase.prototype._abortAsync = function () {
    this._asyncToken += 1;
    if (this._asyncController) {
      try { this._asyncController.abort(); } catch (err) { /* already settled */ }
      this._asyncController = null;
    }
  };

  /* returns { pending: promise } for async checks, otherwise { error, custom } */
  ZidanFieldBase.prototype._evaluate = function () {
    this._abortAsync();
    if (typeof AbortController !== 'undefined') this._asyncController = new AbortController();
    var custom = this._customError ? this._customError() : '';
    if (isThenable(custom)) return { pending: custom };
    this._asyncController = null;
    if (custom) {
      return { error: typeof custom === 'string' ? custom : this.opts.messages.generic, custom: true };
    }
    var native = this._nativeError();
    return native ? { error: native, custom: false } : {};
  };

  ZidanFieldBase.prototype._applyValidity = function (message, show, custom) {
    this._setCustomValidity(message && custom ? message : '');
    if (message) {
      if (show) this.setError(message);
      else this.setValidation('invalid', true);
      return this;
    }
    if (this.errorMessage) this.setError(null);
    /* keep an initial or manually set invalid state until the user interacts */
    if (this.validation === 'invalid' && !this._presetValidation) this.setValidation(null, true);
    return this;
  };

  ZidanFieldBase.prototype._setPending = function (on) {
    on = !!on;
    this.pending = on;
    if (this.root) {
      this.root.classList.toggle('zs-field--pending', on);
      if (on) {
        this.root.setAttribute('data-zs-validation', 'pending');
      } else if (this.root.getAttribute('data-zs-validation') === 'pending') {
        this.root.removeAttribute('data-zs-validation');
      }
    }
    this.validationTargets().forEach(function (input) {
      if (!input || !input.setAttribute) return;
      if (on) input.setAttribute('aria-busy', 'true');
      else input.removeAttribute('aria-busy');
    }, this);
    if (on) {
      if (this.errorMessage) this.setError(null);
      this._setCustomValidity(this.opts.messages.pending || FIELD_MESSAGES.pending);
    } else {
      this._setCustomValidity('');
    }
    return this;
  };

  ZidanFieldBase.prototype._runAsync = function (promise) {
    var self = this;
    if (self.destroyed) return Promise.resolve(false);
    var token = self._asyncToken;
    self._setPending(true);
    return Promise.resolve(promise).then(function (value) {
      if (self.destroyed || token !== self._asyncToken) return false;
      self._asyncController = null;
      self._setPending(false);
      var message = '';
      if (value === false) message = self.opts.messages.generic;
      else if (typeof value === 'string') message = value;
      else if (value instanceof Error) message = value.message || self.opts.messages.generic;
      self._applyValidity(message, self.touched || self.opts.alwaysValidate || !!message, true);
      if (!message && self.opts.showValidState) self.setValidation('valid');
      self.emit('async-validation', { valid: !message, message: message });
      return !message;
    }, function (err) {
      if (self.destroyed || token !== self._asyncToken || (err && err.name === 'AbortError')) return false;
      self._asyncController = null;
      self._setPending(false);
      var message = (err && (err.message || err.error)) || self.opts.messages.generic;
      if (typeof message !== 'string') message = self.opts.messages.generic;
      self._applyValidity(message, true, true);
      self.emit('async-validation', { valid: false, message: message, error: err });
      return false;
    });
  };

  /* convenience: resolves with the async result, false when sync-invalid, true when sync-valid */
  ZidanFieldBase.prototype.checkAsync = function () {
    var result = this._evaluate();
    if (result.pending) return this._runAsync(result.pending);
    return Promise.resolve(!result.error);
  };

  ZidanFieldBase.prototype._trackDescribedBy = function (input) {
    if (!input || !input.getAttribute) return;
    for (var i = 0; i < this._describedByBefore.length; i += 1) {
      if (this._describedByBefore[i][0] === input) return;
    }
    this._describedByBefore.push([input, input.getAttribute('aria-describedby')]);
  };

  ZidanFieldBase.prototype._addDescribedBy = function (input, id) {
    if (!input || !input.getAttribute || !id) return;
    this._trackDescribedBy(input);
    var current = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (current.indexOf(id) === -1) current.push(id);
    input.setAttribute('aria-describedby', current.join(' '));
  };

  ZidanFieldBase.prototype._syncDescribedBy = function () {
    if (!this.el || !this.el.getAttribute) return;
    var errorId = this.id + '-error';
    var hint = this.root && this.root.querySelector ? this.root.querySelector('.zs-field__hint[id]') : null;
    var hintId = hint ? hint.id : '';
    var targets = this.validationTargets();
    targets.forEach(function (input) {
      if (!input || !input.getAttribute) return;
      this._trackDescribedBy(input);
      var current = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      var next = current.filter(function (id) { return id !== errorId && id !== hintId; });
      if (hintId) next.push(hintId);
      if (this.errorMessage) next.push(errorId);
      if (next.length) input.setAttribute('aria-describedby', next.join(' '));
      else input.removeAttribute('aria-describedby');
    }, this);
  };

  ZidanFieldBase.prototype._renderError = function () {
    if (!this.root) return;
    if (!this.errorEl) {
      this.errorEl = el('p', 'zs-field__error', {
        id: this.id + '-error',
        role: 'status',
        'aria-live': 'polite'
      });
      this.root.appendChild(this.errorEl);
    }
    this.errorEl.textContent = this.errorMessage || '';
    this.errorEl.hidden = !this.errorMessage;
    this._syncDescribedBy();
  };

  ZidanFieldBase.prototype.setError = function (message) {
    this.errorMessage = message || null;
    if (this.errorMessage) this.validation = 'invalid';
    else if (this.validation === 'invalid') this.validation = null;
    var invalid = !!this.errorMessage || this.validation === 'invalid';
    if (this.root) {
      this.root.classList.toggle('zs-field--invalid', invalid);
      this.root.classList.toggle('zs-field--valid', this.validation === 'valid' && !this.errorMessage);
      if (invalid || this.validation) this.root.setAttribute('data-zs-validation', invalid ? 'invalid' : this.validation);
      else this.root.removeAttribute('data-zs-validation');
    }
    this._renderError();
    this.validationTargets().forEach(function (input) {
      if (!input || !input.setAttribute) return;
      if (invalid) input.setAttribute('aria-invalid', 'true');
      else if (this.validation === 'valid') input.setAttribute('aria-invalid', 'false');
      else input.removeAttribute('aria-invalid');
    }, this);
    this.emit('validation', { state: invalid ? 'invalid' : this.validation, message: this.errorMessage });
    this.call('onValidation', { state: invalid ? 'invalid' : this.validation, message: this.errorMessage, instance: this });
    return this;
  };

  ZidanFieldBase.prototype.clearError = function () {
    return this.setError(null);
  };

  /* mirror native constraint validity + custom rules into classes and aria */
  ZidanFieldBase.prototype._bindValidity = function () {
    var self = this;
    this.validationTargets().forEach(function (input) {
      self.on(input, 'invalid', function () {
        self.touched = true;
        var result = self._evaluate();
        if (result.pending) {
          self._runAsync(result.pending);
          return;
        }
        if (result.error) self.setError(result.error);
        else self.setValidation('invalid');
      });
      self.on(input, 'blur', function () {
        self.touched = true;
        self._presetValidation = false;
        self._mirrorValidity();
      });
      self.on(input, 'input', function () {
        self._presetValidation = false;
        self._mirrorValidity();
      });
      self.on(input, 'change', function () {
        self._presetValidation = false;
        self._mirrorValidity();
      });
    });
    this.on(this.formEl, 'reset', function () {
      global.setTimeout(function () {
        if (self.destroyed) return;
        self._abortAsync();
        self.touched = false;
        self.errorMessage = null;
        self._setPending(false);
        if (self.errorEl) {
          self.errorEl.textContent = '';
          self.errorEl.hidden = true;
        }
        self.setValidation(null);
        self.update();
      }, 0);
    });
    var preset = this.opts.validation || this.el.getAttribute('data-zidan-validation') ||
      this.el.getAttribute('data-zs-validation');
    if (preset === 'valid' || preset === 'invalid') this.setValidation(preset);
    this._syncDescribedBy();
  };

  ZidanFieldBase.prototype._mirrorValidity = function () {
    var result = this._evaluate();
    if (result.pending) {
      this._runAsync(result.pending);
      return this;
    }
    if (this.pending) this._setPending(false);
    this._applyValidity(result.error || '', this.touched || this.opts.alwaysValidate, result.custom);
    return this;
  };

  /* returns a boolean for sync rules and a Promise<boolean> when an async rule runs */
  ZidanFieldBase.prototype.validate = function () {
    this.touched = true;
    var result = this._evaluate();
    if (result.pending) return this._runAsync(result.pending);
    if (this.pending) this._setPending(false);
    if (result.error) {
      this._applyValidity(result.error, true, result.custom);
      return false;
    }
    this._applyValidity('', true, false);
    if (this.opts.showValidState) this.setValidation('valid');
    return true;
  };

  ZidanFieldBase.prototype.setValidation = function (state, internal) {
    this.validation = VALIDATION_STATES.indexOf(state) === -1 ? null : state;
    /* public calls pin the state; internal mirrors may clear it again */
    if (!internal) this._presetValidation = this.validation === 'invalid';
    var invalid = this.validation === 'invalid' || !!this.errorMessage;
    if (this.root) {
      this.root.classList.toggle('zs-field--invalid', invalid);
      this.root.classList.toggle('zs-field--valid', this.validation === 'valid' && !this.errorMessage);
      if (invalid) this.root.setAttribute('data-zs-validation', 'invalid');
      else if (this.validation) this.root.setAttribute('data-zs-validation', this.validation);
      else this.root.removeAttribute('data-zs-validation');
    }
    this.validationTargets().forEach(function (input) {
      if (!input || !input.setAttribute) return;
      if (invalid) input.setAttribute('aria-invalid', 'true');
      else if (this.validation === 'valid') input.setAttribute('aria-invalid', 'false');
      else input.removeAttribute('aria-invalid');
    }, this);
    this.emit('validation', { state: invalid ? 'invalid' : this.validation, message: this.errorMessage });
    this.call('onValidation', { state: invalid ? 'invalid' : this.validation, message: this.errorMessage, instance: this });
    return this;
  };

  ZidanFieldBase.prototype.getValidation = function () {
    return this.validation;
  };

  ZidanFieldBase.prototype.isPending = function () {
    return this.pending;
  };

  ZidanFieldBase.prototype.getValue = function () {
    var el = this.el;
    if (!el) return null;
    if (this.kind === 'file') {
      return this.getFiles ? this.getFiles() : Array.prototype.slice.call(el.files || []);
    }
    if (el.type === 'checkbox') return !!el.checked;
    if (el.multiple && el.options) {
      return Array.prototype.filter.call(el.options, function (option) { return option.selected; })
        .map(function (option) { return option.value; });
    }
    return el.value;
  };

  ZidanFieldBase.prototype.setValue = function (value) {
    var el = this.el;
    if (!el) return this;
    if (this.kind === 'file') {
      var files = value === null || value === undefined ? [] : (Array.isArray(value) ? value : [value]);
      if (!files.length) return this.clear ? this.clear() : this;
      if (this.addFiles) this.addFiles(files);
      return this;
    }
    if (el.type === 'checkbox') {
      if (this.setChecked) return this.setChecked(!!value);
      el.checked = !!value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return this.update();
    }
    if (el.multiple && el.options) {
      var wanted = (Array.isArray(value) ? value : [value]).map(String);
      Array.prototype.forEach.call(el.options, function (option) {
        option.selected = wanted.indexOf(option.value) !== -1;
      });
    } else {
      el.value = value === null || value === undefined ? '' : String(value);
    }
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return this.update();
  };

  ZidanFieldBase.prototype.update = function () {
    if (this._sync) this._sync();
    this._mirrorValidity();
    return this;
  };

  ZidanFieldBase.prototype.refresh = function () {
    return this.update();
  };

  ZidanFieldBase.prototype.destroy = function () {
    if (this.destroyed) return this;
    this.destroyed = true;
    this._abortAsync();
    this._listeners.forEach(function (entry) {
      entry[0].removeEventListener(entry[1], entry[2], entry[3]);
    });
    this._listeners.length = 0;
    if (this._teardown) this._teardown();
    this._cleanups.forEach(function (fn) { fn(); });
    this._cleanups.length = 0;
    this.emit('destroy', {});
    if (this.root) untrackAutoTheme(this.root);
    /* radio groups use the author's <fieldset> as their root: removing it would
       delete the original radios too, so only remove roots the field created. */
    if (this.root && this.root !== this.el && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this._describedByBefore.forEach(function (entry) {
      var input = entry[0];
      if (!input || !input.getAttribute) return;
      if (entry[1] === null || entry[1] === undefined) input.removeAttribute('aria-describedby');
      else input.setAttribute('aria-describedby', entry[1]);
    });
    this._describedByBefore = [];
    if (this.el.__zidanField === this) delete this.el.__zidanField;
    ZidanForm._unregister(this);
    return this;
  };

  /* @zidan-build:checkbox */
  /* ---------------- checkbox ---------------- */

  function ZidanCheckbox(target, options) {
    if (!(this instanceof ZidanCheckbox)) return new ZidanCheckbox(target, options);
    if (!/^checkbox$/i.test(target.type)) {
      throw new Error('ZidanCheckbox: expected an <input type="checkbox">.');
    }
    ZidanFieldBase.call(this, target, options, 'checkbox');
    var self = this;
    var input = target;
    var variant = pickList(
      this.opts.variant || input.getAttribute('data-zidan-variant') ||
        (input.hasAttribute('data-zidan-switch') ? 'switch' : 'default'),
      CHECKBOX_VARIANTS,
      'default'
    );
    this.variant = variant;
    var switchStyle = pickList(
      this.opts.switchStyle || input.getAttribute('data-zidan-switch-style'),
      SWITCH_STYLES,
      'ios'
    );
    this.switchStyle = switchStyle;

    var originalParent = input.parentNode;
    var originalNext = input.nextSibling;
    var wrappingLabel = input.closest ? input.closest('label') : null;
    var externalLabel = null;
    var labelText = this.opts.label || input.getAttribute('data-zidan-label') || '';

    if (!labelText) {
      if (wrappingLabel) {
        labelText = textWithout(wrappingLabel, input);
      } else if (input.labels && input.labels[0]) {
        externalLabel = input.labels[0];
        labelText = textWithout(externalLabel, input);
      }
    }

    var root = this._scope('checkbox');
    root.setAttribute('data-zs-variant', variant);
    root.setAttribute('data-zs-switch-style', switchStyle);
    // mount outside the original <label>: it is removed once its text is moved
    var mountParent = wrappingLabel && wrappingLabel.parentNode ? wrappingLabel.parentNode : originalParent;
    var mountBefore = wrappingLabel && wrappingLabel.parentNode ? wrappingLabel : input;
    mountParent.insertBefore(root, mountBefore);

    // reuse the author's <label> when there is one, so destroy() can put the
    // original markup back untouched
    var check = wrappingLabel || doc.createElement('label');
    addClass(check, 'zs-check');
    if (!wrappingLabel) check.setAttribute('for', this.id);

    var indicator = el('span', variant === 'switch' ? 'zs-switch-track' : 'zs-check-box', { 'aria-hidden': 'true' });
    if (variant === 'switch') {
      indicator.appendChild(el('span', 'zs-switch-on', { 'aria-hidden': 'true' },
        this.opts.onLabel || input.getAttribute('data-zidan-on-label') || 'ON'));
      indicator.appendChild(el('span', 'zs-switch-off', { 'aria-hidden': 'true' },
        this.opts.offLabel || input.getAttribute('data-zidan-off-label') || 'OFF'));
    }
    var text = el('span', 'zs-check-label');
    text.textContent = labelText || '';
    var description = this.opts.description || input.getAttribute('data-zidan-description');
    if (description) {
      var desc = el('span', 'zs-check-desc');
      desc.textContent = description;
      text.appendChild(desc);
      root.classList.add('zs-field--has-description');
    }

    if (wrappingLabel) {
      Array.prototype.slice.call(check.childNodes).forEach(function (node) {
        if (node.nodeType === 3) node.parentNode.removeChild(node);
      });
      check.insertBefore(indicator, input);
      if (input.parentNode !== check) check.appendChild(input);
      check.appendChild(text);
    } else {
      check.appendChild(indicator);
      check.appendChild(input);
      check.appendChild(text);
    }
    root.appendChild(check);

    if (externalLabel) {
      externalLabel.hidden = true;
      externalLabel.setAttribute('data-zs-hidden-label', 'true');
      this._cleanups.push(function () {
        externalLabel.hidden = false;
        externalLabel.removeAttribute('data-zs-hidden-label');
      });
    }

    var hintText = this.opts.hint || input.getAttribute('data-zidan-hint');
    if (hintText) {
      var hint = el('p', 'zs-field__hint', { id: this.id + '-hint' }, hintText);
      root.appendChild(hint);
      this._addDescribedBy(input, this.id + '-hint');
    }

    this.check = check;
    this._restoreInput = function () {
      var parent = root.parentNode || originalParent;
      var anchor = root.parentNode ? root : null;
      if (wrappingLabel) {
        if (indicator.parentNode) indicator.parentNode.removeChild(indicator);
        if (text.parentNode) text.parentNode.removeChild(text);
        if (labelText) check.appendChild(doc.createTextNode(' ' + labelText));
        check.classList.remove('zs-check');
        parent.insertBefore(check, anchor);
        input.classList.remove('zs-native-input');
        return;
      }
      parent.insertBefore(input, anchor);
      input.classList.remove('zs-native-input');
    };

    addClass(input, 'zs-native-input');
    if (this.opts.indeterminate || input.hasAttribute('data-zidan-indeterminate')) {
      input.indeterminate = true;
    }

    this.on(input, 'change', function () {
      self.update();
      self.emit('change', { checked: input.checked, value: input.value });
      self.call('onChange', { checked: input.checked, value: input.value, instance: self });
    });
    this._bindValidity();

    input.__zidanField = this;
    this.update();
    this.emit('init', { variant: variant });
    this.call('onInit', { instance: this, variant: variant });
    ZidanForm._register(this);
  }

  ZidanCheckbox.prototype = Object.create(ZidanFieldBase.prototype);
  ZidanCheckbox.prototype.constructor = ZidanCheckbox;

  ZidanCheckbox.prototype._sync = function () {
    var input = this.el;
    var checked = !!input.checked;
    var indeterminate = !!input.indeterminate;
    this.root.classList.toggle('zs-field--checked', checked);
    this.root.classList.toggle('zs-field--indeterminate', indeterminate);
    this.root.classList.toggle('zs-field--disabled', !!input.disabled);
    this.check.classList.toggle('zs-check--checked', checked);
    this.check.classList.toggle('zs-check--indeterminate', indeterminate);
    this.check.classList.toggle('zs-check--disabled', !!input.disabled);
  };

  ZidanCheckbox.prototype.setIndeterminate = function (on) {
    this.el.indeterminate = !!on;
    return this.update();
  };

  ZidanCheckbox.prototype.setChecked = function (on) {
    this.el.checked = !!on;
    this.el.indeterminate = false;
    this.el.dispatchEvent(new Event('change', { bubbles: true }));
    return this.update();
  };

  ZidanCheckbox.prototype.isChecked = function () {
    return !!this.el.checked;
  };

  ZidanCheckbox.prototype._customError = function () {
    if (typeof this.opts.validate === 'function') {
      var result = this.opts.validate(this.el.checked, this, this._asyncContext());
      if (result === false) return this.opts.messages.generic;
      if (typeof result === 'string' && result) return result;
      if (isThenable(result)) return result;
    }
    return '';
  };

  ZidanCheckbox.prototype._teardown = function () {
    if (this._restoreInput) this._restoreInput();
  };

  /* @zidan-build:radio */
  /* ---------------- radio group ---------------- */

  function ZidanRadioGroup(target, options) {
    if (!(this instanceof ZidanRadioGroup)) return new ZidanRadioGroup(target, options);
    /* radios are enhanced as a group, never one input at a time */
    if (isElement(target) && /^INPUT$/i.test(target.tagName)) {
      var group = target.closest ? target.closest('fieldset, [data-zidan-radio-group]') : null;
      if (!group) throw new Error('ZidanRadioGroup: expected a <fieldset> containing the radio inputs.');
      target = group;
    }
    ZidanFieldBase.call(this, target, options, 'radio-group');
    var variant = pickList(this.opts.variant || target.getAttribute('data-zidan-variant'), RADIO_VARIANTS, 'stacked');
    this.variant = variant;
    this.deselectable = fieldBool(target, this.opts, 'deselectable', 'deselectable', false);
    this.root = target;
    addClass(target, 'zs-radio-group');
    target.setAttribute('data-zs-kind', 'radio-group');
    target.setAttribute('data-zs-variant', variant);
    this._applyScope(target);
    var hadRole = target.hasAttribute('role');
    if (!hadRole) target.setAttribute('role', 'radiogroup');
    this._teardown = function () {
      target.classList.remove('zs-radio-group');
      ['data-zs-kind', 'data-zs-variant', 'data-zs-theme', 'data-zs-framework', 'data-zs-layout']
        .forEach(function (name) { target.removeAttribute(name); });
      if (!hadRole) target.removeAttribute('role');
    };
    this._labels = [];
    this._enhance();
    this._bindValidity();
    var self = this;
    this.on(target, 'change', function () {
      self.update();
      var value = self.getValue();
      self.emit('change', { value: value });
      self.call('onChange', { value: value, instance: self });
    });
    if (this.deselectable) {
      this.on(target, 'mousedown', function (event) {
        var node = event.target;
        var input = node && node.closest ? node.closest('input[type="radio"]') : null;
        if (!input && node && node.closest) {
          var label = node.closest('label');
          input = label && label.control && /^radio$/i.test(label.control.type) ? label.control : null;
        }
        self._deselectCandidate = input && input.checked ? input : null;
      });
      this.on(target, 'click', function () {
        var candidate = self._deselectCandidate;
        self._deselectCandidate = null;
        if (!candidate || !candidate.checked) return;
        /* setting `checked = false` fires the native `change` event, which the
           general radio-group change listener (above) already handles — emitting
           here too would deliver `change`/`onChange` twice for one click. */
        candidate.checked = false;
      });
    }
    this.update();
    target.__zidanField = this;
    this.emit('init', { variant: variant });
    ZidanForm._register(this);
  }

  ZidanRadioGroup.prototype = Object.create(ZidanFieldBase.prototype);
  ZidanRadioGroup.prototype.constructor = ZidanRadioGroup;

  ZidanRadioGroup.prototype._enhance = function () {
    var self = this;
    var nodes = Array.prototype.slice.call(this.el.querySelectorAll('input[type="radio"]'));
    this.radios = [];
    nodes.forEach(function (input) {
      if (input.__zidanRadio) {
        self.radios.push(input);
        return;
      }
      input.__zidanRadio = true;
      self.radios.push(input);

      var holder = input.closest ? input.closest('label') : null;
      var created = false;
      if (!holder) {
        holder = doc.createElement('label');
        holder.className = 'zs-radio';
        holder.setAttribute('for', input.id || (input.id = uid('zr')));
        input.parentNode.insertBefore(holder, input);
        holder.appendChild(input);
        created = true;
      } else {
        holder.classList.add('zs-radio');
      }

      var textWrapper = holder.querySelector('.zs-radio-label');
      if (!textWrapper) {
        textWrapper = el('span', 'zs-radio-label');
        var labelText = self.opts.labels && self.opts.labels[input.value] !== undefined
          ? self.opts.labels[input.value]
          : (input.getAttribute('data-zidan-label') || '');
        if (labelText) {
          textWrapper.textContent = labelText;
        } else if (created) {
          textWrapper.textContent = input.value;
        } else {
          moveTextInto(holder, textWrapper);
        }
        if (!textWrapper.textContent.trim()) textWrapper.textContent = input.value;
        holder.appendChild(textWrapper);
      }

      var descText = (self.opts.descriptions && self.opts.descriptions[input.value]) ||
        input.getAttribute('data-zidan-description');
      if (descText && !textWrapper.querySelector('.zs-radio-desc')) {
        var desc = el('span', 'zs-radio-desc');
        desc.textContent = descText;
        textWrapper.appendChild(desc);
        holder.classList.add('zs-radio--has-description');
      }

      var dot = holder.querySelector('.zs-radio-dot');
      if (!dot) {
        dot = el('span', 'zs-radio-dot', { 'aria-hidden': 'true' });
        holder.insertBefore(dot, holder.firstChild);
      }

      addClass(input, 'zs-native-input');

      self._labels.push({ holder: holder, dot: dot, text: textWrapper, created: created, input: input });

      self._cleanups.push(function () {
        input.classList.remove('zs-native-input');
        if (created) {
          holder.parentNode.insertBefore(input, holder);
          holder.parentNode.removeChild(holder);
        } else {
          holder.classList.remove('zs-radio');
          if (dot.parentNode) dot.parentNode.removeChild(dot);
          if (textWrapper.parentNode) textWrapper.parentNode.removeChild(textWrapper);
        }
        delete input.__zidanRadio;
      });
    });
  };

  ZidanRadioGroup.prototype.validationTargets = function () {
    return this.radios || [];
  };

  ZidanRadioGroup.prototype._sync = function () {
    var self = this;
    (this.radios || []).forEach(function (input) {
      var holder = input.closest ? input.closest('.zs-radio') : null;
      var checked = !!input.checked;
      if (holder) {
        holder.classList.toggle('zs-radio--checked', checked);
        holder.classList.toggle('zs-radio--disabled', !!input.disabled);
      }
      input.classList.toggle('zs-native-input--checked', checked);
    });
    this.root.classList.toggle('zs-field--disabled', (this.radios || []).every(function (input) { return input.disabled; }));
  };

  ZidanRadioGroup.prototype.getValue = function () {
    for (var i = 0; i < this.radios.length; i += 1) {
      if (this.radios[i].checked) return this.radios[i].value;
    }
    return '';
  };

  ZidanRadioGroup.prototype.setValue = function (value) {
    var found = false;
    this.radios.forEach(function (input) {
      input.checked = !found && input.value === String(value);
      if (input.checked) found = true;
    });
    return this.update();
  };

  ZidanRadioGroup.prototype._customError = function () {
    if (typeof this.opts.validate === 'function') {
      var result = this.opts.validate(this.getValue(), this, this._asyncContext());
      if (result === false) return this.opts.messages.generic;
      if (typeof result === 'string' && result) return result;
      if (isThenable(result)) return result;
    }
    return '';
  };

  /* @zidan-build:file */
  /* ---------------- file upload ---------------- */

  function formatBytes(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(bytes < 10240 ? 1 : 0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function fileExtension(name) {
    var match = /\.([a-z0-9]+)$/i.exec(String(name || ''));
    return match ? '.' + match[1].toLowerCase() : '';
  }

  function matchesAccept(file, accept) {
    if (!accept) return true;
    return String(accept).split(',').some(function (raw) {
      var token = raw.trim().toLowerCase();
      if (!token) return false;
      if (token.indexOf('.') === 0) return fileExtension(file.name) === token;
      if (token.indexOf('/*') !== -1) return String(file.type).toLowerCase().indexOf(token.split('/')[0] + '/') === 0;
      return String(file.type).toLowerCase() === token;
    });
  }

  function fileKey(file) {
    /* a downscaled upload keeps the key of the file it replaced, so its
       progress row and state stay attached to the original pick */
    if (file && file.__zidanKey) return file.__zidanKey;
    /* webkitRelativePath keeps two files from different dropped folders apart
       when name/size/lastModified/type happen to match */
    return [file.name, file.size, file.lastModified || 0, file.type || '', file.webkitRelativePath || ''].join('|');
  }

  function uploadErrorText(err, fallback) {
    if (err && typeof err === 'string') return err;
    if (err && err.message) return err.message;
    if (err && err.status) return 'Upload failed (HTTP ' + err.status + ').';
    return fallback || 'Upload failed.';
  }

  /* Resize an image File before upload: returns a Promise resolving to the
     original file when no work is needed (or when the browser cannot draw). */
  function downscaleImage(file, options) {
    return new Promise(function (resolve) {
      if (!file || typeof file.type !== 'string' || file.type.indexOf('image/') !== 0) return resolve(file);
      if (typeof document === 'undefined' || typeof Image === 'undefined' ||
        typeof URL === 'undefined' || !URL.createObjectURL) return resolve(file);
      var cfg = options && typeof options === 'object' ? options : {};
      var maxWidth = cfg.maxWidth > 0 ? cfg.maxWidth : 1920;
      var maxHeight = cfg.maxHeight > 0 ? cfg.maxHeight : 1920;
      var quality = cfg.quality === undefined || cfg.quality === null
        ? 0.85 : Math.max(0.1, Math.min(1, Number(cfg.quality) || 0.85));
      var maxBytes = cfg.maxBytes > 0 ? cfg.maxBytes : 0;
      var mime = cfg.mime || (file.type === 'image/png' ? 'image/png' : 'image/jpeg');
      if (maxBytes && file.size && file.size <= maxBytes) return resolve(file);
      var url = URL.createObjectURL(file);
      var done = function (result) {
        try { URL.revokeObjectURL(url); } catch (err) { /* already revoked */ }
        resolve(result);
      };
      var image = new Image();
      image.onload = function () {
        var width = image.naturalWidth || image.width;
        var height = image.naturalHeight || image.height;
        if (!width || !height) return done(file);
        var scale = Math.min(1, maxWidth / width, maxHeight / height);
        if (scale >= 1 && (!cfg.mime || file.type === mime)) return done(file);
        var canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        var context = canvas.getContext ? canvas.getContext('2d') : null;
        if (!context || !canvas.toBlob) return done(file);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
          if (!blob) return done(file);
          if (file.size && blob.size >= file.size && !cfg.force) return done(file);
          var output;
          try {
            output = new File([blob], file.name, {
              type: blob.type || mime,
              lastModified: file.lastModified || Date.now()
            });
          } catch (err) {
            return done(file);
          }
          done(output);
        }, mime, quality);
      };
      image.onerror = function () { done(file); };
      image.src = url;
    });
  }

  function fileReadPath(source, path) {
    if (!path) return source;
    return String(path).split('.').reduce(function (node, key) {
      return node === null || node === undefined ? undefined : node[key];
    }, source);
  }

  function fileQueryString(params) {
    if (!params) return '';
    if (typeof params === 'string') return params.replace(/^[?&]/, '');
    if (typeof URLSearchParams !== 'undefined' && params instanceof URLSearchParams) return params.toString();
    var parts = [];
    Object.keys(params).forEach(function (key) {
      var value = params[key];
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        value.forEach(function (item) {
          if (item !== undefined && item !== null) parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(item));
        });
        return;
      }
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    return parts.join('&');
  }

  function fileWithQuery(url, params) {
    var query = fileQueryString(params);
    if (!query) return url;
    return url + (url.indexOf('?') === -1 ? '?' : '&') + query;
  }

  function fileAppendData(data, key, value) {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach(function (item) { fileAppendData(data, key, item); });
      return;
    }
    data.append(key, value);
  }

  function fileErrorText(body, fallback) {
    if (body && typeof body === 'object') {
      var keys = ['message', 'error', 'detail', 'reason', 'title'];
      for (var i = 0; i < keys.length; i += 1) {
        var value = body[keys[i]];
        if (typeof value === 'string' && value) return value;
        if (value && typeof value.message === 'string' && value.message) return value.message;
      }
    }
    if (typeof body === 'string' && body.trim() && body.length < 240) return body.trim();
    return fallback;
  }

  function ZidanFileUpload(target, options) {
    if (!(this instanceof ZidanFileUpload)) return new ZidanFileUpload(target, options);
    if (!/^file$/i.test(target.type)) {
      throw new Error('ZidanFileUpload: expected an <input type="file">.');
    }
    ZidanFieldBase.call(this, target, options, 'file');
    var self = this;
    var input = target;
    var opts = this.opts;

    var variant = pickList(
      fieldOption(input, opts, 'fileVariant', 'file-variant',
        fieldOption(input, opts, 'variant', 'variant', 'dropzone')),
      FILE_VARIANTS, 'dropzone');

    var originalParent = input.parentNode;
    var root = this._scope('file');
    root.setAttribute('data-zs-file-variant', variant);
    originalParent.insertBefore(root, input);

    var drop = el('label', 'zs-file-drop zs-file-drop--' + variant);
    drop.setAttribute('for', this.id);

    var avatar = el('span', 'zs-file-avatar', { hidden: true });
    var avatarImg = doc.createElement('img');
    avatarImg.alt = '';
    avatar.appendChild(avatarImg);

    var icon = el('span', 'zs-file-icon', { 'aria-hidden': 'true' });
    var iconSpec = fieldOption(input, opts, 'uploadIcon', 'upload-icon',
      fieldOption(input, opts, 'icon', 'icon', 'upload'));
    var glyph = iconNode(iconSpec, 'zs-file-icon-svg');
    if (glyph) icon.appendChild(glyph);

    var fallbackTitle = opts.title || input.getAttribute('data-zidan-title') ||
      (variant === 'avatar' ? 'Upload an image' : (variant === 'gallery' ? 'Add images' : 'Choose a file'));
    var title = el('span', 'zs-file-drop-title', null, fallbackTitle);
    var hint = el('span', 'zs-file-drop-hint', null,
      opts.dropHint || input.getAttribute('data-zidan-drop-hint') ||
      (input.multiple ? 'or drop files here — multiple allowed' : 'or drop it here'));
    drop.appendChild(avatar);
    drop.appendChild(icon);
    drop.appendChild(title);
    drop.appendChild(hint);
    drop.appendChild(input);
    root.appendChild(drop);

    var list = el('ul', 'zs-file-list');
    root.appendChild(list);

    var footer = el('div', 'zs-file-meta-row');
    var status = el('span', 'zs-file-status', { 'role': 'status', 'aria-live': 'polite' });
    var clearBtn = el('button', 'zs-file-clear', { type: 'button' });
    clearBtn.textContent = opts.clearLabel || 'Clear all';
    clearBtn.hidden = true;
    footer.appendChild(status);
    footer.appendChild(clearBtn);
    root.appendChild(footer);

    var acceptHint = opts.accept || input.accept;
    if (acceptHint) hint.textContent = hint.textContent + ' · ' + acceptHint;

    this.variant = variant;
    this.drop = drop;
    this.list = list;
    this.status = status;
    this.clearBtn = clearBtn;
    this.titleEl = title;
    this.hintEl = hint;
    this._fallbackTitle = fallbackTitle;
    this.avatarEl = avatar;
    this.avatarImg = avatarImg;

    this.uploadHandler = typeof opts.upload === 'function' ? opts.upload :
      (typeof opts.uploadHandler === 'function' ? opts.uploadHandler : null);
    this.uploadUrl = fieldOption(input, opts, 'uploadUrl', 'upload-url', '');
    this.uploadField = fieldOption(input, opts, 'uploadField', 'upload-field', 'file');
    this.uploadMethod = fieldOption(input, opts, 'uploadMethod', 'upload-method', 'POST');
    this.uploadParams = fieldOption(input, opts, 'uploadParams', 'upload-params', null);
    this.uploadResponsePath = fieldOption(input, opts, 'uploadResponsePath', 'upload-response-path', '');
    this.uploadErrorPath = fieldOption(input, opts, 'uploadErrorPath', 'upload-error-path', '');
    this.uploadTimeout = Math.max(0, fieldNumber(input, opts, 'uploadTimeout', 'upload-timeout', 0));
    this.uploadRetries = Math.max(0, parseInt(fieldOption(input, opts, 'uploadRetries', 'upload-retries', 0), 10) || 0);
    this.uploadRetryDelay = Math.max(0, fieldNumber(input, opts, 'uploadRetryDelay', 'upload-retry-delay', 700));
    this.uploadConcurrency = Math.max(0, parseInt(fieldOption(input, opts, 'uploadConcurrency', 'upload-concurrency', 0), 10) || 0);
    this.withCredentials = fieldBool(input, opts, 'withCredentials', 'with-credentials',
      fieldBool(input, opts, 'uploadWithCredentials', 'upload-with-credentials', false));
    this.uploadHeaders = opts.uploadHeaders || opts.headers || null;
    this.simulateUpload = fieldBool(input, opts, 'simulateUpload', 'simulate-upload', false);
    this.simulateDuration = Math.max(120, fieldNumber(input, opts, 'simulateDuration', 'simulate-duration', 900));
    this.autoUpload = fieldBool(input, opts, 'autoUpload', 'auto-upload', true);
    this.allowPaste = fieldBool(input, opts, 'allowPaste', 'allow-paste', false);
    this.showClear = fieldBool(input, opts, 'showClear', 'show-clear', true);
    this.showRemove = fieldBool(input, opts, 'showRemove', 'show-remove', true);
    this.showCancel = fieldBool(input, opts, 'showCancel', 'show-cancel', true);
    this.showRetry = fieldBool(input, opts, 'showRetry', 'show-retry', true);
    this.showStatus = fieldBool(input, opts, 'showStatus', 'show-status', true);
    if (this.showStatus === false) status.hidden = true;
    if (this.showClear === false) clearBtn.hidden = true;
    var downscaleValue = opts.downscale !== undefined
      ? opts.downscale
      : fieldOption(input, opts, 'downscale', 'downscale', null);
    var downscaleConfig = null;
    if (downscaleValue === true || downscaleValue === '' || downscaleValue === 'true' || downscaleValue === 'on') {
      downscaleConfig = {};
    } else if (downscaleValue && typeof downscaleValue === 'object') {
      downscaleConfig = downscaleValue;
    } else if (typeof downscaleValue === 'string' && downscaleValue !== 'false' && downscaleValue !== 'off') {
      try { downscaleConfig = JSON.parse(downscaleValue); } catch (err) { downscaleConfig = {}; }
    }
    if (downscaleConfig) {
      this.downscale = {
        maxWidth: fieldNumber(input, opts, 'downscaleMaxWidth', 'downscale-max-width',
          downscaleConfig.maxWidth > 0 ? downscaleConfig.maxWidth : 1920),
        maxHeight: fieldNumber(input, opts, 'downscaleMaxHeight', 'downscale-max-height',
          downscaleConfig.maxHeight > 0 ? downscaleConfig.maxHeight : 1920),
        quality: fieldNumber(input, opts, 'downscaleQuality', 'downscale-quality',
          downscaleConfig.quality > 0 ? downscaleConfig.quality : 0.85),
        maxBytes: fieldNumber(input, opts, 'downscaleMaxBytes', 'downscale-max-bytes',
          downscaleConfig.maxBytes > 0 ? downscaleConfig.maxBytes : 0),
        mime: fieldOption(input, opts, 'downscaleMime', 'downscale-mime', downscaleConfig.mime || ''),
        force: fieldBool(input, opts, 'downscaleForce', 'downscale-force', !!downscaleConfig.force)
      };
    } else {
      this.downscale = null;
    }
    root.setAttribute('data-zs-downscale', this.downscale ? 'true' : 'false');
    this.showFileMeta = fieldBool(input, opts, 'showFileMeta', 'show-file-meta', true);
    this.showPreview = fieldBool(input, opts, 'showPreview', 'preview', true);
    this.hasUploader = !!(this.uploadHandler || this.uploadUrl || this.simulateUpload);
    root.setAttribute('data-zs-upload', this.hasUploader ? 'true' : 'false');

    this._uploads = Object.create(null);
    this._active = Object.create(null);
    this._queue = [];
    this._retryTimers = Object.create(null);
    this._waiters = [];
    this._pendingStarts = 0;
    this._uploadEpoch = 0;
    this._batch = 0;
    this._urls = [];
    this._renderQueued = false;
    this.fileError = '';
    this._restoreInput = function () {
      var parent = root.parentNode || originalParent;
      parent.insertBefore(input, root.parentNode ? root : null);
      input.classList.remove('zs-native-input', 'zs-file-input');
    };

    addClass(input, 'zs-native-input');
    addClass(input, 'zs-file-input');

    this.on(input, 'change', function () {
      var ok = self._validate();
      self._render();
      self.emit('change', { files: self.getFiles() });
      self.call('onChange', { files: self.getFiles(), instance: self });
      if (ok && self.autoUpload && self.hasUploader) self.uploadAll();
    });

    var dragDepth = 0;
    ['dragenter', 'dragover'].forEach(function (type) {
      self.on(drop, type, function (event) {
        event.preventDefault();
        if (type === 'dragenter') dragDepth += 1;
        drop.classList.add('zs-file-drop--over');
      });
    });
    self.on(drop, 'dragleave', function () {
      dragDepth = Math.max(0, dragDepth - 1);
      if (!dragDepth) drop.classList.remove('zs-file-drop--over');
    });
    self.on(drop, 'drop', function (event) {
      event.preventDefault();
      dragDepth = 0;
      drop.classList.remove('zs-file-drop--over');
      if (!event.dataTransfer || !event.dataTransfer.files || !event.dataTransfer.files.length) return;
      var incoming = Array.prototype.slice.call(event.dataTransfer.files);
      if (!input.multiple) incoming = incoming.slice(0, 1);
      self.addFiles(incoming);
    });

    if (self.allowPaste) {
      drop.setAttribute('tabindex', '0');
      self.on(drop, 'paste', function (event) {
        var data = event.clipboardData || global.clipboardData;
        if (!data || !data.files || !data.files.length) return;
        event.preventDefault();
        var incoming = Array.prototype.slice.call(data.files);
        if (!input.multiple) incoming = incoming.slice(0, 1);
        self.addFiles(incoming);
      });
    }

    self.on(clearBtn, 'click', function () { self.clear(); });

    /* Delegated once: the list is rebuilt on every upload progress tick, so
       per-item listeners would grow without bound. */
    self.on(list, 'click', function (event) {
      var button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!button || !list.contains(button)) return;
      var item = button.closest('.zs-file-item');
      var index = item ? parseInt(item.getAttribute('data-zs-file-index'), 10) : -1;
      var file = index >= 0 ? self.getFiles()[index] : null;
      if (!file) return;
      event.preventDefault();
      event.stopPropagation();
      if (button.classList.contains('zs-file-cancel')) self.cancelUpload(file);
      else if (button.classList.contains('zs-file-retry')) self.retryUpload(file);
      else if (button.classList.contains('zs-file-remove')) self.removeFile(file);
    });

    this._bindValidity();
    this.on(this.formEl, 'reset', function () {
      global.setTimeout(function () {
        if (self.destroyed) return;
        self.cancelAll();
        self._uploads = Object.create(null);
        self.fileError = '';
        if (input.setCustomValidity) input.setCustomValidity('');
        self._render();
      }, 0);
    });

    input.__zidanField = this;
    this.setFramework(this.framework);
    this._render();
    this.emit('init', {});
    ZidanForm._register(this);
  }

  ZidanFileUpload.prototype = Object.create(ZidanFieldBase.prototype);
  ZidanFileUpload.prototype.constructor = ZidanFileUpload;

  ZidanFileUpload.prototype._adapterButton = function (button, tone) {
    if (!button || this.framework !== 'bootstrap') return button;
    button.classList.add('btn', 'btn-sm', 'zs-bootstrap-btn');
    button.classList.add('btn-outline-' + (tone || 'secondary'));
    return button;
  };

  ZidanFileUpload.prototype.setFramework = function (name) {
    ZidanFieldBase.prototype.setFramework.call(this, name);
    if (!this.drop) return this;
    var bootstrap = this.framework === 'bootstrap';
    this.root.classList.toggle('zs-file--bootstrap', bootstrap);
    this.drop.classList.toggle('form-control', bootstrap);
    this.drop.classList.toggle('zs-bootstrap-drop', bootstrap);
    this.clearBtn.classList.toggle('btn', bootstrap);
    this.clearBtn.classList.toggle('btn-sm', bootstrap);
    this.clearBtn.classList.toggle('btn-outline-secondary', bootstrap);
    this.clearBtn.classList.toggle('zs-bootstrap-btn', bootstrap);
    return this;
  };

  ZidanFileUpload.prototype.getFiles = function () {
    return this.el.files ? Array.prototype.slice.call(this.el.files) : [];
  };

  ZidanFileUpload.prototype.getUploadState = function () {
    var self = this;
    return this.getFiles().map(function (file) {
      var state = self._stateFor(file, false) || { status: 'idle', progress: 0, error: '', result: null, attempts: 0 };
      return {
        file: file,
        name: file.name,
        size: file.size,
        status: state.status,
        progress: state.progress,
        error: state.error,
        result: state.result,
        attempts: state.attempts || 0
      };
    });
  };

  ZidanFileUpload.prototype._fileIndex = function (target) {
    var files = this.getFiles();
    if (typeof target === 'number') return target;
    if (typeof target === 'string') {
      for (var i = 0; i < files.length; i += 1) {
        if (files[i].name === target) return i;
      }
      return -1;
    }
    return files.indexOf(target);
  };

  ZidanFileUpload.prototype.getFileState = function (target) {
    var index = this._fileIndex(target);
    if (index < 0) return null;
    return this.getUploadState()[index] || null;
  };

  ZidanFileUpload.prototype._stateFor = function (file, create) {
    var key = fileKey(file);
    var state = this._uploads[key];
    if (!state && create) {
      state = this._uploads[key] = {
        status: 'idle', progress: 0, error: '', result: null, attempts: 0
      };
    }
    return state;
  };

  ZidanFileUpload.prototype._setFiles = function (files) {
    try {
      var Ctor = typeof DataTransfer !== 'undefined' ? DataTransfer : global.DataTransfer;
      if (!Ctor) return false;
      var dt = new Ctor();
      files.forEach(function (file) { dt.items.add(file); });
      this.el.files = dt.files;
      return true;
    } catch (err) {
      return false;
    }
  };

  /* keeps native input.files authoritative; `source: 'user'` mirrors a pick/drop */
  ZidanFileUpload.prototype._applyFiles = function (files, fromDrop) {
    if (!this._setFiles(files)) {
      this.emit('error', { error: new Error('This browser cannot assign files programmatically.'), action: 'setFiles' });
      return this;
    }
    if (fromDrop) {
      try { this.el.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { /* old browsers */ }
    } else {
      this._validate();
      this._render();
    }
    return this;
  };

  ZidanFileUpload.prototype.addFiles = function (files) {
    var incoming = files && files.length !== undefined ? Array.prototype.slice.call(files) : toArray(files);
    if (!incoming.length) return this;
    var current = this.el.multiple ? this.getFiles() : [];
    var seen = Object.create(null);
    var next = current.concat(incoming).filter(function (file) {
      var key = fileKey(file);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
    if (!this.el.multiple) next = next.slice(0, 1);
    if (!this._setFiles(next)) {
      this.emit('error', { error: new Error('This browser cannot assign files programmatically.'), action: 'addFiles' });
      return this;
    }
    try { this.el.dispatchEvent(new Event('change', { bubbles: true })); } catch (err) { /* old browsers */ }
    return this;
  };

  ZidanFileUpload.prototype.replaceFiles = function (files) {
    return this._applyFiles(files && files.length !== undefined ? Array.prototype.slice.call(files) : toArray(files), true);
  };

  ZidanFileUpload.prototype.removeFile = function (target) {
    var files = this.getFiles();
    var index = this._fileIndex(target);
    if (index === -1 || !files[index]) return this;
    var file = files[index];
    this.cancelUpload(file);
    delete this._uploads[fileKey(file)];
    var next = files.slice();
    next.splice(index, 1);
    this._setFiles(next);
    this._validate();
    this._render();
    this.emit('change', { files: next });
    this.emit('remove', { file: file, index: index });
    this.call('onChange', { files: next, instance: this });
    this.call('onRemove', { file: file, index: index, instance: this });
    this._flushWaiters();
    return this;
  };

  ZidanFileUpload.prototype.removeFiles = function (targets) {
    var list = targets && targets.length !== undefined ? Array.prototype.slice.call(targets) : [targets];
    var files = this.getFiles();
    var self = this;
    var indexes = list.map(function (target) {
      return self._fileIndex(target);
    }).filter(function (index, position, all) {
      return index >= 0 && index < files.length && all.indexOf(index) === position;
    }).sort(function (a, b) { return b - a; });
    indexes.forEach(function (index) { self.removeFile(index); });
    return this;
  };

  ZidanFileUpload.prototype.clear = function () {
    var waiters = this._waiters;
    this._uploadEpoch += 1;
    this._pendingStarts = 0;
    this._batch = 0;
    this._waiters = [];
    this.cancelAll();
    this._uploads = Object.create(null);
    this.fileError = '';
    if (!this._setFiles([])) this.el.value = '';
    if (this.el.setCustomValidity) this.el.setCustomValidity('');
    this._validate();
    this._render();
    this.emit('change', { files: [] });
    this.emit('clear', {});
    this.call('onChange', { files: [], instance: this });
    this._flushWaiters();
    // a clear ends the current upload session: settle anyone waiting for it
    // instead of leaving their whenUploaded() promise pending forever
    if (waiters.length) {
      var states = this.getUploadState();
      waiters.forEach(function (resolve) { resolve(states); });
    }
    return this;
  };

  ZidanFileUpload.prototype._limits = function () {
    var input = this.el;
    var opts = this.opts;
    var maxFiles = parseInt(opts.maxFiles || input.getAttribute('data-zidan-max-files'), 10);
    var minFiles = parseInt(opts.minFiles || input.getAttribute('data-zidan-min-files'), 10);
    var maxSize = parseInt(opts.maxSize || input.getAttribute('data-zidan-max-size'), 10);
    var maxTotalSize = parseInt(opts.maxTotalSize || input.getAttribute('data-zidan-max-total-size'), 10);
    if (!(maxSize > 0)) {
      var sizeMb = opts.maxSizeMB;
      if (sizeMb === undefined || sizeMb === null || sizeMb === '') sizeMb = input.getAttribute('data-zidan-max-size-mb');
      if (sizeMb !== null && sizeMb !== undefined && sizeMb !== '') {
        var sizeMbValue = parseFloat(sizeMb);
        if (sizeMbValue > 0) maxSize = Math.round(sizeMbValue * 1024 * 1024);
      }
    }
    if (!(maxTotalSize > 0)) {
      var totalMb = opts.maxTotalSizeMB;
      if (totalMb === undefined || totalMb === null || totalMb === '') totalMb = input.getAttribute('data-zidan-max-total-size-mb');
      if (totalMb !== null && totalMb !== undefined && totalMb !== '') {
        var totalMbValue = parseFloat(totalMb);
        if (totalMbValue > 0) maxTotalSize = Math.round(totalMbValue * 1024 * 1024);
      }
    }
    return {
      minFiles: minFiles > 0 ? minFiles : 0,
      maxFiles: maxFiles > 0 ? maxFiles : 0,
      maxSize: maxSize > 0 ? maxSize : 0,
      maxTotalSize: maxTotalSize > 0 ? maxTotalSize : 0,
      accept: opts.accept || input.accept || ''
    };
  };

  ZidanFileUpload.prototype._setCustomValidity = function (message) {
    if (this.el && this.el.setCustomValidity) this.el.setCustomValidity(message || '');
  };

  ZidanFileUpload.prototype._customError = function () {
    if (this.fileError) return this.fileError;
    if (typeof this.opts.validate === 'function') {
      var result = this.opts.validate(this.getFiles(), this, this._asyncContext());
      if (result === false) return this.opts.messages.generic;
      if (typeof result === 'string' && result) return result;
      if (isThenable(result)) return result;
    }
    return '';
  };

  ZidanFileUpload.prototype._validate = function () {
    var input = this.el;
    var messages = this.opts.messages;
    var limits = this._limits();
    var files = this.getFiles();
    var error = '';

    if (limits.maxFiles && files.length > limits.maxFiles) {
      error = fillTemplate(messages.fileCount, { max: limits.maxFiles });
      files = files.slice(0, limits.maxFiles);
      this._setFiles(files);
    }
    if (!error && limits.minFiles && files.length && files.length < limits.minFiles) {
      error = fillTemplate(messages.fileMin, { min: limits.minFiles });
    }
    if (!error && limits.maxTotalSize) {
      var totalSize = files.reduce(function (sum, file) { return sum + file.size; }, 0);
      if (totalSize > limits.maxTotalSize) {
        error = fillTemplate(messages.fileTotalSize, { limit: formatBytes(limits.maxTotalSize) });
      }
    }
    if (!error && limits.maxSize) {
      for (var i = 0; i < files.length; i += 1) {
        if (files[i].size > limits.maxSize) {
          error = fillTemplate(messages.fileSize, {
            name: files[i].name,
            size: formatBytes(files[i].size),
            limit: formatBytes(limits.maxSize)
          });
          break;
        }
      }
    }
    if (!error && limits.accept) {
      for (var j = 0; j < files.length; j += 1) {
        if (!matchesAccept(files[j], limits.accept)) {
          error = fillTemplate(messages.fileType, { name: files[j].name, accept: limits.accept });
          break;
        }
      }
    }

    this.fileError = error;
    if (input.setCustomValidity) {
      input.setCustomValidity(this.pending ? (messages.pending || FIELD_MESSAGES.pending) : (error || ''));
    }
    var shown = error || this._nativeError();
    if (shown) this.setError(shown);
    else if (this.errorMessage) this.setError(null);
    this.root.classList.toggle('zs-field--filled', files.length > 0);
    this.drop.classList.toggle('zs-file-drop--invalid', !!shown);
    this._renderStatus();
    return !shown;
  };

  ZidanFileUpload.prototype._sync = function () {
    this._render();
  };

  ZidanFileUpload.prototype._queueRender = function () {
    var self = this;
    if (this._renderQueued || this.destroyed) return;
    this._renderQueued = true;
    var run = function () {
      self._renderQueued = false;
      if (!self.destroyed) self._render();
    };
    if (global.requestAnimationFrame) global.requestAnimationFrame(run);
    else global.setTimeout(run, 32);
  };

  ZidanFileUpload.prototype._renderStatus = function () {
    var files = this.getFiles();
    var states = this.getUploadState();
    var total = files.reduce(function (sum, file) { return sum + file.size; }, 0);
    var uploading = states.filter(function (state) { return state.status === 'uploading'; });
    var failed = states.filter(function (state) { return state.status === 'error'; });
    var done = states.filter(function (state) { return state.status === 'done'; });
    var text = '';

    if (this.fileError) {
      text = this.fileError;
    } else if (files.length) {
      text = files.length + (files.length === 1 ? ' file selected' : ' files selected') + ' · ' + formatBytes(total);
      if (uploading.length) {
        var percent = Math.round(uploading.reduce(function (sum, state) { return sum + state.progress; }, 0) / uploading.length);
        text += ' · Uploading ' + percent + '%';
      } else if (failed.length) {
        text += ' · ' + failed.length + ' failed';
      } else if (done.length === files.length && this.hasUploader) {
        text += ' · Uploaded';
      }
    }

    if (typeof this.opts.statusFormat === 'function') {
      try {
        var custom = this.opts.statusFormat({
          files: files,
          states: states,
          total: total,
          uploading: uploading.length,
          failed: failed.length,
          done: done.length,
          error: this.fileError,
          field: this
        });
        if (custom !== undefined && custom !== null) text = String(custom);
      } catch (err) {
        this.emit('error', { error: err, callback: 'statusFormat' });
      }
    }

    this.status.textContent = text;
    this.status.classList.toggle('zs-file-status--error', !!this.fileError);
    this.status.classList.toggle('zs-file-status--success', !this.fileError && files.length > 0 && done.length === files.length && this.hasUploader);
  };

  ZidanFileUpload.prototype._render = function () {
    var self = this;
    var files = this.getFiles();
    var opts = this.opts;
    // detach first, then revoke a tick later: revoking a blob that a live
    // <img> still points at (or that is mid-decode) makes the browser raise a
    // failed-resource error
    this.list.textContent = '';
    this._revokeLater(this._urls);
    this._urls = [];
    this.list.hidden = files.length === 0;
    this.clearBtn.hidden = files.length === 0 || !this.showClear;
    this.root.classList.toggle('zs-field--filled', files.length > 0);
    this.drop.classList.toggle('zs-file-drop--has-files', files.length > 0);

    var previewFile = this.showPreview ? files.filter(function (file) { return /^image\//.test(file.type); })[0] : null;
    var previewUrl = previewFile && typeof URL !== 'undefined' && URL.createObjectURL
      ? URL.createObjectURL(previewFile) : '';
    if (previewUrl) {
      this._urls.push(previewUrl);
      this.avatarImg.src = previewUrl;
      this.avatarEl.hidden = false;
      this.drop.classList.add('zs-file-drop--has-preview');
      this.titleEl.textContent = opts.replaceTitle || 'Change image';
    } else {
      this.avatarImg.removeAttribute('src');
      this.avatarEl.hidden = true;
      this.drop.classList.remove('zs-file-drop--has-preview');
      this.titleEl.textContent = this._fallbackTitle;
    }

    files.forEach(function (file, index) {
      var state = self._stateFor(file, false) || { status: 'idle', progress: 0, error: '', result: null, attempts: 0 };
      var item = el('li', 'zs-file-item');
      item.setAttribute('data-zs-upload-state', state.status);
      item.setAttribute('data-zs-file-index', String(index));

      var thumb = el('span', 'zs-file-thumb');
      var url = typeof URL !== 'undefined' && URL.createObjectURL ? URL.createObjectURL(file) : '';
      if (/^image\//.test(file.type) && url) {
        self._urls.push(url);
        var img = doc.createElement('img');
        img.src = url;
        img.alt = '';
        thumb.appendChild(img);
      } else {
        thumb.textContent = (fileExtension(file.name) || 'file').replace('.', '').slice(0, 4).toUpperCase();
      }

      var meta = el('span', 'zs-file-info');
      var name = el('span', 'zs-file-name', null, file.name);
      meta.appendChild(name);
      if (self.showFileMeta) {
        var sizeText = formatBytes(file.size) + (file.type ? ' · ' + file.type : '');
        meta.appendChild(el('span', 'zs-file-size', null, sizeText));
      }

      if (self.hasUploader) {
        var stateLine = el('span', 'zs-file-upload-state');
        if (state.status === 'uploading') {
          stateLine.textContent = fillTemplate(opts.progressTemplate || 'Uploading {percent}%', { percent: state.progress });
          var bar = el('span', 'zs-file-progress');
          bar.setAttribute('role', 'progressbar');
          bar.setAttribute('aria-valuemin', '0');
          bar.setAttribute('aria-valuemax', '100');
          bar.setAttribute('aria-valuenow', String(state.progress));
          bar.setAttribute('aria-label', 'Upload progress for ' + file.name);
          var fill = el('span', 'zs-file-progress-bar');
          fill.style.width = state.progress + '%';
          bar.appendChild(fill);
          stateLine.appendChild(bar);
        } else if (state.status === 'done') {
          stateLine.textContent = opts.uploadedLabel || 'Uploaded';
        } else if (state.status === 'error') {
          stateLine.textContent = (opts.failedLabel || 'Upload failed') + (state.error ? ' — ' + state.error : '');
        } else if (state.status === 'canceled') {
          stateLine.textContent = opts.canceledLabel || 'Upload canceled';
        } else if (state.status === 'queued') {
          stateLine.textContent = opts.queuedLabel || 'Queued';
        } else if (state.status === 'retrying') {
          stateLine.textContent = fillTemplate(opts.retryingLabel || 'Retrying attempt {attempt}…', { attempt: state.attempts });
        }
        if (stateLine.textContent) meta.appendChild(stateLine);
      }

      var actions = el('span', 'zs-file-actions');
      if (self.showCancel && (state.status === 'uploading' || state.status === 'queued' || state.status === 'retrying')) {
        var cancel = el('button', 'zs-file-cancel', { type: 'button', 'aria-label': 'Cancel upload of ' + file.name });
        cancel.textContent = opts.cancelLabel || 'Cancel';
        self._adapterButton(cancel, 'danger');
        actions.appendChild(cancel);
      } else if (self.showRetry && (state.status === 'error' || state.status === 'canceled')) {
        var retry = el('button', 'zs-file-retry', { type: 'button', 'aria-label': 'Retry upload of ' + file.name });
        retry.textContent = opts.retryLabel || 'Retry';
        self._adapterButton(retry, 'primary');
        actions.appendChild(retry);
      }

      if (self.showRemove) {
        var remove = el('button', 'zs-file-remove', { type: 'button', 'aria-label': 'Remove ' + file.name });
        remove.textContent = '\u00d7';
        self._adapterButton(remove, 'secondary');
        actions.appendChild(remove);
      }

      item.appendChild(thumb);
      item.appendChild(meta);
      item.appendChild(actions);
      self.list.appendChild(item);

      if (typeof opts.renderFile === 'function') {
        try {
          opts.renderFile(item, {
            file: file,
            index: index,
            state: state,
            field: self
          });
        } catch (err) {
          self.emit('error', { error: err, callback: 'renderFile' });
        }
      }
    });

    this._renderStatus();
  };

  ZidanFileUpload.prototype.setVariant = function (name) {
    var next = pickList(name, FILE_VARIANTS, this.variant);
    if (next === this.variant) return this;
    this.variant = next;
    FILE_VARIANTS.forEach(function (variant) { this.drop.classList.remove('zs-file-drop--' + variant); }, this);
    this.drop.classList.add('zs-file-drop--' + next);
    this.root.setAttribute('data-zs-file-variant', next);
    this._render();
    return this;
  };

  ZidanFileUpload.prototype.setUploader = function (source) {
    if (typeof source === 'function') {
      this.uploadHandler = source;
      this.uploadUrl = '';
    } else {
      this.uploadHandler = null;
      this.uploadUrl = source ? String(source) : '';
    }
    this.hasUploader = !!(this.uploadHandler || this.uploadUrl || this.simulateUpload);
    this.root.setAttribute('data-zs-upload', this.hasUploader ? 'true' : 'false');
    this._render();
    return this;
  };

  ZidanFileUpload.prototype._formData = function (file) {
    var data = new FormData();
    data.append(this.uploadField, file, file.name);
    var extra = typeof this.opts.uploadData === 'function' ? this.opts.uploadData(file, this) : this.opts.uploadData;
    if (extra && typeof extra === 'object') {
      Object.keys(extra).forEach(function (key) {
        fileAppendData(data, key, extra[key]);
      });
    }
    return data;
  };

  ZidanFileUpload.prototype.setUploadUrl = function (url) {
    this.uploadHandler = null;
    this.uploadUrl = url ? String(url) : '';
    this.hasUploader = !!(this.uploadHandler || this.uploadUrl || this.simulateUpload);
    this.root.setAttribute('data-zs-upload', this.hasUploader ? 'true' : 'false');
    this._render();
    return this;
  };

  ZidanFileUpload.prototype.setUploadOptions = function (options) {
    var opts = options || {};
    if ('upload' in opts) this.uploadHandler = typeof opts.upload === 'function' ? opts.upload : null;
    if ('uploadHandler' in opts) this.uploadHandler = typeof opts.uploadHandler === 'function' ? opts.uploadHandler : null;
    if ('uploadUrl' in opts) {
      this.uploadUrl = typeof opts.uploadUrl === 'function'
        ? opts.uploadUrl
        : (opts.uploadUrl ? String(opts.uploadUrl) : '');
    }
    if ('uploadField' in opts && opts.uploadField) this.uploadField = String(opts.uploadField);
    if ('uploadMethod' in opts && opts.uploadMethod) this.uploadMethod = opts.uploadMethod;
    if ('uploadParams' in opts) this.uploadParams = opts.uploadParams;
    if ('uploadData' in opts) this.opts.uploadData = opts.uploadData;
    if ('uploadHeaders' in opts) this.uploadHeaders = opts.uploadHeaders;
    if ('headers' in opts) this.uploadHeaders = opts.headers;
    if ('withCredentials' in opts) this.withCredentials = !!opts.withCredentials;
    if ('uploadWithCredentials' in opts) this.withCredentials = !!opts.uploadWithCredentials;
    if ('uploadResponsePath' in opts) this.uploadResponsePath = opts.uploadResponsePath || '';
    if ('uploadErrorPath' in opts) this.uploadErrorPath = opts.uploadErrorPath || '';
    if ('uploadTimeout' in opts) this.uploadTimeout = Math.max(0, Number(opts.uploadTimeout) || 0);
    if ('uploadRetries' in opts) this.uploadRetries = Math.max(0, parseInt(opts.uploadRetries, 10) || 0);
    if ('uploadRetryDelay' in opts) this.uploadRetryDelay = Math.max(0, Number(opts.uploadRetryDelay) || 0);
    if ('uploadConcurrency' in opts) this.uploadConcurrency = Math.max(0, parseInt(opts.uploadConcurrency, 10) || 0);
    this.hasUploader = !!(this.uploadHandler || this.uploadUrl || this.simulateUpload);
    this.root.setAttribute('data-zs-upload', this.hasUploader ? 'true' : 'false');
    this._render();
    return this;
  };

  ZidanFileUpload.prototype.uploadAll = function () {
    var self = this;
    if (!this.hasUploader) return this;
    if (!this._validate()) return this;
    var check = this.validate();
    var epoch = this._uploadEpoch;
    var release = function () {
      self._batch = Math.max(0, self._batch - 1);
      self._drainQueue();
      self._flushWaiters();
    };
    var run = function (valid) {
      try {
        if (valid && !self.destroyed && epoch === self._uploadEpoch) {
          self.getFiles().forEach(function (file) { self.uploadFile(file); });
        }
      } finally {
        release();
      }
      return valid;
    };
    if (isThenable(check)) {
      this._batch += 1;
      return check.then(run, function (err) {
        release();
        throw err;
      });
    }
    if (!check) return this;
    this._batch += 1;
    try {
      run(true);
    } finally {
      /* run() releases on its own; only release when it never ran */
      if (this._batch > 0) release();
    }
    return this;
  };

  ZidanFileUpload.prototype._isBusy = function () {
    return this._batch > 0 || this._pendingStarts > 0 || this._queue.length > 0 ||
      Object.keys(this._active).length > 0 || Object.keys(this._retryTimers).length > 0;
  };

  ZidanFileUpload.prototype.isUploading = function () { return this._isBusy(); };

  ZidanFileUpload.prototype.whenUploaded = function () {
    var self = this;
    if (!this._isBusy()) return Promise.resolve(this.getUploadState());
    return new Promise(function (resolve) { self._waiters.push(resolve); });
  };

  ZidanFileUpload.prototype._flushWaiters = function () {
    if (this._cancelingAll || !this._waiters.length || this._isBusy()) return;
    var waiters = this._waiters;
    this._waiters = [];
    var states = this.getUploadState();
    waiters.forEach(function (resolve) { resolve(states); });
  };

  ZidanFileUpload.prototype._drainQueue = function () {
    if (this.destroyed) return this;
    var limit = this.uploadConcurrency;
    while (this._queue.length && (!limit || Object.keys(this._active).length < limit)) {
      var file = this._queue.shift();
      var state = this._stateFor(file, false);
      if (!state || state.status !== 'queued') continue;
      this._startUpload(file);
    }
    this._flushWaiters();
    return this;
  };

  ZidanFileUpload.prototype._enqueueUpload = function (file) {
    var state = this._stateFor(file, true);
    if (state.status === 'uploading' || state.status === 'queued' ||
        state.status === 'done' || state.status === 'retrying') return this;
    if (this.uploadConcurrency > 0 && Object.keys(this._active).length >= this.uploadConcurrency) {
      state.status = 'queued';
      state.progress = 0;
      state.error = '';
      this._queue.push(file);
      this._queueRender();
      this.emit('upload-queued', { file: file, name: file.name, size: file.size, position: this._queue.length });
      this.call('onUploadQueued', { file: file, name: file.name, size: file.size, position: this._queue.length, instance: this });
      this._flushWaiters();
      return this;
    }
    return this._startUpload(file);
  };

  ZidanFileUpload.prototype.uploadFile = function (file) {
    var self = this;
    var key = fileKey(file);
    var epoch = this._uploadEpoch;
    if (this.downscale && file && file.type && file.type.indexOf('image/') === 0 && !file.__zidanKey) {
      this._pendingStarts += 1;
      var ready = function (output) {
        self._pendingStarts = Math.max(0, self._pendingStarts - 1);
        if (self.destroyed || epoch !== self._uploadEpoch) {
          self._flushWaiters();
          return;
        }
        var stillSelected = self.getFiles().some(function (item) { return item === file || fileKey(item) === key; });
        if (!stillSelected) {
          self._flushWaiters();
          return;
        }
        if (!output) output = file;
        try {
          Object.defineProperty(output, '__zidanKey', { value: key, configurable: true });
        } catch (err) {
          output.__zidanKey = key;
        }
        self._enqueueUpload(output);
      };
      downscaleImage(file, this.downscale).then(ready, function () { ready(file); });
      return this;
    }
    return this._enqueueUpload(file);
  };

  ZidanFileUpload.prototype._startUpload = function (file) {
    var self = this;
    var key = fileKey(file);
    var state = this._stateFor(file, true);
    if (state.status === 'uploading' || state.status === 'done') return this;

    state.status = 'uploading';
    state.progress = 0;
    state.error = '';
    state.result = null;
    state.attempts = (state.attempts || 0) + 1;
    this._queueRender();
    this.emit('upload-start', {
      file: file, name: file.name, size: file.size, attempt: state.attempts
    });
    this.call('onUploadStart', {
      file: file, name: file.name, size: file.size, attempt: state.attempts, instance: this
    });

    if (this.uploadHandler) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      this._active[key] = {
        type: 'handler',
        abort: function () { if (controller) controller.abort(); }
      };
      var formData;
      try {
        formData = this._formData(file);
      } catch (err) {
        this._fail(file, err);
        return this;
      }
      var context = {
        file: file,
        field: this,
        formData: formData,
        signal: controller ? controller.signal : null,
        onProgress: function (percent) { self._setProgress(file, percent); },
        complete: function (value) { self._finish(file, value); },
        fail: function (err) { self._fail(file, err); }
      };
      var result;
      try {
        result = this.uploadHandler(file, context);
      } catch (err) {
        this._fail(file, err);
        return this;
      }
      if (result && typeof result.then === 'function') {
        result.then(function (value) {
          self._finish(file, value);
        }, function (err) {
          if (err && (err.name === 'AbortError' || err.aborted)) self._canceledUpload(file);
          else self._fail(file, err);
        });
      } else if (result !== undefined) {
        this._finish(file, result);
      }
      // returning nothing means the handler will call context.complete/fail
      return this;
    }

    if (this.uploadUrl) {
      var xhr;
      try {
        xhr = new global.XMLHttpRequest();
        var url = typeof this.uploadUrl === 'function' ? this.uploadUrl(file, this) : this.uploadUrl;
        var method = typeof this.uploadMethod === 'function' ? this.uploadMethod(file, this) : this.uploadMethod;
        var params = typeof this.uploadParams === 'function' ? this.uploadParams(file, this) : this.uploadParams;
        url = fileWithQuery(String(url || ''), params);
        xhr.open(String(method || 'POST').toUpperCase(), url, true);
      } catch (err) {
        this._fail(file, err);
        return this;
      }
      this._active[key] = {
        type: 'xhr',
        abort: function () { try { xhr.abort(); } catch (err) { /* already done */ } }
      };
      if (this.withCredentials) xhr.withCredentials = true;
      if (this.uploadTimeout) xhr.timeout = this.uploadTimeout;
      try {
        var headers = typeof this.uploadHeaders === 'function' ? this.uploadHeaders(file, this) : this.uploadHeaders;
        if (headers && typeof headers === 'object') {
          Object.keys(headers).forEach(function (name) {
            var value = headers[name];
            if (Array.isArray(value)) value = value.join(', ');
            if (value !== undefined && value !== null) xhr.setRequestHeader(name, value);
          });
        }
      } catch (err) {
        this._fail(file, err);
        return this;
      }
      if (xhr.upload) {
        xhr.upload.onprogress = function (event) {
          if (!event.lengthComputable) return;
          self._setProgress(file, Math.min(99, Math.round((event.loaded / event.total) * 100)));
        };
      }
      xhr.onload = function () {
        var body = xhr.responseText;
        try { body = JSON.parse(body); } catch (err) { /* plain text response */ }
        if (xhr.status >= 200 && xhr.status < 300) {
          self._finish(file, self.uploadResponsePath ? fileReadPath(body, self.uploadResponsePath) : body);
          return;
        }
        var detail = self.uploadErrorPath ? fileReadPath(body, self.uploadErrorPath) : body;
        self._fail(file, {
          status: xhr.status,
          body: body,
          message: fileErrorText(detail, 'Upload failed (HTTP ' + xhr.status + ').'),
          retryable: xhr.status === 0 || xhr.status === 408 || xhr.status === 429 || xhr.status >= 500
        });
      };
      xhr.onerror = function () {
        self._fail(file, { message: 'Network error while uploading.', retryable: true });
      };
      xhr.ontimeout = function () {
        self._fail(file, {
          message: 'Upload timed out after ' + Math.round(self.uploadTimeout / 1000) + 's.',
          timeout: true,
          retryable: true
        });
      };
      xhr.onabort = function () { self._canceledUpload(file); };
      try {
        xhr.send(this._formData(file));
      } catch (err) {
        this._fail(file, err);
      }
      return this;
    }

    if (this.simulateUpload) {
      var started = Date.now();
      var timer = null;
      var tick = function () {
        if (!self._uploads[key] || state.status !== 'uploading') return;
        var percent = Math.min(99, Math.round(((Date.now() - started) / self.simulateDuration) * 100));
        self._setProgress(file, percent);
        if (percent >= 99) {
          delete self._active[key];
          self._finish(file, { simulated: true });
        } else {
          timer = global.setTimeout(tick, 40);
        }
      };
      this._active[key] = { type: 'simulation', abort: function () { if (timer) global.clearTimeout(timer); } };
      timer = global.setTimeout(tick, 40);
      return this;
    }

    delete this._active[key];
    state.status = 'idle';
    this._queueRender();
    this._drainQueue();
    return this;
  };

  ZidanFileUpload.prototype._setProgress = function (file, percent) {
    var state = this._stateFor(file, false);
    if (!state || state.status !== 'uploading') return;
    var value = clamp(Math.round(Number(percent) || 0), 0, 99);
    if (value === state.progress) return;
    state.progress = value;
    this._queueRender();
    this.emit('upload-progress', { file: file, progress: value, name: file.name });
    this.call('onUploadProgress', { file: file, progress: value, name: file.name, instance: this });
  };

  ZidanFileUpload.prototype._finish = function (file, result) {
    var state = this._stateFor(file, false);
    if (!state || state.status !== 'uploading') return;
    delete this._active[fileKey(file)];
    state.status = 'done';
    state.progress = 100;
    state.result = result === undefined ? null : result;
    this._queueRender();
    this.emit('upload-success', { file: file, name: file.name, result: state.result, attempts: state.attempts || 1 });
    this.call('onUploadSuccess', { file: file, name: file.name, result: state.result, attempts: state.attempts || 1, instance: this });
    this.call('onUpload', { file: file, name: file.name, result: state.result, attempts: state.attempts || 1, instance: this });
    this._drainQueue();
    this._flushWaiters();
  };

  ZidanFileUpload.prototype._scheduleRetry = function (file, err, message) {
    var state = this._stateFor(file, false);
    if (!state || !err || err.retryable !== true) return false;
    if (!this.uploadRetries || state.attempts > this.uploadRetries) return false;
    var self = this;
    var key = fileKey(file);
    var delay = this.uploadRetryDelay;
    delete this._active[key];
    state.status = 'retrying';
    state.error = message;
    this._queueRender();
    this.emit('upload-retry', {
      file: file, name: file.name, attempt: state.attempts,
      nextAttempt: state.attempts + 1, delay: delay, error: err, message: message
    });
    this.call('onUploadRetry', {
      file: file, name: file.name, attempt: state.attempts,
      nextAttempt: state.attempts + 1, delay: delay, error: err, message: message, instance: this
    });
    this._retryTimers[key] = global.setTimeout(function () {
      delete self._retryTimers[key];
      if (self.destroyed) return;
      var current = self._stateFor(file, false);
      if (!current || current.status !== 'retrying') return;
      current.status = 'idle';
      self._enqueueUpload(file);
      self._flushWaiters();
    }, delay);
    this._drainQueue();
    return true;
  };

  ZidanFileUpload.prototype._fail = function (file, err) {
    var state = this._stateFor(file, false);
    if (!state || state.status !== 'uploading') return;
    delete this._active[fileKey(file)];
    state.error = uploadErrorText(err, this.opts.messages.upload || 'Upload failed.');
    if (this._scheduleRetry(file, err, state.error)) return;
    state.status = 'error';
    this._queueRender();
    this.emit('upload-error', { file: file, name: file.name, error: err, message: state.error, attempts: state.attempts || 1 });
    this.call('onUploadError', { file: file, name: file.name, error: err, message: state.error, attempts: state.attempts || 1, instance: this });
    this._drainQueue();
    this._flushWaiters();
  };

  ZidanFileUpload.prototype._canceledUpload = function (file) {
    var state = this._stateFor(file, false);
    if (!state || (state.status !== 'uploading' && state.status !== 'retrying')) return;
    delete this._active[fileKey(file)];
    state.status = 'canceled';
    state.progress = 0;
    state.error = '';
    this._queueRender();
    this.emit('upload-cancel', { file: file, name: file.name });
    this.call('onUploadCancel', { file: file, name: file.name, instance: this });
    this._drainQueue();
    this._flushWaiters();
  };

  ZidanFileUpload.prototype.cancelUpload = function (file) {
    var key = fileKey(file);
    var state = this._stateFor(file, false);
    if (!state) return this;

    if (state.status === 'queued') {
      var index = this._queue.indexOf(file);
      if (index !== -1) this._queue.splice(index, 1);
      state.status = 'canceled';
      state.progress = 0;
      state.error = '';
      this._queueRender();
      this.emit('upload-cancel', { file: file, name: file.name });
      this.call('onUploadCancel', { file: file, name: file.name, instance: this });
      this._flushWaiters();
      return this;
    }

    if (state.status === 'retrying') {
      if (this._retryTimers[key]) global.clearTimeout(this._retryTimers[key]);
      delete this._retryTimers[key];
      state.status = 'canceled';
      state.progress = 0;
      state.error = '';
      this._queueRender();
      this.emit('upload-cancel', { file: file, name: file.name });
      this.call('onUploadCancel', { file: file, name: file.name, instance: this });
      this._drainQueue();
      this._flushWaiters();
      return this;
    }

    var active = this._active[key];
    if (active) {
      try { active.abort(); } catch (err) { /* already stopped */ }
      delete this._active[key];
      /* an abort settles through the transport's own handler; only finish the
         state here when that handler never ran (e.g. a custom uploader) */
      if (state.status === 'uploading') this._canceledUpload(file);
      this._drainQueue();
      this._flushWaiters();
      return this;
    }
    this._canceledUpload(file);
    return this;
  };

  ZidanFileUpload.prototype.cancelAll = function () {
    var self = this;
    this._cancelingAll = true;
    var files = this.getFiles();
    var queued = this._queue.slice();
    this._queue = [];
    Object.keys(this._retryTimers).forEach(function (key) {
      global.clearTimeout(self._retryTimers[key]);
      delete self._retryTimers[key];
    });
    Object.keys(this._active).forEach(function (key) {
      try { self._active[key].abort(); } catch (err) { /* already stopped */ }
      delete self._active[key];
    });
    var keys = Object.keys(this._uploads);
    keys.forEach(function (key) {
      var state = self._uploads[key];
      if (!state || (state.status !== 'uploading' && state.status !== 'retrying')) return;
      var file = files.filter(function (item) { return fileKey(item) === key; })[0];
      if (!file) return;
      state.status = 'canceled';
      state.progress = 0;
      state.error = '';
      self.emit('upload-cancel', { file: file, name: file.name });
      self.call('onUploadCancel', { file: file, name: file.name, instance: self });
    });
    queued.forEach(function (file) {
      var state = self._stateFor(file, false);
      if (state && state.status === 'queued') {
        state.status = 'canceled';
        self.emit('upload-cancel', { file: file, name: file.name });
        self.call('onUploadCancel', { file: file, name: file.name, instance: self });
      }
    });
    this._cancelingAll = false;
    this._queueRender();
    this._flushWaiters();
    return this;
  };

  ZidanFileUpload.prototype.retryAll = function () {
    var self = this;
    this.getUploadState().forEach(function (entry) {
      if (entry.status === 'error' || entry.status === 'canceled') self.retryUpload(entry.file);
    });
    return this;
  };

  ZidanFileUpload.prototype.retryUpload = function (file) {
    var state = this._stateFor(file, false);
    if (!state) return this;
    var key = fileKey(file);
    if (this._retryTimers[key]) {
      global.clearTimeout(this._retryTimers[key]);
      delete this._retryTimers[key];
    }
    state.status = 'idle';
    state.progress = 0;
    state.error = '';
    state.attempts = 0;
    return this.uploadFile(file);
  };

  ZidanFileUpload.prototype._revokeLater = function (urls) {
    if (!urls || !urls.length) return;
    global.setTimeout(function () {
      urls.forEach(function (url) {
        try { URL.revokeObjectURL(url); } catch (err) { /* already gone */ }
      });
    }, 800);
  };

  ZidanFileUpload.prototype._teardown = function () {
    this.cancelAll();
    this._uploadEpoch += 1;
    this._pendingStarts = 0;
    this._batch = 0;
    this._waiters = [];
    this._uploads = Object.create(null);
    this._revokeLater(this._urls);
    this._urls = [];
    if (this._restoreInput) this._restoreInput();
  };

  /* @zidan-build:text */
  /* ---------------- text inputs & textarea ---------------- */

  var TEXT_TYPES = ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local', 'month', 'week', 'range', 'color'];
  var PICKER_TYPES = ['date', 'time', 'datetime-local', 'month', 'week', 'color'];
  var STEPPER_MODES = ['stacked', 'split', 'inline'];

  /* ---------------- input mask ---------------- */

  /* Tokens: # digit, A letter, * letter or digit. Everything else is a
     literal inserted automatically; \ escapes the next character. */
  var MASK_TOKENS = {
    '#': function (ch) { return ch >= '0' && ch <= '9'; },
    'A': function (ch) { return /[A-Za-z]/.test(ch); },
    '*': function (ch) { return /[A-Za-z0-9]/.test(ch); }
  };

  function maskToken(ch) {
    return MASK_TOKENS[ch] || null;
  }

  /* raw data is the alphanumeric content; mask literals are punctuation */
  function maskRaw(value) {
    return String(value === null || value === undefined ? '' : value).replace(/[^A-Za-z0-9]/g, '');
  }

  function maskBuild(pattern, raw) {
    var out = '';
    var caretMap = [0];
    var pending = '';
    var pos = 0;
    var index = 0;
    while (index < pattern.length) {
      var ch = pattern.charAt(index);
      if (ch === '\\' && index + 1 < pattern.length) {
        pending += pattern.charAt(index + 1);
        index += 2;
        continue;
      }
      var test = maskToken(ch);
      if (!test) {
        pending += ch;
        index += 1;
        continue;
      }
      while (pos < raw.length && !test(raw.charAt(pos))) pos += 1;
      if (pos >= raw.length) break;
      if (pending) {
        out += pending;
        for (var p = 0; p < pending.length; p += 1) caretMap.push(pos);
        pending = '';
      }
      out += raw.charAt(pos);
      pos += 1;
      caretMap.push(pos);
      index += 1;
    }
    return { value: out, map: caretMap };
  }

  function maskCaret(map, consumed) {
    var position = 0;
    for (var i = 0; i < map.length; i += 1) {
      if (map[i] <= consumed) position = i;
      else break;
    }
    return position;
  }

  function formatMasked(value, pattern) {
    return maskBuild(String(pattern || ''), maskRaw(value)).value;
  }

  function decimalsOf(number) {
    var text = String(number);
    if (/e-/i.test(text)) return 10;
    var dot = text.indexOf('.');
    return dot === -1 ? 0 : Math.min(10, text.length - dot - 1);
  }

  function ZidanTextField(target, options) {
    if (!(this instanceof ZidanTextField)) return new ZidanTextField(target, options);
    var isTextarea = target.tagName === 'TEXTAREA';
    if (!isTextarea && !/^(INPUT)$/i.test(target.tagName)) {
      throw new Error('ZidanTextField: expected an <input> or <textarea>.');
    }
    if (!isTextarea && TEXT_TYPES.indexOf(String(target.type).toLowerCase()) === -1) {
      throw new Error('ZidanTextField: unsupported input type "' + target.type + '".');
    }
    ZidanFieldBase.call(this, target, options, isTextarea ? 'textarea' : 'input');
    var self = this;
    var input = target;
    var opts = this.opts;
    var type = isTextarea ? 'textarea' : String(input.type).toLowerCase();
    var isRange = type === 'range';
    var isPicker = PICKER_TYPES.indexOf(type) !== -1;

    var originalParent = input.parentNode;
    var externalLabel = input.labels && input.labels[0] ? input.labels[0] : null;
    if (externalLabel && externalLabel.closest && externalLabel.closest('.zs-field')) externalLabel = null;
    var labelText = opts.label || input.getAttribute('data-zidan-label') ||
      (externalLabel ? textWithout(externalLabel, input) : '') || '';
    var layout = this.layout || 'stacked';
    var floating = /^(floating|outlined)$/.test(layout);

    var root = this._scope(isTextarea ? 'textarea' : 'input');
    root.setAttribute('data-zs-type', type);
    originalParent.insertBefore(root, input);

    var label = null;
    if (labelText) {
      label = el('label', 'zs-field__label', { for: this.id });
      label.textContent = labelText;
      if (!floating) root.appendChild(label);
    }
    if (externalLabel && labelText) {
      externalLabel.hidden = true;
      externalLabel.setAttribute('data-zs-hidden-label', 'true');
      this._cleanups.push(function () {
        externalLabel.hidden = false;
        externalLabel.removeAttribute('data-zs-hidden-label');
      });
    }

    var shell = el('div', 'zs-input-shell');
    root.appendChild(shell);
    if (floating && label) shell.appendChild(label);

    /* ---------- phone country selector & formatting ---------- */
    var phoneEnabled = type === 'tel' && (opts.phone || input.hasAttribute('data-zidan-phone'));
    this.phone = null;
    if (phoneEnabled) {
      var phoneCfg = opts.phone && typeof opts.phone === 'object' ? opts.phone : {};
      var phoneCountry = String(phoneCfg.country || fieldOption(input, opts, 'phoneCountry', 'phone-country', 'US')).toUpperCase();
      if (!PHONE_COUNTRIES[phoneCountry]) phoneCountry = 'US';
      var phoneFormat = String(phoneCfg.format || fieldOption(input, opts, 'phoneFormat', 'phone-format', 'national')).toLowerCase();
      if (PHONE_FORMATS.indexOf(phoneFormat) === -1) phoneFormat = 'national';
      var showCountry = phoneCfg.showCountry !== undefined ? !!phoneCfg.showCountry : fieldBool(input, opts, 'phoneCountrySelect', 'phone-country-select', true);
      var countryList = phoneCfg.countries || fieldList(input, opts, 'phoneCountries', 'phone-countries', PHONE_DEFAULT_COUNTRIES);
      var countrySelect = null;
      var pickerButton = null;
      var pickerMenu = null;
      if (showCountry) {
        /* the native select stays as the accessible value holder and keeps the
           old `.zs-phone-country` API working; the visible control is the
           searchable picker below */
        countrySelect = el('select', 'zs-phone-country zs-phone-country--native', {
          'aria-label': opts.phoneCountryLabel || 'Country code',
          tabindex: '-1',
          'aria-hidden': 'true'
        });
        countryList.forEach(function (iso) {
          iso = String(iso).toUpperCase();
          var country = PHONE_COUNTRIES[iso];
          if (!country) return;
          var optionNode = el('option', null, { value: iso },
            iso + ' +' + country.dial);
          countrySelect.appendChild(optionNode);
        });
        countrySelect.value = phoneCountry;
        shell.appendChild(countrySelect);
        this.on(countrySelect, 'change', function () { self.setPhoneCountry(countrySelect.value); });

        pickerButton = el('button', 'zs-phone-picker', {
          type: 'button',
          'aria-haspopup': 'listbox',
          'aria-expanded': 'false',
          'aria-label': opts.phoneCountryLabel || 'Country code'
        });
        var pickerIso = el('span', 'zs-phone-picker-iso');
        var pickerDial = el('span', 'zs-phone-picker-dial');
        var pickerChevron = el('span', 'zs-phone-picker-chevron', { 'aria-hidden': 'true' });
        pickerChevron.textContent = '\u25be';
        pickerButton.appendChild(pickerIso);
        pickerButton.appendChild(pickerDial);
        pickerButton.appendChild(pickerChevron);
        shell.appendChild(pickerButton);

        pickerMenu = el('div', 'zs-phone-menu', {
          role: 'listbox',
          'aria-label': opts.phoneCountryLabel || 'Country code',
          hidden: ''
        });
        var pickerSearch = el('input', 'zs-phone-search', {
          type: 'search',
          placeholder: opts.phoneCountrySearchText || 'Search country or code',
          'aria-label': opts.phoneCountrySearchText || 'Search country or code',
          autocomplete: 'off'
        });
        var pickerList = el('div', 'zs-phone-list');
        pickerMenu.appendChild(pickerSearch);
        pickerMenu.appendChild(pickerList);
        shell.appendChild(pickerMenu);
        this.phoneCountryPicker = pickerButton;
        this.phoneCountryMenu = pickerMenu;
      }
      this.phone = {
        country: phoneCountry,
        format: phoneFormat,
        select: countrySelect,
        picker: pickerButton,
        menu: pickerMenu,
        validate: phoneCfg.validate !== false,
        countries: countryList.slice(),
        syncPicker: null
      };
      if (showCountry) {
        var activeCountry = null;
        var syncPhonePicker = function () {
          var country = PHONE_COUNTRIES[self.phone.country] || PHONE_COUNTRIES.US;
          pickerIso.textContent = self.phone.country;
          pickerDial.textContent = '+' + country.dial;
        };
        var closePhoneMenu = function (focus) {
          if (pickerMenu.hidden) return;
          pickerMenu.hidden = true;
          pickerButton.setAttribute('aria-expanded', 'false');
          if (focus) pickerButton.focus();
        };
        var renderPhoneOptions = function (query) {
          var text = String(query || '').trim().toLowerCase().replace(/^\+/, '');
          pickerList.textContent = '';
          var shown = 0;
          self.phone.countries.forEach(function (iso) {
            iso = String(iso).toUpperCase();
            var country = PHONE_COUNTRIES[iso];
            if (!country) return;
            if (text &&
              iso.toLowerCase().indexOf(text) === -1 &&
              country.name.toLowerCase().indexOf(text) === -1 &&
              String(country.dial).indexOf(text) === -1) return;
            var optionNode = el('button', 'zs-phone-option', {
              type: 'button',
              role: 'option',
              'aria-selected': iso === self.phone.country ? 'true' : 'false',
              'data-iso': iso,
              tabindex: '-1'
            });
            optionNode.appendChild(el('span', 'zs-phone-option-iso', null, iso));
            optionNode.appendChild(el('span', 'zs-phone-option-name', null, country.name));
            optionNode.appendChild(el('span', 'zs-phone-option-dial', null, '+' + country.dial));
            pickerList.appendChild(optionNode);
            shown += 1;
          });
          if (!shown) pickerList.appendChild(el('p', 'zs-phone-empty', null, opts.phoneCountryEmptyText || 'No countries found'));
          /* opening the menu should keep the current country highlighted; a
             search narrows the list, so the first match wins there */
          activeCountry = (!text && pickerList.querySelector('[data-iso="' + self.phone.country + '"]')) ||
            pickerList.querySelector('[data-iso]');
          if (activeCountry) activeCountry.classList.add('zs-phone-option--active');
        };
        var moveCountry = function (direction) {
          var optionsList = Array.prototype.slice.call(pickerList.querySelectorAll('[data-iso]'));
          if (!optionsList.length) return;
          var at = optionsList.indexOf(activeCountry);
          if (at === -1) at = direction > 0 ? -1 : optionsList.length;
          at = Math.max(0, Math.min(optionsList.length - 1, at + direction));
          if (activeCountry) activeCountry.classList.remove('zs-phone-option--active');
          activeCountry = optionsList[at];
          activeCountry.classList.add('zs-phone-option--active');
          if (activeCountry.scrollIntoView) activeCountry.scrollIntoView({ block: 'nearest' });
        };
        var chooseCountry = function (iso) {
          if (!iso) return;
          closePhoneMenu(true);
          self.setPhoneCountry(iso);
        };
        var openPhoneMenu = function () {
          if (self.disabled_) return;
          pickerMenu.hidden = false;
          pickerButton.setAttribute('aria-expanded', 'true');
          pickerSearch.value = '';
          renderPhoneOptions('');
          pickerSearch.focus();
        };
        this.phone.syncPicker = syncPhonePicker;
        syncPhonePicker();
        this.on(pickerButton, 'click', function (event) {
          event.preventDefault();
          if (pickerMenu.hidden) openPhoneMenu();
          else closePhoneMenu(true);
        });
        this.on(pickerButton, 'keydown', function (event) {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openPhoneMenu();
          } else if (event.key === 'Escape') {
            closePhoneMenu(true);
          }
        });
        this.on(pickerSearch, 'input', function () { renderPhoneOptions(pickerSearch.value); });
        this.on(pickerSearch, 'keydown', function (event) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveCountry(event.key === 'ArrowDown' ? 1 : -1);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            chooseCountry(activeCountry && activeCountry.getAttribute('data-iso'));
          } else if (event.key === 'Escape') {
            event.preventDefault();
            closePhoneMenu(true);
          }
        });
        this.on(pickerList, 'click', function (event) {
          var optionNode = event.target.closest ? event.target.closest('[data-iso]') : null;
          if (!optionNode) return;
          event.preventDefault();
          chooseCountry(optionNode.getAttribute('data-iso'));
        });
        this.on(doc, 'pointerdown', function (event) {
          if (pickerMenu.hidden) return;
          var path = event.composedPath ? event.composedPath() : [];
          if (path.indexOf(pickerMenu) !== -1 || path.indexOf(pickerButton) !== -1) return;
          if (pickerMenu.contains(event.target) || pickerButton.contains(event.target)) return;
          closePhoneMenu(false);
        });
        if (input.value) {
          var initialCountry = detectPhoneCountry(input.value);
          if (initialCountry && !phoneCfg.country && !input.getAttribute('data-zidan-phone-country')) {
            this.phone.country = initialCountry;
            countrySelect.value = initialCountry;
            syncPhonePicker();
          }
        }
      }
      root.classList.add('zs-field--phone');

      if (input.value) {
        var detected = detectPhoneCountry(input.value);
        if (detected && !phoneCfg.country && !input.getAttribute('data-zidan-phone-country')) {
          this.phone.country = detected;
          if (countrySelect) countrySelect.value = detected;
          if (this.phone.syncPicker) this.phone.syncPicker();
        }
        this._applyPhoneFormat(false);
      }
      this.on(input, 'input', function () { self._applyPhoneFormat(true); });
      this.on(input, 'focus', function () { self._applyPhoneFormat(true); });
      this.on(input, 'blur', function () { self._applyPhoneFormat(false); });
    }

    /* ---------- input mask ---------- */
    var maskPattern = opts.mask || fieldOption(input, opts, 'mask', 'mask', '');
    maskPattern = typeof maskPattern === 'string' ? maskPattern.trim() : '';
    var maskAllowed = !!maskPattern && !isTextarea && !isRange && !isPicker &&
      ['text', 'tel', 'search', 'url', 'password', 'email'].indexOf(type) !== -1;
    this.mask = maskAllowed ? { pattern: maskPattern } : null;
    this._maskRaw = '';
    this._maskValue = '';
    this._maskCaret = 0;
    this._maskKey = null;
    if (this.mask) {
      root.classList.add('zs-field--masked');
      var initialMask = formatMasked(input.value, maskPattern);
      if (initialMask !== input.value) input.value = initialMask;
      this._maskRaw = maskRaw(input.value);
      this._maskValue = input.value;
      this.on(input, 'beforeinput', function () {
        self._maskCaret = input.selectionStart === null ? input.value.length : input.selectionStart;
      });
      this.on(input, 'keydown', function (event) {
        if (event.key === 'Backspace' || event.key === 'Delete') self._maskKey = event.key;
      });
      this.on(input, 'input', function () { self._applyMask(); });
    }

    /* ---------- textarea autogrow ---------- */
    var autogrowOn = isTextarea && fieldBool(input, opts, 'autogrow', 'autogrow', false);
    this.autogrow = autogrowOn ? { max: fieldNumber(input, opts, 'autogrowMax', 'autogrow-max', 0) } : null;
    if (this.autogrow) {
      root.classList.add('zs-field--autogrow');
      /* A textarea inside a hidden tab/dialog has scrollHeight 0, so grow it
         once the layout becomes visible (and after width changes). */
      if (typeof ResizeObserver !== 'undefined') {
        var growObserver = new ResizeObserver(function () { self._autogrow(); });
        growObserver.observe(input);
        this._cleanups.push(function () { growObserver.disconnect(); });
      }
    }

    /* ---------- icons ---------- */
    var iconSpec = opts.icon || input.getAttribute('data-zidan-icon') || null;
    var autoIcon = fieldBool(input, opts, 'autoIcon', 'auto-icon', false);
    if (iconSpec === 'auto') {
      iconSpec = null;
      autoIcon = true;
    }
    if (!iconSpec && autoIcon) iconSpec = iconForType(type);
    var iconPosition = String(fieldOption(input, opts, 'iconPosition', 'icon-position', 'left')).toLowerCase() === 'right' ? 'right' : 'left';
    var iconClickable = fieldBool(input, opts, 'iconClickable', 'icon-clickable', false);
    var iconLabel = opts.iconLabel || input.getAttribute('data-zidan-icon-label') || '';
    var iconControl = null;
    if (iconSpec) {
      var iconContent = iconNode(iconSpec, 'zs-input-icon-glyph') || iconNode('info', 'zs-input-icon-glyph');
      var clickable = iconClickable || isPicker;
      if (clickable) {
        iconControl = el('button', 'zs-input-icon zs-input-icon--action', {
          type: 'button',
          'aria-label': iconLabel || (isPicker ? 'Open ' + type.replace('-', ' ') + ' picker' : 'Field action')
        });
        if (iconContent) iconControl.appendChild(iconContent);
        this.on(iconControl, 'click', function (event) {
          event.preventDefault();
          if (isPicker) self.openPicker();
          self.emit('icon-click', { icon: iconSpec, position: iconPosition });
          self.call('onIconClick', { icon: iconSpec, position: iconPosition, instance: self });
        });
      } else {
        iconControl = el('span', 'zs-input-icon', iconLabel ? null : { 'aria-hidden': 'true' });
        if (iconLabel) {
          iconControl.setAttribute('role', 'img');
          iconControl.setAttribute('aria-label', iconLabel);
        }
        if (iconContent) iconControl.appendChild(iconContent);
      }
      root.classList.add('zs-field--icon-' + iconPosition);
      this.icon = iconControl;
      if (iconPosition === 'left') {
        if (this.phone && this.phone.select) shell.insertBefore(iconControl, this.phone.select);
        else shell.appendChild(iconControl);
      }
    }

    var prefixText = opts.prefix || input.getAttribute('data-zidan-prefix');
    if (prefixText) {
      shell.appendChild(el('span', 'zs-input-prefix', { 'aria-hidden': 'true' }, prefixText));
    }

    /* ---------- native control (optionally wrapped by range chrome) ---------- */
    var rangeWrap = null;
    var rangeBubble = null;
    var rangeTicksEl = null;
    var rangeScale = null;
    if (isRange) {
      var rangeVariant = pickList(fieldOption(input, opts, 'rangeVariant', 'range-variant', 'default'), RANGE_VARIANTS, 'default');
      var rangeBubbleOn = fieldBool(input, opts, 'rangeBubble', 'range-bubble', true);
      var rangeBubbleMode = pickList(fieldOption(input, opts, 'rangeBubbleMode', 'range-bubble-mode', 'always'), RANGE_BUBBLE_MODES, 'always');
      var rangeBubblePosition = pickList(fieldOption(input, opts, 'rangeBubblePosition', 'range-bubble-position', 'top'), RANGE_BUBBLE_POSITIONS, 'top');
      var rangeFillOn = fieldBool(input, opts, 'rangeFill', 'range-fill', true);
      var rangeScaleOn = fieldBool(input, opts, 'rangeMinMax', 'range-minmax', true);
      var showBubble = rangeBubbleOn && rangeBubbleMode !== 'never';
      var bubbleVisible = showBubble && rangeVariant !== 'minimal';
      rangeWrap = el('div', 'zs-range');
      rangeWrap.setAttribute('data-zs-range', rangeVariant);
      rangeWrap.classList.toggle('zs-range--fill-off', !rangeFillOn);
      rangeWrap.classList.toggle('zs-range--no-bubble', !bubbleVisible);
      if (showBubble) {
        rangeBubble = el('output', 'zs-range-bubble', { for: this.id, 'aria-hidden': 'true' });
        rangeWrap.appendChild(rangeBubble);
        if (bubbleVisible) {
          rangeWrap.classList.toggle('zs-range--bubble-active', rangeBubbleMode === 'active');
          rangeWrap.classList.toggle('zs-range--bubble-bottom', rangeBubblePosition === 'bottom');
        }
      }
      rangeWrap.appendChild(input);
      rangeTicksEl = el('div', 'zs-range-ticks', { 'aria-hidden': 'true' });
      rangeWrap.appendChild(rangeTicksEl);
      if (rangeScaleOn) {
        rangeScale = el('div', 'zs-range-scale');
        rangeScale.appendChild(el('span', 'zs-range-min'));
        rangeScale.appendChild(el('span', 'zs-range-max'));
        rangeWrap.appendChild(rangeScale);
      }
      shell.appendChild(rangeWrap);
      shell.classList.add('zs-input-shell--range');
      this.range = rangeWrap;
      this.rangeBubble = rangeBubble;
      this.rangeTicksEl = rangeTicksEl;
      this.rangeScale = rangeScale;
      this.rangeFormat = opts.rangeFormat || input.getAttribute('data-zidan-range-format') || null;
      this.rangeBubbleMode = rangeBubbleMode;
      this.rangeBubblePosition = rangeBubblePosition;
      this.rangeMinLabel = String(fieldOption(input, opts, 'rangeMinLabel', 'range-min-label', ''));
      this.rangeMaxLabel = String(fieldOption(input, opts, 'rangeMaxLabel', 'range-max-label', ''));
      this.rangeTicksOption = parseRangeTicks(fieldOption(input, opts, 'rangeTicks', 'range-ticks', 0));
      this.rangeTickLabels = fieldBool(input, opts, 'rangeTickLabels', 'range-tick-labels', false);
      this.rangeLabelMap = opts.rangeLabels || null;
      this.rangeSignature = '';
    } else {
      shell.appendChild(input);
    }

    var suffixText = opts.suffix || input.getAttribute('data-zidan-suffix');
    if (suffixText) {
      shell.appendChild(el('span', 'zs-input-suffix', { 'aria-hidden': 'true' }, suffixText));
    }
    if (prefixText || suffixText) addClass(root, 'zs-field--adorned');

    var reveal = null;
    if (type === 'password' && (opts.reveal || input.hasAttribute('data-zidan-reveal'))) {
      reveal = el('button', 'zs-input-action zs-input-reveal', {
        type: 'button',
        'aria-label': opts.showPasswordLabel || 'Show password',
        'aria-pressed': 'false'
      });
      reveal.textContent = opts.showPasswordLabel || 'Show';
      shell.appendChild(reveal);
      this.on(reveal, 'click', function () {
        var visible = input.type === 'text';
        input.type = visible ? 'password' : 'text';
        reveal.setAttribute('aria-pressed', String(!visible));
        reveal.textContent = !visible ? (opts.hidePasswordLabel || 'Hide') : (opts.showPasswordLabel || 'Show');
        reveal.setAttribute('aria-label', !visible ? (opts.hidePasswordLabel || 'Hide password') : (opts.showPasswordLabel || 'Show password'));
        self.emit('reveal', { visible: !visible });
      });
    }

    var clearable = opts.clearable;
    if (clearable === undefined) {
      clearable = input.hasAttribute('data-zidan-clear') || type === 'search';
    }
    var clear = null;
    if (clearable) {
      clear = el('button', 'zs-input-action zs-input-clear', {
        type: 'button',
        'aria-label': opts.clearLabel || 'Clear field',
        hidden: ''
      });
      clear.textContent = '\u00d7';
      shell.appendChild(clear);
      this.on(clear, 'click', function () {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
        self.update();
        self.emit('clear', {});
      });
    }

    /* ---------- number stepper ---------- */
    var stepperEnabled = false;
    var stepperRaw = opts.stepper !== undefined && opts.stepper !== null
      ? opts.stepper
      : input.getAttribute('data-zidan-stepper');
    if (type === 'number' && stepperRaw !== null && stepperRaw !== undefined && stepperRaw !== '' &&
      stepperRaw !== false && stepperRaw !== 'false') {
      stepperEnabled = true;
    }
    this.stepper = null;
    var stepperContainer = null;
    if (stepperEnabled) {
      var stepperMode = typeof stepperRaw === 'string' && stepperRaw !== 'true'
        ? pickList(stepperRaw, STEPPER_MODES, 'stacked')
        : 'stacked';
      var stepperPosition = String(fieldOption(input, opts, 'stepperPosition', 'stepper-position', 'right')).toLowerCase() === 'left' ? 'left' : 'right';
      var stepperWrap = fieldBool(input, opts, 'stepperWrap', 'stepper-wrap', false);
      var stepperLongPress = fieldBool(input, opts, 'stepperLongPress', 'stepper-long-press', true);
      var stepperDelay = fieldNumber(input, opts, 'stepperDelay', 'stepper-delay', 420);
      var stepperInterval = fieldNumber(input, opts, 'stepperInterval', 'stepper-interval', 90);
      var minusLabel = opts.stepperDownLabel || fieldOption(input, opts, 'stepperDownLabel', 'stepper-down-label', 'Decrease value');
      var plusLabel = opts.stepperUpLabel || fieldOption(input, opts, 'stepperUpLabel', 'stepper-up-label', 'Increase value');

      var makeStepButton = function (direction) {
        var isUp = direction > 0;
        var button = el('button', 'zs-stepper-btn zs-stepper-btn--' + (isUp ? 'up' : 'down'), {
          type: 'button',
          'aria-label': isUp ? plusLabel : minusLabel,
          'data-zs-step': direction
        });
        var glyph = iconNode(isUp ? 'plus' : 'minus', 'zs-stepper-glyph');
        if (glyph) button.appendChild(glyph);
        else button.textContent = isUp ? '+' : '\u2212';

        var holdTimer = null;
        var holdInterval = null;
        var stopHold = function () {
          if (holdTimer) global.clearTimeout(holdTimer);
          if (holdInterval) global.clearInterval(holdInterval);
          holdTimer = null;
          holdInterval = null;
        };
        var startHold = function (event) {
          if (event.button !== undefined && event.button !== 0) return;
          event.preventDefault();
          self._stepBy(direction);
          if (!stepperLongPress) return;
          holdTimer = global.setTimeout(function () {
            holdInterval = global.setInterval(function () { self._stepBy(direction); }, stepperInterval);
          }, stepperDelay);
        };
        self.on(button, 'pointerdown', startHold);
        self.on(button, 'mousedown', function (event) {
          // pointerdown is the primary path; mousedown keeps very old engines working
          if (typeof global.PointerEvent === 'undefined') startHold(event);
        });
        ['pointerup', 'pointercancel', 'pointerleave', 'mouseup', 'mouseleave', 'blur'].forEach(function (typeName) {
          self.on(button, typeName, stopHold);
        });
        self.on(button, 'keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
          event.preventDefault();
          self._stepBy(direction);
        });
        return button;
      };

      var minusButton = makeStepButton(-1);
      var plusButton = makeStepButton(1);
      this.stepper = {
        mode: stepperMode,
        position: stepperPosition,
        wrap: stepperWrap,
        minus: minusButton,
        plus: plusButton
      };
      root.classList.add('zs-field--stepper', 'zs-field--stepper-' + stepperMode);
      if (stepperMode === 'split') {
        // minus sits before the field, plus after it
        shell.insertBefore(minusButton, iconPosition === 'left' && iconControl ? iconControl.nextSibling : input);
        shell.appendChild(plusButton);
      } else {
        stepperContainer = el('span', 'zs-stepper zs-stepper--' + stepperMode, { role: 'group', 'aria-label': 'Number stepper' });
        if (stepperMode === 'stacked') {
          stepperContainer.appendChild(plusButton);
          stepperContainer.appendChild(minusButton);
        } else {
          stepperContainer.appendChild(minusButton);
          stepperContainer.appendChild(plusButton);
        }
        if (stepperPosition === 'left') shell.insertBefore(stepperContainer, iconPosition === 'left' && iconControl ? iconControl.nextSibling : shell.firstChild);
        else shell.appendChild(stepperContainer);
      }
      addClass(input, 'zs-input-native--stepper');
    }

    /* ---------- explicit picker button ---------- */
    var pickerButtonOption = fieldBool(input, opts, 'pickerButton', 'picker-button', false);
    if (isPicker && pickerButtonOption && !iconControl) {
      var pickerIcon = opts.pickerIcon || fieldOption(input, opts, 'pickerIcon', 'picker-icon', iconForType(type) || 'calendar');
      var pickerControl = el('button', 'zs-input-icon zs-input-icon--action zs-input-picker', {
        type: 'button',
        'aria-label': opts.pickerLabel || ('Open ' + type.replace('-', ' ') + ' picker')
      });
      var pickerGlyph = iconNode(pickerIcon, 'zs-input-icon-glyph');
      if (pickerGlyph) pickerControl.appendChild(pickerGlyph);
      shell.appendChild(pickerControl);
      this.on(pickerControl, 'click', function (event) {
        event.preventDefault();
        self.openPicker();
      });
      this.pickerButton = pickerControl;
      root.classList.add('zs-field--custom-picker');
    } else if (isPicker && iconControl) {
      root.classList.add('zs-field--custom-picker');
    }

    /* right-positioned icon is appended after all actions */
    if (iconControl && iconPosition === 'right') {
      if (isRange) shell.insertBefore(iconControl, rangeWrap.nextSibling);
      else shell.appendChild(iconControl);
    }

    var showValidationIcon = fieldBool(input, opts, 'validationIcon', 'validation-icon', false);
    if (showValidationIcon) {
      var validIcon = iconNode('check', 'zs-input-validation zs-input-validation--valid');
      var invalidIcon = iconNode('alert', 'zs-input-validation zs-input-validation--invalid');
      if (validIcon) shell.appendChild(validIcon);
      if (invalidIcon) shell.appendChild(invalidIcon);
      root.classList.add('zs-field--validation-icon');
    }

    var hintText = opts.hint || input.getAttribute('data-zidan-hint');
    var counterMax = parseInt(opts.counter, 10) ||
      parseInt(input.getAttribute('data-zidan-counter'), 10) ||
      parseInt(input.getAttribute('maxlength'), 10) || 0;
    var meta = null;
    var counter = null;
    if (hintText || counterMax) {
      meta = el('div', 'zs-field__meta');
      if (hintText) meta.appendChild(el('p', 'zs-field__hint', { id: this.id + '-hint' }, hintText));
      else meta.appendChild(el('span', '', null, ''));
      if (counterMax) {
        counter = el('span', 'zs-counter', { 'aria-live': 'polite' });
        meta.appendChild(counter);
      }
      root.appendChild(meta);
    }

    this.label = label;
    this.shell = shell;
    this.clear = clear;
    this.counter = counter;
    this.counterMax = counterMax;
    this._restoreInput = function () {
      var parent = root.parentNode || originalParent;
      parent.insertBefore(input, root.parentNode ? root : null);
      input.classList.remove('zs-input-native', 'zs-input-native--stepper');
    };

    addClass(input, 'zs-input-native');
    addClass(root, 'zs-field--' + layout);

    var outputSelector = opts.output || input.getAttribute('data-zidan-output');
    if (isRange && outputSelector) {
      var out = null;
      try { out = doc.querySelector(outputSelector); } catch (err) { out = null; }
      if (out) {
        this.rangeOutput = out;
      }
    }

    var previousValue = input.value;
    this.on(input, 'input', function () {
      var current = input.value;
      self._syncRangeOutput(current);
      self.update();
      if (current !== previousValue) {
        previousValue = current;
        self.emit('input', { value: current });
        self.call('onInput', { value: current, instance: self });
      }
    });
    this.on(input, 'change', function () {
      self.update();
      self.emit('change', { value: input.value });
      self.call('onChange', { value: input.value, instance: self });
    });
    this.on(input, 'focus', function () { root.classList.add('zs-field--focused'); });
    this.on(input, 'blur', function () { root.classList.remove('zs-field--focused'); });

    this._bindValidity();
    input.__zidanField = this;
    this.update();
    this._syncRangeOutput(input.value);
    this.emit('init', { type: type, stepper: !!this.stepper, phone: !!this.phone, range: !!this.range });
    this.call('onInit', { instance: this, type: type });
    ZidanForm._register(this);
  }

  ZidanTextField.prototype = Object.create(ZidanFieldBase.prototype);
  ZidanTextField.prototype.constructor = ZidanTextField;

  // phone/date/custom rules must also block native form submission
  ZidanTextField.prototype._setCustomValidity = function (message) {
    var input = this.el;
    if (!input.setCustomValidity) return;
    /* the cache lives on the field instance: two wrappers can share one
       native input, and a shared cache made the second wrapper skip updates */
    if (this._customValidityCache !== message) {
      input.setCustomValidity(message);
      this._customValidityCache = message;
    }
  };

  ZidanTextField.prototype._formatRangeValue = function (value) {
    var formatter = this.rangeFormat;
    if (typeof formatter === 'function') {
      try { return String(formatter(value, this)); } catch (err) { return String(value); }
    }
    if (typeof formatter === 'string' && formatter) {
      if (formatter.indexOf('%s') !== -1) return formatter.replace('%s', String(value));
      return fillTemplate(formatter, {
        value: value,
        min: this.el.min,
        max: this.el.max
      });
    }
    return String(value);
  };

  ZidanTextField.prototype._rangeBounds = function () {
    var input = this.el;
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 100;
    return { min: min, max: max };
  };

  ZidanTextField.prototype._rangeLabelFor = function (value) {
    if (this.rangeLabelMap && this.rangeLabelMap[value] !== undefined) {
      return String(this.rangeLabelMap[value]);
    }
    return this._formatRangeValue(value);
  };

  ZidanTextField.prototype._renderRangeTicks = function () {
    if (!this.rangeTicksEl) return;
    var bounds = this._rangeBounds();
    var option = this.rangeTicksOption;
    var labelsOn = !!this.rangeTickLabels;
    this.rangeTicksEl.textContent = '';
    var values = [];
    if (Array.isArray(option)) {
      values = option.map(Number).filter(function (n) { return isFinite(n); });
    } else {
      var count = parseInt(option, 10);
      if (count > 1) {
        for (var i = 0; i < count; i += 1) values.push(bounds.min + ((bounds.max - bounds.min) * i) / (count - 1));
      }
    }
    /* Labeled ticks at both ends replace the min/max scale, so the start and end
       numbers are printed once instead of twice. */
    var coversEnds = labelsOn && !!this.rangeScale && values.length > 0 &&
      values.indexOf(bounds.min) !== -1 && values.indexOf(bounds.max) !== -1;
    if (this.rangeScale) this.rangeScale.classList.toggle('zs-range-scale--hidden', coversEnds);
    /* with no scale row, tick labels need their own room so they cannot overlap
       whatever follows the range */
    this.range.classList.toggle('zs-range--labels-no-scale', labelsOn && !this.rangeScale && values.length > 0);
    values.forEach(function (value) {
      var pct = bounds.max > bounds.min ? (value - bounds.min) / (bounds.max - bounds.min) : 0;
      var tick = el('span', 'zs-range-tick');
      tick.style.setProperty('--zs-range-tick-pct', (clamp(pct, 0, 1) * 100).toFixed(2) + '%');
      if (labelsOn) {
        tick.textContent = this._rangeLabelFor(value);
        tick.classList.add('zs-range-tick--labeled');
        if (pct <= 0) tick.classList.add('zs-range-tick--start');
        else if (pct >= 1) tick.classList.add('zs-range-tick--end');
      }
      this.rangeTicksEl.appendChild(tick);
    }, this);
  };

  ZidanTextField.prototype._syncRange = function (value) {
    if (!this.range) return;
    var bounds = this._rangeBounds();
    var numeric = parseFloat(value);
    if (!isFinite(numeric)) numeric = bounds.min;
    var pct = bounds.max > bounds.min ? (numeric - bounds.min) / (bounds.max - bounds.min) : 0;
    pct = clamp(pct, 0, 1);
    this.range.style.setProperty('--zs-range-pct', pct.toFixed(4));
    this.range.style.setProperty('--zs-range-fill', (pct * 100).toFixed(2) + '%');
    if (this.rangeBubble) {
      this.rangeBubble.textContent = this._formatRangeValue(numeric);
      /* at the ends, align the bubble inside the track instead of half outside it */
      this.rangeBubble.classList.toggle('zs-range-bubble--start', pct <= 0);
      this.rangeBubble.classList.toggle('zs-range-bubble--end', pct >= 1);
    }
    if (this.rangeScale) {
      this.rangeScale.firstChild.textContent = this.rangeMinLabel || this._formatRangeValue(bounds.min);
      this.rangeScale.lastChild.textContent = this.rangeMaxLabel || this._formatRangeValue(bounds.max);
    }
    /* the formatted value is what the user sees and what assistive tech should read */
    if (this.rangeFormat) this.el.setAttribute('aria-valuetext', this._formatRangeValue(numeric));
    else this.el.removeAttribute('aria-valuetext');
    var signature = [
      bounds.min, bounds.max, this.el.step, JSON.stringify(this.rangeTicksOption), this.rangeTickLabels,
      JSON.stringify(this.rangeLabelMap || null), this.rangeMinLabel, this.rangeMaxLabel,
      String(this.rangeFormat || '')
    ].join('|');
    if (signature !== this.rangeSignature) {
      this.rangeSignature = signature;
      this._renderRangeTicks();
    }
  };

  ZidanTextField.prototype._syncRangeOutput = function (value) {
    if (this.range) this._syncRange(value);
    if (this.rangeOutput) {
      var display = this.range ? this._formatRangeValue(value) : value;
      this.rangeOutput.textContent = display;
      this.rangeOutput.value = display;
    }
  };

  ZidanTextField.prototype._applyPhoneFormat = function (preserveCaret) {
    if (!this.phone) return this;
    var input = this.el;
    var raw = input.value;
    if (!digitsOnly(raw)) {
      /* no digits yet: leave the raw text alone — rewriting it to '+' on every
         format pass made the field impossible to type into */
      return this;
    }
    var caret = null;
    var digitCount = 0;
    var dialLength = this.phone.format === 'national'
      ? 0
      : String((PHONE_COUNTRIES[this.phone.country] || PHONE_COUNTRIES.US).dial).length;
    if (preserveCaret && typeof input.selectionStart === 'number') {
      caret = input.selectionStart;
      digitCount = digitsBefore(raw, caret);
      if (/^\s*\+/.test(raw)) digitCount = Math.max(0, digitCount - dialLength);
    }
    var formatted = formatPhone(raw, this.phone.country, this.phone.format);
    if (formatted === input.value) return this;
    input.value = formatted;
    if (preserveCaret && caret !== null) {
      var targetDigits = digitCount + (formatted.charAt(0) === '+' ? dialLength : 0);
      var position = caretAfterDigits(formatted, targetDigits);
      try { input.setSelectionRange(position, position); } catch (err) { /* unsupported */ }
    }
    return this;
  };

  ZidanTextField.prototype._applyMask = function () {
    if (!this.mask) return this;
    var input = this.el;
    var value = input.value;
    var caret = input.selectionStart === null || input.selectionStart === undefined ? value.length : input.selectionStart;
    var previousValue = this._maskValue || '';
    var previousRaw = this._maskRaw || '';
    var raw = maskRaw(value);
    var key = this._maskKey;
    var deletedLiteral = false;
    var consumedBefore = maskRaw(value.slice(0, caret)).length;
    this._maskKey = null;
    if (previousValue && value.length < previousValue.length && raw === previousRaw) {
      deletedLiteral = true;
      if (key === 'Delete') {
        if (consumedBefore < raw.length) raw = raw.slice(0, consumedBefore) + raw.slice(consumedBefore + 1);
      } else if (consumedBefore > 0) {
        raw = raw.slice(0, consumedBefore - 1) + raw.slice(consumedBefore);
      }
    }
    var result = maskBuild(this.mask.pattern, raw);
    if (result.value !== value) {
      input.value = result.value;
      var target;
      if (caret >= value.length && value.length > previousValue.length) {
        target = result.value.length;
      } else if (deletedLiteral) {
        target = maskCaret(result.map, key === 'Delete' ? consumedBefore : Math.max(0, consumedBefore - 1));
      } else {
        target = maskCaret(result.map, consumedBefore);
      }
      try { input.setSelectionRange(target, target); } catch (err) { /* older engines */ }
    }
    this._maskRaw = maskRaw(input.value);
    this._maskValue = input.value;
    return this;
  };

  ZidanTextField.prototype._autogrow = function () {
    if (!this.autogrow) return this;
    var input = this.el;
    if (!input || !input.scrollHeight) return this;
    var max = this.autogrow.max;
    input.style.height = 'auto';
    var next = input.scrollHeight;
    if (max > 0 && next > max) {
      next = max;
      input.style.overflowY = 'auto';
    } else {
      input.style.overflowY = '';
    }
    input.style.height = next + 'px';
    return this;
  };

  ZidanTextField.prototype.refreshAutogrow = function () {
    return this._autogrow();
  };

  ZidanTextField.prototype.getUnmaskedValue = function () {
    return this.mask ? maskRaw(this.el.value) : this.el.value;
  };

  ZidanTextField.prototype._stepBy = function (direction, times) {
    var input = this.el;
    if (!this.stepper || !direction || input.disabled || input.readOnly) return this;
    var count = Math.max(1, parseInt(times, 10) || 1);
    var step = parseFloat(this.opts.stepperStep || input.step);
    if (!isFinite(step) || step <= 0) step = 1;
    var bounds = this._rangeBounds();
    var min = parseFloat(input.min);
    var max = parseFloat(input.max);
    var hasValue = input.value !== '' && isFinite(parseFloat(input.value));
    var current = hasValue ? parseFloat(input.value) : (isFinite(min) ? min : 0);
    var next;
    if (!hasValue && direction > 0 && isFinite(min)) next = min;
    else next = current + direction * step * count;
    if (this.stepper.wrap && isFinite(min) && isFinite(max)) {
      var span = max - min;
      while (next > max) next -= span || step;
      while (next < min) next += span || step;
    } else {
      if (isFinite(min)) next = Math.max(min, next);
      if (isFinite(max)) next = Math.min(max, next);
    }
    var decimals = Math.max(decimalsOf(step), decimalsOf(next));
    var value = String(parseFloat(next.toFixed(Math.min(10, decimals))));
    if (value === input.value) {
      this._sync();
      return this;
    }
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    this.emit('step', { value: value, direction: direction, step: step });
    this.call('onStep', { value: value, direction: direction, instance: this });
    return this;
  };

  ZidanTextField.prototype.stepUp = function (times) {
    return this._stepBy(1, times);
  };

  ZidanTextField.prototype.stepDown = function (times) {
    return this._stepBy(-1, times);
  };

  ZidanTextField.prototype.setStepper = function (enabled) {
    var input = this.el;
    if (enabled) input.setAttribute('data-zidan-stepper', 'true');
    else input.removeAttribute('data-zidan-stepper');
    return this;
  };

  ZidanTextField.prototype.openPicker = function () {
    var input = this.el;
    try {
      if (typeof input.showPicker === 'function') input.showPicker();
      else if (input.focus) input.focus();
    } catch (err) {
      if (input.focus) input.focus();
    }
    this.emit('picker', { type: this.el.type });
    this.call('onPicker', { type: this.el.type, instance: this });
    return this;
  };

  ZidanTextField.prototype.showPicker = function () {
    return this.openPicker();
  };

  ZidanTextField.prototype.getPhoneCountry = function () {
    return this.phone ? this.phone.country : '';
  };

  ZidanTextField.prototype.setPhoneCountry = function (iso) {
    if (!this.phone) return this;
    iso = String(iso || '').toUpperCase();
    if (!PHONE_COUNTRIES[iso]) return this;
    this.phone.country = iso;
    if (this.phone.select) this.phone.select.value = iso;
    if (this.phone.syncPicker) this.phone.syncPicker();
    this._applyPhoneFormat(false);
    this.update();
    this.emit('phone-country', { country: iso });
    this.call('onPhoneCountry', { country: iso, instance: this });
    return this;
  };

  ZidanTextField.prototype.setPhoneFormat = function (format) {
    if (!this.phone) return this;
    var mode = String(format || '').toLowerCase();
    if (PHONE_FORMATS.indexOf(mode) === -1) return this;
    this.phone.format = mode;
    this._applyPhoneFormat(false);
    this.update();
    this.emit('phone-format', { format: mode });
    this.call('onPhoneFormat', { format: mode, instance: this });
    return this;
  };

  ZidanTextField.prototype.formatPhone = function (value) {
    if (!this.phone) return String(value === undefined ? this.el.value : value);
    return formatPhone(value === undefined ? this.el.value : value, this.phone.country, this.phone.format);
  };

  ZidanTextField.prototype._customError = function () {
    var input = this.el;
    var opts = this.opts;
    var messages = opts.messages;

    if (this.phone && this.phone.validate && input.value) {
      var country = PHONE_COUNTRIES[this.phone.country];
      var digits = phoneDigitsForCountry(input.value, this.phone.country, this.phone.format);
      if (digits && (digits.length < country.min || digits.length > country.max)) {
        return fillTemplate(messages.phone, { country: country.name, min: country.min, max: country.max });
      }
    }

    if (input.type === 'date' && input.value) {
      var weekend = fieldBool(input, opts, 'disableWeekends', 'disable-weekends', false);
      var disabledDates = opts.disabledDates || input.getAttribute('data-zidan-disabled-dates');
      var date = new Date(input.value + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        if (weekend && (date.getDay() === 0 || date.getDay() === 6)) return messages.weekend;
        var blocked = false;
        if (typeof disabledDates === 'function') {
          try { blocked = disabledDates(input.value, date, this) === true; } catch (err) { blocked = false; }
        } else if (disabledDates) {
          var list = Array.isArray(disabledDates) ? disabledDates : String(disabledDates).split(',').map(function (item) { return item.trim(); });
          blocked = list.indexOf(input.value) !== -1;
        }
        if (blocked) return messages.dateDisabled;
      }
      if (typeof opts.validateDate === 'function') {
        var dateResult = opts.validateDate(input.value, date, this, this._asyncContext());
        if (dateResult === false) return messages.date;
        if (typeof dateResult === 'string' && dateResult) return dateResult;
        if (isThenable(dateResult)) return dateResult;
      }
    }

    if (typeof opts.validate === 'function') {
      var result = opts.validate(input.value, this, this._asyncContext());
      if (result === false) return messages.generic;
      if (typeof result === 'string' && result) return result;
      if (isThenable(result)) return result;
    }
    return '';
  };

  ZidanTextField.prototype._sync = function () {
    var input = this.el;
    var value = input.value === undefined ? '' : String(input.value);
    var hasValue = value.length > 0 || (input.type === 'range' && value !== '');
    this.root.classList.toggle('zs-field--filled', hasValue);
    this.root.classList.toggle('zs-field--disabled', !!input.disabled);
    this.root.classList.toggle('zs-field--readonly', !!input.readOnly);
    if (this.clear) this.clear.hidden = !hasValue || !!input.disabled || !!input.readOnly;
    if (this.counter) {
      var length = value.length;
      this.counter.textContent = length + ' / ' + this.counterMax;
      this.counter.classList.toggle('zs-counter--limit', length >= this.counterMax);
    }
    if (this.range) this._syncRange(value);
    if (this.rangeOutput) {
      var display = this.range ? this._formatRangeValue(value) : value;
      this.rangeOutput.textContent = display;
      this.rangeOutput.value = display;
    }
    if (this.stepper) {
      var min = parseFloat(input.min);
      var max = parseFloat(input.max);
      var current = parseFloat(value);
      if (!isFinite(current)) current = isFinite(min) ? min : 0;
      var blocked = !!input.disabled || !!input.readOnly;
      this.stepper.minus.disabled = blocked || (!this.stepper.wrap && isFinite(min) && current <= min);
      this.stepper.plus.disabled = blocked || (!this.stepper.wrap && isFinite(max) && current >= max);
    }
    if (this.autogrow) this._autogrow();
  };

  ZidanTextField.prototype.getValue = function () {
    return this.el.value;
  };

  ZidanTextField.prototype.setValue = function (value) {
    var next = value === null || value === undefined ? '' : String(value);
    if (this.mask) next = formatMasked(next, this.mask.pattern);
    this.el.value = next;
    if (this.mask) {
      this._maskRaw = maskRaw(next);
      this._maskValue = next;
    }
    if (this.phone) this._applyPhoneFormat(false);
    return this.update();
  };

  ZidanTextField.prototype._teardown = function () {
    if (this.range) this.el.removeAttribute('aria-valuetext');
    if (this._restoreInput) this._restoreInput();
  };

  /* @zidan-build:factory */
  /* ---------------- factory, registry, auto-init ---------------- */

  function fieldKindFor(node) {
    if (!isElement(node)) return null;
    var flag = String(node.getAttribute('data-zidan') || '').toLowerCase();
    if (FIELD_KINDS.indexOf(flag) !== -1) return flag;
    if (node.hasAttribute('data-zidan-radio-group')) return 'radio-group';
    if (node.hasAttribute('data-zidan-radio')) return 'radio';
    if (node.hasAttribute('data-zidan-checkbox') || node.hasAttribute('data-zidan-switch')) return 'checkbox';
    if (node.hasAttribute('data-zidan-file')) return 'file';
    if (node.hasAttribute('data-zidan-textarea')) return 'textarea';
    if (node.hasAttribute('data-zidan-input')) return 'input';
    var type = String(node.type || '').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (type === 'file') return 'file';
    if (hasClass(node, 'zidan-field')) {
      if (node.tagName === 'FIELDSET') return node.querySelector('input[type="radio"]') ? 'radio-group' : null;
      if (node.tagName === 'TEXTAREA') return 'textarea';
      if (node.tagName !== 'INPUT') return null;
      // a lone radio needs its group container, so only the fieldset form is inferred
      if (type === 'radio') return null;
      if (typeof TEXT_TYPES !== 'undefined' && TEXT_TYPES.indexOf(type) !== -1) return 'input';
    }
    return null;
  }

  function createField(node, kind, options) {
    var opts = mergeOptions(parseOptionsAttr(node), options);
    if (node.__zidanField && !opts.force) return node.__zidanField;
    /* { force: true } rebuilds the field, so tear the old wrapper down first
       instead of wrapping the element a second time */
    if (node.__zidanField) node.__zidanField.destroy();
    /* the generated wrapper is inserted next to the original element, so a node
       with no parent cannot be enhanced — say so instead of failing deeper in */
    if (!node.parentNode) {
      throw new Error('ZidanForm: a ' + kind + ' field needs a parent element before it can be enhanced.');
    }
    switch (kind) {
      case 'checkbox':
        return typeof ZidanCheckbox !== 'undefined' ? new ZidanCheckbox(node, opts) : null;
      case 'radio':
      case 'radio-group':
        return typeof ZidanRadioGroup !== 'undefined' ? new ZidanRadioGroup(node, opts) : null;
      case 'file':
        return typeof ZidanFileUpload !== 'undefined' ? new ZidanFileUpload(node, opts) : null;
      case 'input':
      case 'textarea':
        return typeof ZidanTextField !== 'undefined' ? new ZidanTextField(node, opts) : null;
      default: return null;
    }
  }

  function zidanField(target, options) {
    var nodes = [];
    if (typeof target === 'string') {
      nodes = Array.prototype.slice.call(doc.querySelectorAll(target));
    } else if (isElement(target)) {
      nodes = [target];
    } else if (target && typeof target.length === 'number') {
      nodes = Array.prototype.slice.call(target);
    }
    var created = [];
    nodes.forEach(function (node) {
      if (node.__zidanField && !(options && options.force)) {
        created.push(node.__zidanField);
        return;
      }
      // zidanField() accepts a plain input/textarea too, so JS-only options
      // (output, counter, clearable, …) work without a data attribute
      var kind = fieldKindFor(node) || inferredTextKind(node);
      if (!kind) return;
      if (kind === 'radio' || kind === 'radio-group') {
        if (/^INPUT$/i.test(node.tagName)) {
          node = node.closest ? node.closest('fieldset, [data-zidan-radio-group]') : null;
          if (!node) return;
        }
        kind = 'radio-group';
      }
      var instance = createField(node, kind, options || {});
      if (instance) created.push(instance);
    });
    return created.length === 1 ? created[0] : created;
  }

  function initFieldList(nodes, options) {
    var instances = [];
    nodes.forEach(function (node) {
      if (!isElement(node)) return;
      if (node.__zidanField && !(options && options.force)) return;
      var kind = fieldKindFor(node);
      if (!kind) return;
      if (kind === 'radio' || kind === 'radio-group') {
        if (/^INPUT$/i.test(node.tagName)) {
          node = node.closest ? node.closest('fieldset, [data-zidan-radio-group]') : null;
          if (!node) return;
        }
        kind = 'radio-group';
      }
      var instance = createField(node, kind, options || {});
      if (instance) instances.push(instance);
    });
    return instances;
  }

  function initZidanForms(container, options) {
    var scope = container || doc;
    if (!scope || !scope.querySelectorAll) return [];
    var nodes = Array.prototype.slice.call(scope.querySelectorAll(FIELDS_SELECTOR));
    if (isElement(scope) && scope.matches && scope.matches(FIELDS_SELECTOR)) nodes.unshift(scope);
    return initFieldList(nodes, options);
  }

  function formElementFor(target) {
    var node = typeof target === 'string' ? doc.querySelector(target) : target;
    if (!node) return null;
    if (node.tagName === 'FORM') return node;
    if (node.form) return node.form;
    if (node.querySelector) return node.querySelector('form');
    return null;
  }

  function serializeForm(target, options) {
    var cfg = options || {};
    var form = formElementFor(target);
    if (!form) throw new TypeError('ZidanForm.serialize: expected a <form> or a form control.');
    var out = {};
    new FormData(form).forEach(function (value, key) {
      if (!cfg.files && typeof File !== 'undefined' && value instanceof File) return;
      if (Object.prototype.hasOwnProperty.call(out, key)) {
        if (!Array.isArray(out[key])) out[key] = [out[key]];
        out[key].push(value);
      } else {
        out[key] = value;
      }
    });
    return out;
  }

  /* resolves boolean after every enhanced field (and native constraint) ran */
  function validateForm(target, options) {
    var cfg = options || {};
    var form = formElementFor(target);
    if (!form) return Promise.reject(new TypeError('ZidanForm.validate: expected a <form> or a form control.'));
    var fields = ZidanForm.fields.filter(function (field) {
      return field.el && field.el.form === form;
    });
    var checks = fields.map(function (field) {
      var result;
      try { result = field.validate(); } catch (err) { result = false; }
      return Promise.resolve(result).catch(function () { return false; });
    });
    return Promise.all(checks).then(function (results) {
      var nativeValid = true;
      try { nativeValid = form.checkValidity(); } catch (err) { nativeValid = true; }
      var valid = nativeValid && results.every(function (value) { return value !== false; });
      var invalidField = null;
      for (var i = 0; i < fields.length; i += 1) {
        if (results[i] === false) { invalidField = fields[i]; break; }
      }
      if (!valid && cfg.focus !== false) {
        var focusTarget = null;
        try { focusTarget = form.querySelector(':invalid'); } catch (err) { focusTarget = null; }
        if (invalidField && invalidField.el) {
          /* choose whichever comes first in the document, so a native email
             error above a failing textarea wins */
          if (!focusTarget || (focusTarget.compareDocumentPosition &&
            (focusTarget.compareDocumentPosition(invalidField.el) & 2))) {
            focusTarget = invalidField.el;
          }
        }
        if (focusTarget && focusTarget.focus) {
          try { focusTarget.focus(); } catch (err) { /* detached */ }
        }
      }
      var detail = { valid: valid, form: form, fields: fields };
      try {
        form.dispatchEvent(new CustomEvent('zidan:validate', { detail: detail, bubbles: true }));
      } catch (err) {
        try { form.dispatchEvent(new Event('zidan:validate')); } catch (ignored) { /* old browsers */ }
      }
      return valid;
    });
  }

  var ZidanForm = {
    version: VERSION,
    __zidanFormGuard: VERSION,
    // live registries: pushing a name here makes it a valid theme/layout
    themes: THEMES,
    frameworks: FRAMEWORKS.slice(),
    fieldLayouts: FIELD_LAYOUTS,
    locales: LOCALES,
    fields: [],
    _register: function (field) {
      if (ZidanForm.fields.indexOf(field) === -1) ZidanForm.fields.push(field);
    },
    _unregister: function (field) {
      var index = ZidanForm.fields.indexOf(field);
      if (index !== -1) ZidanForm.fields.splice(index, 1);
    },
    get: function (target) {
      var node = typeof target === 'string' ? doc.querySelector(target) : target;
      return isElement(node) ? node.__zidanField || null : null;
    },
    init: function (scope, options) {
      return initZidanForms(scope || doc, options || {});
    },
    field: zidanField,
    serialize: serializeForm,
    validate: validateForm,
    refresh: function (scope) {
      initZidanForms(scope || doc, {});
      ZidanForm.fields.slice().forEach(function (field) { field.update(); });
      return ZidanForm.fields.slice();
    },
    /* destroy only the fields/selects inside a subtree (framework unmount) */
    destroy: function (scope) {
      var root = scopeRoot(scope);
      if (!root) return 0;
      var count = 0;
      ZidanForm.fields.slice().forEach(function (field) {
        if (inScope(root, field.el)) {
          field.destroy();
          count += 1;
        }
      });
      if (typeof ZidanSelect !== 'undefined' && ZidanSelect.destroy) {
        count += ZidanSelect.destroy(root);
      }
      return count;
    },
    destroyAll: function () {
      ZidanForm.fields.slice().forEach(function (field) { field.destroy(); });
      ZidanForm.fields = [];
      if (typeof ZidanSelect !== 'undefined' && ZidanSelect.destroyAll) ZidanSelect.destroyAll();
      return ZidanForm;
    },
    /* keep a subtree in sync when it is re-rendered by a framework */
    observe: function (scope, options) {
      var root = scope || doc.body;
      if (!root || !global.MutationObserver) return null;
      var observer = new global.MutationObserver(function (records) {
        records.forEach(function (record) {
          Array.prototype.slice.call(record.addedNodes).forEach(function (node) {
            if (!isElement(node)) return;
            if (fieldKindFor(node)) createField(node, fieldKindFor(node) === 'radio' ? 'radio-group' : fieldKindFor(node), options || {});
            if (node.querySelectorAll) initZidanForms(node, options || {});
          });
        });
        // drop instances whose control left the document
        ZidanForm.fields.slice().forEach(function (field) {
          if (!field.el.isConnected) field.destroy();
        });
        if (typeof ZidanSelect !== 'undefined') {
          ZidanSelect.instances.slice().forEach(function (instance) {
            if (!instance.el.isConnected) instance.destroy();
          });
        }
      });
      observer.observe(root, { childList: true, subtree: true });
      return observer;
    }
  };

  ZidanForm.api = null;

  /* registries, presets and helpers shared by every field type */
  ZidanForm.registerIcon = registerIcon;
  ZidanForm.icons = ICON_REGISTRY;
  if (typeof PHONE_COUNTRIES !== 'undefined') {
    ZidanForm.phoneCountries = PHONE_COUNTRIES;
    ZidanForm.phoneFormats = PHONE_FORMATS.slice();
    ZidanForm.formatPhone = formatPhone;
    ZidanForm.detectPhoneCountry = detectPhoneCountry;
  }
  ZidanForm.messages = FIELD_MESSAGES;
  /* input-mask helpers: mask(value, pattern) formats, unmask strips literals */
  if (typeof maskBuild === 'function') {
    ZidanForm.mask = function (value, pattern) {
      return formatMasked(value, pattern);
    };
    ZidanForm.unmask = function (value) {
      return maskRaw(value);
    };
  }
  if (typeof downscaleImage === 'function') {
    ZidanForm.downscaleImage = downscaleImage;
  }
  ZidanForm.variants = {};
  if (typeof CHECKBOX_VARIANTS !== 'undefined') ZidanForm.variants.checkbox = CHECKBOX_VARIANTS.slice();
  if (typeof SWITCH_STYLES !== 'undefined') ZidanForm.variants.switch = SWITCH_STYLES.slice();
  if (typeof RADIO_VARIANTS !== 'undefined') ZidanForm.variants.radio = RADIO_VARIANTS.slice();
  if (typeof FILE_VARIANTS !== 'undefined') ZidanForm.variants.file = FILE_VARIANTS.slice();
  if (typeof RANGE_VARIANTS !== 'undefined') ZidanForm.variants.range = RANGE_VARIANTS.slice();
  if (typeof STEPPER_MODES !== 'undefined') ZidanForm.stepperModes = STEPPER_MODES.slice();
  ZidanForm.fieldLayouts = FIELD_LAYOUTS.slice();

  /* static helpers */
  if (typeof ZidanSelect !== 'undefined') {
    ZidanSelect.version = VERSION;
    ZidanSelect.__zidanSelectGuard = VERSION;
    ZidanSelect.layouts = LAYOUTS.slice();
    ZidanSelect.frameworks = FRAMEWORKS.slice();
    ZidanSelect.scrollbars = SCROLLBARS.slice();
    ZidanSelect.defaults = DEFAULTS;
    ZidanSelect.locales = LOCALES;
    ZidanSelect.registerIcon = registerIcon;
    ZidanSelect.icons = ICON_REGISTRY;
    ZidanSelect.cacheLimit = 50;
    ZidanSelect.get = function (target) {
      var element = typeof target === 'string' ? doc.querySelector(target) : target;
      if (!isElement(element)) return null;
      return element.__zidanSelect || null;
    };
    ZidanSelect.instances = [];
    /* destroy only the selects inside a subtree; returns how many were removed */
    ZidanSelect.destroy = function (scope) {
      var root = scopeRoot(scope);
      if (!root) return 0;
      var count = 0;
      ZidanSelect.instances.slice().forEach(function (instance) {
        if (inScope(root, instance.el)) {
          instance.destroy();
          count += 1;
        }
      });
      return count;
    };
    ZidanSelect.destroyAll = function () {
      ZidanSelect.destroy(doc);
      ZidanSelect.instances = [];
    };
  }

  /* ------------------------------------------------------------------ *
   * Factory + auto-init
   * ------------------------------------------------------------------ */

  function zidanSelect(target, options) {
    var nodes = [];
    if (typeof target === 'string') {
      nodes = Array.prototype.slice.call(doc.querySelectorAll(target));
    } else if (target && typeof target.length === 'number' && !isElement(target) && target !== global) {
      nodes = Array.prototype.slice.call(target);
    } else if (isElement(target)) {
      nodes = [target];
    }

    var instances = nodes.map(function (node) {
      var instance = new ZidanSelect(node, options || {});
      ZidanSelect.instances.push(instance);
      return instance;
    });

    return instances.length === 1 ? instances[0] : instances;
  }

  function initSelectList(nodes, options) {
    return nodes.filter(function (node) {
      return isElement(node) && !node.__zidanSelect;
    }).map(function (node) {
      ZidanSelect.instances.push(new ZidanSelect(node, options || {}));
      return node.__zidanSelect;
    });
  }

  function initZidanSelects(container, options) {
    var scope = container || doc;
    if (!scope || !scope.querySelectorAll) return [];
    var nodes = Array.prototype.slice.call(scope.querySelectorAll(SELECT_SELECTOR));
    if (isElement(scope) && scope.matches && scope.matches(SELECT_SELECTOR)) nodes.unshift(scope);
    return initSelectList(nodes, options);
  }

  /* a config target is a CSS selector string or { selector, options } */
  function eachTarget(list, run) {
    toArray(list).forEach(function (entry) {
      if (!entry) return;
      if (typeof entry === 'string') run(entry, null);
      else if (entry.selector) run(String(entry.selector), entry.options || null);
    });
  }

  function initSelectTargets(list, shared) {
    eachTarget(list, function (selector, options) {
      initSelectList(Array.prototype.slice.call(doc.querySelectorAll(selector)),
        mergeOptions(shared, options));
    });
  }

  function initFieldTargets(list, shared) {
    eachTarget(list, function (selector, options) {
      var opts = mergeOptions(shared, options);
      Array.prototype.slice.call(doc.querySelectorAll(selector)).forEach(function (node) {
        if (!isElement(node) || node.__zidanField) return;
        var kind = fieldKindFor(node) || inferredTextKind(node);
        if (!kind) return;
        if (kind === 'radio') kind = 'radio-group';
        createField(node, kind, opts);
      });
    });
  }

  /* explicit targets may point at a plain text input or textarea */
  function inferredTextKind(node) {
    if (typeof TEXT_TYPES === 'undefined' || !isElement(node)) return null;
    if (node.tagName === 'TEXTAREA') return 'textarea';
    if (node.tagName !== 'INPUT') return null;
    return TEXT_TYPES.indexOf(String(node.type).toLowerCase()) !== -1 ? 'input' : null;
  }

  /* a form scope enhances every native select inside, marked or not */
  function initScopeSelects(scope, options) {
    if (typeof ZidanSelect === 'undefined') return [];
    var selector = SELECT_SELECTOR + ', select';
    var nodes = Array.prototype.slice.call(scope.querySelectorAll(selector));
    if (isElement(scope) && scope.matches && scope.matches(selector)) nodes.unshift(scope);
    return initSelectList(nodes, options);
  }

  function initScope(scope, selectOptions, fieldOptions) {
    if (!isElement(scope)) return;
    initScopeSelects(scope, selectOptions);
    if (typeof ZidanFileUpload !== 'undefined') {
      // a form scope also picks up plain file inputs, not just marked ones
      initFieldList(Array.prototype.slice.call(scope.querySelectorAll('input[type="file"]')), fieldOptions);
    }
    if (typeof ZidanCheckbox !== 'undefined' || typeof ZidanRadioGroup !== 'undefined' ||
      typeof ZidanFileUpload !== 'undefined' || typeof ZidanTextField !== 'undefined') {
      initZidanForms(scope, fieldOptions);
    }
  }

  function initFormScopes(list, selectOptions, fieldOptions) {
    Array.prototype.slice.call(doc.querySelectorAll(FORM_SCOPE_SELECTOR))
      .forEach(function (scope) { initScope(scope, selectOptions, fieldOptions); });
    eachTarget(list, function (selector, options) {
      Array.prototype.slice.call(doc.querySelectorAll(selector)).forEach(function (scope) {
        initScope(scope, mergeOptions(selectOptions, options), mergeOptions(fieldOptions, options));
      });
    });
  }

  function autoInit() {
    if (!doc) return;
    var config = global.ZIDAN_FORM_CONFIG || global.ZIDAN_SELECT_CONFIG || {};
    if (config.autoInit === false) return;
    if (global.ZidanSelect && global.ZidanSelect.autoInit === false) return;
    if (doc.documentElement.getAttribute('data-zidan-auto-init') === 'false') return;

    var hasSelect = typeof ZidanSelect !== 'undefined';
    var hasFields = typeof ZidanCheckbox !== 'undefined' || typeof ZidanRadioGroup !== 'undefined' ||
      typeof ZidanFileUpload !== 'undefined' || typeof ZidanTextField !== 'undefined';
    var selectOptions = config.options || {};
    var fieldOptions = config.fieldOptions || config.fields || {};

    // explicit targets run first so their per-target options win over the
    // generic attribute scan (the scan then skips what is already initialised)
    if (hasSelect) {
      if (config.selector) {
        // legacy: an explicit selector replaces the data-attribute scan
        initSelectTargets(config.selector, selectOptions);
      } else {
        initSelectTargets(config.targets || config.selectors, selectOptions);
      }
    }
    if (hasFields) initFieldTargets(config.fieldTargets, fieldOptions);
    initFormScopes(config.formTargets, selectOptions, fieldOptions);

    if (hasSelect && !config.selector) initZidanSelects(doc, selectOptions);
    if (hasFields) initZidanForms(doc, fieldOptions);
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', autoInit);
    } else {
      setTimeout(autoInit, 0);
    }
  }

  var api = {
    ZidanForm: ZidanForm,
    registerIcon: registerIcon
  };
  if (typeof ZidanSelect !== 'undefined') {
    api.ZidanSelect = ZidanSelect;
    api.zidanSelect = zidanSelect;
    api.initZidanSelects = initZidanSelects;
  }
  if (typeof ZidanCheckbox !== 'undefined' || typeof ZidanRadioGroup !== 'undefined' ||
    typeof ZidanFileUpload !== 'undefined' || typeof ZidanTextField !== 'undefined') {
    api.zidanField = zidanField;
    api.initZidanForms = initZidanForms;
  }
  if (typeof ZidanCheckbox !== 'undefined') api.ZidanCheckbox = ZidanCheckbox;
  if (typeof ZidanRadioGroup !== 'undefined') api.ZidanRadioGroup = ZidanRadioGroup;
  if (typeof ZidanFileUpload !== 'undefined') api.ZidanFileUpload = ZidanFileUpload;
  if (typeof ZidanTextField !== 'undefined') api.ZidanTextField = ZidanTextField;
  if (typeof formatPhone === 'function') {
    api.formatPhone = formatPhone;
    api.detectPhoneCountry = detectPhoneCountry;
  }
  if (typeof downscaleImage === 'function') api.downscaleImage = downscaleImage;
  if (typeof maskBuild === 'function') {
    api.mask = formatMasked;
    api.unmask = maskRaw;
  }

  ZidanForm.api = api;

  return api;
});
