(function () {
  'use strict';

  var stage = document.getElementById('pg-stage');
  var body = document.getElementById('pg-options-body');
  var tabs = document.getElementById('pg-kinds');
  var panel = document.getElementById('pg-panel');
  var title = document.getElementById('pg-options-title');
  var htmlCode = document.getElementById('pg-html');
  var jsCode = document.getElementById('pg-js');
  var valueEl = document.getElementById('pg-value');
  var kindNote = document.getElementById('pg-kind-note');
  var resetBtn = document.getElementById('pg-reset');
  var methodsEl = document.getElementById('pg-methods');
  var eventsEl = document.getElementById('pg-events');
  var usageNote = document.getElementById('pg-usage-note');
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('.pg-runmode button'));

  var THEME_OPTIONS = [
    ['default', 'Default'], ['modern', 'Modern'], ['minimal', 'Minimal'],
    ['dark', 'Dark'], ['glass', 'Glass']
  ];
  var FRAMEWORK_OPTIONS = [
    ['none', 'None / vanilla'], ['bootstrap', 'Bootstrap'], ['tailwind', 'Tailwind'],
    ['bulma', 'Bulma'], ['foundation', 'Foundation']
  ];
  var FIELD_LAYOUT_OPTIONS = [
    ['', 'Theme default'], ['stacked', 'Stacked'], ['inline', 'Inline'],
    ['card', 'Card'], ['compact', 'Compact'], ['floating', 'Floating'], ['outlined', 'Outlined']
  ];
  var SELECT_LAYOUT_OPTIONS = [
    ['classic-clean', 'Classic'], ['floating-label', 'Floating label'],
    ['soft-pill', 'Soft pill'], ['bordered-brutalist', 'Bordered'], ['glass-elevated', 'Glass']
  ];
  var ICON_OPTIONS = [
    ['', 'None'], ['text', 'Text'], ['mail', 'Mail'], ['phone', 'Phone'], ['user', 'User'],
    ['lock', 'Lock'], ['search', 'Search'], ['calendar', 'Calendar'], ['clock', 'Clock'],
    ['link', 'Link'], ['hash', 'Hash'], ['palette', 'Palette'], ['sliders', 'Sliders'],
    ['file', 'File'], ['upload', 'Upload'], ['eye', 'Eye'], ['globe', 'Globe'],
    ['map-pin', 'Map pin'], ['image', 'Image']
  ];
  var VALIDATION_OPTIONS = [['', 'None'], ['valid', 'Valid'], ['invalid', 'Invalid']];
  var STATUS_ICON = [['', 'None'], ['check', 'Check'], ['alert', 'Alert']];
  var MOVIES = ['Inception', 'Interstellar', 'The Dark Knight', 'Dunkirk', 'Tenet', 'Oppenheimer'];
  var PLANS = [['starter', 'Starter'], ['pro', 'Pro'], ['team', 'Team']];

  function themeField() {
    return { key: 'theme', label: 'Theme', type: 'select', options: THEME_OPTIONS, def: 'default' };
  }
  function frameworkField() {
    return { key: 'framework', label: 'Framework adapter', type: 'select', options: FRAMEWORK_OPTIONS, def: 'none' };
  }
  function layoutField() {
    return { key: 'layout', label: 'Field layout', type: 'select', options: FIELD_LAYOUT_OPTIONS, def: '' };
  }
  function bool(key, label, def, when, reflow) {
    return { key: key, label: label, type: 'checkbox', def: !!def, when: when, reflow: reflow };
  }
  function text(key, label, def, when) {
    return { key: key, label: label, type: 'text', def: def === undefined ? '' : def, when: when };
  }
  function number(key, label, def, when) {
    return { key: key, label: label, type: 'number', def: def === undefined ? '' : def, when: when };
  }
  function choice(key, label, options, def, when, reflow) {
    return { key: key, label: label, type: 'select', options: options, def: def, when: when, reflow: reflow };
  }
  function validationField() {
    return choice('validation', 'Validation state', VALIDATION_OPTIONS, '');
  }
  function styleGroup() {
    return { title: 'Theme & layout', fields: [themeField(), frameworkField(), layoutField()] };
  }
  function stateGroup(fields) {
    return {
      title: 'State',
      fields: [bool('required', 'Required', false), bool('disabled', 'Disabled', false), validationField()]
        .concat(fields || [])
    };
  }

  var TEXT_TYPE_OPTIONS = [
    ['text', 'Text'], ['email', 'Email'], ['password', 'Password'], ['number', 'Number'],
    ['tel', 'Phone'], ['url', 'URL'], ['search', 'Search'], ['date', 'Date'],
    ['time', 'Time'], ['datetime-local', 'Datetime'], ['range', 'Range'], ['color', 'Colour']
  ];

  var KINDS = {
    select: {
      label: 'Select / combobox / tags',
      initName: 'initZidanSelects()',
      groups: [
        {
          title: 'Control',
          fields: [
            choice('mode', 'Mode', [['select', 'Select'], ['combobox', 'Combobox'], ['tags', 'Tags']], 'combobox', null, true),
            choice('layout', 'Layout', SELECT_LAYOUT_OPTIONS, 'classic-clean'),
            themeField(),
            frameworkField(),
            choice('scrollbar', 'Scrollbar', [
              ['default', 'Default'], ['thin', 'Thin'], ['fancy', 'Fancy'], ['hover', 'On hover'], ['hidden', 'Hidden']
            ], 'default')
          ]
        },
        {
          title: 'Content',
          fields: [
            text('label', 'Floating label', 'Favorite movie'),
            text('placeholder', 'Placeholder', 'Choose a movie…', function (s) { return s.mode !== 'tags'; })
          ]
        },
        {
          title: 'Behaviour',
          fields: [
            bool('searchable', 'Searchable (type to filter)', true, function (s) { return s.mode === 'select'; }),
            bool('clearable', 'Clear button', true),
            bool('multiple', 'Allow multiple values', false, function (s) { return s.mode !== 'tags'; }),
            choice('closeOnSelect', 'Close after choosing', [['', 'Auto'], ['true', 'Always'], ['false', 'Never']], ''),
            number('maxDropdownHeight', 'Listbox max height (px)', 280)
          ]
        },
        {
          title: 'Tags mode',
          fields: [
            number('maxTags', 'Max tags', '', function (s) { return s.mode === 'tags'; }),
            number('minTagLength', 'Min tag length', 1, function (s) { return s.mode === 'tags'; }),
            number('maxTagLength', 'Max tag length', '', function (s) { return s.mode === 'tags'; }),
            bool('reorderable', 'Drag / Alt+Arrow reorder', false, function (s) { return s.mode === 'tags'; }, true),
            bool('editable', 'F2 / double-click rename', false, function (s) { return s.mode === 'tags'; }, true),
            bool('allowFreeText', 'Allow free text', true, function (s) { return s.mode === 'tags'; }),
            bool('commitOnTab', 'Commit on Tab', false, function (s) { return s.mode === 'tags'; }),
            bool('commitOnBlur', 'Commit on blur', false, function (s) { return s.mode === 'tags'; })
          ]
        },
        stateGroup()
      ],
      defaults: function () {
        return {
          mode: 'combobox', layout: 'classic-clean', theme: 'default', framework: 'none', scrollbar: 'default',
          label: 'Favorite movie', placeholder: 'Choose a movie…', searchable: true, clearable: true,
          multiple: false, closeOnSelect: '', maxDropdownHeight: 280,
          maxTags: '', minTagLength: 1, maxTagLength: '', reorderable: false, editable: false,
          allowFreeText: true, commitOnTab: false, commitOnBlur: false, required: false,
          disabled: false, validation: ''
        };
      }
    },

    file: {
      label: 'File upload',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            choice('variant', 'Variant', [
              ['dropzone', 'Dropzone'], ['button', 'Button'], ['avatar', 'Avatar'],
              ['gallery', 'Gallery'], ['compact', 'Compact']
            ], 'dropzone', null, true),
            themeField(),
            frameworkField(),
            layoutField()
          ]
        },
        {
          title: 'Copy',
          fields: [
            text('title', 'Drop title', 'Drag & drop your files'),
            text('dropHint', 'Drop hint', 'PNG, JPG or PDF up to 5 MB'),
            text('accept', 'Accepted files', 'image/*,.pdf'),
            text('hint', 'Hint under the field', '')
          ]
        },
        {
          title: 'Limits & behaviour',
          fields: [
            number('maxFiles', 'Max files', 4),
            number('maxSizeMB', 'Max size (MB)', 5),
            bool('multiple', 'Multiple files', true),
            bool('autoUpload', 'Auto upload', true, null, true),
            bool('simulateUpload', 'Simulate progress', false, null, true),
            number('simulateDuration', 'Simulation length (ms)', 900, function (s) { return !!s.simulateUpload; }),
            bool('showPreview', 'Image preview', true),
            bool('showFileMeta', 'Show size / type', true)
          ]
        },
        {
          title: 'Image downscale',
          fields: [
            bool('downscale', 'Resize images before upload', false, null, true),
            number('downscaleMaxWidth', 'Max width (px)', 1024, function (s) { return !!s.downscale; }),
            number('downscaleMaxHeight', 'Max height (px)', 1024, function (s) { return !!s.downscale; }),
            number('downscaleQuality', 'JPEG / WebP quality', 0.85, function (s) { return !!s.downscale; }),
            number('downscaleMaxBytes', 'Skip files at or below (bytes)', 0, function (s) { return !!s.downscale; }),
            choice('downscaleMime', 'Output format', [['', 'Auto'], ['image/jpeg', 'JPEG'], ['image/webp', 'WebP'], ['image/png', 'PNG']], '', function (s) { return !!s.downscale; }),
            bool('downscaleForce', 'Keep output even if larger', false, function (s) { return !!s.downscale; })
          ]
        },
        {
          title: 'Upload endpoint',
          fields: [
            text('uploadUrl', 'Upload URL (XHR)', '/api/files'),
            text('uploadField', 'FormData field name', 'file'),
            bool('withCredentials', 'Send credentials', false, function (s) { return !!s.uploadUrl; }),
            text('progressTemplate', 'Progress text', 'Uploading {percent}%'),
            text('uploadedLabel', 'Uploaded label', 'Uploaded'),
            text('failedLabel', 'Failed label', 'Upload failed'),
            text('cancelLabel', 'Cancel label', 'Cancel'),
            text('retryLabel', 'Retry label', 'Retry')
          ]
        },
        stateGroup()
      ],
      defaults: function () {
        return {
          variant: 'dropzone', theme: 'default', framework: 'none', layout: '',
          title: 'Drag & drop your files', dropHint: 'PNG, JPG or PDF up to 5 MB', accept: 'image/*,.pdf', hint: '',
          maxFiles: 4, maxSizeMB: 5, multiple: true, autoUpload: true, simulateUpload: false,
          simulateDuration: 900, showPreview: true, showFileMeta: true,
          downscale: false, downscaleMaxWidth: 1024, downscaleMaxHeight: 1024,
          downscaleQuality: 0.85, downscaleMaxBytes: 0, downscaleMime: '', downscaleForce: false,
          uploadUrl: '', uploadField: 'file', withCredentials: false,
          progressTemplate: 'Uploading {percent}%', uploadedLabel: 'Uploaded',
          failedLabel: 'Upload failed', cancelLabel: 'Cancel', retryLabel: 'Retry',
          required: false, disabled: false, validation: ''
        };
      }
    },

    checkbox: {
      label: 'Checkbox',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            choice('variant', 'Variant', [
              ['default', 'Checkbox'], ['switch', 'Switch'], ['card', 'Card'],
              ['button', 'Button'], ['minimal', 'Minimal']
            ], 'default', null, true),
            choice('switchStyle', 'Switch style', [
              ['ios', 'iOS'], ['material', 'Material'], ['square', 'Square'],
              ['labeled', 'Labeled'], ['icon', 'Icon']
            ], 'ios', function (s) { return s.variant === 'switch'; }),
            themeField(),
            frameworkField(),
            layoutField()
          ]
        },
        {
          title: 'Copy',
          fields: [
            text('label', 'Label', 'Email digest'),
            text('description', 'Description', 'A short daily summary.'),
            text('hint', 'Hint', '')
          ]
        },
        {
          title: 'State',
          fields: [
            bool('checked', 'Checked', true),
            bool('indeterminate', 'Indeterminate', false, function (s) { return s.variant !== 'switch'; }),
            bool('required', 'Required', false),
            bool('disabled', 'Disabled', false),
            validationField()
          ]
        }
      ],
      defaults: function () {
        return {
          variant: 'default', switchStyle: 'ios', theme: 'default', framework: 'none', layout: '',
          label: 'Email digest', description: 'A short daily summary.', hint: '',
          checked: true, indeterminate: false, required: false, disabled: false, validation: ''
        };
      }
    },

    switch: {
      label: 'Switch',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            choice('switchStyle', 'Switch style', [
              ['ios', 'iOS'], ['material', 'Material'], ['square', 'Square'],
              ['labeled', 'Labeled'], ['icon', 'Icon']
            ], 'ios', null, true),
            text('onLabel', 'On label', 'ON', function (s) { return /^(labeled|icon|square|material)$/.test(s.switchStyle); }),
            text('offLabel', 'Off label', 'OFF', function (s) { return /^(labeled|icon|square|material)$/.test(s.switchStyle); }),
            themeField(),
            frameworkField(),
            layoutField()
          ]
        },
        {
          title: 'Copy',
          fields: [
            text('label', 'Label', 'Email digest'),
            text('description', 'Description', 'A short daily summary.'),
            text('hint', 'Hint', '')
          ]
        },
        {
          title: 'State',
          fields: [
            bool('checked', 'Checked', true),
            bool('required', 'Required', false),
            bool('disabled', 'Disabled', false),
            validationField()
          ]
        }
      ],
      defaults: function () {
        return {
          switchStyle: 'ios', onLabel: 'ON', offLabel: 'OFF', theme: 'default', framework: 'none', layout: '',
          label: 'Email digest', description: 'A short daily summary.', hint: '',
          checked: true, required: false, disabled: false, validation: ''
        };
      }
    },

    radio: {
      label: 'Radio group',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            choice('variant', 'Variant', [
              ['stacked', 'Stacked'], ['inline', 'Inline'], ['card', 'Card'],
              ['button', 'Button'], ['tile', 'Tile']
            ], 'stacked'),
            themeField(),
            frameworkField(),
            layoutField()
          ]
        },
        {
          title: 'Copy',
          fields: [
            text('legend', 'Legend', 'Plan'),
            text('hint', 'Hint', '')
          ]
        },
        {
          title: 'Behaviour',
          fields: [
            bool('deselectable', 'Click again to clear', false),
            bool('required', 'Required', false),
            bool('disabled', 'Disabled', false),
            validationField()
          ]
        }
      ],
      defaults: function () {
        return {
          variant: 'stacked', theme: 'default', framework: 'none', layout: '', legend: 'Plan', hint: '',
          deselectable: false, required: false, disabled: false, validation: ''
        };
      }
    }
  };

  /* ------------------------------------------------------------------ *
   * Text family: one option model per input type
   * ------------------------------------------------------------------ */

  function textDefaults(type) {
    return {
      type: type, label: '', placeholder: '', hint: '', theme: 'default', framework: 'none', layout: '',
      autoIcon: false, icon: '', iconPosition: 'left', iconClickable: false, iconLabel: '',
      validationIcon: false, prefix: '', suffix: '', clearable: false, reveal: false,
      counter: '', rows: 4, maxlength: '', minlength: '',
      mask: '', autogrow: false, autogrowMax: '',
      stepper: 'false', stepperPosition: 'right', stepperWrap: false, stepperLongPress: true,
      stepperDelay: 420, stepperInterval: 90, min: '', max: '', step: '', value: '',
      phone: false, phoneCountry: 'US', phoneFormat: 'national', phoneCountrySelect: true,
      phoneCountries: '', phoneCountryLabel: '', phoneValidate: true,
      rangeVariant: 'default', rangeBubbleMode: 'always', rangeBubblePosition: 'top',
      rangeFill: true, rangeMinMax: true, rangeTicks: '', rangeTickLabels: false,
      rangeMinLabel: '', rangeMaxLabel: '', rangeFormat: '',
      pickerButton: false, pickerIcon: 'calendar', pickerLabel: '',
      disableWeekends: false, disabledDates: '',
      required: false, disabled: false, validation: ''
    };
  }

  function textKind(type, copy) {
    var fields = [
      {
        title: 'Control',
        fields: [
          text('label', copy.label, copy.placeholderLabel || 'Label'),
          text('placeholder', 'Placeholder', copy.placeholder || '', function (s) { return s.type !== 'date' && s.type !== 'range'; }),
          text('hint', 'Hint', '')
        ]
      },
      styleGroup(),
      {
        title: 'Icons & add-ons',
        fields: [
          bool('autoIcon', 'Icon from input type', false, null, true),
          choice('icon', 'Custom icon', ICON_OPTIONS, '', function (s) { return !s.autoIcon; }),
          choice('iconPosition', 'Icon position', [['left', 'Left'], ['right', 'Right']], 'left',
            function (s) { return !!(s.icon || s.autoIcon); }),
          bool('iconClickable', 'Clickable icon', false, function (s) { return !!(s.icon || s.autoIcon); }, true),
          text('iconLabel', 'Icon label', '', function (s) { return !!(s.icon || s.autoIcon); }),
          bool('validationIcon', 'Validation icon', false),
          text('prefix', 'Prefix', '', function (s) { return s.type !== 'range'; }),
          text('suffix', 'Suffix', '', function (s) { return s.type !== 'range'; }),
          bool('clearable', 'Clear button', false, function (s) { return s.type !== 'range'; }),
          bool('reveal', 'Show / hide password', false, function (s) { return s.type === 'password'; }),
          number('counter', 'Character counter', '', function (s) { return s.type === 'text' || s.type === 'email'; }),
          number('maxlength', 'Max length', '', function (s) { return s.type === 'text' || s.type === 'email'; }),
          number('rows', 'Rows', 4, function (s) { return s.type === 'textarea'; })
        ]
      },
      {
        title: 'Mask & sizing',
        fields: [
          text('mask', 'Mask', '', function (s) { return s.type === 'text'; }),
          bool('autogrow', 'Grow with content', false, function (s) { return s.type === 'textarea'; }),
          number('autogrowMax', 'Max height (px)', '', function (s) { return s.type === 'textarea' && s.autogrow; })
        ]
      }
    ];

    fields.push({
      title: 'Number & stepper',
      fields: [
        number('min', 'Min', '', function (s) { return s.type === 'number'; }),
        number('max', 'Max', '', function (s) { return s.type === 'number'; }),
        number('step', 'Step', '', function (s) { return s.type === 'number'; }),
        text('value', 'Value', '', function (s) { return s.type === 'number'; }),
        choice('stepper', 'Stepper', [['false', 'Off'], ['stacked', 'Stacked'], ['split', 'Split'], ['inline', 'Inline']],
          'stacked', function (s) { return s.type === 'number'; }),
        choice('stepperPosition', 'Stepper position', [['right', 'Right'], ['left', 'Left']], 'right',
          function (s) { return s.type === 'number' && s.stepper === 'inline'; }),
        bool('stepperWrap', 'Wrapped stepper', false, function (s) { return s.type === 'number' && s.stepper !== 'false'; }),
        bool('stepperLongPress', 'Long-press repeat', true, function (s) { return s.type === 'number' && s.stepper !== 'false'; }),
        number('stepperDelay', 'Hold delay (ms)', 420, function (s) { return s.type === 'number' && s.stepper !== 'false'; }),
        number('stepperInterval', 'Repeat interval (ms)', 90, function (s) { return s.type === 'number' && s.stepper !== 'false'; })
      ]
    });

    fields.push({
      title: 'Phone',
      fields: [
        bool('phone', 'Phone formatting', false, function (s) { return s.type === 'tel'; }, true),
        text('value', 'Phone value', '07700 900123', function (s) { return s.type === 'tel'; }),
        choice('phoneCountry', 'Country', [
          ['US', 'United States'], ['GB', 'United Kingdom'], ['DE', 'Germany'], ['FR', 'France'],
          ['IN', 'India'], ['PK', 'Pakistan'], ['AU', 'Australia'], ['CA', 'Canada']
        ], 'GB', function (s) { return s.type === 'tel' && s.phone; }),
        choice('phoneFormat', 'Format', [
          ['national', 'National'], ['international', 'International'], ['e164', 'E.164']
        ], 'national', function (s) { return s.type === 'tel' && s.phone; }),
        bool('phoneCountrySelect', 'Country selector', true, function (s) { return s.type === 'tel' && s.phone; }),
        text('phoneCountries', 'Countries (ISO list)', '', function (s) { return s.type === 'tel' && s.phone; }),
        text('phoneCountryLabel', 'Country aria-label', '', function (s) { return s.type === 'tel' && s.phone; }),
        text('phoneCountrySearchText', 'Country search placeholder', '', function (s) { return s.type === 'tel' && s.phone; }),
        text('phoneCountryEmptyText', 'No-country message', '', function (s) { return s.type === 'tel' && s.phone; }),
        bool('phoneValidate', 'Validate length', true, function (s) { return s.type === 'tel' && s.phone; })
      ]
    });

    fields.push({
      title: 'Range',
      fields: [
        number('min', 'Min', 0, function (s) { return s.type === 'range'; }),
        number('max', 'Max', 1000, function (s) { return s.type === 'range'; }),
        number('step', 'Step', 50, function (s) { return s.type === 'range'; }),
        number('value', 'Value', 400, function (s) { return s.type === 'range'; }),
        choice('rangeVariant', 'Style', [
          ['default', 'Default'], ['gradient', 'Gradient'], ['stepped', 'Stepped'], ['minimal', 'Minimal']
        ], 'default', function (s) { return s.type === 'range'; }),
        choice('rangeBubbleMode', 'Value bubble', [['always', 'Always'], ['active', 'On hover / focus'], ['never', 'Never']],
          'always', function (s) { return s.type === 'range'; }),
        choice('rangeBubblePosition', 'Bubble position', [['top', 'Top'], ['bottom', 'Bottom']], 'top',
          function (s) { return s.type === 'range'; }),
        bool('rangeFill', 'Progress fill', true, function (s) { return s.type === 'range'; }),
        bool('rangeMinMax', 'Min / max scale', true, function (s) { return s.type === 'range'; }),
        text('rangeTicks', 'Ticks (count or list)', '', function (s) { return s.type === 'range'; }),
        bool('rangeTickLabels', 'Tick labels', false, function (s) { return s.type === 'range'; }),
        text('rangeMinLabel', 'Scale start label', '', function (s) { return s.type === 'range'; }),
        text('rangeMaxLabel', 'Scale end label', '', function (s) { return s.type === 'range'; }),
        text('rangeFormat', 'Value template', '', function (s) { return s.type === 'range'; })
      ]
    });

    fields.push({
      title: 'Date & time',
      fields: [
        bool('pickerButton', 'Picker button', false, function (s) { return s.type === 'date' || s.type === 'time' || s.type === 'datetime-local'; }),
        text('pickerIcon', 'Picker icon', 'calendar', function (s) { return s.type === 'date' || s.type === 'time' || s.type === 'datetime-local'; }),
        text('pickerLabel', 'Picker label', '', function (s) { return s.type === 'date' || s.type === 'time' || s.type === 'datetime-local'; }),
        bool('disableWeekends', 'Block weekends', false, function (s) { return s.type === 'date' || s.type === 'datetime-local'; }),
        text('disabledDates', 'Blocked dates (ISO list)', '', function (s) { return s.type === 'date' || s.type === 'datetime-local'; }),
        text('value', 'Date value', '', function (s) { return s.type === 'date' || s.type === 'time' || s.type === 'datetime-local'; })
      ]
    });

    fields.push(stateGroup([bool('alwaysValidate', 'Always validate', false)]));

    return {
      label: copy.label,
      initName: 'initZidanForms()',
      groups: fields,
      defaults: function () {
        var base = textDefaults(type);
        Object.keys(copy.defaults || {}).forEach(function (key) { base[key] = copy.defaults[key]; });
        return base;
      },
      fixedType: type
    };
  }

  KINDS.text = textKind('text', {
    label: 'Text & email',
    placeholderLabel: 'Email address',
    placeholder: 'ada@example.com',
    defaults: { type: 'text', label: 'Email address', placeholder: 'ada@example.com', autoIcon: true, clearable: true }
  });
  KINDS.textarea = textKind('textarea', {
    label: 'Textarea',
    placeholderLabel: 'Message',
    placeholder: 'Tell us more…',
    defaults: { type: 'textarea', label: 'Message', placeholder: 'Tell us more…', counter: 240 }
  });
  KINDS.number = textKind('number', {
    label: 'Number & stepper',
    placeholderLabel: 'Guests',
    defaults: { type: 'number', label: 'Guests', min: 0, max: 20, step: 1, value: 2, stepper: 'split' }
  });
  KINDS.phone = textKind('tel', {
    label: 'Phone',
    placeholderLabel: 'Phone number',
    defaults: {
      type: 'tel', label: 'Phone number', autoIcon: true, phone: true,
      phoneCountry: 'GB', phoneFormat: 'international', value: '07700 900123',
      phoneCountrySearchText: '', phoneCountryEmptyText: ''
    }
  });
  KINDS.range = textKind('range', {
    label: 'Range',
    placeholderLabel: 'Budget',
    defaults: { type: 'range', label: 'Budget', value: 400, rangeTicks: '0,500,1000', rangeTickLabels: true }
  });
  KINDS.date = textKind('date', {
    label: 'Date & time',
    placeholderLabel: 'Delivery date',
    defaults: { type: 'date', label: 'Delivery date', pickerButton: true, value: '' }
  });
  KINDS.date.groups[0].fields.unshift(choice('type', 'Input type', [
    ['date', 'Date'], ['time', 'Time'], ['datetime-local', 'Datetime'], ['month', 'Month'], ['week', 'Week']
  ], 'date', null, true));
  delete KINDS.date.fixedType;

  /* ------------------------------------------------------------------ *
   * Per-control usage reference
   * ------------------------------------------------------------------ */

  var FIELD_METHODS = [
    ['getValue()', 'Current value (array for multiple/tags).'],
    ['setValue(v)', 'Write the native control and re-render.'],
    ['update()', 'Re-read checked, disabled, value and validity.'],
    ['validate()', 'Run the rules now; returns boolean or Promise.'],
    ['setValidation(state)', "'valid', 'invalid' or null."],
    ['setError(msg)', 'Show a manual message; clearError() hides it.'],
    ['destroy()', 'Restore the original markup and listeners.']
  ];
  var FIELD_EVENTS = [
    ['zidan:init', 'After enhancement.'],
    ['zidan:change', 'Value, checked state or files changed.'],
    ['zidan:input', 'Text or range input while typing.'],
    ['zidan:validation', 'State changed: { state, message }.'],
    ['zidan:clear', 'The clear button was used.'],
    ['zidan:destroy', 'Instance removed.']
  ];

  var USAGE = {
    select: {
      note: 'The instance returned by zidanSelect() / initZidanSelects().',
      methods: [
        ['open() / close() / toggle()', 'Control the listbox.'],
        ['getValue() / setValue(v)', 'Single value, or an array for multiple/tags.'],
        ['getTags() / addTag(t) / removeTag(t)', 'Tags mode helpers.'],
        ['moveTag(from, to) / editTag(tag, label)', 'Reorder or rename a tag.'],
        ['selectAll() / deselectAll() / toggleAll()', 'Act on every enabled option.'],
        ['areAllSelected() / getSelectedItems()', 'Selection summary with labels.'],
        ['setOptions(items)', 'Replace options; keeps groups and disabled flags.'],
        ['loadMore() / hasMoreResults()', 'Paged fetchOptions results.'],
        ['getAsyncState()', '{ query, page, hasMore, loading, error }.'],
        ['refreshOptions() / clearCache()', 'Refetch page 0 / drop cached pages.'],
        ['setLayout() / setFramework() / setScrollbar()', 'Restyle at runtime.'],
        ['destroy()', 'Restore the original <select>.']
      ],
      events: [
        ['zidan:change', '{ value, previousValue }'],
        ['zidan:select', '{ value, item }'],
        ['zidan:open / zidan:close', 'Listbox visibility.'],
        ['zidan:tag-add / zidan:tag-remove', '{ tag, value }'],
        ['zidan:tag-move / zidan:tag-edit', '{ tag, index, label, previousLabel }'],
        ['zidan:load-more', '{ page, query }'],
        ['zidan:error', '{ error, callback }']
      ]
    },
    file: {
      note: 'Uploads run through your function, an XHR uploadUrl or the simulator.',
      methods: [
        ['getFiles() / getUploadState()', 'Files and per-file status/progress.'],
        ['addFiles(files) / replaceFiles(files)', 'Add or swap the selection.'],
        ['removeFile(nameOrIndex) / clear()', 'Remove one file or all of them.'],
        ['uploadAll() / uploadFile(file)', 'Start the pipeline manually.'],
        ['cancelUpload(file) / cancelAll() / retryUpload(file)', 'Control one upload.'],
        ['setVariant(name) / setUploader(fnOrUrl)', 'Change look or transport.'],
        ['destroy()', 'Restore the original <input type="file">.']
      ],
      events: [
        ['zidan:upload-start', '{ file, name, size }'],
        ['zidan:upload-progress', '{ file, progress }'],
        ['zidan:upload-success', '{ file, result }'],
        ['zidan:upload-error', '{ file, error }'],
        ['zidan:upload-cancel', '{ file }'],
        ['zidan:remove', '{ file, index }']
      ]
    },
    checkbox: { note: 'Checkbox and switch share one field instance.', methods: FIELD_METHODS.concat([['setChecked(b) / isChecked()', 'Toggle and read the state.'], ['setIndeterminate(b)', 'Mixed state.']]), events: FIELD_EVENTS },
    switch: { note: 'A checkbox with variant: "switch".', methods: FIELD_METHODS.concat([['setChecked(b) / isChecked()', 'Toggle and read the state.']]), events: FIELD_EVENTS },
    radio: { note: 'One instance per <fieldset> or [data-zidan-radio-group].', methods: FIELD_METHODS.concat([['setValue(v)', 'Check the radio with that value.'], ['getValue()', 'The checked radio value or "".']]), events: FIELD_EVENTS },
    text: { note: 'Text, email, password, url, search and colour inputs; mask adds input filtering.', methods: FIELD_METHODS.concat([['getUnmaskedValue()', 'The raw characters without literals.']]), events: FIELD_EVENTS },
    textarea: { note: 'A plain <textarea>; autogrow follows its content up to autogrowMax.', methods: FIELD_METHODS, events: FIELD_EVENTS },
    number: {
      note: 'Adds a stepper to a native number input.',
      methods: FIELD_METHODS.concat([['stepUp(n) / stepDown(n)', 'Step the value.'], ['setStepper(on)', 'Set or clear the source attribute; reinitialise to apply.']]),
      events: FIELD_EVENTS.concat([['zidan:step', '{ value, direction }']])
    },
    phone: {
      note: 'Formatting is caret-safe; the native value stays authoritative.',
      methods: FIELD_METHODS.concat([
        ['getPhoneCountry() / setPhoneCountry(iso)', 'Read or change the country.'],
        ['setPhoneFormat(fmt) / formatPhone(v)', 'national, international or e164.']
      ]),
      events: FIELD_EVENTS.concat([['zidan:phone-country', '{ country }'], ['zidan:phone-format', '{ format }']])
    },
    range: {
      note: 'The native range keeps its value; only the chrome is added.',
      methods: FIELD_METHODS,
      events: FIELD_EVENTS
    },
    date: {
      note: 'Uses input.showPicker() when the browser supports it.',
      methods: FIELD_METHODS.concat([['openPicker() / showPicker()', 'Open the native picker.']]),
      events: FIELD_EVENTS.concat([['zidan:picker', '{ type }']])
    }
  };

  var states = {};
  var instances = [];
  var active = 'select';
  var runMode = 'attrs';

  function eachField(kind, run) {
    kind.groups.forEach(function (group) {
      group.fields.forEach(run);
    });
  }

  function fieldByKey(kind, key) {
    var found = null;
    eachField(kind, function (field) {
      if (field.key === key) found = field;
    });
    return found;
  }

  function isMulti(s) {
    return s.mode === 'tags' || !!s.multiple;
  }

  function escapeText(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function escapeAttr(value) {
    return escapeText(value).replace(/"/g, '&quot;');
  }

  function attr(name, value) {
    if (value === null || value === undefined || value === '') return '';
    return '\n  ' + name + '="' + escapeAttr(value) + '"';
  }

  function flag(name, on) {
    return on ? '\n  ' + name : '';
  }

  function themeAttrs(s) {
    return attr('data-zidan-theme', s.theme) +
      attr('data-zidan-framework', s.framework) +
      attr('data-zidan-layout', s.layout);
  }

  /* ------------------------------------------------------------------ *
   * Generated markup
   * ------------------------------------------------------------------ */

  function selectMarkup(kind, s, withAttrs) {
    var multi = isMulti(s);
    var attrs = ' id="pg-' + kind + '"' + '\n  name="movie"';
    if (withAttrs) {
      attrs += attr('data-zidan-select', s.mode);
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-scrollbar', s.scrollbar);
      attrs += attr('data-zidan-label', s.label);
      if (s.mode !== 'tags') attrs += attr('data-zidan-placeholder', s.placeholder);
      if (s.mode === 'select') attrs += attr('data-zidan-searchable', s.searchable ? 'true' : 'false');
      if (s.clearable) attrs += flag('data-zidan-clearable', 'true');
      if (s.mode === 'tags') {
        attrs += attr('data-zidan-max-tags', s.maxTags);
        attrs += attr('data-zidan-min-tag-length', s.minTagLength);
        attrs += attr('data-zidan-max-tag-length', s.maxTagLength);
        if (s.reorderable) attrs += flag('data-zidan-reorderable', true);
        if (s.editable) attrs += flag('data-zidan-editable', true);
        attrs += attr('data-zidan-allow-free-text', s.allowFreeText ? 'true' : 'false');
      }
      attrs += attr('data-zidan-validation', s.validation);
    }
    if (multi) attrs += flag('multiple', true);
    if (s.required) attrs += flag('required', true);
    if (s.disabled) attrs += flag('disabled', true);

    var lines = ['<select' + attrs + '\n>'];
    MOVIES.forEach(function (name, index) {
      var value = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var selected = s.mode !== 'tags' && (multi ? index < 2 : index === 0);
      lines.push('  <option value="' + value + '"' + (selected ? ' selected' : '') + '>' + name + '</option>');
    });
    lines.push('</select>');
    return lines.join('\n');
  }

  function fileMarkup(kind, s, withAttrs) {
    var attrs = ' id="pg-' + kind + '"' + '\n  type="file"' + '\n  name="attachments"';
    if (withAttrs) {
      attrs += attr('data-zidan', 'file');
      attrs += attr('data-zidan-file-variant', s.variant);
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-title', s.title);
      attrs += attr('data-zidan-drop-hint', s.dropHint);
      attrs += attr('data-zidan-hint', s.hint);
      attrs += attr('data-zidan-max-files', s.maxFiles);
      attrs += attr('data-zidan-max-size-mb', s.maxSizeMB);
      attrs += attr('data-zidan-upload-url', s.uploadUrl);
      attrs += attr('data-zidan-upload-field', s.uploadUrl ? s.uploadField : '');
      attrs += attr('data-zidan-with-credentials', s.uploadUrl ? (s.withCredentials ? 'true' : 'false') : '');
      attrs += attr('data-zidan-auto-upload', s.autoUpload ? 'true' : 'false');
      attrs += attr('data-zidan-simulate-upload', s.simulateUpload ? 'true' : 'false');
      attrs += attr('data-zidan-simulate-duration', s.simulateUpload ? s.simulateDuration : '');
      attrs += attr('data-zidan-preview', s.showPreview ? 'true' : 'false');
      attrs += attr('data-zidan-show-file-meta', s.showFileMeta ? 'true' : 'false');
      if (s.downscale) {
        attrs += flag('data-zidan-downscale', true);
        attrs += attr('data-zidan-downscale-max-width', s.downscaleMaxWidth);
        attrs += attr('data-zidan-downscale-max-height', s.downscaleMaxHeight);
        attrs += attr('data-zidan-downscale-quality', s.downscaleQuality);
        attrs += attr('data-zidan-downscale-max-bytes', s.downscaleMaxBytes);
        attrs += attr('data-zidan-downscale-mime', s.downscaleMime);
        attrs += attr('data-zidan-downscale-force', s.downscaleForce ? 'true' : 'false');
      }
      attrs += attr('data-zidan-validation', s.validation);
    }
    attrs += attr('accept', s.accept);
    if (s.multiple) attrs += flag('multiple', true);
    if (s.required) attrs += flag('required', true);
    if (s.disabled) attrs += flag('disabled', true);
    return '<input' + attrs + '\n>';
  }

  function checkboxMarkup(kind, s, withAttrs) {
    var isSwitch = kind === 'switch' || s.variant === 'switch';
    var variant = kind === 'switch' ? 'switch' : s.variant;
    var attrs = ' id="pg-' + kind + '"' + '\n  type="checkbox"' + '\n  name="newsletter"';
    if (withAttrs) {
      attrs += attr('data-zidan', 'checkbox');
      attrs += attr('data-zidan-variant', variant);
      if (isSwitch) {
        attrs += attr('data-zidan-switch-style', s.switchStyle);
        if (/^(labeled|icon|square|material)$/.test(s.switchStyle)) {
          attrs += attr('data-zidan-on-label', s.onLabel);
          attrs += attr('data-zidan-off-label', s.offLabel);
        }
      }
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-label', s.label);
      attrs += attr('data-zidan-description', s.description);
      attrs += attr('data-zidan-hint', s.hint);
      attrs += attr('data-zidan-validation', s.validation);
      if (s.indeterminate && !isSwitch) attrs += flag('data-zidan-indeterminate', true);
    }
    if (s.checked) attrs += flag('checked', true);
    if (s.required) attrs += flag('required', true);
    if (s.disabled) attrs += flag('disabled', true);
    return '<label class="pg-check">\n  <input' + attrs.replace(/\n  /g, '\n    ') + '\n  >' + escapeText(s.label) + '\n</label>';
  }

  function radioMarkup(kind, s, withAttrs) {
    var attrs = ' id="pg-' + kind + '"' + '\n  class="zidan-field"';
    if (withAttrs) {
      attrs += attr('data-zidan', 'radio-group');
      attrs += attr('data-zidan-variant', s.variant);
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-hint', s.hint);
      attrs += attr('data-zidan-validation', s.validation);
      if (s.deselectable) attrs += flag('data-zidan-deselectable', true);
    }
    if (s.disabled) attrs += flag('disabled', true);
    var lines = ['<fieldset' + attrs + '\n>', '  <legend>' + escapeText(s.legend) + '</legend>'];
    PLANS.forEach(function (plan, index) {
      var first = index === 0;
      lines.push('  <label><input type="radio" name="plan" value="' + plan[0] + '"' +
        (first ? ' checked' : '') + (s.required && first ? ' required' : '') + '>' + plan[1] + '</label>');
    });
    lines.push('</fieldset>');
    return lines.join('\n');
  }

  function textTypeOf(kind, s) {
    return KINDS[kind].fixedType || s.type;
  }

  function textMarkup(kind, s, withAttrs) {
    var type = textTypeOf(kind, s);
    var isTextarea = type === 'textarea';
    var isRange = type === 'range';
    var isPhone = type === 'tel';
    var isPicker = type === 'date' || type === 'time' || type === 'datetime-local';
    var id = 'pg-' + kind;
    var attrs = ' id="' + id + '"';
    if (!isTextarea) attrs += '\n  type="' + type + '"';
    attrs += '\n  name="' + (type === 'tel' ? 'phone' : (isRange ? 'budget' : (type === 'password' ? 'password' : 'field'))) + '"';

    if (withAttrs) {
      attrs += attr('data-zidan', isTextarea ? 'textarea' : 'input');
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-label', s.label);
      attrs += attr('data-zidan-hint', s.hint);
      attrs += attr('data-zidan-validation', s.validation);
      if (s.autoIcon) attrs += flag('data-zidan-auto-icon', 'true');
      if (!s.autoIcon && s.icon) attrs += attr('data-zidan-icon', s.icon);
      if (s.icon || s.autoIcon) {
        attrs += attr('data-zidan-icon-position', s.iconPosition);
        attrs += attr('data-zidan-icon-clickable', s.iconClickable ? 'true' : '');
        attrs += attr('data-zidan-icon-label', s.iconLabel);
      }
      if (s.validationIcon) attrs += flag('data-zidan-validation-icon', 'true');
      attrs += attr('data-zidan-prefix', s.prefix);
      attrs += attr('data-zidan-suffix', s.suffix);
      if (s.clearable) attrs += flag('data-zidan-clear', true);
      if (s.reveal) attrs += flag('data-zidan-reveal', true);
      attrs += attr('data-zidan-counter', s.counter);
      attrs += attr('data-zidan-mask', s.mask);
      if (s.autogrow) {
        attrs += flag('data-zidan-autogrow', 'true');
        attrs += attr('data-zidan-autogrow-max', s.autogrowMax);
      }
      if (type === 'number') {
        if (s.stepper !== 'false') {
          attrs += attr('data-zidan-stepper', s.stepper);
          if (s.stepper === 'inline') attrs += attr('data-zidan-stepper-position', s.stepperPosition);
          attrs += attr('data-zidan-stepper-wrap', s.stepperWrap ? 'true' : '');
          attrs += attr('data-zidan-stepper-long-press', s.stepperLongPress ? 'true' : 'false');
          attrs += attr('data-zidan-stepper-delay', s.stepperDelay);
          attrs += attr('data-zidan-stepper-interval', s.stepperInterval);
        }
      }
      if (isPhone && s.phone) {
        attrs += flag('data-zidan-phone', 'true');
        attrs += attr('data-zidan-phone-country', s.phoneCountry);
        attrs += attr('data-zidan-phone-format', s.phoneFormat);
        attrs += attr('data-zidan-phone-country-select', s.phoneCountrySelect ? 'true' : 'false');
        attrs += attr('data-zidan-phone-countries', s.phoneCountries);
        if (!s.phoneValidate) {
          attrs += attr('data-zidan-options', JSON.stringify({ phone: { validate: false } }));
        }
      }
      if (isRange) {
        attrs += attr('data-zidan-range-variant', s.rangeVariant);
        attrs += attr('data-zidan-range-bubble-mode', s.rangeBubbleMode);
        attrs += attr('data-zidan-range-bubble-position', s.rangeBubblePosition);
        attrs += attr('data-zidan-range-fill', s.rangeFill ? 'true' : 'false');
        attrs += attr('data-zidan-range-minmax', s.rangeMinMax ? 'true' : 'false');
        attrs += attr('data-zidan-range-ticks', s.rangeTicks);
        if (s.rangeTickLabels) attrs += flag('data-zidan-range-tick-labels', 'true');
        attrs += attr('data-zidan-range-min-label', s.rangeMinLabel);
        attrs += attr('data-zidan-range-max-label', s.rangeMaxLabel);
        attrs += attr('data-zidan-range-format', s.rangeFormat);
        attrs += attr('data-zidan-output', '#pg-' + kind + '-output');
      }
      if (isPicker) {
        if (s.pickerButton) attrs += flag('data-zidan-picker-button', true);
        attrs += attr('data-zidan-picker-icon', s.pickerButton ? s.pickerIcon : '');
        if (/^date|datetime/.test(type)) {
          attrs += attr('data-zidan-disable-weekends', s.disableWeekends ? 'true' : '');
          attrs += attr('data-zidan-disabled-dates', s.disabledDates);
        }
      }
    }
    if (!isTextarea && !isRange && type !== 'color') attrs += attr('placeholder', s.placeholder);
    if (!isTextarea && type !== 'range' && type !== 'date' && type !== 'time' && type !== 'datetime-local') {
      attrs += attr('maxlength', s.maxlength);
    }
    if (type === 'number' || isRange) {
      attrs += attr('min', s.min);
      attrs += attr('max', s.max);
      attrs += attr('step', s.step);
      attrs += attr('value', s.value);
    }
    if (isPhone || isPicker) attrs += attr('value', s.value);
    if (isTextarea) attrs += attr('rows', s.rows);
    if (s.required) attrs += flag('required', true);
    if (s.disabled) attrs += flag('disabled', true);

    var tag = isTextarea ? 'textarea' : 'input';
    var markup = '<label for="' + id + '">' + escapeText(s.label) + '</label>\n<' + tag + attrs + '\n>';
    if (isTextarea) markup += '</textarea>';
    if (isRange) markup += '\n<output id="pg-' + kind + '-output" for="' + id + '">' + escapeText(s.value) + '</output>';
    return markup;
  }

  var MARKUP = {
    select: selectMarkup,
    file: fileMarkup,
    checkbox: checkboxMarkup,
    switch: checkboxMarkup,
    radio: radioMarkup,
    text: textMarkup,
    textarea: textMarkup,
    number: textMarkup,
    phone: textMarkup,
    range: textMarkup,
    date: textMarkup
  };

  /* ------------------------------------------------------------------ *
   * Generated JavaScript
   * ------------------------------------------------------------------ */

  function jsOptions(kind, s) {
    var out = '';
    var type = textTypeOf(kind, s);
    function add(key, value) {
      if (value === '' || value === null || value === undefined) return;
      out += '  ' + key + ': ' + JSON.stringify(value) + ',\n';
    }
    if (kind === 'select') {
      add('mode', s.mode);
      add('layout', s.layout);
      add('theme', s.theme);
      add('themeFramework', s.framework);
      add('scrollbar', s.scrollbar);
      add('label', s.label);
      if (s.mode !== 'tags') add('placeholder', s.placeholder);
      if (s.mode === 'select') add('searchable', s.searchable);
      add('clearable', s.clearable);
      if (s.mode !== 'tags') add('multiple', isMulti(s));
      if (s.closeOnSelect !== '') add('closeOnSelect', s.closeOnSelect === 'true');
      if (Number(s.maxDropdownHeight) > 0) add('maxDropdownHeight', Number(s.maxDropdownHeight));
      if (s.mode === 'tags') {
        if (Number(s.maxTags) > 0) add('maxTags', Number(s.maxTags));
        add('minTagLength', Number(s.minTagLength) || 1);
        if (Number(s.maxTagLength) > 0) add('maxTagLength', Number(s.maxTagLength));
        add('reorderable', !!s.reorderable);
        add('editable', !!s.editable);
        add('allowFreeText', !!s.allowFreeText);
        add('commitOnTab', !!s.commitOnTab);
        add('commitOnBlur', !!s.commitOnBlur);
      }
    }
    if (kind === 'file') {
      add('variant', s.variant);
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('title', s.title);
      add('dropHint', s.dropHint);
      add('hint', s.hint);
      add('accept', s.accept);
      add('maxFiles', Number(s.maxFiles) || 0);
      add('maxSizeMB', Number(s.maxSizeMB) || 0);
      add('autoUpload', s.autoUpload);
      add('simulateUpload', s.simulateUpload);
      if (s.simulateUpload) add('simulateDuration', Number(s.simulateDuration) || 900);
      add('showPreview', s.showPreview);
      add('showFileMeta', s.showFileMeta);
      if (s.downscale) {
        add('downscale', {
          maxWidth: Number(s.downscaleMaxWidth) || 1920,
          maxHeight: Number(s.downscaleMaxHeight) || 1920,
          quality: Number(s.downscaleQuality) || 0.85,
          maxBytes: Number(s.downscaleMaxBytes) || 0,
          mime: s.downscaleMime,
          force: !!s.downscaleForce
        });
      }
      if (s.uploadUrl) {
        add('uploadUrl', s.uploadUrl);
        add('uploadField', s.uploadField);
        add('withCredentials', s.withCredentials);
      }
      add('progressTemplate', s.progressTemplate);
      add('uploadedLabel', s.uploadedLabel);
      add('failedLabel', s.failedLabel);
      add('cancelLabel', s.cancelLabel);
      add('retryLabel', s.retryLabel);
    }
    if (kind === 'checkbox' || kind === 'switch') {
      var variant = kind === 'switch' ? 'switch' : s.variant;
      add('variant', variant);
      if (variant === 'switch') {
        add('switchStyle', s.switchStyle);
        if (/^(labeled|icon|square|material)$/.test(s.switchStyle)) {
          add('onLabel', s.onLabel);
          add('offLabel', s.offLabel);
        }
      }
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('label', s.label);
      add('description', s.description);
      add('hint', s.hint);
      if (kind !== 'switch') add('indeterminate', s.indeterminate);
    }
    if (kind === 'radio') {
      add('variant', s.variant);
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('hint', s.hint);
      add('deselectable', s.deselectable);
    }
    if (MARKUP[kind] === textMarkup) {
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('label', s.label);
      add('hint', s.hint);
      if (s.autoIcon) add('autoIcon', true);
      if (!s.autoIcon && s.icon) add('icon', s.icon);
      if (s.icon || s.autoIcon) {
        add('iconPosition', s.iconPosition);
        if (s.iconClickable) add('iconClickable', true);
        add('iconLabel', s.iconLabel);
      }
      add('validationIcon', s.validationIcon);
      add('prefix', s.prefix);
      add('suffix', s.suffix);
      if (type !== 'range') add('clearable', s.clearable);
      if (type === 'password') add('reveal', s.reveal);
      if (Number(s.counter) > 0) add('counter', Number(s.counter));
      if (s.mask) add('mask', s.mask);
      if (s.autogrow) {
        add('autogrow', true);
        if (Number(s.autogrowMax) > 0) add('autogrowMax', Number(s.autogrowMax));
      }
      if (type === 'number' && s.stepper !== 'false') {
        add('stepper', s.stepper);
        if (s.stepper === 'inline') add('stepperPosition', s.stepperPosition);
        add('stepperWrap', s.stepperWrap);
        add('stepperLongPress', s.stepperLongPress);
        add('stepperDelay', Number(s.stepperDelay) || 420);
        add('stepperInterval', Number(s.stepperInterval) || 90);
      }
      if (type === 'tel' && s.phone) {
        var phoneCountries = String(s.phoneCountries || '').split(',').map(function (iso) {
          return iso.trim().toUpperCase();
        }).filter(Boolean);
        var phoneOptions = {
          country: s.phoneCountry,
          format: s.phoneFormat,
          showCountry: s.phoneCountrySelect,
          validate: !!s.phoneValidate
        };
        if (phoneCountries.length) phoneOptions.countries = phoneCountries;
        add('phone', phoneOptions);
        add('phoneCountryLabel', s.phoneCountryLabel);
        add('phoneCountrySearchText', s.phoneCountrySearchText);
        add('phoneCountryEmptyText', s.phoneCountryEmptyText);
      }
      if (type === 'range') {
        add('rangeVariant', s.rangeVariant);
        add('rangeBubbleMode', s.rangeBubbleMode);
        add('rangeBubblePosition', s.rangeBubblePosition);
        add('rangeFill', s.rangeFill);
        add('rangeMinMax', s.rangeMinMax);
        if (String(s.rangeTicks || '').trim()) {
          var ticks = String(s.rangeTicks).indexOf(',') !== -1
            ? String(s.rangeTicks).split(',').map(Number).filter(function (v) { return isFinite(v); })
            : Number(s.rangeTicks);
          add('rangeTicks', ticks);
        }
        add('rangeTickLabels', s.rangeTickLabels);
        add('rangeMinLabel', s.rangeMinLabel);
        add('rangeMaxLabel', s.rangeMaxLabel);
        if (s.rangeFormat) add('rangeFormat', s.rangeFormat);
        add('output', '#pg-' + kind + '-output');
      }
      if (/^(date|time|datetime-local)$/.test(type)) {
        if (s.pickerButton) {
          add('pickerButton', true);
          add('pickerIcon', s.pickerIcon);
          add('pickerLabel', s.pickerLabel);
        }
        if (/^(date|datetime-local)$/.test(type)) {
          if (s.disableWeekends) add('disableWeekends', true);
          if (s.disabledDates) add('disabledDates', s.disabledDates);
        }
      }
    }
    if (kind === 'select') add('required', s.required);
    add('validation', s.validation);
    if (!out) return '{}';
    return '{\n' + out.replace(/,\n$/, '\n') + '}';
  }

  function jsSnippet(kind, s) {
    var selector = '#pg-' + kind;
    var type = textTypeOf(kind, s);
    var lines = [];
    if (kind === 'select') {
      lines.push("const select = document.querySelector('" + selector + "');");
      if (isMulti(s)) lines.push('select.multiple = true;');
      if (s.required) lines.push('select.required = true;');
      if (s.disabled) lines.push('select.disabled = true;');
      lines.push('');
      lines.push('const picker = zidanSelect(select, ' + jsOptions(kind, s) + ');');
    } else if (kind === 'file') {
      lines.push("const input = document.querySelector('" + selector + "');");
      if (s.multiple) lines.push('input.multiple = true;');
      if (s.required) lines.push('input.required = true;');
      if (s.disabled) lines.push('input.disabled = true;');
      lines.push('');
      lines.push('const upload = zidanField(input, ' + jsOptions(kind, s) + ');');
    } else if (kind === 'checkbox' || kind === 'switch') {
      lines.push("const input = document.querySelector('" + selector + "');");
      lines.push('input.checked = ' + (s.checked ? 'true' : 'false') + ';');
      if (kind !== 'switch' && s.indeterminate) lines.push('input.indeterminate = true;');
      if (s.required) lines.push('input.required = true;');
      if (s.disabled) lines.push('input.disabled = true;');
      lines.push('');
      lines.push('const checkbox = zidanField(input, ' + jsOptions(kind, s) + ');');
    } else if (kind === 'radio') {
      lines.push("const group = document.querySelector('" + selector + "');");
      lines.push('');
      lines.push('const plan = zidanField(group, ' + jsOptions(kind, s) + ');');
    } else {
      lines.push("const input = document.querySelector('" + selector + "');");
      if (type !== 'range' && type !== 'date' && type !== 'time' && type !== 'datetime-local') {
        lines.push('input.placeholder = ' + JSON.stringify(s.placeholder) + ';');
      }
      if (type === 'number' || type === 'range') {
        if (s.min !== '') lines.push('input.min = ' + JSON.stringify(String(s.min)) + ';');
        if (s.max !== '') lines.push('input.max = ' + JSON.stringify(String(s.max)) + ';');
        if (s.step !== '') lines.push('input.step = ' + JSON.stringify(String(s.step)) + ';');
        if (s.value !== '') lines.push('input.value = ' + JSON.stringify(String(s.value)) + ';');
      }
      if (type === 'tel' || type === 'date' || type === 'time' || type === 'datetime-local') {
        if (s.value) lines.push('input.value = ' + JSON.stringify(String(s.value)) + ';');
      }
      if (s.required) lines.push('input.required = true;');
      if (s.disabled) lines.push('input.disabled = true;');
      lines.push('');
      lines.push('const field = zidanField(input, ' + jsOptions(kind, s) + ');');
    }
    lines.push('');
    lines.push('// Read the current value at any time: instance.getValue()');
    return lines.join('\n');
  }

  /* ------------------------------------------------------------------ *
   * Rendering
   * ------------------------------------------------------------------ */

  function optionRow(field, value) {
    var wrap = document.createElement('div');
    wrap.className = 'pg-field' + (field.type === 'checkbox' ? ' pg-field--toggle' : '');

    var label = document.createElement('label');
    label.className = 'pg-field-label';
    label.setAttribute('for', 'pg-opt-' + field.key);
    label.textContent = field.label;

    var control;
    if (field.type === 'select') {
      control = document.createElement('select');
      control.className = 'pg-input';
      field.options.forEach(function (pair) {
        var option = document.createElement('option');
        option.value = pair[0];
        option.textContent = pair[1];
        control.appendChild(option);
      });
      control.value = value;
    } else if (field.type === 'checkbox') {
      control = document.createElement('input');
      control.type = 'checkbox';
      control.checked = !!value;
      control.className = 'pg-check-input';
      wrap.className = 'pg-field pg-field--toggle';
    } else {
      control = document.createElement('input');
      control.type = field.type === 'number' ? 'number' : 'text';
      control.className = 'pg-input';
      control.value = value === undefined || value === null ? '' : value;
    }
    control.id = 'pg-opt-' + field.key;
    control.setAttribute('data-opt', field.key);

    if (field.type === 'checkbox') {
      var track = document.createElement('span');
      track.className = 'pg-switch';
      track.setAttribute('aria-hidden', 'true');
      label.textContent = '';
      label.appendChild(control);
      label.appendChild(track);
      var text = document.createElement('span');
      text.textContent = field.label;
      label.appendChild(text);
      wrap.appendChild(label);
    } else {
      wrap.appendChild(label);
      wrap.appendChild(control);
    }
    return wrap;
  }

  function renderOptions() {
    var kind = KINDS[active];
    var s = states[active];
    body.textContent = '';
    kind.groups.forEach(function (group) {
      var box = document.createElement('div');
      box.className = 'pg-group';
      var heading = document.createElement('h3');
      heading.textContent = group.title;
      box.appendChild(heading);
      group.fields.forEach(function (field) {
        if (field.when && !field.when(s)) return;
        box.appendChild(optionRow(field, s[field.key]));
      });
      if (box.children.length > 1) body.appendChild(box);
    });
    title.textContent = kind.label + ' options';
  }

  function renderUsage() {
    var usage = USAGE[active] || USAGE.text;
    usageNote.textContent = usage.note;
    methodsEl.textContent = '';
    eventsEl.textContent = '';
    usage.methods.forEach(function (pair) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = pair[0];
      li.appendChild(code);
      if (pair[1]) {
        var span = document.createElement('span');
        span.textContent = pair[1];
        li.appendChild(span);
      }
      methodsEl.appendChild(li);
    });
    usage.events.forEach(function (pair) {
      var li = document.createElement('li');
      var code = document.createElement('code');
      code.textContent = pair[0];
      li.appendChild(code);
      if (pair[1]) {
        var span = document.createElement('span');
        span.textContent = pair[1];
        li.appendChild(span);
      }
      eventsEl.appendChild(li);
    });
  }

  function destroyInstances() {
    instances.forEach(function (instance) {
      if (instance && typeof instance.destroy === 'function' && !instance.destroyed) instance.destroy();
    });
    instances = [];
  }

  function initPreview() {
    var s = states[active];
    var withAttrs = runMode === 'attrs';
    stage.innerHTML = MARKUP[active](active, s, withAttrs);

    if (withAttrs) {
      if (window.initZidanSelects) window.initZidanSelects(stage);
      if (window.initZidanForms) window.initZidanForms(stage);
      instances = (window.ZidanSelect ? window.ZidanSelect.instances : [])
        .filter(function (instance) { return stage.contains(instance.el); })
        .concat((window.ZidanForm ? window.ZidanForm.fields : [])
          .filter(function (instance) { return stage.contains(instance.el); }));
    } else {
      var target = stage.querySelector('#pg-' + active);
      var options = new Function('return (' + jsOptions(active, s) + ');')();
      var created = null;
      if (active === 'select') created = window.zidanSelect(target, options);
      else created = window.zidanField(target, options);
      instances = [].concat(created || []);
    }
    updateValue();
  }

  function activeInstance() {
    var node = stage.querySelector('#pg-' + active);
    if (!node) return null;
    return node.__zidanSelect || node.__zidanField || null;
  }

  function updateValue() {
    var kind = KINDS[active];
    var instance = activeInstance();
    var value;
    if (!instance) value = '—';
    else if (active === 'checkbox' || active === 'switch') value = instance.isChecked();
    else if (active === 'file') value = instance.getFiles().map(function (file) { return file.name; });
    else value = instance.getValue();
    valueEl.textContent = JSON.stringify(value);
    kindNote.innerHTML = runMode === 'attrs'
      ? 'Enhanced with the data attributes via <code>' + kind.initName + '</code>.'
      : 'Enhanced with a direct <code>' + (active === 'select' ? 'zidanSelect()' : 'zidanField()') + '</code> call — no data attributes.';
  }

  function refresh() {
    destroyInstances();
    initPreview();
    var s = states[active];
    htmlCode.textContent = MARKUP[active](active, s, true);
    jsCode.textContent = jsSnippet(active, s);
  }

  function refreshValue() {
    updateValue();
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */

  function syncState(kindKey) {
    var s = states[kindKey];
    var kind = KINDS[kindKey];
    if (kind.fixedType && s.type !== kind.fixedType) s.type = kind.fixedType;
  }

  function selectKind(key, focus) {
    if (!KINDS[key]) key = 'select';
    active = key;
    if (window.history && history.replaceState) history.replaceState(null, '', '#' + key);
    Array.prototype.slice.call(tabs.querySelectorAll('button')).forEach(function (button) {
      var on = button.getAttribute('data-kind') === key;
      button.setAttribute('aria-selected', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
      if (on && button.scrollIntoView) button.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    panel.setAttribute('aria-labelledby', 'pg-tab-' + key);
    renderOptions();
    renderUsage();
    refresh();
  }

  tabs.addEventListener('click', function (event) {
    var button = event.target.closest ? event.target.closest('button[data-kind]') : null;
    if (button) selectKind(button.getAttribute('data-kind'), false);
  });

  tabs.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    var keys = Object.keys(KINDS);
    var index = keys.indexOf(active);
    var next = event.key === 'ArrowRight' ? (index + 1) % keys.length : (index - 1 + keys.length) % keys.length;
    event.preventDefault();
    selectKind(keys[next], true);
  });

  body.addEventListener('input', function (event) {
    var target = event.target;
    var key = target.getAttribute && target.getAttribute('data-opt');
    if (!key) return;
    var kind = KINDS[active];
    var field = fieldByKey(kind, key);
    if (!field || (field.type === 'checkbox' || field.type === 'select')) return;
    states[active][key] = target.value;
    syncState(active);
    refresh();
  });

  body.addEventListener('change', function (event) {
    var target = event.target;
    var key = target.getAttribute && target.getAttribute('data-opt');
    if (!key) return;
    var kind = KINDS[active];
    var field = fieldByKey(kind, key);
    if (!field) return;
    var value = field.type === 'checkbox' ? target.checked : target.value;
    states[active][key] = value;
    syncState(active);
    if (field.reflow) renderOptions();
    refresh();
  });

  resetBtn.addEventListener('click', function () {
    states[active] = KINDS[active].defaults();
    syncState(active);
    renderOptions();
    refresh();
  });

  modeButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      runMode = button.getAttribute('data-mode');
      modeButtons.forEach(function (other) {
        other.setAttribute('aria-pressed', other === button ? 'true' : 'false');
      });
      refresh();
    });
  });

  stage.addEventListener('input', refreshValue);
  stage.addEventListener('change', refreshValue);
  stage.addEventListener('zidan:change', refreshValue);
  stage.addEventListener('zidan:input', refreshValue);

  window.addEventListener('hashchange', function () {
    var key = window.location.hash.replace('#', '');
    if (KINDS[key] && key !== active) selectKind(key, false);
  });

  function fallbackCopy(text) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (err) { /* clipboard unavailable */ }
    document.body.removeChild(area);
  }

  Array.prototype.slice.call(document.querySelectorAll('.pg-copy')).forEach(function (button) {
    button.addEventListener('click', function () {
      var text = button.getAttribute('data-copy') === 'html' ? htmlCode.textContent : jsCode.textContent;
      var done = function () {
        var original = button.textContent;
        button.textContent = 'Copied';
        button.classList.add('is-done');
        window.setTimeout(function () {
          button.textContent = original;
          button.classList.remove('is-done');
        }, 1600);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });
  });

  Object.keys(KINDS).forEach(function (key) {
    states[key] = KINDS[key].defaults();
    syncState(key);
  });

  var requested = window.location.hash.replace('#', '');
  selectKind(KINDS[requested] ? requested : 'select', false);
})();
