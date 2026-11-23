(function () {
  'use strict';

  var form = window.ZidanForm;
  if (!form) return;

  /* ---------------- code tabs + copy ---------------- */

  function activeCode(block) {
    var panels = Array.prototype.slice.call(block.querySelectorAll('pre[data-lang]'));
    return panels.filter(function (pre) { return !pre.hidden; })[0] || panels[0];
  }

  Array.prototype.forEach.call(document.querySelectorAll('.adv-code'), function (block) {
    var buttons = Array.prototype.slice.call(block.querySelectorAll('.adv-code-tabs button'));
    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        var lang = button.getAttribute('data-lang');
        buttons.forEach(function (other) {
          other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
        });
        Array.prototype.forEach.call(block.querySelectorAll('pre[data-lang]'), function (pre) {
          pre.hidden = pre.getAttribute('data-lang') !== lang;
        });
      });
    });

    var copy = block.querySelector('.adv-copy');
    if (copy) {
      copy.addEventListener('click', function () {
        var pre = activeCode(block);
        var text = pre ? pre.textContent : '';
        var done = function () {
          copy.textContent = 'Copied';
          window.setTimeout(function () { copy.textContent = 'Copy'; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, done);
        } else {
          var area = document.createElement('textarea');
          area.value = text;
          document.body.appendChild(area);
          area.select();
          try { document.execCommand('copy'); } catch (error) { /* ignore */ }
          document.body.removeChild(area);
          done();
        }
      });
    }
  });

  function status(el, message, state) {
    if (!el) return;
    el.textContent = message;
    el.classList.toggle('is-ok', state === 'ok');
    el.classList.toggle('is-bad', state === 'bad');
  }

  /* ---------------- async validation ---------------- */

  var emailInput = document.getElementById('adv-email');
  var emailStatus = document.getElementById('adv-email-status');
  var checkButton = document.getElementById('adv-check');

  if (emailInput) {
    var email = form.field(emailInput, {
      label: 'Work email',
      clearable: true,
      alwaysValidate: true,
      showValidState: true,
      messages: { pending: 'Checking…', generic: 'That email is not available.' },
      validate: function (value, field, context) {
        if (!value) return true;
        return new Promise(function (resolve, reject) {
          var timer = window.setTimeout(function () {
            resolve(value.toLowerCase() === 'taken@example.com'
              ? 'This email is already registered.'
              : true);
          }, 650);
          if (context && context.signal) {
            context.signal.addEventListener('abort', function () {
              window.clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            }, { once: true });
          }
        });
      }
    });

    document.addEventListener('zidan:async-validation', function (event) {
      var detail = event.detail || {};
      if (!detail.valid && detail.message) {
        status(emailStatus, detail.message, 'bad');
      } else if (detail.valid) {
        status(emailStatus, 'Available — the native control is valid.', 'ok');
      }
    });

    if (checkButton) {
      checkButton.addEventListener('click', function () {
        status(emailStatus, 'Checking…');
        Promise.resolve(email.validate()).then(function (valid) {
          status(
            emailStatus,
            valid ? 'Available — the native control is valid.' : (email.errorMessage || 'That email is not available.'),
            valid ? 'ok' : 'bad'
          );
        });
      });
    }
  }

  /* ---------------- paged remote select ---------------- */

  var remoteSelect = document.getElementById('adv-remote');
  if (remoteSelect) {
    var people = [
      'Amara Okafor', 'Ben Carter', 'Chloé Martin', 'Diego Ruiz', 'Elin Berg',
      'Farah Haddad', 'Grace Kim', 'Hugo Silva', 'Imani Brooks', 'Jonas Weber',
      'Kavya Rao', 'Liam Murphy', 'Mina Sato', 'Noah Fischer', 'Olga Petrova',
      'Priya Nair', 'Quentin Dubois', 'Rosa Alvarez'
    ];
    var remoteEvent = document.getElementById('adv-remote-event');
    var remoteStatus = document.getElementById('adv-remote-status');

    var wait = function (ms, signal) {
      return new Promise(function (resolve, reject) {
        var timer = window.setTimeout(resolve, ms);
        if (signal) {
          signal.addEventListener('abort', function () {
            window.clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        }
      });
    };

    window.zidanSelect(remoteSelect, {
      mode: 'combobox',
      label: 'Assign reviewer',
      placeholder: 'Search 18 people…',
      fetchPageSize: 6,
      cacheResults: true,
      autoLoadMore: true,
      fetchOptions: function (query, signal, context) {
        return wait(320, signal).then(function () {
          var needle = String(query || '').toLowerCase();
          var matches = people.filter(function (name) {
            return name.toLowerCase().indexOf(needle) !== -1;
          });
          var start = context.page * context.pageSize;
          return {
            items: matches.slice(start, start + context.pageSize).map(function (name) {
              return { value: name.toLowerCase().replace(/\s+/g, '-'), label: name };
            }),
            hasMore: start + context.pageSize < matches.length
          };
        });
      },
      onLoadMore: function (event) {
        status(remoteEvent, 'Fetched page ' + (event.page + 1) + '. Scroll or press Load more for the next one.');
      },
      onChange: function (event) {
        status(remoteEvent, 'Selected: ' + (event.value || 'none'));
      }
    });

    status(remoteStatus, 'Open the list to fetch page 1 of 3 from the paged source.');
  }

  /* ---------------- tags ---------------- */

  var tagsSelect = document.getElementById('adv-tags');
  if (tagsSelect) {
    window.zidanSelect(tagsSelect, {
      mode: 'tags',
      label: 'Skills (max 4)',
      placeholder: 'Type a skill and press Enter',
      maxTags: 4,
      minTagLength: 2,
      allowFreeText: true,
      commitOnTab: true,
      validateTag: function (tag) {
        return tag.length <= 16 || 'Keep tags to 16 characters or fewer';
      }
    });
  }

  /* ---------------- phone + range ---------------- */

  var phoneInput = document.getElementById('adv-phone');
  if (phoneInput) {
    form.field(phoneInput, {
      label: 'UK phone',
      icon: 'phone',
      phone: { country: 'GB', format: 'international' }
    });
  }

  var rangeChrome = document.getElementById('adv-range-chrome');
  if (rangeChrome) {
    form.field(rangeChrome, {
      label: 'Delivery window',
      rangeTicks: [10, 20],
      rangeBubbleMode: 'active',
      rangeBubblePosition: 'bottom',
      rangeFill: false,
      rangeMinLabel: 'Low',
      rangeMaxLabel: 'High',
      rangeFormat: function (value) {
        return value + ' days';
      }
    });
  }

  var rangeInput = document.getElementById('adv-range');
  if (rangeInput) {
    form.field(rangeInput, {
      label: 'Budget',
      output: '#adv-range-out',
      rangeTicks: [0, 250, 500, 750, 1000],
      rangeTickLabels: true,
      rangeFormat: function (value) {
        return '€' + Number(value).toLocaleString('en-US');
      }
    });
  }

  /* ---------------- upload + RTL ---------------- */

  var fileInput = document.getElementById('adv-file');
  if (fileInput) {
    form.field(fileInput, {
      label: 'Reference files',
      variant: 'compact',
      maxFiles: 2,
      maxSizeMB: 2,
      simulateUpload: true,
      simulateDuration: 1400
    });
  }

  var rtlSelect = document.getElementById('adv-rtl');
  if (rtlSelect) {
    window.zidanSelect(rtlSelect, { mode: 'select', label: 'المدينة' });
  }
})();
