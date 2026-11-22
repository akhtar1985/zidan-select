/*!
 * ZidanForm v2.2.0
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

  var VERSION = '2.2.0';

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
  var THEMES = ['default', 'modern', 'minimal', 'dark', 'glass'];
  var FIELD_LAYOUTS = ['stacked', 'inline', 'card', 'compact', 'floating', 'outlined'];
  var FIELD_KINDS = ['checkbox', 'radio', 'radio-group', 'file', 'input', 'textarea'];
  var FIELDS_SELECTOR = '[data-zidan], [data-zidan-checkbox], [data-zidan-switch], [data-zidan-radio], ' +
    '[data-zidan-radio-group], [data-zidan-file], [data-zidan-input], [data-zidan-textarea]';
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

  function isElement(value) {
    return !!(value && typeof value === 'object' && value.nodeType === 1);
  }

  function readBoolAttr(value, fallback) {
    if (value === undefined || value === null || value === '') return fallback;
    var v = String(value).toLowerCase();
    return !(v === 'false' || v === '0' || v === 'no' || v === 'off');
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
    if (!name || typeof markup !== 'string') return ZidanSelect;
    ICON_REGISTRY[String(name)] = markup;
    return ZidanSelect;
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
        if (value) return value;
      }
      current = current.parentElement;
    }
    return '';
  }

  function pickList(value, list, fallback) {
    var candidate = String(value || '').toLowerCase();
    return list.indexOf(candidate) === -1 ? fallback : candidate;
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
    themeFramework: 'auto',    // 'auto' | 'vanilla' | 'bootstrap' | 'tailwind'
    id: null,
    name: null,
    disabled: false,
    required: false,
    /* data */
    options: null,
    value: null,
    label: null,               // floating label text (falls back to placeholder)
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
    /* combobox / async */
    fetchOptions: null,
    debounce: 250,
    minChars: 0,
    allowFreeText: false,
    searchValues: true,
    /* tags */
    maxTags: Infinity,
    minTagLength: 1,
    maxTagLength: Infinity,
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
    onError: null
  };

  /* @zidan-build:select */
  /* ------------------------------------------------------------------ *
   * ZidanSelect
   * ------------------------------------------------------------------ */

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
      element.hasAttribute('data-zidan-select') && !/^(SELECT|INPUT|TEXTAREA)$/i.test(element.tagName);
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
    this.timer = null;
    this.savedInputText = '';
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
    merged.disabled = pick('disabled', readBoolAttr(d.zidanDisabled, isNativeSelect ? this.el.disabled : false));
    merged.placeholder = pick('placeholder',
      d.zidanPlaceholder || (this.el.getAttribute && this.el.getAttribute('placeholder')) || placeholderDefault);
    merged.label = pick('label', d.zidanLabel || null);
    merged.name = pick('name', d.zidanName || (this.el.getAttribute && this.el.getAttribute('name')) || null);
    merged.allowFreeText = pick('allowFreeText', readBoolAttr(d.zidanAllowFreeText, mode === 'tags'));
    merged.maxTags = pick('maxTags', d.zidanMaxTags ? parseInt(d.zidanMaxTags, 10) || Infinity : DEFAULTS.maxTags);
    merged.minTagLength = pick('minTagLength', d.zidanMinTagLength ? parseInt(d.zidanMinTagLength, 10) || 1 : DEFAULTS.minTagLength);
    merged.maxTagLength = pick('maxTagLength', d.zidanMaxTagLength ? parseInt(d.zidanMaxTagLength, 10) || Infinity : DEFAULTS.maxTagLength);
    merged.caseSensitive = pick('caseSensitive', readBoolAttr(d.zidanCaseSensitive, false));
    merged.validation = pick('validation', d.zidanValidation || null);
    merged.options = pick('options', null);
    merged.suggestions = pick('suggestions', null);

    // carry over every explicitly-passed option (callbacks, custom classes, ...)
    Object.keys(options).forEach(function (key) {
      if (options[key] !== undefined) merged[key] = options[key];
    });

    // these three are authoritative after the merge
    merged.mode = mode;
    merged.layout = layout;
    merged.themeFramework = framework;
    merged.scrollbar = scrollbar;
    if (!merged.theme) merged.theme = d.zidanTheme || d.zsTheme || '';
    if (mode === 'combobox') merged.searchable = true;
    if (mode === 'tags' && merged.searchable === false) merged.searchable = true;
    if (mode === 'tags') merged.multiple = true;
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
    this.theme = scope.theme;

    var rootEl = el('div', 'zs-root');
    rootEl.id = this.id + '-root';
    rootEl.setAttribute('data-zs-theme', this.theme);
    rootEl.setAttribute('data-zs-layout', this.layout);
    rootEl.setAttribute('data-zs-framework', this.framework);
    rootEl.setAttribute('data-zs-mode', this.mode);
    rootEl.setAttribute('data-zs-scrollbar', opts.scrollbar || 'default');
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
    if (opts.ariaLabel || opts.label) input.setAttribute('aria-label', opts.ariaLabel || opts.label);
    if (opts.disabled) input.disabled = true;
    this._applyCustomClass(input, 'input');

    var labelEl = null;
    if (opts.label) {
      labelEl = el('label', 'zs-label', { for: input.id });
      labelEl.textContent = opts.label;
      if (this.layout !== 'floating-label') rootEl.classList.add('zs-root--has-static-label');
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
    if (this.mode !== 'tags') {
      dropdown.setAttribute('aria-multiselectable', String(!!(opts.multiple || this.mode === 'tags')));
    }
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
    this.controlEl = control;
    this.chipsEl = chips;
    this.input = input;
    this.dropdown = dropdown;
    this.clearBtn = clearBtn;
    this.arrowEl = arrow;
    this.labelEl = labelEl;
    this.liveEl = live;
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
      // NOTE: `required` is intentionally NOT copied to the hidden native
      // control — a display:none required field blocks submit with an
      // unfocusable invalid control. We expose aria-required on our input
      // and validation via setValidation('invalid').
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
      toArray(initial).forEach(function (tag) { this._addTagObject(tag, { silent: true }); }, this);
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
    if (!this.value_.length) this.input.value = '';
  };

  /* ---------------- dropdown ---------------- */

  ZidanSelect.prototype._sourceItems = function () {
    if (this.mode === 'tags') return this.suggestions || [];
    if (typeof this.opts.fetchOptions === 'function' && this.asyncItems) return this.asyncItems;
    return this.items;
  };

  ZidanSelect.prototype._visibleItems = function () {
    var self = this;
    var query = this.query.trim();
    var source = this._sourceItems();
    var isCaseSensitive = !!this.opts.caseSensitive;

    if (!query) return source.slice();

    return source.filter(function (item) {
      if (typeof self.opts.filterOption === 'function') {
        return !!self.opts.filterOption(item, query, {
          instance: self,
          mode: self.mode,
          caseSensitive: isCaseSensitive,
          selected: self._hasValue(item.value)
        });
      }
      var label = isCaseSensitive ? item.label : item.label.toLowerCase();
      var needle = isCaseSensitive ? query : query.toLowerCase();
      if (label.indexOf(needle) !== -1) return true;
      if (self.opts.searchValues) {
        var value = isCaseSensitive ? item.value : item.value.toLowerCase();
        if (value.indexOf(needle) !== -1) return true;
      }
      return false;
    });
  };

  ZidanSelect.prototype._renderDropdown = function () {
    var self = this;
    if (!this.opened) return;

    var scrollTop = this.dropdown.scrollTop;
    this.dropdown.textContent = '';
    this.rendered = [];

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
        var lastGroup = null;
        items.forEach(function (item, index) {
          if (item.group && item.group !== lastGroup) {
            var header = el('div', 'zs-group', { role: 'presentation' }, item.group);
            self.dropdown.appendChild(header);
            lastGroup = item.group;
          }

          var selected = self._hasValue(item.value);
          var option = el('div', 'zs-option', {
            role: 'option',
            id: self.id + '-opt-' + index,
            'data-zs-option': index
          });
          option.setAttribute('aria-selected', String(selected));
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
            option.appendChild(el('span', 'zs-option-label', null, item.label));
          }

          if (index === self.activeIndex) {
            option.classList.add('zs-option--active');
            self._applyCustomClass(option, 'active');
          }

          self.rendered.push({ element: option, item: item, index: index });
          self.dropdown.appendChild(option);
        });
      }
    }

    this.dropdown.scrollTop = scrollTop;
    this._updateActiveDescendant(false);
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
    if (this.mode === 'combobox' || (this.mode === 'select' && this.opts.searchable)) {
      this.savedInputText = this.input.value;
    }
    this.root.classList.add('zs-root--open');
    this.dropdown.setAttribute('data-zs-visible', 'true');
    this._render();
    this._renderDropdown();
    this._position();
    this.emit('open', { instance: this });
    this.call('onOpen', { instance: this });

    if (typeof this.opts.fetchOptions === 'function' && !this.asyncItems) {
      this._fetch('');
    } else if (this.mode !== 'tags') {
      var first = this._firstEnabledIndex();
      if (first !== -1) {
        this.activeIndex = first;
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

  ZidanSelect.prototype._fetch = function (query) {
    var self = this;
    if (typeof this.opts.fetchOptions !== 'function') return;
    query = query === undefined || query === null ? '' : String(query);

    if (this.asyncController) this.asyncController.abort();
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    this.asyncController = controller;
    this.loading = true;
    this.error = null;
    this._renderDropdown();
    this.announce(this.opts.loadingText);

    var done = function (result) {
      self.loading = false;
      self.asyncItems = self._normalizeItems(result || []);
      self.activeIndex = -1;
      self._renderDropdown();
      var count = self._visibleItems().length;
      self.announce(count + ' result' + (count === 1 ? '' : 's'));
    };
    var fail = function (err) {
      self.loading = false;
      self.error = { message: (err && err.message) || 'Unable to load options.' };
      self.emit('error', { error: err, message: self.error.message, instance: self });
      self.call('onError', { error: err, message: self.error.message, instance: self });
      self._renderDropdown();
    };

    try {
      var result = this.opts.fetchOptions(query, controller ? controller.signal : undefined);
      if (result && typeof result.then === 'function') {
        result.then(function (data) {
          if (controller && controller.signal.aborted) return;
          done(data);
        }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          if (controller && controller.signal.aborted) return;
          fail(err);
        });
      } else {
        done(result);
      }
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      fail(err);
    }
    void self;
  };

  /* ---------------- tags ---------------- */

  ZidanSelect.prototype._tagError = function (message) {
    this.announce(message);
    this.emit('error', { message: message, instance: this });
    this.call('onError', { message: message, instance: this });
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
    var added = this._addTagObject(tag, {});
    this._render();
    if (this.opened) this._renderDropdown();
    return added;
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

  /* ---------------- keyboard ---------------- */

  ZidanSelect.prototype._onKeyDown = function (event) {
    if (this.destroyed) return;
    var key = event.key;
    var items = this._visibleItems();

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
    }
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
        if (!self.opts.searchable && !self.input.readOnly) return;
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

    this.debouncedFetch = debounce(function (query) { self._fetch(query); }, this.opts.debounce);

    this.input.addEventListener('input', this.onInput);
    this.input.addEventListener('keydown', this.onKeyDown);
    this.input.addEventListener('focus', this.onFocus);
    this.input.addEventListener('blur', this.onBlur);
    this.controlEl.addEventListener('click', this.onControlClick);
    this.controlEl.addEventListener('mousedown', this.onControlMouseDown);
    this.chipsEl.addEventListener('click', this.onChipsClick);
    this.clearBtn.addEventListener('click', this.onClearClick);
    this.dropdown.addEventListener('mousedown', this.onDropdownMouseDown);
    this.dropdown.addEventListener('click', this.onDropdownClick);
    doc.addEventListener('pointerdown', this.onDocumentPointerDown, true);
    global.addEventListener('resize', this.onWindowResize);
  };

  ZidanSelect.prototype._observeResize = function () {
    if (typeof ResizeObserver === 'undefined') return;
    var self = this;
    this.resizeObserver = new ResizeObserver(function () {
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

  ZidanSelect.prototype.clear = function () {
    if (this.mode === 'tags') {
      if (!this.value_.length) return this;
      this.value_ = [];
      this._render();
      this._syncNative();
      this.announce('All tags removed.');
      this.emit('change', { value: [], instance: this });
      this.call('onChange', { value: [], instance: this });
      if (this.opened) this._renderDropdown();
      return this;
    }
    this._setValueInternal([], {});
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
    }
    this.asyncItems = null;
    this.activeIndex = -1;
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
      this.emit('error', { error: err, message: (err && err.message) || String(err), callback: callbackName, instance: this });
      return undefined;
    }
  };

  ZidanSelect.prototype.announce = function (message) {
    if (!this.liveEl || !message) return;
    this.liveEl.textContent = '';
    this.liveEl.textContent = message;
  };

  ZidanSelect.prototype.destroy = function () {
    if (this.destroyed) return this;
    this.destroyed = true;

    if (this.debouncedFetch) this.debouncedFetch.cancel();
    if (this.asyncController) this.asyncController.abort();
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.form && this.onFormReset) this.form.removeEventListener('reset', this.onFormReset);

    doc.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    global.removeEventListener('resize', this.onWindowResize);

    this.emit('destroy', { instance: this });

    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);

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
    this.destroyed = false;
    this._listeners = [];
    this._cleanups = [];
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
    try { return fn(payload); } catch (err) { this.emit('error', { error: err, callback: name }); }
    return undefined;
  };

  ZidanFieldBase.prototype._scope = function (kind) {
    var root = el('div', 'zs-field');
    root.id = this.id + '-field';
    root.setAttribute('data-zs-kind', kind);
    root.classList.add('zs-field--' + kind);
    this._applyScope(root);
    this.root = root;
    return root;
  };

  ZidanFieldBase.prototype._applyScope = function (root) {
    root.setAttribute('data-zs-theme', this.theme);
    root.setAttribute('data-zs-framework', this.framework);
    if (this.layout) root.setAttribute('data-zs-layout', this.layout);
    return root;
  };

  ZidanFieldBase.prototype.setTheme = function (name) {
    this.theme = pickList(name, THEMES, this.theme);
    if (this.root) this.root.setAttribute('data-zs-theme', this.theme);
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
      if (input && input.validity && !input.validity.valid) return this._messageFor(input);
    }
    return '';
  };

  ZidanFieldBase.prototype._evaluateError = function () {
    var custom = this._customError ? this._customError() : '';
    if (custom) return typeof custom === 'string' ? custom : this.opts.messages.generic;
    return this._nativeError();
  };

  ZidanFieldBase.prototype._syncDescribedBy = function () {
    if (!this.el || !this.el.getAttribute) return;
    var errorId = this.id + '-error';
    var hint = this.root && this.root.querySelector ? this.root.querySelector('.zs-field__hint[id]') : null;
    var hintId = hint ? hint.id : '';
    var targets = this.validationTargets();
    targets.forEach(function (input) {
      if (!input || !input.getAttribute) return;
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
        var message = self._evaluateError();
        if (message) self.setError(message);
        else self.setValidation('invalid');
      });
      self.on(input, 'blur', function () {
        self.touched = true;
        self._mirrorValidity();
      });
      self.on(input, 'input', function () { self._mirrorValidity(); });
      self.on(input, 'change', function () { self._mirrorValidity(); });
    });
    this.on(this.formEl, 'reset', function () {
      global.setTimeout(function () {
        if (self.destroyed) return;
        self.touched = false;
        self.errorMessage = null;
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
    var error = this._evaluateError();
    if (error) {
      if (this.touched || this.opts.alwaysValidate) this.setError(error);
      else this.setValidation('invalid');
      return this;
    }
    if (this.errorMessage) this.setError(null);
    if (this.validation === 'invalid') this.setValidation(null);
    return this;
  };

  ZidanFieldBase.prototype.validate = function () {
    this.touched = true;
    var error = this._evaluateError();
    if (error) {
      this.setError(error);
      return false;
    }
    this.setError(null);
    if (this.opts.showValidState) this.setValidation('valid');
    return true;
  };

  ZidanFieldBase.prototype.setValidation = function (state) {
    this.validation = VALIDATION_STATES.indexOf(state) === -1 ? null : state;
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
    this._listeners.forEach(function (entry) {
      entry[0].removeEventListener(entry[1], entry[2], entry[3]);
    });
    this._listeners.length = 0;
    if (this._teardown) this._teardown();
    this._cleanups.forEach(function (fn) { fn(); });
    this._cleanups.length = 0;
    this.emit('destroy', {});
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
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
      input.setAttribute('aria-describedby', this.id + '-hint');
      this._cleanups.push(function () { input.removeAttribute('aria-describedby'); });
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
      var result = this.opts.validate(this.el.checked, this);
      if (result === false) return this.opts.messages.generic;
      if (typeof result === 'string' && result) return result;
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
    ZidanFieldBase.call(this, target, options, 'radio-group');
    var variant = pickList(this.opts.variant || target.getAttribute('data-zidan-variant'), RADIO_VARIANTS, 'stacked');
    this.variant = variant;
    this.deselectable = fieldBool(target, this.opts, 'deselectable', 'deselectable', false);
    this.root = target;
    addClass(target, 'zs-radio-group');
    target.setAttribute('data-zs-kind', 'radio-group');
    target.setAttribute('data-zs-variant', variant);
    this._applyScope(target);
    if (!target.hasAttribute('role')) target.setAttribute('role', 'radiogroup');
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
        candidate.checked = false;
        self.update();
        self.emit('change', { value: '' });
        self.call('onChange', { value: '', instance: self });
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
      var result = this.opts.validate(this.getValue(), this);
      if (result === false) return this.opts.messages.generic;
      if (typeof result === 'string' && result) return result;
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
    return [file.name, file.size, file.lastModified || 0, file.type || ''].join('|');
  }

  function uploadErrorText(err, fallback) {
    if (err && typeof err === 'string') return err;
    if (err && err.message) return err.message;
    if (err && err.status) return 'Upload failed (HTTP ' + err.status + ').';
    return fallback || 'Upload failed.';
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
    this.withCredentials = fieldBool(input, opts, 'withCredentials', 'with-credentials', false);
    this.uploadHeaders = opts.uploadHeaders || opts.headers || null;
    this.simulateUpload = fieldBool(input, opts, 'simulateUpload', 'simulate-upload', false);
    this.simulateDuration = Math.max(120, fieldNumber(input, opts, 'simulateDuration', 'simulate-duration', 900));
    this.autoUpload = fieldBool(input, opts, 'autoUpload', 'auto-upload', true);
    this.showFileMeta = fieldBool(input, opts, 'showFileMeta', 'show-file-meta', true);
    this.showPreview = fieldBool(input, opts, 'showPreview', 'preview', true);
    this.hasUploader = !!(this.uploadHandler || this.uploadUrl || this.simulateUpload);
    root.setAttribute('data-zs-upload', this.hasUploader ? 'true' : 'false');

    this._uploads = Object.create(null);
    this._active = Object.create(null);
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

    self.on(clearBtn, 'click', function () { self.clear(); });

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
    this._render();
    this.emit('init', {});
    ZidanForm._register(this);
  }

  ZidanFileUpload.prototype = Object.create(ZidanFieldBase.prototype);
  ZidanFileUpload.prototype.constructor = ZidanFileUpload;

  ZidanFileUpload.prototype.getFiles = function () {
    return this.el.files ? Array.prototype.slice.call(this.el.files) : [];
  };

  ZidanFileUpload.prototype.getUploadState = function () {
    var self = this;
    return this.getFiles().map(function (file) {
      var state = self._stateFor(file, false) || { status: 'idle', progress: 0, error: '', result: null };
      return {
        file: file,
        name: file.name,
        size: file.size,
        status: state.status,
        progress: state.progress,
        error: state.error,
        result: state.result
      };
    });
  };

  ZidanFileUpload.prototype._stateFor = function (file, create) {
    var key = fileKey(file);
    var state = this._uploads[key];
    if (!state && create) {
      state = this._uploads[key] = {
        status: 'idle', progress: 0, error: '', result: null
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
    var index = typeof target === 'number' ? target : files.indexOf(target);
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
    return this;
  };

  ZidanFileUpload.prototype.clear = function () {
    this.cancelAll();
    this._uploads = Object.create(null);
    this.fileError = '';
    this.el.value = '';
    if (this.el.setCustomValidity) this.el.setCustomValidity('');
    this._validate();
    this._render();
    this.emit('change', { files: [] });
    this.emit('clear', {});
    this.call('onChange', { files: [], instance: this });
    return this;
  };

  ZidanFileUpload.prototype._limits = function () {
    var input = this.el;
    var opts = this.opts;
    var maxFiles = parseInt(opts.maxFiles || input.getAttribute('data-zidan-max-files'), 10);
    var maxSize = parseInt(opts.maxSize || input.getAttribute('data-zidan-max-size'), 10);
    if (!(maxSize > 0)) {
      var sizeMb = opts.maxSizeMB;
      if (sizeMb === undefined || sizeMb === null || sizeMb === '') sizeMb = input.getAttribute('data-zidan-max-size-mb');
      if (sizeMb !== null && sizeMb !== undefined && sizeMb !== '') {
        var sizeMbValue = parseFloat(sizeMb);
        if (sizeMbValue > 0) maxSize = Math.round(sizeMbValue * 1024 * 1024);
      }
    }
    return {
      maxFiles: maxFiles > 0 ? maxFiles : 0,
      maxSize: maxSize > 0 ? maxSize : 0,
      accept: opts.accept || input.accept || ''
    };
  };

  ZidanFileUpload.prototype._customError = function () {
    return this.fileError || '';
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
    if (input.setCustomValidity) input.setCustomValidity(error || '');
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
    this.clearBtn.hidden = files.length === 0;
    this.root.classList.toggle('zs-field--filled', files.length > 0);
    this.drop.classList.toggle('zs-file-drop--has-files', files.length > 0);

    var previewFile = this.showPreview ? files.filter(function (file) { return /^image\//.test(file.type); })[0] : null;
    if (previewFile) {
      var previewUrl = URL.createObjectURL(previewFile);
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
      var state = self._stateFor(file, false) || { status: 'idle', progress: 0, error: '', result: null };
      var item = el('li', 'zs-file-item');
      item.setAttribute('data-zs-upload-state', state.status);

      var thumb = el('span', 'zs-file-thumb');
      if (/^image\//.test(file.type)) {
        var url = URL.createObjectURL(file);
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
        }
        if (stateLine.textContent) meta.appendChild(stateLine);
      }

      var actions = el('span', 'zs-file-actions');
      if (state.status === 'uploading') {
        var cancel = el('button', 'zs-file-cancel', { type: 'button', 'aria-label': 'Cancel upload of ' + file.name });
        cancel.textContent = opts.cancelLabel || 'Cancel';
        self.on(cancel, 'click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          self.cancelUpload(file);
        });
        actions.appendChild(cancel);
      } else if (state.status === 'error' || state.status === 'canceled') {
        var retry = el('button', 'zs-file-retry', { type: 'button', 'aria-label': 'Retry upload of ' + file.name });
        retry.textContent = opts.retryLabel || 'Retry';
        self.on(retry, 'click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          self.retryUpload(file);
        });
        actions.appendChild(retry);
      }

      var remove = el('button', 'zs-file-remove', { type: 'button', 'aria-label': 'Remove ' + file.name });
      remove.textContent = '\u00d7';
      self.on(remove, 'click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        self.removeFile(file);
      });
      actions.appendChild(remove);

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
        var value = extra[key];
        if (value !== undefined && value !== null) data.append(key, value);
      });
    }
    return data;
  };

  ZidanFileUpload.prototype.uploadAll = function () {
    var self = this;
    if (!this.hasUploader) return this;
    if (!this._validate()) return this;
    this.getFiles().forEach(function (file) { self.uploadFile(file); });
    return this;
  };

  ZidanFileUpload.prototype.uploadFile = function (file) {
    var self = this;
    var key = fileKey(file);
    var state = this._stateFor(file, true);
    if (state.status === 'uploading' || state.status === 'done') return this;

    state.status = 'uploading';
    state.progress = 0;
    state.error = '';
    state.result = null;
    this._queueRender();
    this.emit('upload-start', { file: file, name: file.name, size: file.size });
    this.call('onUploadStart', { file: file, name: file.name, size: file.size, instance: this });

    if (this.uploadHandler) {
      var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      this._active[key] = {
        type: 'handler',
        abort: function () { if (controller) controller.abort(); }
      };
      var context = {
        file: file,
        field: this,
        formData: this._formData(file),
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
      var xhr = new global.XMLHttpRequest();
      this._active[key] = {
        type: 'xhr',
        abort: function () { try { xhr.abort(); } catch (err) { /* already done */ } }
      };
      xhr.open('POST', this.uploadUrl, true);
      if (this.withCredentials) xhr.withCredentials = true;
      var headers = typeof this.uploadHeaders === 'function' ? this.uploadHeaders(file, this) : this.uploadHeaders;
      if (headers && typeof headers === 'object') {
        Object.keys(headers).forEach(function (name) { xhr.setRequestHeader(name, headers[name]); });
      }
      xhr.upload.onprogress = function (event) {
        if (!event.lengthComputable) return;
        self._setProgress(file, Math.min(99, Math.round((event.loaded / event.total) * 100)));
      };
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          var body = xhr.responseText;
          try { body = JSON.parse(body); } catch (err) { /* plain text response */ }
          self._finish(file, body);
        } else {
          self._fail(file, { status: xhr.status, message: 'Upload failed (HTTP ' + xhr.status + ').' });
        }
      };
      xhr.onerror = function () { self._fail(file, { message: 'Network error while uploading.' }); };
      xhr.onabort = function () { self._canceledUpload(file); };
      xhr.send(this._formData(file));
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

    state.status = 'idle';
    this._queueRender();
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
    this.emit('upload-success', { file: file, name: file.name, result: state.result });
    this.call('onUploadSuccess', { file: file, name: file.name, result: state.result, instance: this });
    this.call('onUpload', { file: file, name: file.name, result: state.result, instance: this });
  };

  ZidanFileUpload.prototype._fail = function (file, err) {
    var state = this._stateFor(file, false);
    if (!state || state.status !== 'uploading') return;
    delete this._active[fileKey(file)];
    state.status = 'error';
    state.error = uploadErrorText(err, this.opts.messages.upload || 'Upload failed.');
    this._queueRender();
    this.emit('upload-error', { file: file, name: file.name, error: err, message: state.error });
    this.call('onUploadError', { file: file, name: file.name, error: err, message: state.error, instance: this });
  };

  ZidanFileUpload.prototype._canceledUpload = function (file) {
    var state = this._stateFor(file, false);
    if (!state || state.status !== 'uploading') return;
    delete this._active[fileKey(file)];
    state.status = 'canceled';
    state.progress = 0;
    state.error = '';
    this._queueRender();
    this.emit('upload-cancel', { file: file, name: file.name });
    this.call('onUploadCancel', { file: file, name: file.name, instance: this });
  };

  ZidanFileUpload.prototype.cancelUpload = function (file) {
    var key = fileKey(file);
    var active = this._active[key];
    if (active) {
      try { active.abort(); } catch (err) { /* already stopped */ }
      delete this._active[key];
    }
    this._canceledUpload(file);
    return this;
  };

  ZidanFileUpload.prototype.cancelAll = function () {
    var self = this;
    Object.keys(this._active).forEach(function (key) {
      try { self._active[key].abort(); } catch (err) { /* already stopped */ }
      delete self._active[key];
    });
    return this;
  };

  ZidanFileUpload.prototype.retryUpload = function (file) {
    var state = this._stateFor(file, false);
    if (!state) return this;
    state.status = 'idle';
    state.progress = 0;
    state.error = '';
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
      if (showCountry) {
        countrySelect = el('select', 'zs-phone-country', { 'aria-label': opts.phoneCountryLabel || 'Country code' });
        countryList.forEach(function (iso) {
          iso = String(iso).toUpperCase();
          var country = PHONE_COUNTRIES[iso];
          if (!country) return;
          var optionNode = el('option', null, { value: iso },
            (country.flag ? country.flag + ' ' : '') + iso + ' +' + country.dial);
          countrySelect.appendChild(optionNode);
        });
        countrySelect.value = phoneCountry;
        shell.appendChild(countrySelect);
        this.on(countrySelect, 'change', function () { self.setPhoneCountry(countrySelect.value); });
      }
      this.phone = {
        country: phoneCountry,
        format: phoneFormat,
        select: countrySelect,
        validate: phoneCfg.validate !== false,
        countries: countryList.slice()
      };
      root.classList.add('zs-field--phone');

      if (input.value) {
        var detected = detectPhoneCountry(input.value);
        if (detected && !phoneCfg.country && !input.getAttribute('data-zidan-phone-country')) {
          this.phone.country = detected;
          if (countrySelect) countrySelect.value = detected;
        }
        this._applyPhoneFormat(false);
      }
      this.on(input, 'input', function () { self._applyPhoneFormat(true); });
      this.on(input, 'focus', function () { self._applyPhoneFormat(true); });
      this.on(input, 'blur', function () { self._applyPhoneFormat(false); });
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
      var rangeScaleOn = fieldBool(input, opts, 'rangeMinMax', 'range-minmax', true);
      rangeWrap = el('div', 'zs-range');
      rangeWrap.setAttribute('data-zs-range', rangeVariant);
      if (rangeBubbleOn) {
        rangeBubble = el('output', 'zs-range-bubble', { for: this.id, 'aria-hidden': 'true' });
        rangeWrap.appendChild(rangeBubble);
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
      this.rangeTicksOption = fieldOption(input, opts, 'rangeTicks', 'range-ticks', 0);
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
    var pickerButton = fieldBool(input, opts, 'pickerButton', 'picker-button', false);
    if (isPicker && pickerButton && !iconControl) {
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
      var out = doc.querySelector(outputSelector);
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
  ZidanTextField.prototype._mirrorValidity = function () {
    var input = this.el;
    if (input.setCustomValidity) {
      var custom = this._customError();
      var message = typeof custom === 'string' ? custom : (custom ? this.opts.messages.generic : '');
      if (input.__zidanCustomError !== message) {
        input.setCustomValidity(message);
        input.__zidanCustomError = message;
      }
    }
    return ZidanFieldBase.prototype._mirrorValidity.call(this);
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

  ZidanTextField.prototype._renderRangeTicks = function () {
    if (!this.rangeTicksEl) return;
    var bounds = this._rangeBounds();
    var option = this.rangeTicksOption;
    var values = [];
    if (Array.isArray(option)) values = option.map(Number).filter(function (n) { return isFinite(n); });
    else {
      var count = parseInt(option, 10);
      if (!(count > 1)) return;
      for (var i = 0; i < count; i += 1) values.push(bounds.min + ((bounds.max - bounds.min) * i) / (count - 1));
    }
    this.rangeTicksEl.textContent = '';
    values.forEach(function (value) {
      var pct = bounds.max > bounds.min ? (value - bounds.min) / (bounds.max - bounds.min) : 0;
      var tick = el('span', 'zs-range-tick');
      tick.style.left = (clamp(pct, 0, 1) * 100).toFixed(2) + '%';
      if (this.rangeTickLabels) {
        var label = this.rangeLabelMap && this.rangeLabelMap[value] !== undefined
          ? this.rangeLabelMap[value]
          : this._formatRangeValue(value);
        tick.textContent = label;
        tick.classList.add('zs-range-tick--labeled');
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
    if (this.rangeBubble) this.rangeBubble.textContent = this._formatRangeValue(numeric);
    if (this.rangeScale) {
      this.rangeScale.firstChild.textContent = this._formatRangeValue(bounds.min);
      this.rangeScale.lastChild.textContent = this._formatRangeValue(bounds.max);
    }
    var signature = [bounds.min, bounds.max, this.el.step, JSON.stringify(this.rangeTicksOption), this.rangeTickLabels].join('|');
    if (signature !== this.rangeSignature) {
      this.rangeSignature = signature;
      this._renderRangeTicks();
    }
  };

  ZidanTextField.prototype._syncRangeOutput = function (value) {
    if (this.range) this._syncRange(value);
    if (this.rangeOutput) {
      this.rangeOutput.textContent = value;
      this.rangeOutput.value = value;
    }
  };

  ZidanTextField.prototype._applyPhoneFormat = function (preserveCaret) {
    if (!this.phone) return this;
    var input = this.el;
    var raw = input.value;
    if (!digitsOnly(raw)) {
      if (raw && /\+/.test(raw)) input.value = '+';
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
        var dateResult = opts.validateDate(input.value, date, this);
        if (dateResult === false) return messages.date;
        if (typeof dateResult === 'string' && dateResult) return dateResult;
      }
    }

    if (typeof opts.validate === 'function') {
      var result = opts.validate(input.value, this);
      if (result === false) return messages.generic;
      if (typeof result === 'string' && result) return result;
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
    if (this.stepper) {
      var min = parseFloat(input.min);
      var max = parseFloat(input.max);
      var current = parseFloat(value);
      if (!isFinite(current)) current = isFinite(min) ? min : 0;
      var blocked = !!input.disabled || !!input.readOnly;
      this.stepper.minus.disabled = blocked || (!this.stepper.wrap && isFinite(min) && current <= min);
      this.stepper.plus.disabled = blocked || (!this.stepper.wrap && isFinite(max) && current >= max);
    }
  };

  ZidanTextField.prototype.getValue = function () {
    return this.el.value;
  };

  ZidanTextField.prototype.setValue = function (value) {
    this.el.value = value === null || value === undefined ? '' : String(value);
    if (this.phone) this._applyPhoneFormat(false);
    return this.update();
  };

  ZidanTextField.prototype._teardown = function () {
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
    return null;
  }

  function createField(node, kind, options) {
    var opts = options || {};
    if (node.__zidanField && !opts.force) return node.__zidanField;
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
      if (node.__zidanField) return;
      var kind = fieldKindFor(node);
      // zidanField() accepts a plain input/textarea too, so JS-only options
      // (output, counter, clearable, …) work without a data attribute
      if (!kind && typeof TEXT_TYPES !== 'undefined' && (node.tagName === 'TEXTAREA' ||
        (node.tagName === 'INPUT' && TEXT_TYPES.indexOf(String(node.type).toLowerCase()) !== -1))) {
        kind = node.tagName === 'TEXTAREA' ? 'textarea' : 'input';
      }
      if (!kind) return;
      if (kind === 'radio' && !node.hasAttribute('data-zidan-radio')) {
        kind = 'radio-group';
      }
      var instance = createField(node, kind, options || {});
      if (instance) created.push(instance);
    });
    return created.length === 1 ? created[0] : created;
  }

  function initZidanForms(container, options) {
    var scope = container || doc;
    if (!scope || !scope.querySelectorAll) return [];
    var nodes = Array.prototype.slice.call(scope.querySelectorAll(FIELDS_SELECTOR));
    if (isElement(scope) && scope.matches && scope.matches(FIELDS_SELECTOR)) nodes.unshift(scope);
    var instances = [];
    nodes.forEach(function (node) {
      if (node.__zidanField) return;
      var kind = fieldKindFor(node);
      if (!kind) return;
      if (kind === 'radio') kind = 'radio-group';
      var instance = createField(node, kind, options || {});
      if (instance) instances.push(instance);
    });
    return instances;
  }

  var ZidanForm = {
    version: VERSION,
    __zidanFormGuard: VERSION,
    // live registries: pushing a name here makes it a valid theme/layout
    themes: THEMES,
    frameworks: FRAMEWORKS.slice(),
    fieldLayouts: FIELD_LAYOUTS,
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
    refresh: function (scope) {
      initZidanForms(scope || doc, {});
      ZidanForm.fields.slice().forEach(function (field) { field.update(); });
      return ZidanForm.fields.slice();
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
    ZidanSelect.get = function (target) {
      var element = typeof target === 'string' ? doc.querySelector(target) : target;
      if (!isElement(element)) return null;
      return element.__zidanSelect || null;
    };
    ZidanSelect.instances = [];
    ZidanSelect.destroyAll = function () {
      ZidanSelect.instances.slice().forEach(function (instance) { instance.destroy(); });
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

  function initZidanSelects(container, options) {
    var scope = container || doc;
    if (!scope || !scope.querySelectorAll) return [];
    var nodes = Array.prototype.slice.call(scope.querySelectorAll('[data-zidan-select]'));
    if (isElement(scope) && scope.hasAttribute('data-zidan-select')) nodes.unshift(scope);
    return nodes
      .filter(function (node) { return !node.__zidanSelect; })
      .map(function (node) {
        ZidanSelect.instances.push(new ZidanSelect(node, options || {}));
        return node.__zidanSelect;
      });
  }

  function autoInit() {
    if (!doc) return;
    var config = global.ZIDAN_SELECT_CONFIG || {};
    if (config.autoInit === false) return;
    if (global.ZidanSelect && global.ZidanSelect.autoInit === false) return;
    if (doc.documentElement.getAttribute('data-zidan-auto-init') === 'false') return;
    if (config.selector) {
      if (typeof ZidanSelect === 'undefined') return;
      Array.prototype.slice.call(doc.querySelectorAll(config.selector)).forEach(function (node) {
        if (node.__zidanSelect) return;
        ZidanSelect.instances.push(new ZidanSelect(node, config.options || {}));
      });
      return;
    }
    if (typeof ZidanSelect !== 'undefined') initZidanSelects(doc, config.options || {});
    initZidanForms(doc, config.fields || {});
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

  ZidanForm.api = api;

  return api;
});
