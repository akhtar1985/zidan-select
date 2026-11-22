/* Demo-only behaviour for the ZidanForm showcase page. */
(function () {
  'use strict';

  var form = window.ZidanForm;
  var select = window.ZidanSelect;
  if (!form || !select) return;

  var params = new URLSearchParams(window.location.search);
  var embed = params.get('embed') === '1';
  if (embed) document.body.classList.add('embed');

  /* ---------------- initialise ---------------- */

  window.initZidanSelects(document);
  window.initZidanForms(document);

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

  function applyScope() {
    document.documentElement.setAttribute('data-zs-theme', state.theme);
    document.documentElement.setAttribute('data-zs-framework', state.framework);

    select.instances.forEach(function (instance) {
      if (excludesShowcase(instance.root)) return;
      instance.root.setAttribute('data-zs-theme', state.theme);
      instance.root.setAttribute('data-zs-framework', state.framework);
      // an element that chose its own layout keeps it
      if (!instance.el.hasAttribute('data-zidan-layout')) {
        instance.root.setAttribute('data-zs-layout', state.selectLayout);
      }
    });

    form.fields.forEach(function (field) {
      if (!field.root || excludesShowcase(field.root)) return;
      field.root.setAttribute('data-zs-theme', state.theme);
      field.root.setAttribute('data-zs-framework', state.framework);
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

  /* ---------------- theme showcase ---------------- */

  var preview = document.getElementById('theme-preview');

  function applyShowcase() {
    if (!preview) return;
    preview.setAttribute('data-zs-theme', preview.dataset.showcaseTheme || preview.getAttribute('data-zs-theme'));
    preview.setAttribute('data-zs-framework', preview.dataset.showcaseFramework || preview.getAttribute('data-zs-framework'));
    var theme = preview.getAttribute('data-zs-theme');
    var framework = preview.getAttribute('data-zs-framework');
    select.instances.forEach(function (instance) {
      if (!preview.contains(instance.root)) return;
      instance.root.setAttribute('data-zs-theme', theme);
      instance.root.setAttribute('data-zs-framework', framework);
    });
    form.fields.forEach(function (field) {
      if (!field.root || !preview.contains(field.root)) return;
      field.root.setAttribute('data-zs-theme', theme);
      field.root.setAttribute('data-zs-framework', framework);
    });
  }

  document.querySelectorAll('[data-theme]').forEach(function (button) {
    button.addEventListener('click', function () {
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

  /* ---------------- boot ---------------- */

  commit();
  applyShowcase();
})();
