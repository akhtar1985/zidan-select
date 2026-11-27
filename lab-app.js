/* Testing lab — live harness for every option, method, event and CSS name.
   The inventory comes from lab-inventory.js (generated from the plugin source),
   so this file never hard-codes what the plugin exposes. */
(function () {
  'use strict';

  var INV = window.ZIDAN_LAB_INVENTORY;
  var BUNDLE = window.ZIDAN_LAB_BUNDLE || 'full';
  var ASSETS = window.ZIDAN_LAB_ASSETS || {};
  var BUNDLES = window.ZIDAN_LAB_BUNDLES || {};
  var form = window.ZidanForm;
  var core = (form && form.api) || window;

  var byId = function (id) { return document.getElementById(id); };
  var noop = function () {};

  function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  /* ---------------- boot ---------------- */

  if (!INV) {
    byId('lab-runtime').textContent =
      'lab-inventory.js is missing — run `npm run lab:inventory` first.';
    byId('lab-runtime').className = 'lab-status lab-status--bad';
    return;
  }

  var runtime = {
    form: form,
    select: core.ZidanSelect || window.ZidanSelect || null,
    fieldBase: core.ZidanFieldBase || window.ZidanFieldBase || null,
    checkbox: core.ZidanCheckbox || window.ZidanCheckbox || null,
    radio: core.ZidanRadioGroup || window.ZidanRadioGroup || null,
    file: core.ZidanFileUpload || window.ZidanFileUpload || null,
    text: core.ZidanTextField || window.ZidanTextField || null,
    zidanSelect: core.zidanSelect || window.zidanSelect || null,
    zidanField: core.zidanField || window.zidanField || null,
    registerIcon: core.registerIcon || window.registerZidanIcon || null
  };
  var hasFields = !!(runtime.checkbox || runtime.radio || runtime.file || runtime.text);

  var logEl = byId('lab-results');

  var GROUPS = [
    { key: 'selectOptions', label: 'Select options', items: INV.select.coreOptions },
    { key: 'selectCallbacks', label: 'Select callbacks', items: INV.select.callbacks },
    { key: 'selectMethods', label: 'Select methods', items: INV.select.methods },
    { key: 'fieldOptions', label: 'Field options', items: INV.field.options },
    { key: 'fieldCallbacks', label: 'Field callbacks', items: INV.field.callbacks },
    { key: 'fieldMethods', label: 'Field methods', items: INV.field.methods },
    { key: 'formMethods', label: 'ZidanForm helpers', items: INV.form.methods },
    { key: 'events', label: 'zidan:* events', items: INV.events },
    { key: 'cssTokens', label: 'CSS tokens', items: INV.css.tokens },
    { key: 'cssClasses', label: 'CSS classes', items: INV.css.classes }
  ];

  var state = {
    tested: {},
    outcome: {},   // group -> { name: 'ok' | 'warn' | 'bad' }
    eventsSeen: {},
    configured: {}, // name -> true, options explicitly passed
    callbacks: {},
    bugs: []
  };
  GROUPS.forEach(function (group) {
    state.tested[group.key] = {};
    state.outcome[group.key] = {};
  });
  /* exposed for the smoke test and the browser console */
  window.ZIDAN_LAB_STATE = state;

  function mark(group, name) {
    if (!state.tested[group]) state.tested[group] = {};
    state.tested[group][name] = true;
  }

  function markOutcome(group, name, outcome) {
    if (!state.outcome[group]) state.outcome[group] = {};
    state.outcome[group][name] = outcome;
  }

  function markAll(group, names) {
    (names || []).forEach(function (name) { mark(group, name); });
  }

  function markConfigured(options) {
    Object.keys(options || {}).forEach(function (key) {
      if (options[key] !== undefined) {
        state.configured[key] = true;
        mark('selectOptions', key);
        mark('fieldOptions', key);
      }
    });
  }

  function log(kind, tag, message) {
    if (!logEl) return;
    var li = make('li', 'is-' + kind);
    var time = make('time', null, new Date().toLocaleTimeString([], { hour12: false }));
    var name = make('span', 'lab-log-tag', tag);
    var text = make('span', null, message);
    li.appendChild(time);
    li.appendChild(name);
    li.appendChild(text);
    logEl.appendChild(li);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function recordBug(name, detail) {
    state.bugs.push({ name: name, detail: detail });
    log('bad', 'BUG', name + (detail ? ' — ' + detail : ''));
  }

  function describe(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (Array.isArray(value)) return '[' + value.map(describe).join(', ') + ']';
    if (typeof value === 'object') {
      if (typeof value.nodeType === 'number') return '<' + String(value.tagName || 'node').toLowerCase() + '>';
      if (typeof value.length === 'number' && typeof value.slice === 'function') {
        return '[' + Array.prototype.slice.call(value, 0, 4).map(describe).join(', ') + ']';
      }
      try { return JSON.stringify(value); } catch (error) { return '[object]'; }
    }
    return String(value);
  }

  function safe(fn) {
    try {
      return { ok: true, value: fn() };
    } catch (error) {
      return { ok: false, error: error };
    }
  }
/* ---------------- offline fetch so declarative AJAX is testable ---------------- */

  var labRequests = [];
  var realFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  window.fetch = function (input, init) {
    var url = String(input && input.url ? input.url : input);
    if (url.indexOf('lab.zidan.test') === -1) {
      return realFetch ? realFetch(input, init)
        : Promise.reject(new Error('fetch() is not available in this browser.'));
    }
    var parsed = new URL(url, location.href);
    var headers = {};
    if (init && init.headers) {
      if (typeof init.headers.forEach === 'function' && !Array.isArray(init.headers)) {
        init.headers.forEach(function (value, key) { headers[key] = value; });
      } else {
        headers = init.headers;
      }
    }
    labRequests.push({
      method: (init && init.method) || 'GET',
      url: parsed.toString(),
      headers: headers,
      body: init && init.body !== undefined ? String(init.body) : null
    });
    var page = Number(parsed.searchParams.get('page') || '1');
    var limit = Number(parsed.searchParams.get('limit') || '5');
    var query = parsed.searchParams.get('q') || '';
    var rows = [];
    for (var index = 0; index < limit; index += 1) {
      var number = (page - 1) * limit + index + 1;
      rows.push({ id: number, name: query ? query + ' ' + number : 'Item ' + number, title: 'Item ' + number });
    }
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: function () {
        return Promise.resolve({
          items: rows,
          total: 42,
          hasMore: page * limit < 42,
          echo: { q: query, page: page }
        });
      }
    });
  };

  /* ---------------- coverage board ---------------- */

  function groupStats(key) {
    var group = GROUPS.filter(function (entry) { return entry.key === key; })[0];
    if (!group) return { done: 0, total: 0, pct: 0 };
    var total = group.items.length;
    var done = group.items.filter(function (name) { return state.tested[key] && state.tested[key][name]; }).length;
    return { done: done, total: total, pct: total ? Math.round(done / total * 100) : 0 };
  }

  function pill(node, stats) {
    if (!node) return;
    node.textContent = stats.done + '/' + stats.total + ' · ' + stats.pct + '%';
    node.className = 'lab-pill ' + (stats.pct === 100 ? 'is-ok' : stats.pct > 0 ? 'is-warn' : '');
  }

  function renderCoverage() {
    var host = byId('lab-coverage-groups');
    if (!host) return;
    host.innerHTML = '';
    var total = 0;
    var done = 0;

    GROUPS.forEach(function (group) {
      var items = group.items || [];
      var exercised = items.filter(function (name) { return state.tested[group.key][name]; });
      total += items.length;
      done += exercised.length;

      var box = make('div', 'lab-group');
      var head = make('h3');
      head.appendChild(document.createTextNode(group.label));
      head.appendChild(make('span', null,
        exercised.length + '/' + items.length + ' · ' +
        (items.length ? Math.round(exercised.length / items.length * 100) : 0) + '%'));
      box.appendChild(head);

      var bar = make('div', 'lab-bar');
      var fill = make('i');
      fill.style.width = (items.length ? Math.round(exercised.length / items.length * 100) : 0) + '%';
      bar.appendChild(fill);
      box.appendChild(bar);

      var list = make('div', 'lab-items');
      items.forEach(function (name) {
        var outcome = state.outcome[group.key] && state.outcome[group.key][name];
        var cls = 'lab-item';
        if (state.tested[group.key][name]) cls += ' is-ok';
        if (outcome === 'bad' || outcome === 'warn') cls += ' is-warn';
        list.appendChild(make('span', cls, name));
      });
      box.appendChild(list);
      host.appendChild(box);
    });

    var pct = total ? Math.round(done / total * 100) : 0;
    var score = byId('lab-score');
    if (score) {
      score.textContent = pct + '% · ' + done + '/' + total;
      score.className = 'lab-pill ' + (pct === 100 ? 'is-ok' : pct > 0 ? 'is-warn' : '');
    }

    pill(byId('lab-select-pill'), groupStats('selectOptions'));
    pill(byId('lab-field-pill'), groupStats('fieldOptions'));
    pill(byId('lab-method-pill'), {
      done: groupStats('selectMethods').done + groupStats('fieldMethods').done,
      total: groupStats('selectMethods').total + groupStats('fieldMethods').total,
      pct: Math.round(
        (groupStats('selectMethods').done + groupStats('fieldMethods').done) /
        Math.max(1, groupStats('selectMethods').total + groupStats('fieldMethods').total) * 100)
    });
    pill(byId('lab-event-pill'), groupStats('events'));
    pill(byId('lab-css-pill'), {
      done: groupStats('cssTokens').done + groupStats('cssClasses').done,
      total: groupStats('cssTokens').total + groupStats('cssClasses').total,
      pct: Math.round(
        (groupStats('cssTokens').done + groupStats('cssClasses').done) /
        Math.max(1, groupStats('cssTokens').total + groupStats('cssClasses').total) * 100)
    });
    pill(byId('lab-form-pill'), {
      done: groupStats('selectCallbacks').done + groupStats('fieldCallbacks').done,
      total: groupStats('selectCallbacks').total + groupStats('fieldCallbacks').total,
      pct: Math.round(
        (groupStats('selectCallbacks').done + groupStats('fieldCallbacks').done) /
        Math.max(1, groupStats('selectCallbacks').total + groupStats('fieldCallbacks').total) * 100)
    });
  }
/* ---------------- runtime banner + version/docs audit ---------------- */

  var auditState = {};

  function setAudit(id, status, label, detail) {
    auditState[id] = { status: status, label: label, detail: detail || '' };
    renderAudit();
  }

  function renderAudit() {
    var host = byId('lab-audit');
    if (!host) return;
    host.innerHTML = '';
    var worst = 'ok';
    Object.keys(auditState).forEach(function (id) {
      var item = auditState[id];
      var li = make('li', 'is-' + item.status);
      var text = make('span');
      text.textContent = item.label + (item.detail ? ' — ' + item.detail : '');
      li.appendChild(text);
      host.appendChild(li);
      if (item.status === 'bad') worst = 'bad';
      else if (item.status === 'warn' && worst !== 'bad') worst = 'warn';
    });
    var pillNode = byId('lab-audit-pill');
    if (pillNode) {
      pillNode.textContent = worst === 'ok' ? 'all clear' : worst === 'warn' ? 'warnings' : 'failures';
      pillNode.className = 'lab-pill ' + (worst === 'ok' ? 'is-ok' : worst === 'warn' ? 'is-warn' : 'is-bad');
    }
  }

  function sheetLoaded(file) {
    var name = String(file).split('/').pop();
    var linked = Array.prototype.some.call(document.styleSheets, function (sheet) {
      return sheet.href && sheet.href.indexOf(name) !== -1;
    });
    if (linked) return true;
    /* jsdom (and some CSP setups) expose cssRules but leave sheet.href empty,
       so fall back to the <link> the lab inserted for this bundle */
    return Array.prototype.some.call(
      document.querySelectorAll('link[rel="stylesheet"]'),
      function (link) {
        return (link.getAttribute('href') || '').indexOf(name) !== -1;
      }
    );
  }

  var bundleInfo = BUNDLES[BUNDLE] || { label: BUNDLE, core: ASSETS.core, theme: ASSETS.theme, js: ASSETS.js };
  var runtimeLine = byId('lab-runtime');
  if (runtimeLine) {
    runtimeLine.textContent = bundleInfo.label + ' · ' + (ASSETS.js || '?') +
      ' · ZidanForm ' + ((form && form.version) || 'missing') +
      (form ? '' : ' — the build did not load (run npm run build for the subset bundles)');
    runtimeLine.className = 'lab-status' + (form ? '' : ' lab-status--bad');
    var labelNode = byId('lab-bundle-label');
    if (labelNode) labelNode.textContent = bundleInfo.label;
    Array.prototype.forEach.call(document.querySelectorAll('.lab-bundle'), function (link) {
      if (link.getAttribute('data-bundle') === BUNDLE) link.classList.add('is-active');
    });
  }

  setAudit('bundle', 'ok', 'Build under test', bundleInfo.label + ' (' + (ASSETS.js || '?') + ')');

  if (!form) {
    setAudit('api', 'bad', 'window.ZidanForm', 'missing — the selected bundle did not load');
  } else {
    setAudit('api', 'ok', 'window.ZidanForm', 'v' + form.version +
      ' · api: ' + (runtime.select ? 'select ' : '') + (hasFields ? 'fields ' : '') +
      (runtime.zidanField ? 'zidanField' : 'no field factory'));
  }

  var versionOk = form && form.version === INV.version &&
    (!runtime.select || runtime.select.version === INV.version);
  setAudit('version', versionOk ? 'ok' : 'bad', 'Runtime version = inventory version',
    'runtime ' + ((form && form.version) || '?') + ' · inventory ' + INV.version);

  setAudit('css-core', sheetLoaded(ASSETS.core) ? 'ok' : 'bad', 'Core stylesheet', ASSETS.core || '?');
  setAudit('css-theme', sheetLoaded(ASSETS.theme) ? 'ok' : 'bad', 'Theme stylesheet', ASSETS.theme || '?');

  setAudit('inventory', (INV.select.options.length && INV.field.options.length && INV.events.length)
    ? 'ok' : 'bad', 'Generated inventory',
    INV.select.options.length + ' select options · ' + INV.field.options.length + ' field options · ' +
    INV.events.length + ' events · ' + INV.css.tokens.length + ' tokens');

  var expectSelect = BUNDLE !== 'file';
  var expectFields = BUNDLE !== 'select';
  setAudit('surface-select', (!!runtime.select === expectSelect) ? 'ok' : 'warn',
    'Select API', runtime.select ? 'present' : 'absent');
  setAudit('surface-fields', (hasFields === expectFields) ? 'ok' : 'warn',
    'Field API plus factories',
    hasFields
      ? ['checkbox', 'radio', 'file', 'text']
        .filter(function (name) { return !!runtime[name]; })
        .join(', ') || 'present'
      : 'absent');

  var staticDrift = [];
  if (runtime.select) {
    if (runtime.select.defaults) {
      var defaults = Object.keys(runtime.select.defaults);
      INV.select.coreOptions.forEach(function (name) {
        if (defaults.indexOf(name) === -1) staticDrift.push('option:' + name);
      });
    }
    if (runtime.select.layouts) {
      INV.select.layouts.forEach(function (name) {
        if (runtime.select.layouts.indexOf(name) === -1) staticDrift.push('layout:' + name);
      });
    }
    if (runtime.select.scrollbars) {
      INV.select.scrollbars.forEach(function (name) {
        if (runtime.select.scrollbars.indexOf(name) === -1) staticDrift.push('scrollbar:' + name);
      });
    }
    if (runtime.select.frameworks) {
      INV.select.frameworks.forEach(function (name) {
        if (runtime.select.frameworks.indexOf(name) === -1) staticDrift.push('framework:' + name);
      });
    }
  }
  setAudit('drift', staticDrift.length ? 'bad' : 'ok', 'Declarations match runtime',
    staticDrift.length ? 'missing: ' + staticDrift.join(', ') : 'every declared option/layout/scrollbar exists');
  if (staticDrift.length) recordBug('Declarations drift', staticDrift.join(', '));
function probeUrl(url) {
    return fetch(url, { method: 'HEAD', cache: 'no-store' }).then(function (response) {
      return response.status;
    }).catch(function () { return 0; });
  }

  var demoPages = [
    'index.html', 'advanced.html', 'playground.html', 'api.html', 'ajax.html',
    'shopify.html', 'lab.html'
  ];
  var docPages = [
    'docs/index.html', 'docs/options.html', 'docs/theming.html', 'docs/frameworks.html',
    'docs/comparison.html', 'docs/validation-guide.html', 'docs/build.html',
    'docs/html-and-wordpress.html'
  ];

  function checkPages(id, label, pages) {
    Promise.all(pages.map(probeUrl)).then(function (codes) {
      var bad = [];
      pages.forEach(function (page, index) {
        if (!codes[index]) bad.push(page + ' (unreachable)');
        else if (codes[index] !== 200) bad.push(page + ' (' + codes[index] + ')');
      });
      setAudit(id, bad.length ? 'bad' : 'ok', label,
        bad.length ? 'failing: ' + bad.join(', ') : pages.length + ' of ' + pages.length + ' reachable');
      if (bad.length) recordBug(label, bad.join(', '));
    });
  }

  checkPages('demo-pages', 'Demo pages serve 200', demoPages);
  checkPages('doc-pages', 'Documentation pages serve 200', docPages);

  fetch('package.json', { cache: 'no-store' }).then(function (response) {
    return response.json();
  }).then(function (pkg) {
    var ok = pkg.version === INV.version;
    setAudit('package', ok ? 'ok' : 'bad', 'package.json version = inventory',
      'package ' + pkg.version + ' · inventory ' + INV.version);
    if (!ok) recordBug('package.json version', pkg.version + ' != ' + INV.version);
    var exported = Object.keys(pkg.exports || {});
    var missing = [];
    ['select', 'file'].forEach(function (variant) {
      if (exported.indexOf('./' + variant) === -1) missing.push('./' + variant);
    });
    setAudit('exports', missing.length ? 'bad' : 'ok', 'package.json exports',
      missing.length ? 'missing ' + missing.join(', ') : exported.length + ' entry points');
  }).catch(function () {
    setAudit('package', 'warn', 'package.json', 'could not be read (serve the repo root with npm run dev)');
  });
/* ---------------- callbacks + event coverage ---------------- */

  function bumpCallback(group, name, detail) {
    mark(group, name);
    state.callbacks[name] = (state.callbacks[name] || 0) + 1;
    if (state.callbacks[name] <= 2) log('cb', 'callback ' + name, describe(detail));
  }

  function selectCallback(name) {
    return function (detail) { bumpCallback('selectCallbacks', name, detail); };
  }

  /* Rendering hooks (filterOption/renderOption/renderSelected/renderTag/
     formatTag/validateTag) are plain functions, not `on*` handlers, so wrap
     them to record coverage while returning the value the renderer expects. */
  function selectHook(name, impl) {
    return function () {
      bumpCallback('selectCallbacks', name, arguments[0]);
      return impl ? impl.apply(this, arguments) : undefined;
    };
  }

  function fieldCallback(name) {
    return function (detail) { bumpCallback('fieldCallbacks', name, detail); };
  }

  INV.events.forEach(function (name) {
    document.addEventListener('zidan:' + name, function (event) {
      mark('events', name);
      if (state.eventsSeen[name]) return;
      state.eventsSeen[name] = true;
      var detail = event && event.detail;
      var summary = '';
      if (detail && typeof detail === 'object') {
        ['value', 'valid', 'state', 'message', 'error', 'format', 'country', 'query', 'name', 'checked']
          .some(function (key) {
            if (detail[key] === undefined) return false;
            summary = describe(detail[key]);
            return true;
          });
      }
      log('ok', 'event zidan:' + name, summary);
    });
  });

  /* ---------------- select lab ---------------- */

  var selectHost = byId('lab-select-host');
  var selectInstances = {};

  function markSelectOptions(options) {
    Object.keys(options || {}).forEach(function (key) {
      if (options[key] !== undefined) {
        state.configured[key] = true;
        mark('selectOptions', key);
      }
    });
  }

  function selectItems(config) {
    return (config.items || [
      { value: 'alpha', label: 'Alpha' },
      { value: 'beta', label: 'Beta' },
      { value: 'gamma', label: 'Gamma' }
    ]);
  }

  function buildSelect(config) {
    var wrap = make('div', 'lab-stack-item');
    var label = make('label', 'field-label', config.title);
    label.setAttribute('for', config.id);
    var select = document.createElement('select');
    select.id = config.id;
    if (config.multiple) select.multiple = true;
    if (config.disabled) select.disabled = true;
    if (config.required) select.required = true;
    selectItems(config).forEach(function (item) {
      var option = document.createElement('option');
      if (typeof item === 'string') {
        option.value = item;
        option.textContent = item;
      } else {
        option.value = item.value;
        option.textContent = item.label;
        if (item.disabled) option.disabled = true;
      }
      select.appendChild(option);
    });
    var status = make('p', 'lab-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    wrap.appendChild(label);
    wrap.appendChild(select);
    wrap.appendChild(status);
    if (selectHost) selectHost.appendChild(wrap);
    return { wrap: wrap, select: select, status: status };
  }

  function initSelect(config) {
    var parts = buildSelect(config);
    if (!runtime.select) {
      parts.status.textContent = 'Select API is not part of this build.';
      return null;
    }
    var result = safe(function () {
      return new runtime.select(parts.select, config.options || {});
    });
    if (!result.ok) {
      parts.status.textContent = 'init() threw: ' + result.error.message;
      recordBug('Select init · ' + config.title, result.error.message);
      return null;
    }
    var instance = result.value;
    markSelectOptions(config.options);
    ['options', 'multiple', 'disabled', 'value', 'name', 'required'].forEach(function (name) {
      mark('selectOptions', name);
    });
    parts.status.textContent = 'ready · mode ' + instance.mode + ' · layout ' + instance.layout;
    selectInstances[config.id] = instance;
    instance.on('error', function (event) {
      parts.status.textContent = 'error: ' + (event.detail && event.detail.message);
    });
    return instance;
  }
/* every declared select option in one tags probe — proves init accepts the whole set */
  function allSelectOptions() {
    return {
      mode: 'tags', layout: 'floating-label', theme: 'default', themeFramework: 'none',
      id: 'lab-all-option-probe', name: 'lab-all-options', disabled: false, required: false,
      options: [
        { value: 'alpha', label: 'Alpha' },
        { value: 'beta', label: 'Beta' },
        { value: 'gamma', label: 'Gamma', disabled: true }
      ],
      value: ['alpha'], label: 'All select options', ariaLabel: 'All select options probe',
      placeholder: 'Type or pick...',
      multiple: true, searchable: true, clearable: true, closeOnSelect: false, maxDropdownHeight: 220,
      noResultsText: 'Nothing found', emptyText: 'No options yet', loadingText: 'Loading...',
      clearText: 'Clear it', requiredText: 'Pick one',
      fetchOptions: null, debounce: 120, minChars: 0, allowFreeText: true, searchValues: true,
      fetchPageSize: 0, autoLoadMore: true, cacheResults: true, loadMoreText: 'Load more',
      fetchUrl: null, fetchMethod: 'GET', fetchQueryParam: 'q', fetchPageParam: 'page',
      fetchSkipParam: null, fetchPageSizeParam: 'limit', fetchParams: { lang: 'en' }, fetchBody: null,
      fetchItemsPath: 'items', fetchTotalPath: 'total', fetchHasMorePath: 'hasMore',
      fetchHeaders: { 'X-Lab': '1' }, fetchCredentials: 'same-origin',
      maxTags: 6, minTagLength: 1, maxTagLength: 12, reorderable: true, editable: true,
      caseSensitive: false, delimiters: [','], commitOnTab: true, commitOnBlur: true,
      suggestions: ['Delta', 'Echo'], valueDelimiter: ',',
      customClasses: { root: 'lab-custom-root' }, validation: null, scrollbar: 'thin',
      accentInsensitive: true, highlightMatches: true, virtual: false, virtualThreshold: 150,
      itemHeight: 32, typeAhead: true, typeAheadTimeout: 400, locale: 'en',
      filterOption: selectHook('filterOption', function () { return true; }),
      renderOption: selectHook('renderOption', function () { return null; }),
      renderSelected: selectHook('renderSelected', function () { return null; }),
      renderTag: selectHook('renderTag', function () { return null; }),
      validateTag: selectHook('validateTag', function () { return true; }),
      formatTag: selectHook('formatTag', function (tag) { return tag; }),
      onInit: selectCallback('onInit'),
      onChange: selectCallback('onChange'),
      onSelect: selectCallback('onSelect'),
      onOpen: selectCallback('onOpen'),
      onClose: selectCallback('onClose'),
      onTagAdd: selectCallback('onTagAdd'),
      onTagRemove: selectCallback('onTagRemove'),
      onTagMove: selectCallback('onTagMove'),
      onTagEdit: selectCallback('onTagEdit'),
      onLoadMore: selectCallback('onLoadMore'),
      onError: selectCallback('onError')
    };
  }

  var selectProbe = null;
function buildSelectLab() {
    if (!runtime.select) {
      if (selectHost) {
        selectHost.appendChild(make('p', 'lab-status lab-status--warn',
          'This bundle omits the select API. Switch to Full or Select-only above.'));
      }
      return;
    }

    var comboboxOptions = {
      mode: 'combobox', layout: 'floating-label', theme: 'default', themeFramework: 'auto',
      id: 'lab-combobox', name: 'lab-combobox', label: 'Combobox', ariaLabel: 'Combobox probe',
      placeholder: 'Search a city...', searchable: true, clearable: true, closeOnSelect: true,
      maxDropdownHeight: 220, noResultsText: 'No city matches', emptyText: 'No cities',
      clearText: 'Clear the city', required: false, requiredText: 'Pick a city',
      accentInsensitive: true, highlightMatches: true, scrollbar: 'fancy',
      typeAhead: true, typeAheadTimeout: 500, locale: 'en', value: 'zurich',
      onInit: selectCallback('onInit'), onChange: selectCallback('onChange'),
      onOpen: selectCallback('onOpen'), onClose: selectCallback('onClose'),
      onSelect: selectCallback('onSelect'), onError: selectCallback('onError')
    };
    var combobox = initSelect({
      id: 'lab-combobox', title: 'Combobox · search, accents, highlight, scrollbar',
      options: comboboxOptions,
      items: ['Café Zürich', 'Zürich', 'Zagreb', 'Ångström', 'São Paulo', 'München', 'New York']
    });
    if (combobox) {
      combobox.open();
      combobox.close();
      combobox.setValue('zurich');
      combobox.setValue('angstrom');
      combobox.open();
    }

    /* a plain `select`-mode probe: renderSelected only runs for that mode */
    var plain = initSelect({
      id: 'lab-plain', title: 'Plain select · renderSelected + local filter',
      options: {
        mode: 'select', label: 'Plain select', value: ['one'], multiple: true, searchable: true,
        renderSelected: selectHook('renderSelected', function () { return null; }),
        filterOption: selectHook('filterOption', function () { return true; }),
        renderOption: selectHook('renderOption', function () { return null; })
      },
      items: [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]
    });
    if (plain) { plain.open(); plain.close(); }

    var tagsOptions = {
      mode: 'tags', layout: 'soft-pill', multiple: true, label: 'Tags', ariaLabel: 'Tags probe',
      placeholder: 'Add a tag...', searchable: true, clearable: true,
      maxTags: 4, minTagLength: 2, maxTagLength: 12, reorderable: true, editable: true,
      caseSensitive: false, delimiters: [',', ' '], commitOnTab: true, commitOnBlur: true,
      suggestions: ['Design', 'Engineering'], valueDelimiter: ',',
      renderTag: function () { return null; },
      formatTag: function (tag) { return tag.toUpperCase(); },
      validateTag: function (tag) { return tag.length >= 2 ? true : 'Too short'; },
      onTagAdd: selectCallback('onTagAdd'), onTagRemove: selectCallback('onTagRemove'),
      onTagEdit: selectCallback('onTagEdit'), onTagMove: selectCallback('onTagMove'),
      onError: selectCallback('onError')
    };
    var tags = initSelect({
      id: 'lab-tags', title: 'Tags · limits, reorder, edit, custom hooks', multiple: true,
      options: tagsOptions,
      items: [{ value: 'alpha', label: 'Alpha' }, { value: 'beta', label: 'Beta' }]
    });
    if (tags) {
      tags.addTag('Design');
      tags.addTag('Engineering');
      tags.addTag('x');
      tags.moveTag(0, 1);
      tags.editTag(0, 'Renamed');
      tags.selectAll();
      tags.deselectAll();
      tags.toggleAll();
      tags.areAllSelected();
      tags.getSelectedItems();
      tags.getTags();
    }
  }
function buildSelectExtras() {
    if (!runtime.select) return;

    var remoteOptions = {
      mode: 'combobox', label: 'Remote (fetchOptions)', ariaLabel: 'Remote paging probe',
      placeholder: 'Type to search...', searchable: true, clearable: true,
      debounce: 80, minChars: 1, allowFreeText: false, searchValues: true,
      fetchPageSize: 4, autoLoadMore: false, cacheResults: true, loadMoreText: 'Load more results',
      onLoadMore: selectCallback('onLoadMore'), onError: selectCallback('onError'),
      fetchOptions: function (query, signal, context) {
        var page = context ? context.page : 0;
        var items = [];
        for (var index = 0; index < 4; index += 1) {
          var number = page * 4 + index + 1;
          items.push({ value: 'remote-' + number, label: (query || 'Item') + ' ' + number });
        }
        return { items: items, hasMore: page < 3, total: 16 };
      }
    };
    var remote = initSelect({
      id: 'lab-remote', title: 'Remote pagination · load-more, cache, error path',
      options: remoteOptions
    });
    if (remote) {
      remote.refreshOptions();
      remote.loadMore();
      remote.hasMoreResults();
      remote.getAsyncState();
      remote.clearCache();
    }

    var declarativeOptions = {
      mode: 'combobox', label: 'Declarative AJAX (fetchUrl)', ariaLabel: 'Declarative AJAX probe',
      placeholder: 'Search remote rows...', searchable: true, clearable: true,
      fetchUrl: 'https://lab.zidan.test/items',
      fetchMethod: 'POST',
      fetchQueryParam: 'q',
      fetchPageParam: 'page',
      fetchSkipParam: null,
      fetchPageSizeParam: 'limit',
      fetchParams: { source: 'lab', lang: 'en' },
      fetchBody: { scope: 'testing-lab' },
      fetchItemsPath: 'items',
      fetchTotalPath: 'total',
      fetchHasMorePath: 'hasMore',
      fetchHeaders: { 'X-Lab-Token': 'demo' },
      fetchCredentials: 'same-origin',
      fetchPageSize: 5,
      autoLoadMore: true,
      cacheResults: true,
      loadMoreText: 'Next page',
      onLoadMore: selectCallback('onLoadMore'),
      onError: selectCallback('onError')
    };
    var declarative = initSelect({
      id: 'lab-declarative', title: 'Declarative AJAX · every fetch* option',
      options: declarativeOptions
    });
    if (declarative) {
      declarative.refreshOptions();
      declarative.loadMore();
      if (selectHost) {
        var request = make('pre', 'lab-output');
        request.textContent = 'Last request: ' + describe(labRequests[labRequests.length - 1] || {});
        selectHost.appendChild(request);
      }
    }

    var disabled = initSelect({
      id: 'lab-disabled', title: 'Disabled · enable() / disable()',
      disabled: true,
      options: { mode: 'select', label: 'Disabled select', disabled: true, validation: 'invalid' },
      items: [{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]
    });
    if (disabled) {
      disabled.disable();
      disabled.enable();
      disabled.setValidation('invalid');
      disabled.setTheme('modern');
      disabled.setLayout('soft-pill');
      disabled.setFramework('none');
      disabled.setScrollbar('thin');
    }

    /* the full-option probe runs last so its failure is isolated and visible */
    selectProbe = initSelect({
      id: 'lab-all-option-probe', title: 'Every declared select option (probe)',
      multiple: true, options: allSelectOptions()
    });
    if (selectProbe) {
      selectProbe.on('change', selectCallback('onChange'));
      selectProbe.open();
      selectProbe.announce('Testing lab ready');
      selectProbe.close();
      selectProbe.clear();
      selectProbe.setOptions([
        { value: 'one', label: 'One' },
        { value: 'two', label: 'Two', group: 'Group' }
      ]);
      selectProbe.setValue([]);
      selectProbe.refresh();
      selectProbe.isOpen();
      selectProbe.off('change');
    }
  }
/* ---------------- field lab ---------------- */

  var fieldHost = byId('lab-field-host');
  var fieldInstances = {};
  var LAB_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1l2 4 4 .6-3 3 .7 4.4L8 11l-3.7 2 .7-4.4-3-3L6 5z" fill="currentColor"/></svg>';
  if (runtime.registerIcon) {
    safe(function () { return runtime.registerIcon('lab-star', LAB_ICON); });
  }

  function markFieldOptions(options) {
    Object.keys(options || {}).forEach(function (key) {
      if (options[key] !== undefined) {
        state.configured[key] = true;
        mark('fieldOptions', key);
      }
    });
  }

  function fieldStatus(wrap) {
    var status = make('p', 'lab-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    wrap.appendChild(status);
    return status;
  }

  function fieldWrap(title, id) {
    var wrap = make('div', 'lab-stack-item');
    var label = make('label', 'field-label', title);
    if (id) label.setAttribute('for', id);
    wrap.appendChild(label);
    if (fieldHost) fieldHost.appendChild(wrap);
    return wrap;
  }

  function initField(ctl, title, ctorName, node, options) {
    var ctor = runtime[ctorName] || runtime.fieldBase;
    if (!ctor) {
      ctl.status.textContent = 'Field API is not part of this build.';
      return null;
    }
    var result = safe(function () { return new ctor(node, options || {}); });
    if (!result.ok) {
      ctl.status.textContent = 'init() threw: ' + result.error.message;
      recordBug('Field init · ' + title, result.error.message);
      return null;
    }
    markFieldOptions(options);
    ['label', 'hint', 'description', 'layout', 'theme', 'framework', 'validation'].forEach(function (name) {
      mark('fieldOptions', name);
    });
    ctl.status.textContent = 'ready · ' + (result.value.kind || ctorName);
    fieldInstances[String(node.id || title)] = result.value;
    return result.value;
  }

  function addTextControl(config) {
    var wrap = fieldWrap(config.title, config.id);
    var node = document.createElement(config.tag || 'input');
    node.id = config.id;
    if (config.tag === 'textarea') {
      node.rows = config.rows || 2;
      node.value = config.value || '';
    } else {
      node.type = config.type || 'text';
      if (config.value !== undefined) node.value = config.value;
    }
    if (config.attrs) Object.keys(config.attrs).forEach(function (key) { node.setAttribute(key, config.attrs[key]); });
    wrap.appendChild(node);
    var status = fieldStatus(wrap);
    var instance = initField({ status: status }, config.title, 'text', node, config.options);
    if (instance && config.run) {
      var outcome = safe(function () { return config.run(instance, node); });
      status.textContent = outcome.ok
        ? 'methods ok · ' + (outcome.value === undefined ? '' : describe(outcome.value))
        : 'method threw: ' + outcome.error.message;
      if (!outcome.ok) recordBug('Field methods · ' + config.title, outcome.error.message);
    }
    return instance;
  }

  function addCheckboxControl(config) {
    var wrap = fieldWrap(config.title, config.id);
    var node = document.createElement('input');
    node.id = config.id;
    node.type = 'checkbox';
    node.checked = true;
    wrap.appendChild(node);
    var status = fieldStatus(wrap);
    var instance = initField({ status: status }, config.title, 'checkbox', node, config.options);
    if (instance) {
      var outcome = safe(function () {
        return [
          instance.isChecked(),
          instance.setIndeterminate(config.options.indeterminate === true).setChecked(true).isChecked()
        ];
      });
      status.textContent = outcome.ok ? 'methods ok · ' + describe(outcome.value)
        : 'method threw: ' + outcome.error.message;
      if (!outcome.ok) recordBug('Checkbox methods · ' + config.title, outcome.error.message);
    }
    return instance;
  }

  function addRadioControl(config) {
    var wrap = fieldWrap(config.title, config.id);
    var group = document.createElement('fieldset');
    group.id = config.id;
    group.appendChild(make('legend', null, config.title));
    ['One', 'Two', 'Three'].forEach(function (text, index) {
      var label = make('label');
      var radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = config.id;
      radio.value = text.toLowerCase();
      if (index === 0) radio.checked = true;
      label.appendChild(radio);
      label.appendChild(document.createTextNode(' ' + text));
      group.appendChild(label);
    });
    wrap.appendChild(group);
    var status = fieldStatus(wrap);
    var instance = initField({ status: status }, config.title, 'radio', group, config.options);
    if (instance) {
      var outcome = safe(function () {
        return [instance.getValue(), instance.setValue('two').getValue()];
      });
      status.textContent = outcome.ok ? 'methods ok · ' + describe(outcome.value)
        : 'method threw: ' + outcome.error.message;
      if (!outcome.ok) recordBug('Radio methods · ' + config.title, outcome.error.message);
    }
    return instance;
  }
function addFileControl(config) {
    var wrap = fieldWrap(config.title, config.id);
    var node = document.createElement('input');
    node.id = config.id;
    node.type = 'file';
    if (config.multiple) node.multiple = true;
    wrap.appendChild(node);
    var status = fieldStatus(wrap);
    var instance = initField({ status: status }, config.title, 'file', node, config.options);
    if (instance) {
      var outcome = safe(function () {
        var file = new File(['testing lab payload'], 'lab-' + config.id + '.txt', { type: 'text/plain' });
        instance.addFiles([file]);
        var files = instance.getFiles();
        var uploadState = instance.getUploadState();
        instance.uploadAll();
        instance.isUploading();
        return { files: files.length, states: uploadState.length };
      });
      status.textContent = outcome.ok
        ? 'methods ok · ' + describe(outcome.value)
        : 'method threw: ' + outcome.error.message;
      if (!outcome.ok) recordBug('File methods · ' + config.title, outcome.error.message);
    }
    return instance;
  }

  function allFieldOptions() {
    var values = {
      variant: 'default', layout: 'stacked', theme: 'default', framework: 'none',
      label: 'All field options', hint: 'Probe hint', description: 'Probe description',
      descriptions: ['probe'], validation: null, alwaysValidate: true, indeterminate: false,
      clearable: true, reveal: false, prefix: '$', suffix: '.00', counter: 120, output: null,
      title: 'Upload', dropHint: 'Drop a file', accept: '*/*', mask: '###-AAA',
      autogrow: false, autogrowMax: 120, minFiles: 0, maxFiles: 4, maxSize: 0, maxSizeMB: 0,
      maxTotalSize: 0, maxTotalSizeMB: 0, labels: {}, clearLabel: 'Clear',
      showPasswordLabel: 'Show password', hidePasswordLabel: 'Hide password',
      autoIcon: true, icon: 'lab-star', iconPosition: 'left', iconClickable: true, iconLabel: 'Icon',
      validationIcon: true, stepper: false, stepperPosition: 'right', stepperWrap: true,
      stepperLongPress: true, stepperDelay: 350, stepperInterval: 70, stepperUpLabel: 'Up',
      stepperDownLabel: 'Down', stepperStep: 1, phone: false, phoneCountry: 'DE',
      phoneFormat: 'international', phoneCountrySelect: true, phoneCountries: ['DE', 'US'],
      phoneCountryLabel: 'Country', phoneCountrySearchText: 'Search a country',
      phoneCountryEmptyText: 'No country',
      rangeVariant: 'gradient', rangeBubble: true, rangeBubbleMode: 'active',
      rangeBubblePosition: 'top', rangeFill: true, rangeMinMax: true, rangeMinLabel: 'Min',
      rangeMaxLabel: 'Max', rangeTicks: 5, rangeTickLabels: true,
      rangeLabels: { 0: 'Low', 100: 'High' }, rangeFormat: null,
      pickerButton: true, pickerIcon: 'lab-star', pickerLabel: 'Pick', disableWeekends: false,
      disabledDates: [], validateDate: null,
      fileVariant: 'dropzone', uploadIcon: 'lab-star', upload: null, uploadHandler: null,
      uploadUrl: null, uploadField: 'file', uploadMethod: 'POST', uploadParams: null,
      uploadData: null, withCredentials: false, uploadWithCredentials: false,
      uploadHeaders: null, headers: null, uploadResponsePath: null, uploadErrorPath: null,
      uploadTimeout: 0, uploadRetries: 0, uploadRetryDelay: 0, uploadConcurrency: 0,
      simulateUpload: true, simulateDuration: 80, autoUpload: false, showFileMeta: true,
      showPreview: true, showClear: true, showRemove: true, showCancel: true, showRetry: true,
      showStatus: true, allowPaste: false, statusFormat: null, replaceTitle: 'Replace',
      progressTemplate: '{percent}%', uploadedLabel: 'Uploaded', failedLabel: 'Failed',
      canceledLabel: 'Canceled', queuedLabel: 'Queued', retryingLabel: 'Retrying',
      cancelLabel: 'Cancel', retryLabel: 'Retry', renderFile: null,
      downscale: false, downscaleMaxWidth: 1600, downscaleMaxHeight: 1600,
      downscaleQuality: 0.8, downscaleMaxBytes: 0, downscaleMime: 'image/jpeg',
      downscaleForce: false, switchStyle: 'ios', onLabel: 'ON', offLabel: 'OFF',
      deselectable: false, messages: {}, validate: null, showValidState: true,
      onChange: fieldCallback('onChange'), onInit: fieldCallback('onInit'),
      onValidation: fieldCallback('onValidation'), onRemove: fieldCallback('onRemove'),
      onInput: fieldCallback('onInput'), onIconClick: fieldCallback('onIconClick'),
      onStep: fieldCallback('onStep'), onPicker: fieldCallback('onPicker'),
      onPhoneCountry: fieldCallback('onPhoneCountry'), onPhoneFormat: fieldCallback('onPhoneFormat'),
      onUploadStart: fieldCallback('onUploadStart'), onUploadProgress: fieldCallback('onUploadProgress'),
      onUploadSuccess: fieldCallback('onUploadSuccess'), onUpload: fieldCallback('onUpload'),
      onUploadError: fieldCallback('onUploadError'), onUploadCancel: fieldCallback('onUploadCancel'),
      onUploadQueued: fieldCallback('onUploadQueued'), onUploadRetry: fieldCallback('onUploadRetry')
    };
    INV.field.options.forEach(function (name) {
      if (!(name in values)) values[name] = null;
    });
    return values;
  }
function buildFieldLab() {
    if (!runtime.text && !runtime.checkbox && !runtime.radio && !runtime.file) {
      if (fieldHost) {
        fieldHost.appendChild(make('p', 'lab-status lab-status--warn',
          'This bundle omits the field APIs. Switch to Full or File-only above.'));
      }
      return;
    }

    addTextControl({
      id: 'lab-text', title: 'Text · clear, prefix/suffix, counter, icon, mask', value: 'hello',
      options: {
        label: 'Text field', hint: 'Type anything', description: 'Prefix and suffix adornments',
        clearable: true, prefix: '@', suffix: '.com', counter: 40,
        icon: 'lab-star', iconPosition: 'left', iconClickable: true, iconLabel: 'Insert star',
        validationIcon: true, validation: null, alwaysValidate: true, showValidState: true,
        mask: '###-AAA', layout: 'stacked', messages: {},
        validate: function (value) { return value && value.length > 2 ? true : 'Too short'; },
        onInput: fieldCallback('onInput'), onChange: fieldCallback('onChange'),
        onIconClick: fieldCallback('onIconClick'), onValidation: fieldCallback('onValidation')
      },
      run: function (instance) {
        instance.setValue('123-ABC');
        return [instance.getUnmaskedValue(), instance.validate()];
      }
    });

    addTextControl({
      id: 'lab-password', type: 'password', title: 'Password · reveal', value: 'secret123',
      options: {
        label: 'Password', reveal: true,
        showPasswordLabel: 'Show password', hidePasswordLabel: 'Hide password',
        onChange: fieldCallback('onChange')
      }
    });

    addTextControl({
      id: 'lab-note', tag: 'textarea', title: 'Textarea · autogrow + counter', rows: 2,
      value: 'Line one\nLine two',
      options: { label: 'Note', autogrow: true, autogrowMax: 160, counter: 200, clearable: true },
      run: function (instance) { return instance.refreshAutogrow().getValue(); }
    });

    addTextControl({
      id: 'lab-stepper', type: 'number', title: 'Number · stepper', value: '10',
      attrs: { min: '0', max: '100' },
      options: {
        label: 'Quantity', stepper: true, stepperPosition: 'split', stepperWrap: true,
        stepperStep: 1, stepperLongPress: true, stepperDelay: 400, stepperInterval: 80,
        stepperUpLabel: 'Increase', stepperDownLabel: 'Decrease',
        onStep: fieldCallback('onStep')
      },
      run: function (instance) {
        instance.stepUp(2);
        instance.stepDown();
        instance.setStepper(true);
        return instance.getValue();
      }
    });

    addTextControl({
      id: 'lab-phone', type: 'tel', title: 'Phone · country picker + formats',
      value: '+4915112345678',
      options: {
        label: 'Phone', phone: true, phoneCountry: 'DE', phoneFormat: 'international',
        phoneCountrySelect: true, phoneCountries: ['DE', 'US', 'GB', 'PK'],
        phoneCountryLabel: 'Country', phoneCountrySearchText: 'Search country',
        phoneCountryEmptyText: 'No country',
        onPhoneCountry: fieldCallback('onPhoneCountry'),
        onPhoneFormat: fieldCallback('onPhoneFormat')
      },
      run: function (instance) {
        var start = instance.getPhoneCountry();
        instance.setPhoneCountry('US');
        instance.setPhoneFormat('e164');
        return [start, instance.formatPhone('+4915112345678')];
      }
    });

    addTextControl({
      id: 'lab-range', type: 'range', title: 'Range · variants, ticks, bubble, formatter',
      value: '40', attrs: { min: '0', max: '100' },
      options: {
        label: 'Level', rangeVariant: 'gradient', rangeBubble: true, rangeBubbleMode: 'always',
        rangeBubblePosition: 'top', rangeFill: true, rangeMinMax: true,
        rangeMinLabel: 'Min', rangeMaxLabel: 'Max', rangeTicks: 5, rangeTickLabels: true,
        rangeLabels: { 0: 'Zero', 100: 'Max' },
        rangeFormat: function (value) { return value + '%'; }
      }
    });

    addTextControl({
      id: 'lab-date', type: 'date', title: 'Date · picker, weekend and date rules',
      value: '2026-12-01',
      options: {
        label: 'Date', pickerButton: true, pickerIcon: 'lab-star', pickerLabel: 'Open calendar',
        disableWeekends: true, disabledDates: ['2026-12-25'],
        validateDate: function (value) {
          return value === '2026-12-31' ? 'Closed on New Year' : true;
        },
        onPicker: fieldCallback('onPicker')
      },
      run: function (instance) {
        instance.openPicker();
        instance.showPicker();
        return instance.getValue();
      }
    });
  }
function buildFieldExtras() {
    if (!runtime.checkbox && !runtime.radio && !runtime.file && !runtime.text) return;

    addCheckboxControl({
      id: 'lab-check', title: 'Checkbox · indeterminate',
      options: {
        label: 'Checkbox', variant: 'default', indeterminate: true,
        onChange: fieldCallback('onChange'), onInit: fieldCallback('onInit')
      }
    });

    addCheckboxControl({
      id: 'lab-switch', title: 'Switch · style, ON/OFF labels',
      options: {
        label: 'Notifications', variant: 'switch', switchStyle: 'ios',
        onLabel: 'Enabled', offLabel: 'Disabled', onChange: fieldCallback('onChange')
      }
    });

    addRadioControl({
      id: 'lab-radio', title: 'Radio · tile + deselectable',
      options: {
        label: 'Plan', variant: 'tile', deselectable: true,
        onChange: fieldCallback('onChange'), onInit: fieldCallback('onInit')
      }
    });

    addFileControl({
      id: 'lab-upload', title: 'File · dropzone, limits, progress', multiple: true,
      options: {
        label: 'Upload', variant: 'dropzone', title: 'Drop files here', dropHint: 'Any file',
        accept: '*/*', multiple: true, maxFiles: 4, maxSizeMB: 5, maxTotalSizeMB: 12,
        minFiles: 0, simulateUpload: true, simulateDuration: 120, autoUpload: false,
        showFileMeta: true, showPreview: true, showClear: true, showRemove: true,
        showCancel: true, showRetry: true, showStatus: true, allowPaste: false,
        labels: {}, clearLabel: 'Clear all', cancelLabel: 'Cancel', retryLabel: 'Retry',
        queuedLabel: 'Queued', retryingLabel: 'Retrying', uploadedLabel: 'Uploaded',
        failedLabel: 'Failed', canceledLabel: 'Canceled', replaceTitle: 'Replace',
        progressTemplate: '{percent}%',
        onRemove: fieldCallback('onRemove'),
        onUploadStart: fieldCallback('onUploadStart'),
        onUploadProgress: fieldCallback('onUploadProgress'),
        onUploadSuccess: fieldCallback('onUploadSuccess'),
        onUploadQueued: fieldCallback('onUploadQueued'),
        onUploadRetry: fieldCallback('onUploadRetry'),
        onUploadError: fieldCallback('onUploadError'),
        onUploadCancel: fieldCallback('onUploadCancel')
      }
    });

    addFileControl({
      id: 'lab-upload-gallery', title: 'File · gallery variant', multiple: true,
      options: {
        label: 'Gallery', variant: 'gallery', title: 'Add images', dropHint: 'PNG or JPG',
        accept: 'image/*', multiple: true, maxFiles: 6, showPreview: true,
        autoUpload: false, onUploadStart: fieldCallback('onUploadStart')
      }
    });

    /* The upload pipeline: each probe owns its mode so the success, error/retry
       and cancel paths never race on a shared flag. uploadHandler receives
       (file, context) with onProgress/complete/fail. */
    function uploadHandlerFor(mode) {
      return function (file, context) {
        context.onProgress(50);
        if (mode.fail) {
          var error = new Error('Lab upload failure');
          error.retryable = true;
          setTimeout(function () { context.fail(error); }, 10);
          return;
        }
        setTimeout(function () { context.complete({ ok: true }); }, 10);
      };
    }
    var okMode = { fail: false };
    var failMode = { fail: true };
    var cancelMode = { fail: false };

    var uploadOk = addFileControl({
      id: 'lab-upload-success', title: 'File · upload success path', multiple: true,
      options: {
        label: 'Success upload', variant: 'dropzone', title: 'Upload', dropHint: 'Handler drives success',
        multiple: true, maxFiles: 3, autoUpload: false, uploadRetries: 1, uploadRetryDelay: 40,
        uploadHandler: uploadHandlerFor(okMode),
        onUploadStart: fieldCallback('onUploadStart'),
        onUploadProgress: fieldCallback('onUploadProgress'),
        onUploadSuccess: fieldCallback('onUploadSuccess'),
        onUploadQueued: fieldCallback('onUploadQueued'),
        onUploadRetry: fieldCallback('onUploadRetry'),
        onUploadError: fieldCallback('onUploadError'),
        onUploadCancel: fieldCallback('onUploadCancel'),
        onUpload: fieldCallback('onUpload')
      }
    });

    var uploadFail = addFileControl({
      id: 'lab-upload-fail', title: 'File · upload error + retry', multiple: true,
      options: {
        label: 'Failing upload', variant: 'dropzone', title: 'Upload', dropHint: 'Handler fails',
        multiple: true, maxFiles: 3, autoUpload: false, uploadRetries: 1, uploadRetryDelay: 30,
        uploadHandler: uploadHandlerFor(failMode),
        onUploadStart: fieldCallback('onUploadStart'),
        onUploadProgress: fieldCallback('onUploadProgress'),
        onUploadSuccess: fieldCallback('onUploadSuccess'),
        onUploadQueued: fieldCallback('onUploadQueued'),
        onUploadRetry: fieldCallback('onUploadRetry'),
        onUploadError: fieldCallback('onUploadError'),
        onUploadCancel: fieldCallback('onUploadCancel')
      }
    });

    var uploadCancel = addFileControl({
      id: 'lab-upload-cancel', title: 'File · upload cancel', multiple: true,
      options: {
        label: 'Cancelable upload', variant: 'dropzone', title: 'Upload', dropHint: 'Handler aborts',
        multiple: true, maxFiles: 3, autoUpload: false, uploadConcurrency: 1,
        uploadHandler: uploadHandlerFor(cancelMode),
        onUploadStart: fieldCallback('onUploadStart'),
        onUploadProgress: fieldCallback('onUploadProgress'),
        onUploadSuccess: fieldCallback('onUploadSuccess'),
        onUploadQueued: fieldCallback('onUploadQueued'),
        onUploadError: fieldCallback('onUploadError'),
        onUploadCancel: fieldCallback('onUploadCancel')
      }
    });

    state.uploadProbe = {
      ok: uploadOk, fail: uploadFail, cancel: uploadCancel
    };


    /* every declared field option in one probe — init must accept the whole set */
    addTextControl({
      id: 'lab-all-field', tag: 'textarea', title: 'Every declared field option (probe)',
      rows: 2, value: 'probe',
      options: allFieldOptions()
    });
  }
/* ---------------- CSS lab ---------------- */

  var cssRuleText = '';

  function collectCssText() {
    var text = '';
    Array.prototype.forEach.call(document.styleSheets, function (sheet) {
      var rules = null;
      try { rules = sheet.cssRules; } catch (error) { rules = null; }
      if (!rules) return;
      Array.prototype.forEach.call(rules, function (rule) { text += rule.cssText + '\n'; });
    });
    return text;
  }

  function cssChecks() {
    cssRuleText = collectCssText();

    var probe = document.createElement('div');
    probe.className = 'zs-root';
    probe.setAttribute('data-zs-theme', 'default');
    probe.setAttribute('data-zs-framework', 'none');
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    probe.style.top = '0';
    document.body.appendChild(probe);
    var computed = window.getComputedStyle(probe);

    var computedCount = 0;
    INV.css.tokens.forEach(function (token) {
      var escaped = token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      var declared = new RegExp(escaped + '\\s*:').test(cssRuleText);
      if (!declared) {
        markOutcome('cssTokens', token, 'bad');
        recordBug('CSS token', token + ' is not declared in any loaded stylesheet');
        return;
      }
      mark('cssTokens', token);
      if ((computed.getPropertyValue(token) || '').trim()) computedCount += 1;
    });
    probe.parentNode.removeChild(probe);
    state.computedTokens = computedCount;

    INV.css.classes.forEach(function (name) {
      var pattern = new RegExp('\\.' + name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '(?![a-z0-9-])');
      if (pattern.test(cssRuleText)) {
        mark('cssClasses', name);
      } else {
        markOutcome('cssClasses', name, 'bad');
        recordBug('CSS class', '.' + name + ' is not defined in any loaded stylesheet');
      }
    });

    renderCss();
  }

  function renderCss() {
    var summary = byId('lab-css-summary');
    if (summary) {
      summary.innerHTML = '';
      [
        ['Tokens present', groupStats('cssTokens')],
        ['Classes present', groupStats('cssClasses')],
        ['Themes', INV.css.themes.length + ' · ' + INV.css.themes.join(', ')],
        ['Frameworks', INV.css.frameworks.length + ' · ' + INV.css.frameworks.join(', ')]
      ].forEach(function (row) {
        var line = make('div');
        if (row[1] && typeof row[1] === 'object') {
          line.appendChild(document.createTextNode(row[0] + ': '));
          line.appendChild(make('strong', null, row[1].done + '/' + row[1].total));
        } else {
          line.textContent = row[0] + ': ' + row[1];
        }
        summary.appendChild(line);
      });
    }

    var tokenHost = byId('lab-token-list');
    var tokenCount = byId('lab-token-count');
    if (tokenCount) tokenCount.textContent = String(INV.css.tokens.length);
    if (tokenHost) {
      tokenHost.innerHTML = '';
      INV.css.tokens.forEach(function (token) {
        var code = make('code', state.tested.cssTokens[token] ? '' : 'is-missing', token);
        tokenHost.appendChild(code);
      });
    }

    var classHost = byId('lab-class-list');
    var classCount = byId('lab-class-count');
    if (classCount) classCount.textContent = String(INV.css.classes.length);
    if (classHost) {
      classHost.innerHTML = '';
      INV.css.classes.forEach(function (name) {
        classHost.appendChild(make('code', state.tested.cssClasses[name] ? '' : 'is-missing', name));
      });
    }
  }

  /* ---------------- events panel ---------------- */

  function renderEvents() {
    var host = byId('lab-events-list');
    if (!host) return;
    host.innerHTML = '';
    INV.events.forEach(function (name) {
      host.appendChild(make('li', state.tested.events[name] ? 'is-ok' : '', name));
    });
  }

  /* ---------------- form helpers ---------------- */

  var formOutput = byId('lab-form-output');

  function writeFormOutput(value) {
    if (formOutput) formOutput.textContent = typeof value === 'string' ? value : describe(value);
  }

  function buildFormLab() {
    if (!form || !runtime.zidanField) {
      if (formOutput) formOutput.textContent = 'Form helpers need the full build (zidan-form.js).';
      return;
    }
    safe(function () { return form.init(byId('lab-form')); });

    var serialize = byId('lab-form-serialize');
    var validate = byId('lab-form-validate');
    var destroy = byId('lab-form-destroy');

    if (serialize) serialize.addEventListener('click', function () {
      var outcome = safe(function () { return form.serialize('#lab-form'); });
      mark('formMethods', 'serialize');
      writeFormOutput(outcome.ok ? outcome.value : 'threw: ' + outcome.error.message);
      if (!outcome.ok) recordBug('ZidanForm.serialize', outcome.error.message);
    });

    if (validate) validate.addEventListener('click', function () {
      mark('formMethods', 'validate');
      var result = safe(function () { return form.validate('#lab-form'); });
      if (!result.ok) {
        writeFormOutput('threw: ' + result.error.message);
        recordBug('ZidanForm.validate', result.error.message);
        return;
      }
      writeFormOutput('validate() running...');
      Promise.resolve(result.value).then(function (valid) {
        writeFormOutput('valid: ' + valid);
      }, function (error) {
        writeFormOutput('rejected: ' + error.message);
        recordBug('ZidanForm.validate rejection', error.message);
      });
    });

    if (destroy) destroy.addEventListener('click', function () {
      var count = safe(function () { return form.destroy(byId('lab-form')); });
      mark('formMethods', 'destroy');
      writeFormOutput(count.ok ? 'destroyed ' + count.value + ' field(s)' : 'threw: ' + count.error.message);
    });
  }
/* ---------------- method lab ---------------- */

  var methodsHost = byId('lab-method-groups');
  var methodButtons = { select: {}, field: {}, form: {} };
  var FILE_METHODS = [
    'getFiles', 'getUploadState', 'getFileState', 'addFiles', 'replaceFiles', 'removeFile',
    'removeFiles', 'clear', 'isUploading', 'whenUploaded', 'setVariant', 'setUploader',
    'setUploadUrl', 'setUploadOptions', 'uploadAll', 'uploadFile', 'cancelUpload', 'cancelAll',
    'retryUpload', 'retryAll', 'hasUploader'
  ];

  function addMethodGroup(label, names, kind) {
    if (!methodsHost) return;
    var box = make('div', 'lab-method-group');
    box.appendChild(make('h3', null, label + ' (' + names.length + ')'));
    var row = make('div', 'lab-method-row');
    names.forEach(function (name) {
      var button = make('button', 'lab-method', name);
      button.type = 'button';
      button.setAttribute('data-kind', kind);
      button.setAttribute('data-name', name);
      button.addEventListener('click', function () { runMethod(kind, name); });
      methodButtons[kind][name] = button;
      row.appendChild(button);
    });
    box.appendChild(row);
    methodsHost.appendChild(box);
  }

  function buildMethods() {
    if (!methodsHost) return;
    methodsHost.innerHTML = '';
    methodButtons = { select: {}, field: {}, form: {} };
    addMethodGroup('Select methods', INV.select.methods, 'select');
    addMethodGroup('Field methods', INV.field.methods, 'field');
    addMethodGroup('Form helpers', INV.form.methods, 'form');
  }

  function firstSelectInstance() {
    if (selectProbe) return { instance: selectProbe, id: 'lab-all-option-probe' };
    var ids = Object.keys(selectInstances);
    return ids.length ? { instance: selectInstances[ids[0]], id: ids[0] } : null;
  }

  function selectArgs(name) {
    switch (name) {
      case 'setValue': return ['alpha'];
      case 'addTag': return ['Lab tag'];
      case 'removeTag': return [0];
      case 'moveTag': return [0, 1];
      case 'editTag': return [0, 'Renamed'];
      case 'setOptions': return [[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]];
      case 'setTheme': return ['modern'];
      case 'setLayout': return ['soft-pill'];
      case 'setFramework': return ['none'];
      case 'setScrollbar': return ['thin'];
      case 'setValidation': return ['valid'];
      case 'on': return ['init', noop];
      case 'off': return ['init', noop];
      case 'announce': return ['Testing lab'];
      default: return [];
    }
  }

  function fieldPick(name) {
    if (['isChecked', 'setChecked', 'setIndeterminate'].indexOf(name) !== -1) return 'lab-check';
    if (FILE_METHODS.indexOf(name) !== -1) return 'lab-upload';
    if (['stepUp', 'stepDown', 'setStepper'].indexOf(name) !== -1) return 'lab-stepper';
    if (['openPicker', 'showPicker'].indexOf(name) !== -1) return 'lab-date';
    if (['getPhoneCountry', 'setPhoneCountry', 'setPhoneFormat', 'formatPhone'].indexOf(name) !== -1) return 'lab-phone';
    if (['refreshAutogrow'].indexOf(name) !== -1) return 'lab-note';
    if (['getUnmaskedValue'].indexOf(name) !== -1) return 'lab-text';
    return 'lab-text';
  }

  function makeFile(name) {
    try { return new File(['testing lab'], name || 'lab-file.txt', { type: 'text/plain' }); }
    catch (error) { return null; }
  }

  function markMethod(kind, name, outcome, detail) {
    var group = kind === 'select' ? 'selectMethods' : kind === 'field' ? 'fieldMethods' : 'formMethods';
    mark(group, name);
    markOutcome(group, name, outcome);
    var button = methodButtons[kind] && methodButtons[kind][name];
    if (button) {
      button.classList.remove('is-ok', 'is-bad', 'is-warn');
      button.classList.add('is-' + outcome);
      button.title = detail || '';
    }
    if (outcome === 'bad') recordBug(kind + '.' + name + '()', detail || 'threw');
    else log(outcome === 'ok' ? 'ok' : 'warn', kind + '.' + name + '()', detail || 'ok');
  }

  function runMethod(kind, name) {
    if (kind === 'select') runSelectMethod(name);
    else if (kind === 'field') runFieldMethod(name);
    else runFormMethod(name);
    refreshSoon();
  }
function fieldArgs(name) {
    var file = makeFile();
    switch (name) {
      case 'setValue': return ['lab value'];
      case 'setError': return ['Lab error'];
      case 'setValidation': return ['valid'];
      case 'setTheme': return ['modern'];
      case 'setFramework': return ['none'];
      case 'setLayout': return ['stacked'];
      case 'setIndeterminate': return [true];
      case 'setChecked': return [true];
      case 'stepUp': return [1];
      case 'stepDown': return [1];
      case 'setStepper': return [true];
      case 'setPhoneCountry': return ['US'];
      case 'setPhoneFormat': return ['e164'];
      case 'formatPhone': return ['+4915112345678'];
      case 'setVariant': return ['gallery'];
      case 'setUploader': return [null];
      case 'setUploadUrl': return [null];
      case 'setUploadOptions': return [{}];
      case 'removeFile': return [0];
      case 'removeFiles': return [[0]];
      case 'addFiles': return [file ? [file] : []];
      case 'replaceFiles': return [file ? [file] : []];
      case 'uploadFile': return file ? [file] : [];
      case 'cancelUpload': return file ? [file] : [];
      case 'retryUpload': return file ? [file] : [];
      case 'on': return ['init', noop];
      case 'emit': return ['init', {}];
      default: return [];
    }
  }

  function runSelectMethod(name) {
    var picked = firstSelectInstance();
    if (!runtime.select || !picked) {
      markMethod('select', name, 'warn', 'no select instance in this build');
      return;
    }
    var instance = picked.instance;

    if (name === 'destroy') {
      var host = document.createElement('div');
      host.innerHTML = '<select><option value="x">X</option></select>';
      document.body.appendChild(host);
      var temp = safe(function () { return new runtime.select(host.querySelector('select'), { mode: 'select' }); });
      var destroyed = temp.ok
        ? safe(function () { return temp.value.destroy(); })
        : { ok: false, error: temp.error };
      markMethod('select', name, destroyed.ok ? 'ok' : 'bad',
        destroyed.ok ? 'destroyed a temporary select' : destroyed.error.message);
      if (host.parentNode) host.parentNode.removeChild(host);
      return;
    }

    if (typeof instance[name] !== 'function') {
      markMethod('select', name, 'bad', 'declared but not implemented on ZidanSelect.prototype');
      return;
    }
    var result = safe(function () { return instance[name].apply(instance, selectArgs(name)); });
    if (!result.ok) {
      markMethod('select', name, 'bad', result.error.message);
      return;
    }
    if (result.value && typeof result.value.then === 'function') {
      result.value.then(function (value) {
        markMethod('select', name, 'ok', describe(value));
      }, function (error) {
        markMethod('select', name, 'bad', error && error.message);
      });
      return;
    }
    markMethod('select', name, 'ok', describe(result.value));
  }

  function runFieldMethod(name) {
    if (!hasFields) {
      markMethod('field', name, 'warn', 'no field instance in this build');
      return;
    }
    if (name === 'destroy') {
      markMethod('field', name, 'warn', 'skipped: would tear down a lab instance');
      return;
    }
    var node = fieldInstances[fieldPick(name)] || fieldInstances['lab-all-field'];
    if (!node) {
      markMethod('field', name, 'warn', 'no matching field instance');
      return;
    }
    if (typeof node[name] !== 'function') {
      markMethod('field', name, 'bad', 'declared but not implemented on the field prototype');
      return;
    }
    var result = safe(function () { return node[name].apply(node, fieldArgs(name)); });
    if (!result.ok) {
      markMethod('field', name, 'bad', result.error.message);
      return;
    }
    if (result.value && typeof result.value.then === 'function') {
      result.value.then(function (value) {
        markMethod('field', name, 'ok', describe(value));
      }, function (error) {
        markMethod('field', name, 'bad', error && error.message);
      });
      return;
    }
    markMethod('field', name, 'ok', describe(result.value));
  }

  function runFormMethod(name) {
    if (!form) {
      markMethod('form', name, 'warn', 'form helpers need the full build');
      return;
    }
    if (name === 'destroyAll') {
      markMethod('form', name, 'warn', 'skipped: would tear down every lab instance');
      return;
    }
    var args = [];
    var target = '#lab-form';
    if (name === 'get') args = ['#lab-form-name'];
    if (name === 'registerIcon') { args = ['lab-probe-icon', LAB_ICON]; target = null; }
    if (name === 'observe') target = byId('lab-form');
    if (name === 'destroy' || name === 'refresh' || name === 'init') target = byId('lab-form');

    var result = safe(function () {
      if (name === 'registerIcon') return form.registerIcon(args[0], args[1]);
      return form[name].apply(form, target === null ? args : [target].concat(args));
    });
    if (!result.ok) {
      markMethod('form', name, 'bad', result.error.message);
      return;
    }
    if (name === 'observe' && result.value && result.value.disconnect) {
      result.value.disconnect();
      markMethod('form', name, 'ok', 'MutationObserver created and disconnected');
      return;
    }
    if (result.value && typeof result.value.then === 'function') {
      result.value.then(function (value) {
        markMethod('form', name, 'ok', describe(value));
      }, function (error) {
        markMethod('form', name, 'bad', error && error.message);
      });
      return;
    }
    markMethod('form', name, 'ok', describe(result.value));
  }
/* ---------------- interactions that fire the remaining events ---------------- */

  var refreshTimer = null;
  function refreshSoon() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      renderCoverage();
      renderEvents();
    }, 120);
  }

  function clickIn(root, selector) {
    if (!root) return false;
    var target = root.querySelector(selector);
    if (!target) return false;
    target.click();
    return true;
  }

  function fireInteractions() {
    var combobox = selectInstances['lab-combobox'];
    if (combobox) {
      combobox.open();
      var search = combobox.root && combobox.root.querySelector('.zs-input');
      if (search) {
        search.value = 'zzzz-no-match';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      combobox.close();
      combobox.open();
      clickIn(combobox.root, '.zs-option:not(.zs-option--disabled)');
      combobox.clear();
      combobox.announce('interaction pass');
    }

    var remote = selectInstances['lab-remote'];
    if (remote) {
      remote.open();
      var search = remote.root && remote.root.querySelector('.zs-input');
      if (search) {
        search.value = 'page';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      }
      /* load-more only fires once the first page resolved and hasMore is true */
      setTimeout(function () {
        if (remote.hasMoreResults()) remote.loadMore();
      }, 200);
    }

    var tags = selectInstances['lab-tags'];
    if (tags) {
      tags.addTag('EventTag');
      tags.moveTag(0, 1);
      tags.editTag(0, 'Edited');
      tags.removeTag(0);
    }

    /* drive the every-option probe so renderOption/filterOption/renderTag and
       the tag move/edit callbacks fire on a real instance */
    if (selectProbe) {
      selectProbe.open();
      var probeSearch = selectProbe.root && selectProbe.root.querySelector('.zs-input');
      if (probeSearch) {
        probeSearch.value = 'a';
        probeSearch.dispatchEvent(new Event('input', { bubbles: true }));
      }
      selectProbe.addTag('Probe');
      selectProbe.addTag('Second');
      if (selectProbe.getTags().length > 1) selectProbe.moveTag(0, 1);
      selectProbe.editTag(0, 'Edited');
      selectProbe.close();
    }

    var text = fieldInstances['lab-text'];
    if (text && text.el) {
      text.el.value = 'typed value';
      text.el.dispatchEvent(new Event('input', { bubbles: true }));
      text.el.dispatchEvent(new Event('change', { bubbles: true }));
      text.setValidation('invalid');
      text.setValidation('valid');
    }

    /* masked inputs suppress onInput (the mask rewrites the value), so drive the
       plain textarea probe to exercise the onInput callback */
    var noteProbe = fieldInstances['lab-all-field'];
    if (noteProbe && noteProbe.el) {
      noteProbe.el.value = (noteProbe.el.value || '') + ' typed';
      noteProbe.el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    ['lab-text', 'lab-password', 'lab-note'].forEach(function (id) {
      var instance = fieldInstances[id];
      if (!instance || !instance.root) return;
      clickIn(instance.root, '.zs-input-icon--action');
      clickIn(instance.root, '.zs-input-action');
      clickIn(instance.root, '.zs-input-clear');
      clickIn(instance.root, '.zs-clear');
    });

    var stepper = fieldInstances['lab-stepper'];
    if (stepper) { stepper.stepUp(); stepper.stepDown(); }

    var phone = fieldInstances['lab-phone'];
    if (phone) { phone.setPhoneCountry('GB'); phone.setPhoneFormat('national'); }

    var date = fieldInstances['lab-date'];
    if (date) date.openPicker();

    var file = fieldInstances['lab-upload'];
    if (file) {
      var sample = makeFile('event.txt');
      if (sample) { safe(function () { return file.addFiles([sample]); }); }
      safe(function () { return file.uploadAll(); });
      safe(function () { return file.removeFile(0); });
    }

    /* the upload pipeline: success, error + retry and cancel */
    var probe = state.uploadProbe;
    if (probe) {
      var probeFile = makeFile('pipeline.txt');
      if (probeFile) {
        if (probe.ok) {
          safe(function () { return probe.ok.addFiles([probeFile]); });
          safe(function () { return probe.ok.uploadAll(); });
        }
        if (probe.fail) {
          safe(function () { return probe.fail.addFiles([makeFile('pipeline.txt')]); });
          safe(function () { return probe.fail.uploadAll(); });
        }
        if (probe.cancel) {
          /* concurrency 1 + two files: the second queues (upload-queued), then
             cancelUpload() cancels the queued file and cancelAll() aborts the
             active one — both emit upload-cancel */
          var cancelA = makeFile('cancel-a.txt');
          var cancelB = makeFile('cancel-b.txt');
          if (cancelA && cancelB) {
            safe(function () { return probe.cancel.addFiles([cancelA, cancelB]); });
            safe(function () { return probe.cancel.uploadAll(); });
            safe(function () { return probe.cancel.cancelUpload(cancelB); });
            safe(function () { return probe.cancel.cancelAll(); });
          }
        }
      }
    }

    var check = fieldInstances['lab-check'];
    if (check) { check.setIndeterminate(false); check.setChecked(true); }

    var radio = fieldInstances['lab-radio'];
    if (radio) { radio.setValue('two'); radio.setValue(''); }

    /* async validation has its own event */
    if (runtime.text && fieldHost) {
      var node = document.createElement('input');
      node.type = 'text';
      node.id = 'lab-async-' + Date.now();
      node.style.position = 'absolute';
      node.style.left = '-9999px';
      fieldHost.appendChild(node);
      var asyncField = safe(function () {
        return new runtime.text(node, {
          label: 'Async probe',
          validate: function () {
            return new Promise(function (resolve) { setTimeout(function () { resolve(true); }, 30); });
          }
        });
      });
      if (asyncField.ok) {
        safe(function () { return asyncField.value.checkAsync(); });
        setTimeout(function () {
          safe(function () { return asyncField.value.validate(); });
        }, 40);
      }
    }
  }
/* ---------------- self-test orchestration ---------------- */

  function runAll() {
    if (!form) {
      log('bad', 'RUN', 'the selected build did not load — nothing to test');
      return;
    }
    log('ok', 'RUN', 'starting full self-test');
    INV.select.methods.forEach(runSelectMethod);
    INV.field.methods.forEach(runFieldMethod);
    INV.form.methods.forEach(runFormMethod);
    fireInteractions();
    refreshSoon();

    setTimeout(function () {
      fireInteractions();
      cssChecks();
      renderCoverage();
      renderEvents();
      renderAudit();
      var total = Object.keys(auditState).length;
      var bad = Object.keys(auditState).filter(function (id) {
        return auditState[id].status === 'bad';
      }).length;
      log(state.bugs.length ? 'warn' : 'ok', 'RUN',
        state.bugs.length + ' bug(s) · ' + bad + '/' + total + ' audit checks failing');
    }, 500);
  }

  function resetCoverage() {
    GROUPS.forEach(function (group) {
      state.tested[group.key] = {};
      state.outcome[group.key] = {};
    });
    state.eventsSeen = {};
    state.callbacks = {};
    state.bugs = [];
    if (logEl) logEl.innerHTML = '';
    Array.prototype.forEach.call(document.querySelectorAll('.lab-method'), function (button) {
      button.classList.remove('is-ok', 'is-bad', 'is-warn');
      button.title = '';
    });
    cssChecks();
    renderCoverage();
    renderEvents();
    log('ok', 'RESET', 'coverage cleared');
  }

  /* ---------------- init ---------------- */

  function init() {
    [
      ['Select lab', buildSelectLab],
      ['Select extras', buildSelectExtras],
      ['Field lab', buildFieldLab],
      ['Field extras', buildFieldExtras],
      ['Form lab', buildFormLab],
      ['Methods', buildMethods],
      ['CSS', cssChecks]
    ].forEach(function (step) {
      var result = safe(step[1]);
      if (!result.ok) recordBug('Builder · ' + step[0], (result.error && result.error.stack) || String(result.error));
    });
    renderCoverage();
    renderEvents();

    var runButton = byId('lab-run');
    if (runButton) runButton.addEventListener('click', runAll);
    var resetButton = byId('lab-reset');
    if (resetButton) resetButton.addEventListener('click', resetCoverage);
    var clearButton = byId('lab-clear');
    if (clearButton) clearButton.addEventListener('click', function () { if (logEl) logEl.innerHTML = ''; });

    log('ok', 'INIT', 'lab ready · ' + INV.select.options.length + ' select options · ' +
      INV.field.options.length + ' field options · ' + INV.events.length + ' events · ' +
      INV.css.classes.length + ' CSS classes · ' + INV.css.tokens.length + ' tokens');
  }

  init();
})();