/* Demo-only behaviour for the ZidanForm showcase page. */
(function () {
  'use strict';

  /* Declarative no-JS path used by the "No-JS init" cards. Config is read by
     the DOMContentLoaded auto-init inside zidan-form.js, so set it first. */
  window.ZIDAN_FORM_CONFIG = {
    targets: ['#cms-country'],
    fieldTargets: [
      { selector: '#cms-email', options: { label: 'Work email', icon: 'mail', clearable: true } },
      { selector: '#cms-upload', options: { variant: 'dropzone', title: 'Drop a file — configured by ID' } }
    ]
  };

  var form = window.ZidanForm;
  var select = window.ZidanSelect;
  if (!form || !select) return;

  var params = new URLSearchParams(window.location.search);
  var embed = params.get('embed') === '1';
  if (embed) document.body.classList.add('embed');

  /* ---------------- demo-only icon registrations ---------------- */

  form.registerIcon('sparkle',
    '<path d="M12 3l1.9 5.3L19 10l-5.1 1.7L12 17l-1.9-5.3L5 10l5.1-1.7Z"/>' +
    '<path d="M18 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8Z"/>');
  form.registerIcon('document',
    '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>' +
    '<path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>');
  form.registerIcon('paperclip',
    '<path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7-7"/>');
  form.registerIcon('cloud',
    '<path d="M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.6 1.6A3.5 3.5 0 0 1 17.5 18Z"/>' +
    '<path d="M12 12v6"/><path d="m9.5 14.5 2.5-2.5 2.5 2.5"/>');

  /* JS-only options, configured before auto-init picks the rest up */
  var iconJs = document.getElementById('icon-js');
  if (iconJs) {
    window.zidanField(iconJs, {
      label: 'JS options only',
      icon: 'palette',
      iconPosition: 'right',
      iconClickable: true,
      iconLabel: 'Pick a brand colour'
    });
  }

  var rangeMinimal = document.getElementById('range-minimal');
  if (rangeMinimal) {
    window.zidanField(rangeMinimal, {
      rangeFormat: function (value) {
        return '€' + Number(value).toLocaleString('en-US');
      },
      rangeTicks: [0, 250, 500, 750, 1000],
      rangeTickLabels: true,
      rangeLabels: { 0: 'Free', 1000: 'Top' }
    });
  }

  var gallery = document.getElementById('file-gallery');
  if (gallery) {
    window.zidanField(gallery, {
      // custom uploader: call onProgress while working, then complete()
      upload: function (file, context) {
        var progress = 0;
        var timer = window.setInterval(function () {
          if (context.signal && context.signal.aborted) {
            window.clearInterval(timer);
            return;
          }
          progress = Math.min(99, progress + 9 + Math.round(Math.random() * 12));
          context.onProgress(progress);
          if (progress >= 99) {
            window.clearInterval(timer);
            window.setTimeout(function () {
              context.complete({ url: 'https://cdn.example.com/' + encodeURIComponent(file.name) });
            }, 350);
          }
        }, 150);
      }
    });
  }

  /* ---------------- remote pagination ---------------- */

  var remotePeople = document.getElementById('remote-people');
  if (remotePeople) {
    var firstNames = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Barbara', 'Edsger', 'Frances',
      'Ken', 'Dennis', 'Radia', 'Vint', 'Anita', 'Tim', 'Guido', 'Bjarne', 'Katherine', 'Donald',
      'Hedy', 'John', 'Mary', 'Shafi', 'Leslie', 'Niklaus', 'Jean', 'Sophie', 'Adele', 'Noor',
      'Hasan', 'Imani', 'Yusuf', 'Leila', 'Omar', 'Sana', 'Zara', 'Idris', 'Amina', 'Bilal',
      'Farah', 'Kareem', 'Nadia', 'Rami', 'Salma', 'Tariq', 'Yara', 'Zainab', 'Dalia'];
    var people = firstNames.map(function (name, index) {
      return { value: 'person-' + (index + 1), label: name + ' #' + (index + 1) };
    });
    var remoteStatus = document.getElementById('remote-status');
    window.zidanSelect(remotePeople, {
      mode: 'combobox',
      label: 'Owner',
      placeholder: 'Search people…',
      minChars: 0,
      fetchPageSize: 5,
      fetchOptions: function (query, signal, context) {
        return new Promise(function (resolve) {
          var text = String(query || '').toLowerCase();
          var matches = people.filter(function (person) {
            return !text || person.label.toLowerCase().indexOf(text) !== -1;
          });
          var start = context.page * context.pageSize;
          var items = matches.slice(start, start + context.pageSize);
          var timer = window.setTimeout(function () {
            if (remoteStatus) {
              remoteStatus.textContent = 'Page ' + (context.page + 1) + ' — showing '
                + Math.min(start + items.length, matches.length) + ' of ' + matches.length
                + (text ? ' matches' : ' people') + '.';
            }
            resolve({ items: items, hasMore: start + context.pageSize < matches.length });
          }, 380);
          if (signal) {
            signal.addEventListener('abort', function () { window.clearTimeout(timer); }, { once: true });
          }
        });
      }
    });
  }

  /* ---------------- async validation ---------------- */

  var asyncEmail = document.getElementById('async-email');
  if (asyncEmail) {
    var asyncForm = document.getElementById('async-form');
    var asyncResult = document.getElementById('async-result');
    var taken = ['ada@example.com', 'grace@example.com'];
    var asyncField = window.zidanField(asyncEmail, {
      label: 'Work email',
      icon: 'mail',
      hint: 'Try ada@example.com — the fake server says it is taken.',
      alwaysValidate: true,
      showValidState: true,
      validate: function (value, field, context) {
        if (!value) return true;
        return new Promise(function (resolve, reject) {
          var timer = window.setTimeout(function () {
            resolve(taken.indexOf(String(value).toLowerCase()) !== -1
              ? 'This address is already registered.'
              : true);
          }, 900);
          if (context.signal) {
            context.signal.addEventListener('abort', function () {
              window.clearTimeout(timer);
              var err = new Error('Aborted');
              err.name = 'AbortError';
              reject(err);
            }, { once: true });
          }
        });
      }
    });
    asyncEmail.addEventListener('zidan:async-validation', function (event) {
      if (!asyncResult) return;
      asyncResult.textContent = event.detail.valid
        ? 'Available — submit again to continue.'
        : event.detail.message;
    });
    if (asyncForm) {
      asyncForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (asyncResult) asyncResult.textContent = 'Checking…';
        asyncField.validate().then(function (valid) {
          if (!asyncResult) return;
          asyncResult.textContent = valid
            ? 'Submitted (demo only).'
            : (asyncField.errorMessage || 'Please fix the field.');
        });
      });
    }
  }

  /* ---------------- initialise ---------------- */

  window.initZidanSelects(document);
  window.initZidanForms(document);

  /* ---------------- phone format switcher ---------------- */

  document.querySelectorAll('[data-phone-format]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.querySelector(button.dataset.target || '');
      var field = target && target.__zidanField;
      if (!field || typeof field.setPhoneFormat !== 'function' || !field.phone) return;
      field.setPhoneFormat(button.dataset.phoneFormat);
      var group = button.parentNode;
      group.querySelectorAll('[data-phone-format]').forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
    });
  });

  var state = {
    theme: 'default',
    framework: 'none',
    selectLayout: 'classic-clean',
    fieldLayout: 'stacked',
    tab: 'all'
  };

  function excludesShowcase(node) {
    return !!(node.closest && node.closest('#theme-preview'));
  }

  /* ---------------- tabs ---------------- */

  var tablist = document.getElementById('demo-tabs');
  var tabs = tablist ? Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]')) : [];
  var panels = tabs.map(function (tab) {
    return document.getElementById(tab.getAttribute('aria-controls'));
  });

  function activateTab(name, options) {
    var cfg = options || {};
    var index = tabs.findIndex(function (tab) { return tab.dataset.tab === name; });
    if (index === -1) index = 0;
    state.tab = tabs[index].dataset.tab;

    tabs.forEach(function (tab, position) {
      var selected = position === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[position].hidden = !selected;
    });

    if (cfg.focus) tabs[index].focus();
    if (cfg.updateHash !== false) {
      var hash = '#' + state.tab;
      if (window.location.hash !== hash) {
        history.replaceState(null, '', hash);
      }
    }
    if (cfg.scroll && !embed) {
      var section = document.querySelector('.tabs-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { activateTab(tab.dataset.tab); });
    tab.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      activateTab(tabs[next].dataset.tab, { focus: true });
    });
  });

  document.querySelectorAll('[data-tab-link]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      activateTab(link.dataset.tabLink, { scroll: true });
    });
  });

  var initial = (window.location.hash || '').replace('#', '') || 'all';
  if (tabs.some(function (tab) { return tab.dataset.tab === initial; })) {
    activateTab(initial, { updateHash: false });
  }

  /* ---------------- scopes (theme / framework / layout) ---------------- */

  var autoThemeQuery = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;
  function resolvePageTheme(theme) {
    return theme === 'auto' ? (autoThemeQuery && autoThemeQuery.matches ? 'dark' : 'default') : theme;
  }

  function setFramework(instance, name) {
    if (!instance || !instance.root) return;
    if (typeof instance.setFramework === 'function') instance.setFramework(name);
    else instance.root.setAttribute('data-zs-framework', name);
  }

  function applyScope() {
    var pageTheme = resolvePageTheme(state.theme);
    document.documentElement.setAttribute('data-zs-theme', pageTheme);
    document.documentElement.setAttribute('data-zs-framework', state.framework);

    select.instances.forEach(function (instance) {
      if (excludesShowcase(instance.root)) return;
      if (instance.setTheme) instance.setTheme(state.theme === 'auto' ? 'auto' : pageTheme);
      else instance.root.setAttribute('data-zs-theme', pageTheme);
      setFramework(instance, state.framework);
      // an element that chose its own layout keeps it
      if (!instance.el.hasAttribute('data-zidan-layout')) {
        instance.root.setAttribute('data-zs-layout', state.selectLayout);
      }
    });

    form.fields.forEach(function (field) {
      if (!field.root || excludesShowcase(field.root)) return;
      if (field.setTheme) field.setTheme(state.theme === 'auto' ? 'auto' : pageTheme);
      else field.root.setAttribute('data-zs-theme', pageTheme);
      setFramework(field, state.framework);
      var declared = field.el.hasAttribute('data-zidan-layout') || field.el.hasAttribute('data-zs-layout');
      // per-element layouts win over the playground default
      if (!declared && (field.kind === 'input' || field.kind === 'textarea')) {
        field.root.setAttribute('data-zs-layout', state.fieldLayout);
      }
    });
  }

  function snippet() {
    return [
      '<!-- markup: everything is opt-in -->',
      '<form data-zs-theme="' + state.theme + '" data-zs-framework="' + state.framework + '">',
      '  <select data-zidan-select="combobox" data-zidan-layout="' + state.selectLayout + '"> … </select>',
      '  <input type="text" data-zidan="input" data-zidan-layout="' + state.fieldLayout + '">',
      '  <input type="checkbox" data-zidan="checkbox" data-zidan-variant="switch">',
      '  <input type="file" data-zidan="file">',
      '</form>',
      '',
      '// JS (optional when data-* auto-init is enough)',
      'initZidanSelects(document, {',
      "  themeFramework: '" + state.framework + "',",
      "  layout: '" + state.selectLayout + "',",
      "  theme: '" + state.theme + "'",
      '});',
      '',
      'ZidanForm.init(document, {',
      "  theme: '" + state.theme + "',",
      "  framework: '" + state.framework + "',",
      "  layout: '" + state.fieldLayout + "'",
      '});'
    ].join('\n');
  }

  var snippetEl = document.getElementById('snippet');
  function renderSnippet() {
    if (snippetEl) snippetEl.textContent = snippet();
  }

  var themeSelect = document.getElementById('opt-theme');
  var frameworkSelect = document.getElementById('opt-framework');
  var layoutSelect = document.getElementById('opt-layout');
  var fieldLayoutSelect = document.getElementById('opt-field-layout');

  function syncControls() {
    if (themeSelect) themeSelect.value = state.theme;
    if (frameworkSelect) frameworkSelect.value = state.framework;
    if (layoutSelect) layoutSelect.value = state.selectLayout;
    if (fieldLayoutSelect) fieldLayoutSelect.value = state.fieldLayout;
    var quick = document.getElementById('quick-theme');
    if (quick) quick.value = state.theme;
  }

  function commit() {
    applyScope();
    renderSnippet();
    syncControls();
  }

  [themeSelect, frameworkSelect, layoutSelect, fieldLayoutSelect].forEach(function (control) {
    if (!control) return;
    control.addEventListener('change', function () {
      if (control === themeSelect) state.theme = control.value;
      if (control === frameworkSelect) state.framework = control.value;
      if (control === layoutSelect) state.selectLayout = control.value;
      if (control === fieldLayoutSelect) state.fieldLayout = control.value;
      commit();
    });
  });

  var quickTheme = document.getElementById('quick-theme');
  if (quickTheme) {
    quickTheme.addEventListener('change', function () {
      state.theme = quickTheme.value;
      commit();
    });
  }

  var onAutoThemeChange = function () {
    if (state.theme !== 'auto') return;
    applyScope();
    renderSnippet();
    applyShowcase();
  };
  if (autoThemeQuery && autoThemeQuery.addEventListener) autoThemeQuery.addEventListener('change', onAutoThemeChange);
  else if (autoThemeQuery && autoThemeQuery.addListener) autoThemeQuery.addListener(onAutoThemeChange);

  /* ---------------- theme showcase ---------------- */

  var preview = document.getElementById('theme-preview');

  function applyShowcase() {
    if (!preview) return;
    var requestedTheme = preview.dataset.showcaseTheme || preview.getAttribute('data-zs-theme');
    preview.setAttribute('data-zs-theme', resolvePageTheme(requestedTheme));
    preview.setAttribute('data-zs-framework', preview.dataset.showcaseFramework || preview.getAttribute('data-zs-framework'));
    var framework = preview.getAttribute('data-zs-framework');
    select.instances.forEach(function (instance) {
      if (!preview.contains(instance.root)) return;
      if (instance.setTheme) instance.setTheme(requestedTheme);
      else instance.root.setAttribute('data-zs-theme', resolvePageTheme(requestedTheme));
      setFramework(instance, framework);
    });
    form.fields.forEach(function (field) {
      if (!field.root || !preview.contains(field.root)) return;
      if (field.setTheme) field.setTheme(requestedTheme);
      else field.root.setAttribute('data-zs-theme', resolvePageTheme(requestedTheme));
      setFramework(field, framework);
    });
  }

  document.querySelectorAll('[data-theme]').forEach(function (button) {
    button.addEventListener('click', function () {
      preview.dataset.showcaseTheme = button.dataset.theme;
      preview.setAttribute('data-zs-theme', button.dataset.theme);
      document.querySelectorAll('[data-theme]').forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
      applyShowcase();
    });
  });

  document.querySelectorAll('[data-framework]').forEach(function (button) {
    button.addEventListener('click', function () {
      preview.setAttribute('data-zs-framework', button.dataset.framework);
      document.querySelectorAll('[data-framework]').forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
      applyShowcase();
    });
  });

  /* ---------------- viewport & iframe testing ---------------- */

  var app = document.getElementById('demo-app');
  document.querySelectorAll('[data-width]').forEach(function (button) {
    button.addEventListener('click', function () {
      var value = button.dataset.width;
      if (value) app.setAttribute('data-preview', value);
      else app.removeAttribute('data-preview');
      document.querySelectorAll('[data-width]').forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
      if (document.getElementById('iframe-slot').hidden === false) loadFrame();
    });
  });

  var iframeSlot = document.getElementById('iframe-slot');
  var embedFrame = document.getElementById('embed-frame');
  var iframeButton = document.getElementById('btn-iframe');

  function loadFrame() {
    embedFrame.src = 'index.html?embed=1#' + state.tab;
  }

  if (iframeButton) {
    iframeButton.addEventListener('click', function () {
      var open = iframeSlot.hidden;
      iframeSlot.hidden = !open;
      iframeButton.setAttribute('aria-pressed', String(open));
      if (open) loadFrame();
    });
  }

  /* ---------------- copy config ---------------- */

  var copyButton = document.getElementById('copy-config');
  if (copyButton) {
    copyButton.addEventListener('click', function () {
      var text = snippet();
      var done = function () {
        copyButton.textContent = 'Copied';
        window.setTimeout(function () { copyButton.textContent = 'Copy'; }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        done();
      }
    });
  }

  /* ---------------- direct JS init playground ---------------- */

  var directCode = document.getElementById('direct-code');
  var directTarget = document.getElementById('direct-target');
  var directRun = document.getElementById('direct-run');
  var directDestroy = document.getElementById('direct-destroy');
  var directStatus = document.getElementById('direct-status');
  var directValue = document.getElementById('direct-value');
  var directOption = document.getElementById('direct-option');

  function directScopeNodes() {
    return Array.prototype.slice.call(document.querySelectorAll('#mymov, .mymovclass'));
  }

  function directDetails(node) {
    var instance = node.__zidanSelect;
    var selected = Array.prototype.map.call(node.selectedOptions || [], function (option) {
      return { value: option.value, label: option.text, disabled: option.disabled };
    });
    return {
      value: instance ? instance.getValue() : node.value,
      selected: selected
    };
  }

  function refreshDirect() {
    if (!directValue) return;
    var enhanced = directScopeNodes().filter(function (node) { return !!node.__zidanSelect; });
    if (!enhanced.length) {
      directValue.textContent = '—';
      directOption.textContent = '—';
      return;
    }
    var details = enhanced.map(directDetails);
    directValue.textContent = details.length === 1
      ? JSON.stringify(details[0].value)
      : JSON.stringify(details.map(function (item) { return item.value; }));
    directOption.textContent = details.length === 1
      ? JSON.stringify(details[0].selected[0] || null)
      : JSON.stringify(details.map(function (item) {
          return item.selected[0] ? item.selected[0].label : 'none';
        }));
  }

  function setDirectStatus(message, isError) {
    if (!directStatus) return;
    directStatus.textContent = message;
    directStatus.className = 'direct-status' + (isError ? ' is-error' : '');
  }

  function runDirectCode() {
    try {
      var selector = (directTarget.value || '').trim();
      if (!selector) throw new Error('Enter a selector, for example #mymov or .mymovclass.');
      var matches = Array.prototype.slice.call(document.querySelectorAll(selector))
        .filter(function (node) { return node.tagName === 'SELECT'; });
      if (!matches.length) throw new Error('No <select> matches ' + selector + '.');
      matches.forEach(function (node) {
        if (node.__zidanSelect) node.__zidanSelect.destroy();
      });
      var options = new Function('return (' + directCode.value + ');')();
      var result = window.zidanSelect(matches, options);
      var instances = Array.isArray(result) ? result : [result];
      refreshDirect();
      setDirectStatus('Enhanced ' + instances.length + ' select(s) with zidanSelect(' + selector +
        '). Pick an option to see getValue() and the selected <option> update.');
    } catch (error) {
      setDirectStatus('Error: ' + (error && error.message ? error.message : error), true);
    }
  }

  function destroyDirect() {
    var count = 0;
    directScopeNodes().forEach(function (node) {
      if (node.__zidanSelect) {
        node.__zidanSelect.destroy();
        count += 1;
      }
    });
    refreshDirect();
    setDirectStatus(count
      ? 'Destroyed ' + count + ' instance(s) — original native selects restored.'
      : 'Nothing to destroy — these selects are native.');
  }

  var directHost = document.getElementById('direct-demo');
  if (directHost) {
    directHost.addEventListener('zidan:change', refreshDirect);
  }

  if (directRun && directCode && directTarget) {
    directRun.addEventListener('click', runDirectCode);
    if (directDestroy) directDestroy.addEventListener('click', destroyDirect);
    directScopeNodes().forEach(function (node) {
      node.addEventListener('change', refreshDirect);
    });
    directCode.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        runDirectCode();
      }
    });
  }

  /* ---------------- indeterminate tri-state ---------------- */

  var parentBox = document.getElementById('cb-parent');
  var group = document.getElementById('tri-group');
  if (parentBox && group) {
    var children = Array.prototype.slice.call(group.querySelectorAll('input[type="checkbox"]'));

    var syncParent = function () {
      var checked = children.filter(function (box) { return box.checked; }).length;
      parentBox.checked = checked === children.length;
      parentBox.indeterminate = checked > 0 && checked < children.length;
      if (parentBox.__zidanField) parentBox.__zidanField.update();
    };

    parentBox.addEventListener('change', function () {
      children.forEach(function (box) {
        box.checked = parentBox.checked;
        if (box.__zidanField) box.__zidanField.update();
      });
      syncParent();
    });

    children.forEach(function (box) { box.addEventListener('change', syncParent); });
    syncParent();
  }

  /* ---------------- form validation summary ---------------- */

  var allForm = document.getElementById('form-all');
  var allStatus = document.getElementById('all-status');

  function setStatus(message, type, list) {
    if (!allStatus) return;
    allStatus.textContent = '';
    allStatus.dataset.state = type || '';
    if (!message) return;
    allStatus.appendChild(document.createTextNode(message));
    if (list && list.length) {
      var ul = document.createElement('ul');
      list.forEach(function (item) {
        var li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      });
      allStatus.appendChild(ul);
    }
  }

  if (allForm) {
    allForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var messages = [];
      var firstInvalid = null;

      form.fields.forEach(function (field) {
        if (!allForm.contains(field.el)) return;
        if (field.kind === 'radio-group') {
          var groupValid = field.validationTargets().every(function (input) { return input.validity.valid || !input.required; });
          field.setValidation(groupValid ? null : 'invalid');
          if (!groupValid) {
            messages.push((field.el.querySelector('legend') || {}).textContent || 'Choose an option');
            firstInvalid = firstInvalid || field.el;
          }
          return;
        }
        var input = field.el;
        if (!input.willValidate) return;
        if (input.validity.valid) {
          field.setValidation(null);
          return;
        }
        field.setValidation('invalid');
        messages.push((field.el.getAttribute('data-zidan-label') || input.name || 'Field') + ': ' + input.validationMessage);
        firstInvalid = firstInvalid || input;
      });

      if (messages.length) {
        setStatus('Please fix ' + messages.length + ' field' + (messages.length === 1 ? '' : 's') + ':', 'error', messages);
        if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
        return;
      }

      var data = new FormData(allForm);
      var parts = [];
      data.forEach(function (value, key) {
        if (value instanceof File) {
          parts.push(key + '=' + (value.name || 'file'));
        } else {
          parts.push(key + '=' + value);
        }
      });
      setStatus('Submitted — ' + parts.length + ' FormData entries: ' + parts.join(', '), 'success');
    });

    allForm.addEventListener('reset', function () {
      setStatus('');
    });
  }

  /* ---------------- file status ---------------- */

  var docsInput = document.getElementById('file-docs');
  var fileStatus = document.getElementById('file-status');
  if (docsInput && fileStatus) {
    docsInput.addEventListener('change', function () {
      var field = docsInput.__zidanField;
      var files = docsInput.files ? Array.prototype.slice.call(docsInput.files) : [];
      var message = field && field.status && field.status.textContent;
      fileStatus.textContent = message || (files.length ? files.length + ' file(s) attached' : '');
    });
  }

  /* ---------------- client-side image downscale ---------------- */

  var resizeInput = document.getElementById('file-resize');
  var resizeStatus = document.getElementById('file-resize-status');
  var resizeSample = document.getElementById('file-resize-sample');
  if (resizeInput && resizeStatus && window.zidanField) {
    var resizeOriginal = null;

    function resizeBytes(bytes) {
      if (!bytes && bytes !== 0) return 'unknown size';
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(2) + ' MB';
    }

    function resizeInfo(file) {
      return new Promise(function (resolve) {
        if (!file || typeof window.Image === 'undefined' || !window.URL || !window.URL.createObjectURL) {
          resolve(null);
          return;
        }
        var url = window.URL.createObjectURL(file);
        var image = new window.Image();
        var finish = function (info) {
          try { window.URL.revokeObjectURL(url); } catch (error) { /* already revoked */ }
          resolve(info);
        };
        image.onload = function () {
          finish({ width: image.naturalWidth || image.width, height: image.naturalHeight || image.height });
        };
        image.onerror = function () { finish(null); };
        image.src = url;
      });
    }

    var resizeField = window.zidanField(resizeInput, {
      label: 'Photo',
      title: 'Drop a large photo',
      hint: 'Max 600 × 400 · JPEG quality 0.8 · resized in the browser',
      accept: 'image/*',
      maxFiles: 1,
      autoUpload: true,
      showPreview: true,
      downscale: { maxWidth: 600, maxHeight: 400, quality: 0.8, mime: 'image/jpeg' },
      onChange: function (payload) {
        resizeOriginal = payload && payload.files && payload.files[0] ? payload.files[0] : null;
      },
      upload: function (file, context) {
        var original = resizeOriginal || file;
        Promise.all([resizeInfo(original), resizeInfo(file)]).then(function (sizes) {
          var before = sizes[0];
          var after = sizes[1];
          var dimensions = function (info) { return info ? info.width + ' × ' + info.height : 'dimensions unavailable'; };
          var saved = original.size - file.size;
          var note = saved > 0
            ? Math.round((saved / original.size) * 100) + '% smaller'
            : 'already within the limit — original kept';
          resizeStatus.textContent = 'Original ' + dimensions(before) + ' · ' + resizeBytes(original.size)
            + ' → resized ' + dimensions(after) + ' · ' + resizeBytes(file.size)
            + ' (' + note + '). Uploaded without leaving the browser.';
        });
        context.complete({ url: 'demo://photo' });
      }
    });

    if (resizeSample) {
      resizeSample.addEventListener('click', function () {
        var canvas = document.createElement('canvas');
        canvas.width = 2400;
        canvas.height = 1600;
        var context = canvas.getContext && canvas.getContext('2d');
        if (!context || !canvas.toBlob) {
          resizeStatus.textContent = 'This browser cannot generate the sample — pick an image instead.';
          return;
        }
        var gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#0f766e');
        gradient.addColorStop(0.5, '#2563eb');
        gradient.addColorStop(1, '#9333ea');
        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = 'rgba(255, 255, 255, 0.92)';
        context.font = 'bold 132px system-ui, sans-serif';
        context.fillText('2400 × 1600', 150, 780);
        context.font = '54px system-ui, sans-serif';
        context.fillText('generated sample for the downscale demo', 154, 880);
        canvas.toBlob(function (blob) {
          if (!blob) {
            resizeStatus.textContent = 'The sample could not be encoded — pick an image instead.';
            return;
          }
          var sample = new window.File([blob], 'sample-2400x1600.jpg', { type: 'image/jpeg' });
          resizeField.clear();
          resizeOriginal = sample;
          resizeField.addFiles([sample]);
        }, 'image/jpeg', 0.92);
      });
    }
  }

  /* ---------------- live event console ---------------- */

  var logList = document.getElementById('event-log');
  var logCount = document.getElementById('event-count');
  var logEmpty = document.getElementById('event-empty');
  var eventClear = document.getElementById('event-clear');
  var simInput = document.getElementById('file-sim');
  var logTotal = 0;

  var EVENT_NAMES = [
    'init', 'change', 'input', 'validation', 'async-validation', 'step', 'picker',
    'phone-country', 'phone-format', 'icon-click',
    'upload-start', 'upload-progress', 'upload-success', 'upload-error', 'upload-cancel',
    'remove', 'clear', 'error', 'reveal', 'open', 'close', 'select',
    'tag-add', 'tag-remove', 'tag-move', 'tag-edit', 'no-results', 'load-more',
    'validate', 'destroy'
  ];

  function refreshLogCount() {
    if (!logCount) return;
    logCount.textContent = logTotal + (logTotal === 1 ? ' event' : ' events');
    if (logEmpty) logEmpty.hidden = logTotal > 0;
  }

  EVENT_NAMES.forEach(function (name) {
    document.addEventListener('zidan:' + name, function (event) {
      var detail = event.detail || {};

      if (name === 'upload-progress' && simInput && detail.instance && detail.instance.el === simInput) {
        if (docsInput && fileStatus) {
          fileStatus.textContent = detail.name + ' — ' + detail.progress + '%';
        }
      }
      if (name === 'upload-success' && simInput && detail.instance && detail.instance.el === simInput) {
        if (docsInput && fileStatus) fileStatus.textContent = detail.name + ' uploaded (simulated).';
      }
      if (name === 'upload-error' && simInput && detail.instance && detail.instance.el === simInput) {
        if (docsInput && fileStatus) fileStatus.textContent = detail.name + ' failed: ' + (detail.message || 'error');
      }

      if (!logList) return;
      logTotal += 1;
      refreshLogCount();

      var parts = [];
      var instance = detail.instance;
      if (instance && instance.el) {
        var el = instance.el;
        var label = el.getAttribute('data-zidan-label') || el.name || el.id;
        if (label) parts.push(label);
      }
      Object.keys(detail).forEach(function (key) {
        if (key === 'instance' || key === 'kind' || key === 'file' || key === 'error' || key === 'result') return;
        var value = detail[key];
        if (value === undefined || value === null || value === '' || typeof value === 'object') return;
        parts.push(key + '=' + value);
      });
      if (detail.file && detail.file.name) parts.push('file=' + detail.file.name);

      var item = document.createElement('li');
      var time = document.createElement('time');
      time.textContent = new Date().toLocaleTimeString();
      var text = document.createElement('span');
      var strong = document.createElement('b');
      strong.textContent = event.type;
      text.appendChild(strong);
      if (parts.length) text.appendChild(document.createTextNode(' · ' + parts.join(' · ')));
      item.appendChild(time);
      item.appendChild(text);
      logList.appendChild(item);
      while (logList.children.length > 80) logList.removeChild(logList.firstChild);
      logList.scrollTop = logList.scrollHeight;
    });
  });

  if (eventClear) {
    eventClear.addEventListener('click', function () {
      if (logList) logList.textContent = '';
      logTotal = 0;
      refreshLogCount();
    });
  }
  refreshLogCount();

  /* ---------------- boot ---------------- */

  commit();
  applyShowcase();
})();
