/*
 * AJAX demo wiring.
 *
 * Card 1 needs no custom JavaScript for fetching — the select carries data-zidan-fetch-*
 * attributes and the plugin builds its own fetcher. The script prints async state and wires
 * the demo buttons.
 *
 * Card 2 builds fetchOptions over a static JSON file; card 3 adds a demo-only rejected
 * request so the error message and retry path are visible.
 */
(function () {
  'use strict';

  var productsEl = document.getElementById('products');
  var countriesEl = document.getElementById('country');
  var retryEl = document.getElementById('retry-country');
  var productsState = document.getElementById('products-state');
  var countriesState = document.getElementById('country-state');
  var retryState = document.getElementById('retry-state');

  if (!productsEl || !countriesEl) return;

  function instances() {
    return (window.ZidanSelect && window.ZidanSelect.instances) || [];
  }

  function instanceFor(element) {
    var list = instances();
    for (var i = 0; i < list.length; i++) {
      if (list[i].el === element) return list[i];
    }
    return null;
  }

  function readState(instance, label) {
    if (!instance) return label + ': waiting for the plugin to enhance the select…';
    var state = typeof instance.getAsyncState === 'function' ? instance.getAsyncState() : {};
    var rows = (instance.asyncItems || []).length;
    return [
      label,
      '  query    ' + JSON.stringify(state.query || ''),
      '  page     ' + (state.page || 0) + '   hasMore ' + !!state.hasMore,
      '  loading  ' + !!state.loading + '   fetchingMore ' + !!state.fetchingMore,
      '  rows     ' + rows + '   cache ' + Object.keys(instance._fetchCache || {}).length + ' page(s)',
      '  error    ' + (state.error ? String(state.error) : 'none')
    ].join('\n');
  }

  function paint() {
    if (productsState) productsState.textContent = readState(instanceFor(productsEl), 'dummyjson products');
    if (countriesState) countriesState.textContent = readState(instanceFor(countriesEl), 'countries.json');
    if (retryState) retryState.textContent = readState(instanceFor(retryEl), 'error & retry demo');
  }

  /* ---- card 1: declarative fetchUrl ---- */

  var moreButton = document.getElementById('products-more');
  var refreshButton = document.getElementById('products-refresh');

  if (moreButton) {
    moreButton.addEventListener('click', function () {
      var instance = instanceFor(productsEl);
      if (instance && typeof instance.loadMore === 'function') instance.loadMore();
      paint();
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener('click', function () {
      var instance = instanceFor(productsEl);
      if (instance && typeof instance.refreshOptions === 'function') instance.refreshOptions();
      paint();
    });
  }

  /* ---- card 2: hand-written fetchOptions ---- */

  function wait(ms, signal) {
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(resolve, ms);
      if (signal && signal.addEventListener) {
        signal.addEventListener('abort', function () {
          clearTimeout(timer);
          var error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        });
      }
    });
  }

  window.zidanSelect(countriesEl, {
    mode: 'combobox',
    placeholder: 'Type to search countries…',
    clearable: true,
    fetchPageSize: 5,
    minChars: 0,
    debounce: 200,
    loadMoreText: 'Load more countries',
    fetchOptions: function (query, signal, context) {
      var page = (context && context.page) || 0;
      var pageSize = (context && context.pageSize) || 5;
      return wait(300, signal)
        .then(function () {
          return fetch('demo-data/countries.json', { signal: signal });
        })
        .then(function (response) {
          if (!response.ok) throw new Error('countries.json responded ' + response.status);
          return response.json();
        })
        .then(function (rows) {
          var needle = String(query || '').trim().toLowerCase();
          var hits = needle
            ? rows.filter(function (row) { return row.name.toLowerCase().indexOf(needle) !== -1; })
            : rows;
          var start = page * pageSize;
          return {
            items: hits.slice(start, start + pageSize).map(function (row) {
              return { value: row.code, label: row.name };
            }),
            hasMore: start + pageSize < hits.length
          };
        });
    }
  });

  var countryMore = document.getElementById('country-more');
  var countryRefresh = document.getElementById('country-refresh');

  if (countryMore) {
    countryMore.addEventListener('click', function () {
      var instance = instanceFor(countriesEl);
      if (instance) instance.loadMore();
      paint();
    });
  }

  if (countryRefresh) {
    countryRefresh.addEventListener('click', function () {
      var instance = instanceFor(countriesEl);
      if (instance) instance.refreshOptions();
      paint();
    });
  }

  /* ---- card 3: rejected request and retry ---- */

  var failNextRequest = false;
  var retryFail = document.getElementById('retry-fail');
  var retryRequest = document.getElementById('retry-request');

  if (retryEl && window.zidanSelect) {
    window.zidanSelect(retryEl, {
      mode: 'combobox',
      placeholder: 'Open the list, then simulate a failure…',
      clearable: true,
      fetchPageSize: 5,
      minChars: 0,
      debounce: 200,
      loadMoreText: 'Load more countries',
      fetchOptions: function (query, signal, context) {
        var page = (context && context.page) || 0;
        var pageSize = (context && context.pageSize) || 5;
        return wait(300, signal)
          .then(function () {
            if (failNextRequest) {
              failNextRequest = false;
              throw new Error('Demo server is unavailable. Try again.');
            }
            return fetch('demo-data/countries.json', { signal: signal });
          })
          .then(function (response) {
            if (!response.ok) throw new Error('countries.json responded ' + response.status);
            return response.json();
          })
          .then(function (rows) {
            var needle = String(query || '').trim().toLowerCase();
            var hits = needle
              ? rows.filter(function (row) { return row.name.toLowerCase().indexOf(needle) !== -1; })
              : rows;
            var start = page * pageSize;
            return {
              items: hits.slice(start, start + pageSize).map(function (row) {
                return { value: row.code, label: row.name };
              }),
              hasMore: start + pageSize < hits.length
            };
          });
      }
    });

    if (retryFail) {
      retryFail.addEventListener('click', function () {
        var instance = instanceFor(retryEl);
        failNextRequest = true;
        if (instance) {
          instance.refreshOptions();
          instance.open();
        }
        paint();
      });
    }

    if (retryRequest) {
      retryRequest.addEventListener('click', function () {
        var instance = instanceFor(retryEl);
        if (instance) {
          if (instance.loadMoreError) instance.loadMore();
          else {
            instance.refreshOptions();
            instance.open();
          }
        }
        paint();
      });
    }
  }

  ['zidan:load-more', 'zidan:open', 'zidan:error', 'zidan:select', 'zidan:change'].forEach(function (name) {
    document.addEventListener(name, function (event) {
      var detail = event.detail || {};
      if (!detail.instance) return;
      if (detail.instance.el === productsEl || detail.instance.el === countriesEl || detail.instance.el === retryEl) paint();
    });
  });

  paint();
  setInterval(paint, 700);
})();
