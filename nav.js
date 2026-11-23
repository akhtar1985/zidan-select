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
