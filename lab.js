/* API lab — live coverage for every option, callback, method and event.
   Loaded after demo.js on index.html. Everything here is demo-only. */
(function () {
  'use strict';

  var form = window.ZidanForm;
  var selectApi = window.ZidanSelect;
  var host = document.getElementById('panel-lab');
  if (!form || !selectApi || !host) return;

  /* ---------------- what "complete" means ---------------- */

  var EXPECTED = {
    selectOptions: [
      'mode', 'layout', 'themeFramework', 'theme', 'id', 'name', 'disabled', 'required',
      'options', 'value', 'label', 'ariaLabel', 'placeholder',
      'multiple', 'searchable', 'clearable', 'closeOnSelect', 'maxDropdownHeight',
      'noResultsText', 'emptyText', 'loadingText', 'clearText', 'requiredText',
      'accentInsensitive', 'highlightMatches', 'virtual', 'virtualThreshold', 'itemHeight',
      'typeAhead', 'typeAheadTimeout', 'locale',
      'fetchOptions', 'debounce', 'minChars', 'allowFreeText', 'searchValues',
      'fetchUrl', 'fetchQueryParam', 'fetchPageParam', 'fetchSkipParam',
      'fetchPageSize', 'fetchPageSizeParam', 'fetchItemsPath', 'fetchTotalPath',
      'fetchHasMorePath', 'fetchMethod', 'fetchHeaders', 'fetchCredentials',
      'autoLoadMore', 'cacheResults', 'loadMoreText',
      'maxTags', 'minTagLength', 'maxTagLength', 'reorderable', 'editable', 'caseSensitive', 'delimiters',
      'commitOnTab', 'commitOnBlur', 'suggestions', 'valueDelimiter',
      'customClasses', 'validation', 'scrollbar',
      'filterOption', 'renderOption', 'renderSelected', 'renderTag', 'validateTag', 'formatTag',
      'onInit', 'onChange', 'onSelect', 'onOpen', 'onClose',
      'onTagAdd', 'onTagRemove', 'onLoadMore', 'onError'
    ],
    fieldOptions: [
      'variant', 'layout', 'theme', 'framework', 'label', 'hint', 'description', 'descriptions',
      'validation', 'alwaysValidate', 'indeterminate', 'clearable', 'reveal',
      'prefix', 'suffix', 'counter', 'output', 'title', 'dropHint', 'accept',
      'mask', 'autogrow', 'autogrowMax',
      'maxFiles', 'maxSize', 'maxSizeMB', 'labels', 'clearLabel',
      'showPasswordLabel', 'hidePasswordLabel',
      'autoIcon', 'icon', 'iconPosition', 'iconClickable', 'iconLabel', 'validationIcon',
      'stepper', 'stepperPosition', 'stepperWrap', 'stepperLongPress', 'stepperDelay',
      'stepperInterval', 'stepperUpLabel', 'stepperDownLabel', 'stepperStep',
      'phone', 'phoneCountry', 'phoneFormat', 'phoneCountrySelect', 'phoneCountries',
      'phoneCountryLabel', 'phoneCountrySearchText', 'phoneCountryEmptyText',
      'rangeVariant', 'rangeBubble', 'rangeBubbleMode', 'rangeBubblePosition', 'rangeFill',
      'rangeMinMax', 'rangeMinLabel', 'rangeMaxLabel', 'rangeTicks', 'rangeTickLabels',
      'rangeLabels', 'rangeFormat',
      'pickerButton', 'pickerIcon', 'pickerLabel', 'disableWeekends', 'disabledDates',
      'validateDate',
      'fileVariant', 'uploadIcon', 'upload', 'uploadHandler', 'uploadUrl', 'uploadField',
      'uploadData', 'withCredentials', 'uploadHeaders', 'headers',
      'simulateUpload', 'simulateDuration', 'autoUpload', 'showFileMeta', 'showPreview',
      'replaceTitle', 'progressTemplate', 'uploadedLabel', 'failedLabel', 'canceledLabel',
      'cancelLabel', 'retryLabel', 'renderFile', 'downscale',
      'downscaleMaxWidth', 'downscaleMaxHeight', 'downscaleQuality', 'downscaleMaxBytes',
      'downscaleMime', 'downscaleForce',
      'switchStyle', 'onLabel', 'offLabel', 'deselectable', 'messages',
      'validate', 'showValidState'
    ],
    selectCallbacks: [
      'onInit', 'onChange', 'onSelect', 'onOpen', 'onClose',
      'onTagAdd', 'onTagRemove', 'onTagMove', 'onTagEdit', 'onLoadMore', 'onError'
    ],
    fieldCallbacks: [
      'onInit', 'onChange', 'onValidation', 'onRemove', 'onInput', 'onIconClick',
      'onStep', 'onPicker', 'onPhoneCountry', 'onPhoneFormat',
      'onUploadStart', 'onUploadProgress', 'onUploadSuccess', 'onUpload',
      'onUploadError', 'onUploadCancel'
    ],
    selectMethods: [
      'open', 'close', 'toggle', 'isOpen', 'getValue', 'setValue', 'clear', 'setOptions',
      'addTag', 'removeTag', 'getTags', 'getSelectedItems', 'moveTag', 'editTag',
      'selectAll', 'deselectAll', 'toggleAll', 'areAllSelected', 'enable', 'disable',
      'setTheme', 'setLayout', 'setFramework', 'setScrollbar', 'setValidation', 'refresh',
      'clearCache', 'loadMore', 'hasMoreResults', 'getAsyncState', 'refreshOptions',
      'on', 'off', 'announce', 'destroy'
    ],
    fieldMethods: [
      'setTheme', 'setFramework', 'setLayout', 'validationTargets', 'checkAsync',
      'setError', 'clearError', 'validate', 'setValidation', 'getValidation', 'isPending',
      'getValue', 'setValue', 'update', 'refresh', 'destroy',
      'setIndeterminate', 'setChecked', 'isChecked',
      'stepUp', 'stepDown', 'setStepper', 'openPicker', 'showPicker',
      'getPhoneCountry', 'setPhoneCountry', 'setPhoneFormat', 'formatPhone',
      'getUnmaskedValue', 'refreshAutogrow',
      'getFiles', 'getUploadState', 'addFiles', 'replaceFiles', 'removeFile', 'clear',
      'setVariant', 'setUploader', 'uploadAll', 'uploadFile', 'cancelUpload', 'cancelAll',
      'retryUpload'
    ],
    events: [
      'async-validation', 'change', 'clear', 'close', 'destroy', 'error', 'icon-click',
      'init', 'input', 'load-more', 'no-results', 'open', 'phone-country', 'phone-format',
      'picker', 'remove', 'reveal', 'select', 'step', 'tag-add', 'tag-remove', 'tag-move', 'tag-edit',
      'upload-cancel', 'upload-error', 'upload-progress', 'upload-start',
      'upload-success', 'validation', 'validate'
    ]
  };

  var used = Object.create(null);
  var seenEvents = Object.create(null);

  var logEl = document.getElementById('lab-log');
  var resultsEl = document.getElementById('lab-results');
  var coverageEl = document.getElementById('lab-coverage');
  var coverageList = document.getElementById('lab-coverage-list');
  var methodsEl = document.getElementById('lab-method-groups');
  var coverageLabels = {
    selectOptions: 'Select options',
    fieldOptions: 'Field options',
    selectCallbacks: 'Select callbacks',
    fieldCallbacks: 'Field callbacks',
    selectMethods: 'Select methods',
    fieldMethods: 'Field methods',
    events: 'DOM events'
  };

  function use(category) {
    for (var i = 1; i < arguments.length; i += 1) used[category + ':' + arguments[i]] = true;
  }

  function log(kind, message) {
    if (!logEl) return;
    var item = document.createElement('li');
    var time = document.createElement('time');
    time.textContent = new Date().toLocaleTimeString();
    var text = document.createElement('span');
    var strong = document.createElement('b');
    strong.textContent = kind;
    text.appendChild(strong);
    if (message) text.appendChild(document.createTextNode(' · ' + message));
    item.appendChild(time);
    item.appendChild(text);
    logEl.insertBefore(item, logEl.firstChild);
    while (logEl.children.length > 60) logEl.removeChild(logEl.lastChild);
  }

  function describe(payload) {
    if (!payload || typeof payload !== 'object') return payload == null ? '' : String(payload);
    var parts = [];
    ['value', 'state', 'message', 'tag', 'page', 'query', 'country', 'format', 'checked', 'type'].forEach(function (key) {
      var value = payload[key];
      if (value === undefined || value === null || value === '') return;
      if (typeof value === 'object') value = JSON.stringify(value);
      parts.push(key + '=' + value);
    });
    if (payload.files) parts.push('files=' + payload.files.length);
    if (payload.file && payload.file.name) parts.push('file=' + payload.file.name);
    if (payload.progress !== undefined) parts.push('progress=' + payload.progress);
    return parts.join(' ');
  }

  function hook(category, name, extra) {
    use(category, name);
    return function (payload) {
      log(name, describe(payload));
      if (typeof extra === 'function') extra(payload);
    };
  }

  function initSelect(target, options) {
    Object.keys(options).forEach(function (key) { use('selectOptions', key); });
    return window.zidanSelect(target, options);
  }

  function initField(target, options) {
    Object.keys(options).forEach(function (key) { use('fieldOptions', key); });
    return window.zidanField(target, options);
  }

  function delay(ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms || 0); });
  }

  function click(node, selector) {
    var target = node && node.querySelector ? node.querySelector(selector) : null;
    if (target && target.click) target.click();
    return !!target;
  }

  /* watch every event before anything is initialised, so zidan:init counts */
  EXPECTED.events.forEach(function (name) {
    document.addEventListener('zidan:' + name, function () {
      seenEvents[name] = (seenEvents[name] || 0) + 1;
    });
  });

  /* ---------------- selects ---------------- */

  var remoteStatus = document.getElementById('lab-remote-status');
  var remotePeople = ['Ada', 'Grace', 'Linus', 'Margaret', 'Alan', 'Barbara', 'Edsger', 'Frances', 'Ken'];

  var selectA = initSelect('#lab-select', {
    mode: 'combobox',
    layout: 'floating-label',
    themeFramework: 'none',
    theme: 'modern',
    id: 'lab-select-a',
    name: 'lab-plan',
    disabled: false,
    required: true,
    multiple: false,
    searchable: true,
    clearable: true,
    closeOnSelect: false,
    label: 'Lab plan',
    ariaLabel: 'Choose a lab plan',
    placeholder: 'Pick a plan…',
    value: 'pro',
    options: [
      { value: 'starter', label: 'Starter' },
      { value: 'pro', label: 'Pro' },
      { value: 'team', label: 'Team' },
      { value: 'enterprise', label: 'Enterprise', disabled: true }
    ],
    maxDropdownHeight: 220,
    noResultsText: 'Nothing matches that in the lab',
    emptyText: 'The lab list is empty',
    loadingText: 'Lab is thinking…',
    clearText: 'Clear the lab plan',
    scrollbar: 'thin',
    customClasses: { root: 'lab-custom-root', control: 'lab-custom-control', input: 'lab-custom-input' },
    validation: null,
    filterOption: function (item, query) {
      return !query || String(item.label).toLowerCase().indexOf(String(query).toLowerCase()) !== -1;
    },
    renderOption: function (item) {
      return '<span data-lab-option>' + item.label + '</span>';
    },
    onInit: hook('selectCallbacks', 'onInit'),
    onChange: hook('selectCallbacks', 'onChange'),
    onSelect: hook('selectCallbacks', 'onSelect'),
    onOpen: hook('selectCallbacks', 'onOpen'),
    onClose: hook('selectCallbacks', 'onClose'),
    onError: hook('selectCallbacks', 'onError')
  });

  /* large local list: diacritics, match highlighting, type-ahead and windowing */
  var labLarge = document.getElementById('lab-large');
  if (labLarge) {
    var accented = ['Café', 'Zürich', 'Señor', 'Ångström', 'Málaga', 'Kraków'];
    var cities = [];
    for (var cityIndex = 0; cityIndex < 240; cityIndex += 1) {
      cities.push({
        value: 'city-' + cityIndex,
        label: cityIndex % 40 === 0 ? accented[(cityIndex / 40) % accented.length] : 'City ' + (cityIndex + 1)
      });
    }
    initSelect('#lab-large', {
      mode: 'combobox',
      label: 'Search & scale',
      placeholder: 'Try cafe, zurich or angstrom…',
      multiple: false,
      searchable: true,
      required: true,
      requiredText: 'Pick a city from the list.',
      options: cities,
      accentInsensitive: true,
      highlightMatches: true,
      typeAhead: true,
      typeAheadTimeout: 700,
      virtual: 'auto',
      virtualThreshold: 120,
      itemHeight: 38,
      locale: 'en',
      onOpen: hook('selectCallbacks', 'onOpen'),
      onClose: hook('selectCallbacks', 'onClose'),
      onSelect: hook('selectCallbacks', 'onSelect')
    });
  }

  initSelect('#lab-disabled', {
    mode: 'select',
    disabled: true,
    label: 'Disabled by option',
    scrollbar: 'hidden',
    closeOnSelect: true,
    clearable: false,
    searchable: false,
    options: ['Disabled by the disabled option', 'Second option']
  });

  var tags = initSelect('#lab-tags', {
    mode: 'tags',
    multiple: true,
    searchable: true,
    clearable: true,
    closeOnSelect: false,
    label: 'Lab tags',
    placeholder: 'Add a tag…',
    options: ['Alpha', 'Beta', 'Gamma'],
    suggestions: ['Delta', 'Epsilon'],
    value: ['Alpha'],
    allowFreeText: true,
    caseSensitive: false,
    maxTags: 4,
    minTagLength: 2,
    maxTagLength: 16,
    reorderable: true,
    editable: true,
    delimiters: [',', ';'],
    commitOnTab: true,
    commitOnBlur: true,
    valueDelimiter: '|',
    maxDropdownHeight: 200,
    noResultsText: 'Press Enter to add it',
    scrollbar: 'fancy',
    renderTag: function (tag) { return String(tag.label || tag.value).toUpperCase(); },
    formatTag: function (tag) { return String(tag).replace(/\s+/g, ' ').toUpperCase(); },
    validateTag: function (tag) { return String(tag).length >= 2 || 'Use at least 2 characters'; },
    onInit: hook('selectCallbacks', 'onInit'),
    onChange: hook('selectCallbacks', 'onChange'),
    onOpen: hook('selectCallbacks', 'onOpen'),
    onClose: hook('selectCallbacks', 'onClose'),
    onTagAdd: hook('selectCallbacks', 'onTagAdd'),
    onTagRemove: hook('selectCallbacks', 'onTagRemove'),
    onTagMove: hook('selectCallbacks', 'onTagMove'),
    onTagEdit: hook('selectCallbacks', 'onTagEdit')
  });

  var multi = initSelect('#lab-multi', {
    mode: 'select',
    multiple: true,
    label: 'Multi with renderSelected',
    options: ['One', 'Two', 'Three'],
    renderSelected: function (item) { return '◉ ' + item.label; },
    onSelect: hook('selectCallbacks', 'onSelect')
  });

  var remote = initSelect('#lab-remote', {
    mode: 'combobox',
    label: 'Remote lab',
    placeholder: 'Search servers…',
    minChars: 0,
    debounce: 80,
    fetchPageSize: 3,
    autoLoadMore: true,
    cacheResults: true,
    loadMoreText: 'Load the next three',
    searchValues: true,
    fetchOptions: function (query, signal, context) {
      return new Promise(function (resolve, reject) {
        var timer = window.setTimeout(function () {
          var text = String(query || '').toLowerCase();
          if (text.indexOf('err') === 0) {
            reject(new Error('Lab server is offline'));
            return;
          }
          var matches = remotePeople.filter(function (name) {
            return !text || name.toLowerCase().indexOf(text) !== -1;
          });
          var start = context.page * context.pageSize;
          var items = matches.slice(start, start + context.pageSize).map(function (name, index) {
            return { value: 'srv-' + (start + index + 1), label: name + ' server' };
          });
          if (remoteStatus) {
            remoteStatus.textContent = 'Page ' + (context.page + 1) + ' · '
              + Math.min(start + items.length, matches.length) + ' of ' + matches.length
              + (text ? ' matches' : ' servers');
          }
          resolve({ items: items, hasMore: start + context.pageSize < matches.length });
        }, 120);
        if (signal) signal.addEventListener('abort', function () { window.clearTimeout(timer); }, { once: true });
      });
    },
    onInit: hook('selectCallbacks', 'onInit'),
    onLoadMore: hook('selectCallbacks', 'onLoadMore'),
    onError: hook('selectCallbacks', 'onError')
  });

  var declarative = initSelect('#lab-declarative', {
    mode: 'combobox',
    label: 'Declarative remote lab',
    placeholder: 'Search DummyJSON users…',
    minChars: 0,
    debounce: 200,
    fetchUrl: 'https://dummyjson.com/users/search',
    fetchQueryParam: 'q',
    fetchPageParam: 'page',
    fetchSkipParam: 'skip',
    fetchPageSize: 3,
    fetchPageSizeParam: 'limit',
    fetchItemsPath: 'users',
    fetchTotalPath: 'total',
    fetchHasMorePath: null,
    fetchMethod: 'GET',
    fetchHeaders: null,
    fetchCredentials: 'same-origin',
    autoLoadMore: true,
    cacheResults: true,
    loadMoreText: 'Load more users',
    onInit: hook('selectCallbacks', 'onInit'),
    onLoadMore: hook('selectCallbacks', 'onLoadMore'),
    onError: hook('selectCallbacks', 'onError')
  });

  /* ---------------- fields ---------------- */

  var textStatus = document.getElementById('lab-text-status');
  var phoneStatus = document.getElementById('lab-phone-status');

  var labText = initField('#lab-text', {
    variant: 'default',
    layout: 'stacked',
    theme: 'modern',
    framework: 'none',
    label: 'Lab text input',
    hint: 'Every text-option is configured here.',
    description: 'Type “taken” to watch async validation resolve.',
    validation: null,
    required: false,
    clearable: true,
    clearLabel: 'Erase the lab value',
    prefix: 'lab://',
    suffix: '.txt',
    icon: 'sparkle',
    iconPosition: 'right',
    iconClickable: true,
    iconLabel: 'Insert a suggestion',
    validationIcon: true,
    alwaysValidate: true,
    showValidState: true,
    messages: { required: 'The lab needs a value.', generic: 'The lab rule failed.' },
    validate: function (value) {
      if (value === 'taken') {
        return new Promise(function (resolve) {
          window.setTimeout(function () { resolve('“taken” is reserved in the lab.'); }, 40);
        });
      }
      return value === 'fail' ? 'The lab rejects “fail”.' : true;
    },
    onInit: hook('fieldCallbacks', 'onInit'),
    onChange: hook('fieldCallbacks', 'onChange'),
    onInput: hook('fieldCallbacks', 'onInput'),
    onIconClick: hook('fieldCallbacks', 'onIconClick', function () {
      labText.setValue('lab://sparkle.txt');
    }),
    onValidation: hook('fieldCallbacks', 'onValidation', function (payload) {
      if (textStatus) textStatus.textContent = 'validation=' + (payload.state || 'null')
        + (payload.message ? ' — ' + payload.message : '');
    })
  });

  var labMask = initField('#lab-mask', {
    label: 'Masked phone',
    mask: '(###) ###-####',
    hint: 'Type digits — literals are inserted automatically.',
    clearable: true
  });

  initField('#lab-password', {
    label: 'Lab password',
    reveal: true,
    clearable: true,
    showPasswordLabel: 'Reveal',
    hidePasswordLabel: 'Conceal'
  });

  initField('#lab-email', {
    label: 'Lab email (auto icon)',
    autoIcon: true,
    clearable: true,
    validationIcon: true
  });

  var labNote = initField('#lab-note', {
    label: 'Lab textarea',
    counter: 120,
    autogrow: true,
    autogrowMax: 180,
    hint: 'Autogrow stops at 180px; the counter override wins over maxlength.',
    clearable: true
  });

  var labRange = initField('#lab-range', {
    rangeVariant: 'gradient',
    rangeBubble: true,
    rangeBubbleMode: 'active',
    rangeBubblePosition: 'bottom',
    rangeFill: false,
    rangeMinMax: true,
    rangeMinLabel: 'Low',
    rangeMaxLabel: 'High',
    rangeTicks: [0, 50, 100],
    rangeTickLabels: true,
    rangeLabels: { 0: 'Low', 50: 'Mid', 100: 'High' },
    rangeFormat: function (value) { return value + '%'; },
    output: '#lab-range-output'
  });

  var stepper = initField('#lab-stepper', {
    stepper: 'stacked',
    stepperPosition: 'right',
    stepperWrap: true,
    stepperLongPress: false,
    stepperDelay: 420,
    stepperInterval: 90,
    stepperUpLabel: 'Add five',
    stepperDownLabel: 'Remove five',
    stepperStep: 5,
    onStep: hook('fieldCallbacks', 'onStep')
  });

  var phone = initField('#lab-phone', {
    phone: true,
    phoneCountry: 'GB',
    phoneFormat: 'national',
    phoneCountrySelect: true,
    phoneCountries: 'US,GB,DE,PK',
    phoneCountryLabel: 'Lab country code',
    phoneCountrySearchText: 'Search the lab countries',
    phoneCountryEmptyText: 'No lab country matches',
    onPhoneCountry: hook('fieldCallbacks', 'onPhoneCountry', function (payload) {
      if (phoneStatus) phoneStatus.textContent = 'country=' + payload.country
        + ' · format=' + phone.getPhoneCountry();
    }),
    onPhoneFormat: hook('fieldCallbacks', 'onPhoneFormat', function (payload) {
      if (phoneStatus) phoneStatus.textContent = 'format=' + payload.format;
    })
  });

  var datePicker = initField('#lab-date', {
    pickerButton: true,
    pickerIcon: 'calendar',
    pickerLabel: 'Open the lab calendar',
    disableWeekends: true,
    disabledDates: function (value) {
      return String(value || '').slice(-2) === '13';
    },
    validateDate: function (value) {
      if (!value) return true;
      return Number(String(value).slice(-2)) % 2 === 0 || 'Pick an even day in the lab.';
    },
    onPicker: hook('fieldCallbacks', 'onPicker')
  });

  var checkbox = initField('#lab-check', {
    variant: 'card',
    description: 'Card checkbox wired with indeterminate.',
    indeterminate: true,
    onChange: hook('fieldCallbacks', 'onChange')
  });

  initField('#lab-switch', {
    variant: 'switch',
    switchStyle: 'ios',
    onLabel: 'Lab on',
    offLabel: 'Lab off'
  });

  var radio = document.getElementById('lab-radio');
  radio.setAttribute('data-zidan', 'radio-group');
  radio = initField(radio, {
    variant: 'tile',
    labels: { a: 'Plan A', b: 'Plan B', c: 'Plan C' },
    descriptions: { a: 'First option', b: 'Second option', c: 'Third option' },
    deselectable: true,
    onChange: hook('fieldCallbacks', 'onChange')
  });

  function labUploader(file, context) {
    var timers = [];
    context.onProgress(15);
    timers.push(window.setTimeout(function () { context.onProgress(65); }, 160));
    timers.push(window.setTimeout(function () {
      if (/fail/i.test(file.name)) context.fail(new Error('The lab rejected ' + file.name));
      else context.complete({ url: 'lab://' + encodeURIComponent(file.name) });
    }, 340));
    if (context.signal) {
      context.signal.addEventListener('abort', function () {
        timers.forEach(function (timer) { window.clearTimeout(timer); });
      }, { once: true });
    }
  }

  var upload = initField('#lab-upload', {
    fileVariant: 'dropzone',
    uploadIcon: 'cloud',
    title: 'Lab upload',
    dropHint: 'Local uploader — nothing leaves the browser',
    accept: 'image/*,.pdf,.txt',
    maxFiles: 2,
    maxSizeMB: 2,
    downscale: true,
    downscaleMaxWidth: 1024,
    downscaleMaxHeight: 1024,
    downscaleQuality: 0.85,
    downscaleMaxBytes: 0,
    downscaleMime: 'image/jpeg',
    downscaleForce: false,
    autoUpload: true,
    showFileMeta: true,
    showPreview: true,
    replaceTitle: 'Swap lab file',
    upload: labUploader,
    uploadField: 'lab_file',
    uploadData: { folder: 'lab' },
    uploadHeaders: { 'X-Lab': 'coverage' },
    withCredentials: false,
    progressTemplate: 'Lab … {percent}%',
    uploadedLabel: 'Stored',
    failedLabel: 'Failed',
    canceledLabel: 'Stopped',
    cancelLabel: 'Stop',
    retryLabel: 'Again',
    renderFile: function (item) {
      item.className += ' lab-file-row';
    },
    onInit: hook('fieldCallbacks', 'onInit'),
    onChange: hook('fieldCallbacks', 'onChange'),
    onRemove: hook('fieldCallbacks', 'onRemove'),
    onValidation: hook('fieldCallbacks', 'onValidation'),
    onUploadStart: hook('fieldCallbacks', 'onUploadStart'),
    onUploadProgress: hook('fieldCallbacks', 'onUploadProgress'),
    onUploadSuccess: hook('fieldCallbacks', 'onUploadSuccess'),
    onUpload: hook('fieldCallbacks', 'onUpload'),
    onUploadError: hook('fieldCallbacks', 'onUploadError'),
    onUploadCancel: hook('fieldCallbacks', 'onUploadCancel')
  });

  initField('#lab-upload-sim', {
    fileVariant: 'compact',
    uploadIcon: 'upload',
    title: 'Simulated upload',
    dropHint: 'Visual pipeline only',
    maxFiles: 1,
    simulateUpload: true,
    simulateDuration: 400,
    autoUpload: true,
    showFileMeta: true,
    showPreview: false
  });

  initField('#lab-upload-xhr', {
    fileVariant: 'button',
    uploadIcon: 'paperclip',
    title: 'XHR configuration only',
    uploadUrl: '/lab-upload',
    uploadField: 'file',
    uploadData: function () { return { scope: 'lab' }; },
    uploadHeaders: function () { return { 'X-Lab': 'xhr' }; },
    withCredentials: false,
    autoUpload: false,
    showFileMeta: true,
    showPreview: true,
    replaceTitle: 'Swap attachment'
  });

  /* form-level helpers: serialize() and validate() */
  var helperForm = document.getElementById('lab-form');
  var helperOutput = document.getElementById('lab-form-output');
  var helperName = initField('#lab-form-name', {
    label: 'Full name',
    hint: 'A custom rule requires at least two characters.',
    validate: function (value) {
      return String(value || '').trim().length >= 2 || 'Please enter at least two characters.';
    }
  });
  var helperEmail = initField('#lab-form-email', {
    label: 'Email',
    autoIcon: true
  });
  initField('#lab-form-note', {
    label: 'Note',
    counter: 120,
    autogrow: true,
    autogrowMax: 140
  });

  var serializeButton = document.getElementById('lab-form-serialize');
  if (serializeButton && helperForm) {
    serializeButton.addEventListener('click', function () {
      var data = form.serialize(helperForm);
      if (helperOutput) helperOutput.textContent = JSON.stringify(data, null, 2);
    });
  }
  var validateButton = document.getElementById('lab-form-validate');
  if (validateButton && helperForm) {
    validateButton.addEventListener('click', function () {
      if (helperOutput) helperOutput.textContent = 'Validating…';
      form.validate(helperForm, { focus: false }).then(function (valid) {
        if (helperOutput) {
          helperOutput.textContent = valid
            ? 'form is valid — every field rule and native constraint passed'
            : 'form is invalid — focus the highlighted control and fix it';
        }
      }, function (error) {
        if (helperOutput) helperOutput.textContent = 'validation failed: ' + error.message;
      });
    });
  }

  /* a throwaway field used by the method tests; hidden from the page */
  var probeHost = document.getElementById('lab-probe-host');
  var probeInput = document.createElement('input');
  probeInput.type = 'file';
  probeInput.multiple = true;
  probeHost.appendChild(probeInput);

  var pendingUpload = null;
  function stallUploader(file, context) {
    context.onProgress(10);
    pendingUpload = context;
  }

  var probe = initField(probeInput, {
    label: 'Method probe',
    hint: 'Used by the method self-tests',
    variant: 'default',
    fileVariant: 'compact',
    maxFiles: 4,
    maxSize: 1048576,
    autoUpload: false,
    uploadHandler: stallUploader,
    headers: { 'X-Probe': '1' }
  });

  /* ---------------- method runners ---------------- */

  var tempHost = probeHost;
  var pendingTemp = null;

  function makeTempSelect() {
    var el = document.createElement('select');
    var one = document.createElement('option');
    one.value = 'one';
    one.textContent = 'One';
    var two = document.createElement('option');
    two.value = 'two';
    two.textContent = 'Two';
    el.appendChild(one);
    el.appendChild(two);
    tempHost.appendChild(el);
    pendingTemp = window.zidanSelect(el, {
      options: ['one', 'two'],
      onChange: function () { throw new Error('Lab callback error'); }
    });
    return pendingTemp;
  }

  function asFile(name) {
    return new window.File(['lab'], name || 'probe.txt', { type: 'text/plain' });
  }

  function resetProbe() {
    probe.clear();
    probe.setUploader(stallUploader);
    pendingUpload = null;
    return probe;
  }

  function currentProbeFile() {
    return probe.getFiles()[0] || null;
  }

  var METHOD_GROUPS = [
    {
      title: 'Select instance',
      methods: [
        { name: 'open', run: function () { selectA.open(); return 'isOpen=' + selectA.isOpen(); } },
        { name: 'close', run: function () { selectA.close(); return 'isOpen=' + selectA.isOpen(); } },
        { name: 'toggle', run: function () { selectA.toggle(); var open = selectA.isOpen(); selectA.toggle(); return 'toggled from ' + open; } },
        { name: 'isOpen', run: function () { return 'isOpen=' + selectA.isOpen(); } },
        { name: 'getValue', run: function () { return 'value=' + selectA.getValue(); } },
        { name: 'setValue', run: function () { selectA.setValue('team'); var value = selectA.getValue(); selectA.setValue('pro'); return 'set team → ' + value; } },
        { name: 'clear', run: function () { selectA.open(); selectA.clear(); var value = selectA.getValue(); selectA.setValue('pro'); return 'cleared → ' + JSON.stringify(value); } },
        {
          name: 'setOptions',
          run: function () {
            selectA.setOptions([
              { value: 'starter', label: 'Starter' },
              { value: 'pro', label: 'Pro' },
              { value: 'team', label: 'Team' }
            ]);
            selectA.setValue('pro');
            return 'options=' + selectA.el.options.length + ' (native <option>s rebuilt)';
          }
        },
        { name: 'addTag', run: function () { tags.addTag('LabExtra'); return 'tags=' + tags.getTags().join('|'); } },
        { name: 'removeTag', run: function () { tags.removeTag('LabExtra'); return 'tags=' + tags.getTags().join('|'); } },
        { name: 'getTags', run: function () { return 'tags=' + tags.getTags().join('|'); } },
        { name: 'getSelectedItems', run: function () { return 'items=' + JSON.stringify(tags.getSelectedItems()); } },
        {
          name: 'moveTag',
          run: function () {
            var before = tags.getTags().slice();
            var moved = tags.moveTag(0, tags.getTags().length - 1);
            var after = tags.getTags().slice();
            if (moved) tags.moveTag(after.length - 1, 0);
            return moved + ': ' + before.join('|') + ' → ' + after.join('|');
          }
        },
        {
          name: 'editTag',
          run: function () {
            var first = tags.getTags()[0];
            var changed = tags.editTag(first, first + ' *');
            if (changed) tags.editTag(first + ' *', first);
            return 'renamed=' + changed;
          }
        },
        {
          name: 'selectAll',
          run: function () {
            multi.selectAll();
            var all = multi.getValue().slice();
            multi.deselectAll();
            return 'selected=' + all.join('|');
          }
        },
        {
          name: 'deselectAll',
          run: function () {
            multi.selectAll();
            multi.deselectAll();
            return 'left=' + multi.getValue().length;
          }
        },
        {
          name: 'toggleAll',
          run: function () {
            multi.toggleAll();
            var filled = multi.areAllSelected();
            multi.toggleAll();
            return 'filled=' + filled + ' empty=' + (multi.getValue().length === 0);
          }
        },
        { name: 'areAllSelected', run: function () { return 'all=' + multi.areAllSelected(); } },

        { name: 'enable', run: function () { selectA.enable(); return 'disabled=' + selectA.input.disabled; } },
        { name: 'disable', run: function () { selectA.disable(); var off = selectA.input.disabled; selectA.enable(); return 'disabled while running=' + off; } },
        { name: 'setTheme', run: function () { selectA.setTheme('auto'); var auto = selectA.root.getAttribute('data-zs-theme'); selectA.setTheme('modern'); return 'auto resolved to ' + auto + ', restored modern'; } },
        { name: 'setLayout', run: function () { selectA.setLayout('classic-clean'); selectA.setLayout('floating-label'); return 'layout restored'; } },
        { name: 'setFramework', run: function () { selectA.setFramework('none'); return 'framework=' + selectA.framework; } },
        { name: 'setScrollbar', run: function () { selectA.setScrollbar('fancy'); selectA.setScrollbar('thin'); return 'scrollbar cycled'; } },
        { name: 'setValidation', run: function () { selectA.setValidation('valid'); var state = selectA.opts.validation; selectA.setValidation(null); return 'state=' + state; } },
        { name: 'refresh', run: function () { selectA.refresh(); return 're-rendered'; } },
        { name: 'clearCache', run: function () { remote.clearCache(); return 'remote cache dropped'; } },
        {
          name: 'loadMore',
          run: function () {
            remote.open();
            return delay(180).then(function () {
              return remote.loadMore();
            }).then(function () {
              var state = remote.getAsyncState();
              remote.close();
              var count = remote.asyncItems ? remote.asyncItems.length : 0;
              return 'page=' + state.page + ' items=' + count;
            });
          }
        },
        { name: 'hasMoreResults', run: function () { return 'hasMore=' + remote.hasMoreResults(); } },
        { name: 'getAsyncState', run: function () { return JSON.stringify(remote.getAsyncState()); } },
        {
          name: 'refreshOptions',
          run: function () {
            remote.open();
            return delay(180).then(function () {
              return remote.refreshOptions();
            }).then(function () {
              return delay(180);
            }).then(function () {
              var count = remote.asyncItems ? remote.asyncItems.length : 0;
              remote.close();
              return 'refetched page 0 (' + count + ' items)';
            });
          }
        },
        {
          name: 'on',
          run: function () {
            var hits = 0;
            var handler = function () { hits += 1; };
            selectA.on('lab:ping', handler);
            selectA.emit('lab:ping', {});
            use('selectMethods', 'off');
            selectA.off('lab:ping', handler);
            selectA.emit('lab:ping', {});
            return 'listener ran ' + hits + ' time(s), then stayed off';
          }
        },
        { name: 'off', run: function () { return 'covered by on (bind → emit → unbind → emit)'; } },
        { name: 'announce', run: function () { selectA.announce('Lab live-region announcement'); return 'live region updated'; } },
        {
          name: 'destroy',
          run: function () {
            var temp = makeTempSelect();
            temp.destroy();
            var gone = !document.body.contains(temp.root);
            if (pendingTemp) pendingTemp = null;
            return 'throwaway select restored=' + gone;
          }
        }
      ]
    },
    {
      title: 'Text field',
      methods: [
        { name: 'setTheme', run: function () { labText.setTheme('modern'); labText.setTheme('default'); labText.setTheme('modern'); return 'theme=' + labText.root.getAttribute('data-zs-theme'); } },
        { name: 'setFramework', run: function () { labText.setFramework('none'); return 'framework=' + labText.root.getAttribute('data-zs-framework'); } },
        { name: 'setLayout', run: function () { labText.setLayout('outlined'); var layout = labText.root.getAttribute('data-zs-layout'); labText.setLayout('stacked'); return 'layout=' + layout; } },
        { name: 'validationTargets', run: function () { return 'targets=' + labText.validationTargets().length; } },
        {
          name: 'checkAsync',
          run: function () {
            labText.setValue('taken');
            return labText.checkAsync().then(function (valid) {
              labText.setValue('');
              return 'async valid=' + valid;
            });
          }
        },
        { name: 'setError', run: function () { labText.setError('Lab forced error'); return 'message=' + labText.errorMessage; } },
        { name: 'clearError', run: function () { labText.clearError(); return 'message=' + (labText.errorMessage || 'null'); } },
        {
          name: 'validate',
          run: function () {
            labText.setValue('taken');
            return labText.validate().then(function (valid) {
              labText.setValue('');
              return 'validate() resolved ' + valid;
            });
          }
        },
        { name: 'setValidation', run: function () { labText.setValidation('valid'); return 'state=' + labText.getValidation(); } },
        { name: 'getValidation', run: function () { return 'state=' + (labText.getValidation() || 'null'); } },
        { name: 'isPending', run: function () { return 'pending=' + labText.isPending(); } },
        { name: 'getValue', run: function () { labText.setValue('lab value'); return 'value=' + labText.getValue(); } },
        { name: 'setValue', run: function () { labText.setValue('written by setValue'); return 'value=' + labText.getValue(); } },
        { name: 'update', run: function () { labText.update(); return 'native state mirrored'; } },
        { name: 'refresh', run: function () { labText.refresh(); return 're-rendered'; } },
        {
          name: 'getUnmaskedValue',
          run: function () {
            labMask.setValue('5551234567');
            var value = labMask.getUnmaskedValue();
            labMask.setValue('');
            return 'unmasked=' + value;
          }
        },
        {
          name: 'refreshAutogrow',
          run: function () {
            labNote.refreshAutogrow();
            return 'height=' + (labNote.el.style.height || 'auto');
          }
        },
        {
          name: 'destroy',
          run: function () {
            var temp = document.createElement('input');
            temp.type = 'text';
            tempHost.appendChild(temp);
            var field = initField(temp, { label: 'Throwaway' });
            field.destroy();
            return 'throwaway input restored=' + !document.body.contains(field.root);
          }
        }
      ]
    },
    {
      title: 'Checkbox, switch & radio',
      methods: [
        { name: 'setIndeterminate', run: function () { checkbox.setIndeterminate(true); return 'indeterminate=' + checkbox.el.indeterminate; } },
        { name: 'setChecked', run: function () { checkbox.setChecked(true); var checked = checkbox.isChecked(); checkbox.setChecked(false); checkbox.setIndeterminate(false); return 'checked while running=' + checked; } },
        { name: 'isChecked', run: function () { return 'checked=' + checkbox.isChecked(); } },
        { name: 'getValue (radio)', run: function () { radio.setValue('b'); return 'value=' + radio.getValue(); } },
        { name: 'setValue (radio)', run: function () { radio.setValue('a'); return 'value=' + radio.getValue(); } },
        { name: 'validationTargets (radio)', run: function () { return 'targets=' + radio.validationTargets().length; } }
      ]
    },
    {
      title: 'Phone, stepper, range & date',
      methods: [
        { name: 'stepUp', run: function () { stepper.stepUp(); return 'value=' + stepper.getValue(); } },
        { name: 'stepDown', run: function () { stepper.stepDown(); return 'value=' + stepper.getValue(); } },
        { name: 'setStepper', run: function () { stepper.setStepper(false); var removed = !stepper.el.hasAttribute('data-zidan-stepper'); stepper.setStepper('stacked'); var restored = stepper.el.getAttribute('data-zidan-stepper'); return 'attribute removed=' + removed + ', restored=' + restored + ' (reinitialise to apply)'; } },
        { name: 'openPicker', run: function () { datePicker.openPicker(); return 'picker event emitted for ' + datePicker.el.type; } },
        { name: 'showPicker', run: function () { datePicker.showPicker(); return 'aliased to openPicker'; } },
        { name: 'getPhoneCountry', run: function () { return 'country=' + phone.getPhoneCountry(); } },
        { name: 'setPhoneCountry', run: function () { phone.setPhoneCountry('US'); var value = phone.getPhoneCountry(); phone.setPhoneCountry('GB'); return 'set US → ' + value; } },
        { name: 'setPhoneFormat', run: function () { phone.setPhoneFormat('e164'); var value = phone.phone.format; phone.setPhoneFormat('national'); return 'format=' + value; } },
        { name: 'formatPhone', run: function () { return 'formatted=' + phone.formatPhone('2025550134'); } }
      ]
    },
    {
      title: 'File upload probe',
      methods: [
        { name: 'getFiles', run: function () { var f = resetProbe(); f.addFiles([asFile('get.txt')]); return 'files=' + f.getFiles().length; } },
        { name: 'getUploadState', run: function () { var f = resetProbe(); f.addFiles([asFile('state.txt')]); return JSON.stringify(f.getUploadState()[0].status); } },
        { name: 'addFiles', run: function () { var f = resetProbe(); f.addFiles([asFile('one.txt'), asFile('two.txt')]); return 'files=' + f.getFiles().length; } },
        { name: 'replaceFiles', run: function () { var f = resetProbe(); f.replaceFiles([asFile('new-one.txt'), asFile('new-two.txt')]); return 'files=' + f.getFiles().length; } },
        { name: 'removeFile', run: function () { var f = resetProbe(); f.addFiles([asFile('keep.txt'), asFile('drop.txt')]); f.removeFile(1); return 'files=' + f.getFiles().length; } },
        { name: 'clear', run: function () { var f = resetProbe(); f.addFiles([asFile('clear.txt')]); f.clear(); return 'files=' + f.getFiles().length; } },
        { name: 'setVariant', run: function () { var f = resetProbe(); f.setVariant('button'); var variant = f.variant; f.setVariant('compact'); return 'variant=' + variant; } },
        { name: 'setUploader', run: function () { var f = resetProbe(); f.setUploader('/lab-upload'); f.setUploader(stallUploader); return 'uploader swapped twice'; } },
        {
          name: 'uploadAll',
          run: function () {
            var f = resetProbe();
            f.addFiles([asFile('all.txt')]);
            f.uploadAll();
            var status = f.getUploadState()[0].status;
            if (pendingUpload) pendingUpload.complete({ url: 'lab://all' });
            return 'status=' + status;
          }
        },
        {
          name: 'uploadFile',
          run: function () {
            var f = resetProbe();
            f.addFiles([asFile('single.txt')]);
            var file = f.getFiles()[0];
            f.uploadFile(file);
            var status = f.getUploadState()[0].status;
            if (pendingUpload) pendingUpload.complete({ url: 'lab://single' });
            return 'status=' + status;
          }
        },
        {
          name: 'cancelUpload',
          run: function () {
            var f = resetProbe();
            f.addFiles([asFile('cancel.txt')]);
            f.uploadFile(f.getFiles()[0]);
            f.cancelUpload(f.getFiles()[0]);
            return 'status=' + f.getUploadState()[0].status;
          }
        },
        {
          name: 'cancelAll',
          run: function () {
            var f = resetProbe();
            f.addFiles([asFile('a.txt'), asFile('b.txt')]);
            f.uploadAll();
            f.cancelAll();
            return 'uploads cancelled';
          }
        },
        {
          name: 'retryUpload',
          run: function () {
            var f = resetProbe();
            f.addFiles([asFile('retry.txt')]);
            var file = f.getFiles()[0];
            f.uploadFile(file);
            f.cancelUpload(file);
            f.retryUpload(file);
            var status = f.getUploadState()[0].status;
            if (pendingUpload) pendingUpload.complete({ url: 'lab://retry' });
            return 'status=' + status;
          }
        }
      ]
    },
    {
      title: 'Static helpers',
      methods: [
        { name: 'ZidanSelect.get', run: function () { return selectApi.get('#lab-select') === selectA ? 'instance found by selector' : 'unexpected instance'; } },
        { name: 'ZidanForm.formatPhone', run: function () { return form.formatPhone('2025550134', 'US', 'e164'); } },
        { name: 'ZidanForm.detectPhoneCountry', run: function () { return form.detectPhoneCountry('+44 7700 900123'); } },
        { name: 'ZidanForm.registerIcon', run: function () { form.registerIcon('lab-check', '<path d="M4 12l5 5 11-11"/>'); return 'registered lab-check'; } },
        { name: 'ZidanForm.mask', run: function () { return form.mask('5551234567', '(###) ###-####'); } },
        { name: 'ZidanForm.unmask', run: function () { return form.unmask('(555) 123-4567'); } },
        {
          name: 'ZidanForm.serialize',
          run: function () {
            var data = form.serialize(helperForm);
            return 'keys=' + Object.keys(data).join(',');
          }
        },
        {
          name: 'ZidanForm.validate',
          run: function () {
            var nameInput = helperName.el;
            var emailInput = helperEmail.el;
            var oldName = nameInput.value;
            var oldEmail = emailInput.value;
            nameInput.value = 'Ada Lovelace';
            emailInput.value = 'ada@example.com';
            return form.validate(helperForm, { focus: false }).then(function (valid) {
              nameInput.value = oldName;
              emailInput.value = oldEmail;
              return 'valid=' + valid;
            }, function (error) {
              nameInput.value = oldName;
              emailInput.value = oldEmail;
              throw error;
            });
          }
        },
        {
          name: 'ZidanForm.downscaleImage',
          run: function () {
            var file = new window.File(['lab-bytes'], 'lab.png', { type: 'image/png' });
            return form.downscaleImage(file, { maxWidth: 10 }).then(function (output) {
              return output === file ? 'original kept (no resampling needed)' : 'image resized';
            });
          }
        }
      ]
    }
  ];

  METHOD_GROUPS.forEach(function (group) {
    var isSelectGroup = group.title === 'Select instance';
    var isFieldGroup = ['Text field', 'Checkbox, switch & radio', 'Phone, stepper, range & date', 'File upload probe'].indexOf(group.title) !== -1;
    group.methods.forEach(function (entry) {
      if (isSelectGroup && EXPECTED.selectMethods.indexOf(entry.name) !== -1) use('selectMethods', entry.name);
      if (isFieldGroup && EXPECTED.fieldMethods.indexOf(entry.name) !== -1) use('fieldMethods', entry.name);
    });
  });

  /* method buttons */
  function runEntry(entry) {
    var outcome;
    try {
      outcome = entry.run();
    } catch (error) {
      outcome = Promise.reject(error);
    }
    return Promise.resolve(outcome).then(function (message) {
      var text = message == null ? 'ok' : String(message);
      log('method', entry.name + ' → ' + text);
      return { name: entry.name, ok: true, message: text };
    }, function (error) {
      var text = error && error.message ? error.message : String(error);
      log('method', entry.name + ' ✕ ' + text);
      return { name: entry.name, ok: false, message: text };
    });
  }

  if (methodsEl) {
    METHOD_GROUPS.forEach(function (group) {
      var title = document.createElement('h4');
      title.className = 'lab-method-title';
      title.textContent = group.title;
      methodsEl.appendChild(title);
      var row = document.createElement('div');
      row.className = 'lab-method-row';
      group.methods.forEach(function (entry) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn lab-method-btn';
        button.textContent = entry.name;
        button.addEventListener('click', function () {
          button.disabled = true;
          runEntry(entry).then(function () { button.disabled = false; });
        });
        row.appendChild(button);
      });
      methodsEl.appendChild(row);
    });
  }

  /* ---------------- coverage board ---------------- */

  function missingCoverage() {
    var missing = {};
    Object.keys(EXPECTED).forEach(function (category) {
      if (category === 'events') return;
      missing[category] = EXPECTED[category].filter(function (key) {
        return !used[category + ':' + key];
      });
    });
    return missing;
  }

  function missingEvents() {
    return EXPECTED.events.filter(function (name) { return !seenEvents[name]; });
  }

  function renderCoverage() {
    var missing = missingCoverage();
    var total = 0;
    var covered = 0;
    if (coverageList) coverageList.textContent = '';
    Object.keys(EXPECTED).forEach(function (category) {
      if (category === 'events') return;
      var list = EXPECTED[category];
      var gaps = missing[category];
      total += list.length;
      covered += list.length - gaps.length;
      if (coverageList) {
        var item = document.createElement('li');
        var label = document.createElement('span');
        label.textContent = coverageLabels[category];
        var count = document.createElement('span');
        count.className = gaps.length ? 'is-missing' : 'is-ok';
        count.textContent = (list.length - gaps.length) + '/' + list.length;
        if (gaps.length) count.title = 'Missing: ' + gaps.join(', ');
        item.appendChild(label);
        item.appendChild(count);
        coverageList.appendChild(item);
      }
    });
    if (coverageEl) {
      coverageEl.textContent = covered + '/' + total + ' API items exercised by the lab'
        + (covered === total ? ' — complete.' : ' — missing: see below.');
    }
    return { total: total, covered: covered, missing: missing };
  }

  /* ---------------- event exercise + self-test ---------------- */

  function exerciseEvents() {
    var tasks = [];
    try {
      labText.setValue('lab event');
      labText.el.dispatchEvent(new window.Event('input', { bubbles: true }));
      labText.el.dispatchEvent(new window.Event('change', { bubbles: true }));
      labText.setError('Lab event error');
      labText.clearError();
      click(labPasswordRoot(), '.zs-input-reveal');
      click(labText.root, '.zs-input-clear');
      click(labText.root, '.zs-input-icon--action');
      labText.setValue('taken');
      tasks.push(Promise.resolve(labText.validate()).then(function () { labText.setValue(''); }));
      labText.setValue('');
    } catch (error) { /* keep exercising the rest */ }

    selectA.open();
    var option = selectA.dropdown.querySelector('[data-zs-option="0"]');
    if (option) option.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    selectA.close();
    selectA.setValue('team');
    selectA.setValue('pro');
    selectA.open();
    selectA.input.value = 'zzzz-no-match';
    selectA.input.dispatchEvent(new window.Event('input', { bubbles: true }));
    tasks.push(delay(40).then(function () { selectA.close(); }));

    tags.addTag('LabEvent');
    tags.removeTag(tags.getTags().length - 1);
    if (tags.getTags().length > 1) {
      tags.moveTag(0, 1);
      tags.moveTag(1, 0);
    }
    var firstTag = tags.getTags()[0];
    if (firstTag) {
      tags.editTag(firstTag, firstTag + ' event');
      tags.editTag(firstTag + ' event', firstTag);
    }

    remote.open();
    tasks.push(delay(180).then(function () { return remote.loadMore(); }).then(function () { remote.close(); }));

    stepper.stepUp();
    stepper.stepDown();
    datePicker.openPicker();
    phone.setPhoneCountry('US');
    phone.setPhoneCountry('GB');
    phone.setPhoneFormat('e164');
    phone.setPhoneFormat('national');

    /* the callback-error path: call() catches and emits zidan:error */
    var temp;
    try {
      temp = makeTempSelect();
      temp.setValue('two');
    } catch (error) { /* error is expected to be reported as an event */ }
    if (temp) temp.destroy();

    return Promise.all(tasks).then(function () {
      var f = resetProbe();
      f.addFiles([asFile('success.txt')]);
      f.uploadFile(f.getFiles()[0]);
      if (pendingUpload) pendingUpload.complete({ url: 'lab://event' });

      f = resetProbe();
      f.addFiles([asFile('cancel-event.txt')]);
      f.uploadFile(f.getFiles()[0]);
      f.cancelUpload(f.getFiles()[0]);

      f = resetProbe();
      f.setUploader(function () { throw new Error('Lab upload event failure'); });
      f.addFiles([asFile('error-event.txt')]);
      f.uploadFile(f.getFiles()[0]);

      f = resetProbe();
      f.addFiles([asFile('remove-event.txt')]);
      f.removeFile(0);

      f = resetProbe();
      f.addFiles([asFile('clear-event.txt')]);
      f.clear();

      checkbox.setChecked(true);
      checkbox.setChecked(false);
      labText.setValue('');
      labText.setError(null);
      return delay(160);
    });
  }

  function labPasswordRoot() {
    var input = document.getElementById('lab-password');
    return input && input.__zidanField ? input.__zidanField.root : null;
  }

  function renderResults(entries) {
    if (!resultsEl) return;
    resultsEl.textContent = '';
    entries.forEach(function (entry) {
      var item = document.createElement('li');
      var time = document.createElement('time');
      time.textContent = entry.ok ? 'PASS' : 'FAIL';
      var text = document.createElement('span');
      var strong = document.createElement('b');
      strong.textContent = entry.name;
      text.appendChild(strong);
      if (entry.message) text.appendChild(document.createTextNode(' · ' + entry.message));
      item.appendChild(time);
      item.appendChild(text);
      if (!entry.ok) item.className = 'is-fail';
      resultsEl.appendChild(item);
    });
  }

  var running = false;

  function runSelfTest() {
    if (running) return Promise.resolve({ results: [], missingEvents: [], missingCoverage: missingCoverage() });
    running = true;
    var results = [];
    var chain = Promise.resolve();

    METHOD_GROUPS.forEach(function (group) {
      group.methods.forEach(function (entry) {
        chain = chain.then(function () {
          return runEntry(entry).then(function (result) {
            results.push(result);
          });
        });
      });
    });

    chain = chain.then(function () {
      return exerciseEvents();
    }).then(function () {
      var missingApi = missingCoverage();
      var apiGaps = [];
      Object.keys(missingApi).forEach(function (category) {
        missingApi[category].forEach(function (name) { apiGaps.push(category + ':' + name); });
      });
      var missing = missingEvents();
      results.push({
        name: 'API inventory',
        ok: !apiGaps.length,
        message: apiGaps.length
          ? 'missing: ' + apiGaps.join(', ')
          : 'every option, callback and method is covered'
      });
      results.push({
        name: 'DOM events',
        ok: !missing.length,
        message: missing.length
          ? 'missing: ' + missing.join(', ')
          : EXPECTED.events.length + ' events observed'
      });
      renderResults(results);
      renderCoverage();
      running = false;
      return { results: results, missingEvents: missing, missingCoverage: missingApi };
    }, function (error) {
      running = false;
      results.push({ name: 'self-test', ok: false, message: error && error.message ? error.message : String(error) });
      renderResults(results);
      return { results: results, missingEvents: missingEvents(), missingCoverage: missingCoverage() };
    });

    return chain;
  }

  var selfTestButton = document.getElementById('lab-selftest');
  var clearButton = document.getElementById('lab-clear');

  if (selfTestButton) {
    selfTestButton.addEventListener('click', function () {
      if (running) return;
      if (resultsEl) resultsEl.textContent = '';
      log('self-test', 'running every method and event');
      runSelfTest();
    });
  }
  if (clearButton) {
    clearButton.addEventListener('click', function () {
      if (resultsEl) resultsEl.textContent = '';
      if (logEl) logEl.textContent = '';
      seenEvents = Object.create(null);
    });
  }

  renderCoverage();

  window.DemoLab = {
    expected: EXPECTED,
    used: used,
    seenEvents: seenEvents,
    coverage: renderCoverage,
    missing: missingCoverage,
    missingEvents: missingEvents,
    runSelfTest: runSelfTest,
    instances: { selectA: selectA, tags: tags, remote: remote, text: labText, probe: probe }
  };
})();
