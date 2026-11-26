(function () {
  'use strict';

  var getEl = document.getElementById('api-get');
  var postEl = document.getElementById('api-post');
  if (!getEl || !postEl || !window.zidanSelect) return;

  var getRequestEl = document.getElementById('api-get-request');
  var getStateEl = document.getElementById('api-get-state');
  var postRequestEl = document.getElementById('api-post-request');
  var postStateEl = document.getElementById('api-post-state');
  var methodOutput = document.getElementById('api-method-output');
  var headerButton = document.getElementById('api-get-header');
  var headerOn = true;

  /* ---------------- deterministic mock POST endpoint ---------------- */

  var ORDERS = [
    { id: 'ORD-1042', name: 'Ayesha Khan', total: 184.5, status: 'open' },
    { id: 'ORD-1043', name: 'Noah Williams', total: 92.0, status: 'paid' },
    { id: 'ORD-1044', name: 'Mina Sato', total: 310.25, status: 'open' },
    { id: 'ORD-1045', name: 'Luis Romero', total: 48.9, status: 'cancelled' },
    { id: 'ORD-1046', name: 'Priya Nair', total: 129.0, status: 'paid' },
    { id: 'ORD-1047', name: 'Ethan Brooks', total: 76.4, status: 'open' },
    { id: 'ORD-1048', name: 'Sofia Rossi', total: 221.8, status: 'paid' },
    { id: 'ORD-1049', name: 'Jonas Weber', total: 65.0, status: 'cancelled' }
  ];

  var realFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

  function parseBody(body) {
    if (!body) return null;
    if (typeof body === 'string') {
      try { return JSON.parse(body); } catch (error) { return body; }
    }
    return body;
  }

  function prettyBody(body) {
    var parsed = parseBody(body);
    if (parsed === null) return '—';
    if (typeof parsed === 'string') return parsed;
    try { return JSON.stringify(parsed, null, 2); } catch (error) { return String(parsed); }
  }

  function requestSummary(request) {
    var lines = [request.method + ' ' + request.url];
    var headerNames = Object.keys(request.headers || {});
    if (headerNames.length) {
      lines.push('');
      headerNames.forEach(function (name) {
        lines.push(name + ': ' + request.headers[name]);
      });
    }
    if (request.credentials) lines.push('credentials: ' + request.credentials);
    lines.push('body: ' + prettyBody(request.body));
    return lines.join('\n');
  }

  function stateSummary(select) {
    return JSON.stringify(select.getAsyncState(), null, 2);
  }

  function refreshLater() {
    window.setTimeout(function () {
      if (typeof renderGetState === 'function') renderGetState();
      if (typeof renderPostState === 'function') renderPostState();
    }, 0);
  }

  function observed(promise) {
    return promise.then(function (response) {
      refreshLater();
      return response;
    }, function (error) {
      refreshLater();
      throw error;
    });
  }

  function jsonResponse(data) {
    if (typeof window.Response === 'function') {
      return new window.Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: function () { return Promise.resolve(data); }
    };
  }

  function mockSearch(url, init) {
    return new Promise(function (resolve, reject) {
      var timer = window.setTimeout(function () {
        try {
          var parsed = new window.URL(url);
          var query = String(parsed.searchParams.get('q') || '').toLowerCase();
          var skip = Number(parsed.searchParams.get('skip') || 0);
          var limit = Number(parsed.searchParams.get('limit') || 3);
          var body = parseBody(init && init.body) || {};
          var statuses = Array.isArray(body.status) ? body.status : null;
          var rows = ORDERS.filter(function (order) {
            if (statuses && statuses.indexOf(order.status) === -1) return false;
            if (!query) return true;
            return order.name.toLowerCase().indexOf(query) !== -1 ||
              order.id.toLowerCase().indexOf(query) !== -1;
          });
          resolve(jsonResponse({
            rows: rows.slice(skip, skip + limit),
            total: rows.length,
            echoed: body
          }));
        } catch (error) {
          reject(error);
        }
      }, 300);
      if (init && init.signal) {
        init.signal.addEventListener('abort', function () {
          window.clearTimeout(timer);
          try { reject(new window.DOMException('Aborted', 'AbortError')); }
          catch (error) { reject(new Error('Aborted')); }
        }, { once: true });
      }
    });
  }

  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : input && input.url;
    var options = init || {};
    var method = String(options.method || (input && input.method) || 'GET').toUpperCase();
    var headers = {};
    Object.keys(options.headers || {}).forEach(function (name) {
      headers[name] = options.headers[name];
    });
    var request = {
      method: method,
      url: String(url),
      headers: headers,
      credentials: options.credentials || 'same-origin',
      body: options.body
    };
    refreshLater();

    if (String(url).indexOf('https://api.zidanform.test/search') === 0) {
      if (postRequestEl) postRequestEl.textContent = requestSummary(request);
      return observed(mockSearch(String(url), options));
    }
    if (String(url).indexOf('https://dummyjson.com/products/search') === 0) {
      if (getRequestEl) getRequestEl.textContent = requestSummary(request);
    }
    if (!realFetch) return Promise.reject(new Error('fetch is not available'));
    return observed(realFetch(input, init));
  };

  /* ---------------- instances ---------------- */

  var getSelect = window.zidanSelect(getEl, {});
  var postSelect = window.zidanSelect(postEl, {
    mode: 'combobox',
    fetchParams: { scope: 'demo' },
    fetchBody: { status: ['open', 'paid'], sort: 'newest' },
    fetchHeaders: { 'X-Demo-Client': 'zidanform-api' }
  });

  function renderGetState() {
    if (getStateEl) getStateEl.textContent = stateSummary(getSelect);
  }
  function renderPostState() {
    if (postStateEl) postStateEl.textContent = stateSummary(postSelect);
  }

  if (typeof window.MutationObserver === 'function') {
    new window.MutationObserver(renderGetState).observe(getSelect.dropdown, {
      childList: true, subtree: true, attributes: true
    });
    new window.MutationObserver(renderPostState).observe(postSelect.dropdown, {
      childList: true, subtree: true, attributes: true
    });
  }

  getEl.addEventListener('zidan:load-more', renderGetState);
  getEl.addEventListener('zidan:change', renderGetState);
  getEl.addEventListener('zidan:error', renderGetState);
  postEl.addEventListener('zidan:load-more', renderPostState);
  postEl.addEventListener('zidan:change', renderPostState);
  postEl.addEventListener('zidan:error', renderPostState);

  var moreButton = document.getElementById('api-get-more');
  if (moreButton) moreButton.addEventListener('click', function () {
    getSelect.loadMore().then(renderGetState, renderGetState);
  });

  var refreshButton = document.getElementById('api-get-refresh');
  if (refreshButton) refreshButton.addEventListener('click', function () {
    getSelect.refreshOptions();
    renderGetState();
  });

  if (headerButton) headerButton.addEventListener('click', function () {
    var headers = {};
    Object.keys(getSelect.opts.fetchHeaders || {}).forEach(function (name) {
      headers[name] = getSelect.opts.fetchHeaders[name];
    });
    headerOn = !headerOn;
    if (headerOn) headers['X-Demo-Client'] = 'zidanform-api';
    else delete headers['X-Demo-Client'];
    getSelect.opts.fetchHeaders = headers;
    getSelect.clearCache();
    getSelect.refreshOptions();
    headerButton.textContent = headerOn ? 'Turn demo header off' : 'Turn demo header on';
    renderGetState();
  });

  var postOpen = document.getElementById('api-post-open');
  if (postOpen) postOpen.addEventListener('click', function () {
    postSelect.open();
    renderPostState();
  });

  var postMore = document.getElementById('api-post-more');
  if (postMore) postMore.addEventListener('click', function () {
    postSelect.loadMore().then(renderPostState, renderPostState);
  });

  /* ---------------- public method runner ---------------- */

  function printable(value) {
    if (value === undefined) return 'undefined';
    if (value && value.el && typeof value.getAsyncState === 'function') return 'ZidanSelect instance (chainable)';
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return String(value);
    if (typeof value === 'string') return JSON.stringify(value);
    try { return JSON.stringify(value, null, 2); } catch (error) { return String(value); }
  }

  function runMethod(name) {
    if (!methodOutput) return;
    var result;
    try {
      if (name === 'loadMore') {
        methodOutput.textContent = 'loadMore() → waiting for the next page…';
        getSelect.loadMore().then(function (value) {
          methodOutput.textContent = 'loadMore() → ' + printable(value) + '\n\n' + stateSummary(getSelect);
          renderGetState();
        }, function (error) {
          methodOutput.textContent = 'loadMore() rejected → ' + error.message;
          renderGetState();
        });
        return;
      }
      result = getSelect[name]();
      methodOutput.textContent = name + '() → ' + printable(result) +
        (name === 'getAsyncState' || name === 'hasMoreResults' ? '' : '\n\n' + stateSummary(getSelect));
      renderGetState();
    } catch (error) {
      methodOutput.textContent = name + '() threw → ' + error.message;
    }
  }

  Array.prototype.slice.call(document.querySelectorAll('[data-api-method]')).forEach(function (button) {
    button.addEventListener('click', function () { runMethod(button.getAttribute('data-api-method')); });
  });

  renderGetState();
  renderPostState();
})();
