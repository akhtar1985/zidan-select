/* Shared demo header: collapses the project links into a menu button on small screens. */
(function () {
  'use strict';

  var mq = window.matchMedia('(max-width: 720px)');

  function setup(header) {
    var toggle = header.querySelector('.nav-toggle');
    var nav = header.querySelector('.header-nav');
    if (!toggle || !nav) return;

    function setOpen(open) {
      header.setAttribute('data-nav', open ? 'open' : 'collapsed');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    var quickTheme = header.querySelector('#quick-theme');
    if (quickTheme) {
      var autoQuery = typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
      var chosenTheme = 'default';
      var applyPageTheme = function (theme) {
        chosenTheme = theme;
        /* demo pages have no [data-zs-theme="auto"] CSS block, so resolve it
           here and keep every enhanced root on the same concrete theme */
        var resolved = theme === 'auto' ? (autoQuery && autoQuery.matches ? 'dark' : 'default') : theme;
        document.documentElement.setAttribute('data-zs-theme', resolved);
        if (window.ZidanSelect) {
          window.ZidanSelect.instances.forEach(function (instance) {
            if (instance.setTheme) instance.setTheme(theme === 'auto' ? 'auto' : resolved);
            else instance.root.setAttribute('data-zs-theme', resolved);
          });
        }
        if (window.ZidanForm) {
          window.ZidanForm.fields.forEach(function (field) {
            if (!field.root) return;
            if (field.setTheme) field.setTheme(theme === 'auto' ? 'auto' : resolved);
            else field.root.setAttribute('data-zs-theme', resolved);
          });
        }
      };
      var initialTheme = document.documentElement.getAttribute('data-zs-theme') || 'default';
      if (Array.prototype.some.call(quickTheme.options, function (option) { return option.value === initialTheme; })) {
        quickTheme.value = initialTheme;
        chosenTheme = initialTheme;
      }
      quickTheme.addEventListener('change', function () { applyPageTheme(quickTheme.value); });
      var onAutoChange = function () {
        if (chosenTheme === 'auto') applyPageTheme('auto');
      };
      if (autoQuery && autoQuery.addEventListener) autoQuery.addEventListener('change', onAutoChange);
      else if (autoQuery && autoQuery.addListener) autoQuery.addListener(onAutoChange);
    }

    // Only mark the header as enhanced once the toggle really works, so the links
    // stay reachable when the script is blocked.
    header.setAttribute('data-nav-ready', '');
    setOpen(!mq.matches);

    toggle.addEventListener('click', function () {
      setOpen(header.getAttribute('data-nav') !== 'open');
    });

    nav.addEventListener('click', function (event) {
      if (mq.matches && event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !mq.matches) return;
      if (header.getAttribute('data-nav') !== 'open') return;
      setOpen(false);
      toggle.focus();
    });

    document.addEventListener('click', function (event) {
      if (!mq.matches || header.getAttribute('data-nav') !== 'open') return;
      if (!header.contains(event.target)) setOpen(false);
    });

    function onBreakpoint() {
      setOpen(!mq.matches);
    }

    if (mq.addEventListener) mq.addEventListener('change', onBreakpoint);
    else if (mq.addListener) mq.addListener(onBreakpoint);
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('.site-header'), setup);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
