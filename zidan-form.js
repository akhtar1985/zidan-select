/*!
 * ZidanForm v2.0.0
 * Zero-dependency form enhancement library: select / combobox / tags,
 * checkboxes, switches, radio groups, file upload with drag & drop, and
 * text inputs / textarea. Structure and theming are split into
 * plugin-core.css and plugin-theme.css.
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
    window.ZidanSelect = api.ZidanSelect;
    window.zidanSelect = api.zidanSelect;
    window.initZidanSelects = api.initZidanSelects;
    window.zidanField = api.zidanField;
    window.initZidanForms = api.initZidanForms;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this, function (global) {
  'use strict';

  var VERSION = '2.0.0';

  // Loading the file twice (classic script + module wrapper, or two bundles)
  // must not replace the classes and orphan the live instances.
  if (global && global.ZidanForm && global.ZidanForm.__zidanFormGuard === VERSION) {
    return global.ZidanForm.api;
  }

  var doc = typeof document !== 'undefined' ? document : null;

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

  /* ================================================================== *
   * Part 2 — opt-in form fields
   *
   * The real control always stays in the DOM (1×1px, never display:none),
   * so FormData, form.reset(), constraint validation and jQuery Validation's
   * ":hidden" ignore all keep working. Wrappers only mirror its state.
   * ================================================================== */

  var VALIDATION_STATES = ['valid', 'invalid'];
  var CHECKBOX_VARIANTS = ['default', 'switch', 'card'];
  var RADIO_VARIANTS = ['stacked', 'inline', 'card'];

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
    this.id = target.id || (target.id = uid('zf'));
    this.root = null;
    this.touched = false;
    this.validation = null;
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

  /* mirror native constraint validity into classes and aria-invalid */
  ZidanFieldBase.prototype._bindValidity = function () {
    var self = this;
    this.validationTargets().forEach(function (input) {
      self.on(input, 'invalid', function () {
        self.touched = true;
        self.setValidation('invalid');
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
        self.setValidation(null);
        self.update();
      }, 0);
    });
    var preset = this.opts.validation || this.el.getAttribute('data-zidan-validation') ||
      this.el.getAttribute('data-zs-validation');
    if (preset === 'valid' || preset === 'invalid') this.setValidation(preset);
  };

  ZidanFieldBase.prototype._mirrorValidity = function () {
    var target = this.el;
    if (!target || !target.validity) return this;
    if (target.validity.valid) {
      if (this.validation === 'invalid') this.setValidation(null);
      return this;
    }
    if (this.touched || this.opts.alwaysValidate) this.setValidation('invalid');
    return this;
  };

  ZidanFieldBase.prototype.setValidation = function (state) {
    this.validation = VALIDATION_STATES.indexOf(state) === -1 ? null : state;
    if (this.root) {
      this.root.classList.toggle('zs-field--invalid', this.validation === 'invalid');
      this.root.classList.toggle('zs-field--valid', this.validation === 'valid');
      if (this.validation) this.root.setAttribute('data-zs-validation', this.validation);
      else this.root.removeAttribute('data-zs-validation');
    }
    this.validationTargets().forEach(function (input) {
      if (state === 'invalid') input.setAttribute('aria-invalid', 'true');
      else if (state === 'valid') input.setAttribute('aria-invalid', 'false');
      else input.removeAttribute('aria-invalid');
    });
    this.emit('validation', { state: this.validation });
    this.call('onValidation', { state: this.validation, instance: this });
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
    var text = el('span', 'zs-check-label');
    text.textContent = labelText || '';

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

  ZidanCheckbox.prototype.isChecked = function () {
    return !!this.el.checked;
  };

  ZidanCheckbox.prototype._teardown = function () {
    if (this._restoreInput) this._restoreInput();
  };

  /* ---------------- radio group ---------------- */

  function ZidanRadioGroup(target, options) {
    if (!(this instanceof ZidanRadioGroup)) return new ZidanRadioGroup(target, options);
    ZidanFieldBase.call(this, target, options, 'radio-group');
    var variant = pickList(this.opts.variant || target.getAttribute('data-zidan-variant'), RADIO_VARIANTS, 'stacked');
    this.variant = variant;
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

  function ZidanFileUpload(target, options) {
    if (!(this instanceof ZidanFileUpload)) return new ZidanFileUpload(target, options);
    if (!/^file$/i.test(target.type)) {
      throw new Error('ZidanFileUpload: expected an <input type="file">.');
    }
    ZidanFieldBase.call(this, target, options, 'file');
    var self = this;
    var input = target;
    var opts = this.opts;

    var originalParent = input.parentNode;
    var originalNext = input.nextSibling;
    var root = this._scope('file');
    originalParent.insertBefore(root, input);

    var drop = doc.createElement('label');
    drop.className = 'zs-file-drop';
    drop.setAttribute('for', this.id);

    var icon = el('span', 'zs-file-icon', { 'aria-hidden': 'true' });
    var title = el('span', 'zs-file-drop-title', null,
      opts.title || input.getAttribute('data-zidan-title') || 'Choose a file');
    var hint = el('span', 'zs-file-drop-hint', null,
      opts.dropHint || input.getAttribute('data-zidan-drop-hint') ||
      (input.multiple ? 'or drag files here — multiple allowed' : 'or drag it here'));
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
    if (acceptHint) {
      hint.textContent = hint.textContent + ' · ' + acceptHint;
    }

    this.drop = drop;
    this.list = list;
    this.status = status;
    this.clearBtn = clearBtn;
    this._urls = [];
    this._restoreInput = function () {
      var parent = root.parentNode || originalParent;
      parent.insertBefore(input, root.parentNode ? root : null);
      input.classList.remove('zs-native-input', 'zs-file-input');
    };

    addClass(input, 'zs-native-input');
    addClass(input, 'zs-file-input');

    this.on(input, 'change', function () {
      self._validate();
      self._render();
      self.emit('change', { files: self.getFiles() });
      self.call('onChange', { files: self.getFiles(), instance: self });
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
      self._applyFiles(incoming, true);
    });

    self.on(clearBtn, 'click', function () {
      input.value = '';
      self._validate();
      self._render();
      self.emit('change', { files: [] });
    });

    this._bindValidity();
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

  ZidanFileUpload.prototype._applyFiles = function (files, fromDrop) {
    var dt = new DataTransfer();
    files.forEach(function (file) { dt.items.add(file); });
    this.el.files = dt.files;
    if (fromDrop) {
      this.el.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      this._validate();
      this._render();
    }
  };

  ZidanFileUpload.prototype._validate = function () {
    var input = this.el;
    var opts = this.opts;
    var files = this.getFiles();
    var maxFiles = parseInt(opts.maxFiles || input.getAttribute('data-zidan-max-files'), 10);
    var maxSize = parseInt(opts.maxSize || input.getAttribute('data-zidan-max-size'), 10);
    if (!(maxSize > 0)) {
      var sizeMb = opts.maxSizeMB;
      if (sizeMb === undefined || sizeMb === null || sizeMb === '') {
        sizeMb = input.getAttribute('data-zidan-max-size-mb');
      }
      if (sizeMb !== null && sizeMb !== undefined && sizeMb !== '') {
        var sizeMbValue = parseFloat(sizeMb);
        if (sizeMbValue > 0) maxSize = Math.round(sizeMbValue * 1024 * 1024);
      }
    }
    var accept = opts.accept || input.accept;
    var error = '';

    if (maxFiles && files.length > maxFiles) {
      error = 'Too many files — ' + maxFiles + ' maximum.';
      files = files.slice(0, maxFiles);
      this._applyFiles(files, false);
    }
    if (!error && maxSize) {
      for (var i = 0; i < files.length; i += 1) {
        if (files[i].size > maxSize) {
          error = '"' + files[i].name + '" is ' + formatBytes(files[i].size) + ' — limit ' + formatBytes(maxSize) + '.';
          break;
        }
      }
    }
    if (!error && accept) {
      for (var j = 0; j < files.length; j += 1) {
        if (!matchesAccept(files[j], accept)) {
          error = '"' + files[j].name + '" is not an allowed type (' + accept + ').';
          break;
        }
      }
    }

    this.root.classList.toggle('zs-field--invalid', !!error);
    if (error) this.el.setAttribute('aria-invalid', 'true');
    else if (this.validation !== 'invalid') this.el.removeAttribute('aria-invalid');
    this.drop.classList.toggle('zs-file-drop--invalid', !!error);
    this.status.textContent = error || '';
    this.status.classList.toggle('zs-file-status--error', !!error);
    this.emit('validation', { state: error ? 'invalid' : this.validation, message: error });
    return !error;
  };

  ZidanFileUpload.prototype._sync = function () {
    this._render();
  };

  ZidanFileUpload.prototype._render = function () {
    var self = this;
    var files = this.getFiles();
    // detach first, then revoke a tick later: revoking a blob that a live
    // <img> still points at (or that is mid-decode) makes the browser raise a
    // failed-resource error
    this.list.textContent = '';
    this._revokeLater(this._urls);
    this._urls = [];
    this.list.hidden = files.length === 0;
    this.clearBtn.hidden = files.length === 0;
    this.root.classList.toggle('zs-field--filled', files.length > 0);
    if (!this.status.textContent) {
      this.status.textContent = files.length
        ? files.length + (files.length === 1 ? ' file selected' : ' files selected') + ' · ' + formatBytes(files.reduce(function (total, file) { return total + file.size; }, 0))
        : '';
    }

    files.forEach(function (file, index) {
      var item = el('li', 'zs-file-item');
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
      var size = el('span', 'zs-file-size', null, formatBytes(file.size) + (file.type ? ' · ' + file.type : ''));
      meta.appendChild(name);
      meta.appendChild(size);

      var remove = el('button', 'zs-file-remove', {
        type: 'button',
        'aria-label': 'Remove ' + file.name
      });
      remove.textContent = '\u00d7';
      self.on(remove, 'click', function () {
        var next = self.getFiles().filter(function (candidate, position) { return position !== index; });
        self._applyFiles(next, false);
        self.emit('remove', { file: file });
        self.call('onRemove', { file: file, instance: self });
      });

      item.appendChild(thumb);
      item.appendChild(meta);
      item.appendChild(remove);
      self.list.appendChild(item);
    });
  };

  ZidanFileUpload.prototype.clear = function () {
    this.el.value = '';
    this._validate();
    this._render();
    return this;
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
    this._revokeLater(this._urls);
    this._urls = [];
    if (this._restoreInput) this._restoreInput();
  };

  /* ---------------- text inputs & textarea ---------------- */

  var TEXT_TYPES = ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local', 'month', 'week', 'range', 'color'];

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

    var originalParent = input.parentNode;
    var originalNext = input.nextSibling;
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

    var prefixText = opts.prefix || input.getAttribute('data-zidan-prefix');
    if (prefixText) {
      shell.appendChild(el('span', 'zs-input-prefix', { 'aria-hidden': 'true' }, prefixText));
    }

    shell.appendChild(input);

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
      if (hintText) {
        input.setAttribute('aria-describedby', this.id + '-hint');
        this._cleanups.push(function () { input.removeAttribute('aria-describedby'); });
      }
    }

    this.label = label;
    this.shell = shell;
    this.clear = clear;
    this.counter = counter;
    this.counterMax = counterMax;
    this._restoreInput = function () {
      var parent = root.parentNode || originalParent;
      parent.insertBefore(input, root.parentNode ? root : null);
      input.classList.remove('zs-input-native');
    };

    addClass(input, 'zs-input-native');
    addClass(root, 'zs-field--' + layout);

    var outputSelector = opts.output || input.getAttribute('data-zidan-output');
    if (type === 'range' && outputSelector) {
      var out = doc.querySelector(outputSelector);
      if (out) {
        var syncOut = function () {
          out.textContent = input.value;
          out.value = input.value;
        };
        syncOut();
        this.on(input, 'input', syncOut);
      }
    }

    this.on(input, 'input', function () { self.update(); });
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
    this.emit('init', { type: type });
    this.call('onInit', { instance: this, type: type });
    ZidanForm._register(this);
  }

  ZidanTextField.prototype = Object.create(ZidanFieldBase.prototype);
  ZidanTextField.prototype.constructor = ZidanTextField;

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
  };

  ZidanTextField.prototype.getValue = function () {
    return this.el.value;
  };

  ZidanTextField.prototype.setValue = function (value) {
    this.el.value = value === null || value === undefined ? '' : String(value);
    return this.update();
  };

  ZidanTextField.prototype._teardown = function () {
    if (this._restoreInput) this._restoreInput();
  };

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
      case 'checkbox': return new ZidanCheckbox(node, opts);
      case 'radio': return new ZidanRadioGroup(node, opts);
      case 'radio-group': return new ZidanRadioGroup(node, opts);
      case 'file': return new ZidanFileUpload(node, opts);
      case 'input':
      case 'textarea':
        return new ZidanTextField(node, opts);
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
      if (!kind && (node.tagName === 'TEXTAREA' ||
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
      if (ZidanSelect && ZidanSelect.destroyAll) ZidanSelect.destroyAll();
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
        ZidanSelect.instances.slice().forEach(function (instance) {
          if (!instance.el.isConnected) instance.destroy();
        });
      });
      observer.observe(root, { childList: true, subtree: true });
      return observer;
    }
  };

  ZidanForm.api = null;

  /* static helpers */
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
      Array.prototype.slice.call(doc.querySelectorAll(config.selector)).forEach(function (node) {
        if (node.__zidanSelect) return;
        ZidanSelect.instances.push(new ZidanSelect(node, config.options || {}));
      });
      return;
    }
    initZidanSelects(doc, config.options || {});
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
    ZidanSelect: ZidanSelect,
    ZidanCheckbox: ZidanCheckbox,
    ZidanRadioGroup: ZidanRadioGroup,
    ZidanFileUpload: ZidanFileUpload,
    ZidanTextField: ZidanTextField,
    zidanSelect: zidanSelect,
    zidanField: zidanField,
    initZidanSelects: initZidanSelects,
    initZidanForms: initZidanForms
  };

  ZidanForm.api = api;

  return api;
});
