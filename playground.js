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

  var KINDS = {
    select: {
      label: 'Select',
      initName: 'initZidanSelects()',
      groups: [
        {
          title: 'Control',
          fields: [
            { key: 'mode', label: 'Mode', type: 'select', def: 'combobox', reflow: true, options: [
              ['select', 'Select'], ['combobox', 'Combobox'], ['tags', 'Tags']
            ] },
            { key: 'layout', label: 'Layout', type: 'select', options: SELECT_LAYOUT_OPTIONS, def: 'classic-clean' },
            themeField(),
            frameworkField(),
            { key: 'scrollbar', label: 'Scrollbar', type: 'select', def: 'default', options: [
              ['default', 'Default'], ['thin', 'Thin'], ['fancy', 'Fancy'], ['hover', 'On hover'], ['hidden', 'Hidden']
            ] }
          ]
        },
        {
          title: 'Content',
          fields: [
            text('label', 'Floating label', 'Favorite movie'),
            text('placeholder', 'Placeholder', 'Choose a movie…', function (s) { return s.mode !== 'tags' && !isMulti(s); })
          ]
        },
        {
          title: 'Behaviour',
          fields: [
            bool('searchable', 'Searchable', true, function (s) { return s.mode === 'select'; }),
            bool('clearable', 'Clear button', true),
            bool('multiple', 'Allow multiple values', false, function (s) { return s.mode !== 'tags'; }),
            bool('required', 'Required', false),
            bool('disabled', 'Disabled', false)
          ]
        }
      ],
      defaults: function () {
        return { mode: 'combobox', layout: 'classic-clean', theme: 'default', framework: 'none', scrollbar: 'default', label: 'Favorite movie', placeholder: 'Choose a movie…', searchable: true, clearable: true, multiple: false, required: false, disabled: false };
      }
    },
    file: {
      label: 'File upload',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            { key: 'variant', label: 'Variant', type: 'select', def: 'dropzone', options: [
              ['dropzone', 'Dropzone'], ['button', 'Button'], ['avatar', 'Avatar'], ['gallery', 'Gallery'], ['compact', 'Compact']
            ] },
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
            text('accept', 'Accepted files', 'image/*,.pdf')
          ]
        },
        {
          title: 'Limits & behaviour',
          fields: [
            { key: 'maxFiles', label: 'Max files', type: 'number', def: 4 },
            { key: 'maxSizeMB', label: 'Max size (MB)', type: 'number', def: 5 },
            bool('multiple', 'Multiple files', true),
            bool('autoUpload', 'Auto upload', true),
            bool('simulateUpload', 'Simulate progress', false),
            bool('showPreview', 'Image preview', true),
            bool('showFileMeta', 'Show size / type', true),
            bool('required', 'Required', false),
            bool('disabled', 'Disabled', false)
          ]
        }
      ],
      defaults: function () {
        return { variant: 'dropzone', theme: 'default', framework: 'none', layout: '', title: 'Drag & drop your files', dropHint: 'PNG, JPG or PDF up to 5 MB', accept: 'image/*,.pdf', maxFiles: 4, maxSizeMB: 5, multiple: true, autoUpload: true, simulateUpload: false, showPreview: true, showFileMeta: true, required: false, disabled: false };
      }
    },
    checkbox: {
      label: 'Checkbox / switch',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            { key: 'variant', label: 'Variant', type: 'select', def: 'switch', reflow: true, options: [
              ['default', 'Checkbox'], ['switch', 'Switch'], ['card', 'Card'], ['button', 'Button'], ['minimal', 'Minimal']
            ] },
            { key: 'switchStyle', label: 'Switch style', type: 'select', def: 'ios', when: function (s) { return s.variant === 'switch'; }, options: [
              ['ios', 'iOS'], ['material', 'Material'], ['square', 'Square'], ['labeled', 'Labeled'], ['icon', 'Icon']
            ] },
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
            bool('disabled', 'Disabled', false)
          ]
        }
      ],
      defaults: function () {
        return { variant: 'switch', switchStyle: 'ios', theme: 'default', framework: 'none', layout: '', label: 'Email digest', description: 'A short daily summary.', hint: '', checked: true, indeterminate: false, required: false, disabled: false };
      }
    },
    radio: {
      label: 'Radio group',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            { key: 'variant', label: 'Variant', type: 'select', def: 'stacked', options: [
              ['stacked', 'Stacked'], ['inline', 'Inline'], ['card', 'Card'], ['button', 'Button'], ['tile', 'Tile']
            ] },
            themeField(),
            frameworkField(),
            layoutField()
          ]
        },
        {
          title: 'Copy',
          fields: [text('legend', 'Legend', 'Plan')]
        },
        {
          title: 'Behaviour',
          fields: [
            bool('deselectable', 'Click again to clear', false),
            bool('disabled', 'Disabled', false)
          ]
        }
      ],
      defaults: function () {
        return { variant: 'stacked', theme: 'default', framework: 'none', layout: '', legend: 'Plan', deselectable: false, disabled: false };
      }
    },
    text: {
      label: 'Text & inputs',
      initName: 'initZidanForms()',
      groups: [
        {
          title: 'Control',
          fields: [
            { key: 'type', label: 'Input type', type: 'select', def: 'email', reflow: true, options: [
              ['text', 'Text'], ['email', 'Email'], ['password', 'Password'], ['number', 'Number'],
              ['tel', 'Phone'], ['url', 'URL'], ['search', 'Search'], ['date', 'Date'],
              ['time', 'Time'], ['textarea', 'Textarea'], ['range', 'Range']
            ] },
            text('label', 'Label', 'Email address'),
            text('placeholder', 'Placeholder', 'you@example.com', function (s) { return s.type !== 'range'; }),
            themeField(),
            frameworkField(),
            layoutField()
          ]
        },
        {
          title: 'Icons & add-ons',
          fields: [
            bool('autoIcon', 'Icon from input type', true, null, true),
            { key: 'icon', label: 'Custom icon', type: 'select', options: ICON_OPTIONS, def: '', when: function (s) { return !s.autoIcon; } },
            { key: 'iconPosition', label: 'Icon position', type: 'select', def: 'left', when: function (s) { return !!(s.icon || s.autoIcon); }, options: [['left', 'Left'], ['right', 'Right']] },
            text('prefix', 'Prefix', '', function (s) { return s.type !== 'textarea' && s.type !== 'range'; }),
            text('suffix', 'Suffix', '', function (s) { return s.type !== 'textarea' && s.type !== 'range'; }),
            bool('clearable', 'Clear button', true, function (s) { return s.type !== 'range'; }),
            bool('reveal', 'Show / hide password', false, function (s) { return s.type === 'password'; }),
            { key: 'counter', label: 'Character counter', type: 'number', def: '', when: function (s) { return s.type === 'text' || s.type === 'email' || s.type === 'textarea'; } },
            text('hint', 'Hint', '')
          ]
        },
        {
          title: 'Type-specific',
          fields: [
            { key: 'stepper', label: 'Number stepper', type: 'select', def: 'false', when: function (s) { return s.type === 'number'; }, options: [
              ['false', 'Off'], ['stacked', 'Stacked'], ['split', 'Split'], ['inline', 'Inline']
            ] },
            bool('phone', 'Phone formatting', false, function (s) { return s.type === 'tel'; }, true),
            { key: 'phoneCountry', label: 'Phone country', type: 'select', def: 'US', when: function (s) { return s.type === 'tel' && s.phone; }, options: [
              ['US', 'United States'], ['GB', 'United Kingdom'], ['DE', 'Germany'], ['FR', 'France'],
              ['IN', 'India'], ['PK', 'Pakistan'], ['AU', 'Australia'], ['CA', 'Canada']
            ] },
            { key: 'phoneFormat', label: 'Phone format', type: 'select', def: 'national', when: function (s) { return s.type === 'tel' && s.phone; }, options: [
              ['national', 'National'], ['international', 'International'], ['e164', 'E.164']
            ] },
            { key: 'rangeVariant', label: 'Range style', type: 'select', def: 'default', when: function (s) { return s.type === 'range'; }, options: [
              ['default', 'Default'], ['gradient', 'Gradient'], ['stepped', 'Stepped'], ['minimal', 'Minimal']
            ] },
            { key: 'rangeMin', label: 'Range min', type: 'number', def: 0, when: function (s) { return s.type === 'range'; } },
            { key: 'rangeMax', label: 'Range max', type: 'number', def: 1000, when: function (s) { return s.type === 'range'; } },
            { key: 'rangeStep', label: 'Range step', type: 'number', def: 50, when: function (s) { return s.type === 'range'; } },
            { key: 'rangeValue', label: 'Range value', type: 'number', def: 400, when: function (s) { return s.type === 'range'; } },
            bool('rangeMinMax', 'Min / max scale', true, function (s) { return s.type === 'range'; }),
            { key: 'rangeBubbleMode', label: 'Range bubble', type: 'select', def: 'always', when: function (s) { return s.type === 'range'; }, options: [
              ['always', 'Always'], ['active', 'On hover / focus'], ['never', 'Never']
            ] },
            { key: 'rangeBubblePosition', label: 'Bubble position', type: 'select', def: 'top', when: function (s) { return s.type === 'range'; }, options: [
              ['top', 'Top'], ['bottom', 'Bottom']
            ] },
            bool('rangeFill', 'Progress fill', true, function (s) { return s.type === 'range'; }),
            text('rangeMinLabel', 'Scale start label', '', function (s) { return s.type === 'range'; }),
            text('rangeMaxLabel', 'Scale end label', '', function (s) { return s.type === 'range'; }),
            text('rangeTicks', 'Tick values (comma list)', '', function (s) { return s.type === 'range'; }),
            bool('rangeTickLabels', 'Tick labels', false, function (s) { return s.type === 'range'; }),
            bool('pickerButton', 'Open picker button', false, function (s) { return s.type === 'date' || s.type === 'time'; })
          ]
        },
        {
          title: 'State',
          fields: [
            bool('required', 'Required', false),
            bool('disabled', 'Disabled', false)
          ]
        }
      ],
      defaults: function () {
        return { type: 'email', label: 'Email address', placeholder: 'you@example.com', theme: 'default', framework: 'none', layout: '', autoIcon: true, icon: '', iconPosition: 'left', prefix: '', suffix: '', clearable: true, reveal: false, counter: '', hint: '', stepper: 'false', phone: false, phoneCountry: 'US', phoneFormat: 'national', rangeVariant: 'default', rangeMin: 0, rangeMax: 1000, rangeStep: 50, rangeValue: 400, rangeMinMax: true, rangeBubbleMode: 'always', rangeBubblePosition: 'top', rangeFill: true, rangeMinLabel: '', rangeMaxLabel: '', rangeTicks: '', rangeTickLabels: false, pickerButton: false, required: false, disabled: false };
      }
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

  function themeAttrs(s) {
    return attr('data-zidan-theme', s.theme) +
      attr('data-zidan-framework', s.framework) +
      attr('data-zidan-layout', s.layout);
  }

  /* ------------------------------------------------------------------ *
   * Generated markup
   * ------------------------------------------------------------------ */

  function selectMarkup(s, withAttrs) {
    var multi = isMulti(s);
    var attrs = ' id="pg-select"' + '\n  name="movie"';
    if (withAttrs) {
      attrs += attr('data-zidan-select', s.mode);
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-scrollbar', s.scrollbar);
      attrs += attr('data-zidan-label', s.label);
      if (s.mode !== 'tags') attrs += attr('data-zidan-placeholder', s.placeholder);
      if (s.mode === 'select') attrs += attr('data-zidan-searchable', s.searchable ? 'true' : 'false');
      if (s.clearable) attrs += '\n  data-zidan-clearable="true"';
    }
    if (multi) attrs += '\n  multiple';
    if (s.required) attrs += '\n  required';
    if (s.disabled) attrs += '\n  disabled';

    var lines = ['<select' + attrs + '\n>'];
    MOVIES.forEach(function (name, index) {
      var value = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var selected = s.mode !== 'tags' && (multi ? index < 2 : index === 0);
      lines.push('  <option value="' + value + '"' + (selected ? ' selected' : '') + '>' + name + '</option>');
    });
    lines.push('</select>');
    return lines.join('\n');
  }

  function fileMarkup(s, withAttrs) {
    var attrs = ' id="pg-file"' + '\n  type="file"' + '\n  name="attachments"';
    if (withAttrs) {
      attrs += '\n  data-zidan="file"';
      attrs += attr('data-zidan-file-variant', s.variant);
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-title', s.title);
      attrs += attr('data-zidan-drop-hint', s.dropHint);
      attrs += attr('data-zidan-max-files', s.maxFiles);
      attrs += attr('data-zidan-max-size-mb', s.maxSizeMB);
      attrs += attr('data-zidan-auto-upload', s.autoUpload ? 'true' : 'false');
      attrs += attr('data-zidan-simulate-upload', s.simulateUpload ? 'true' : 'false');
      attrs += attr('data-zidan-preview', s.showPreview ? 'true' : 'false');
      attrs += attr('data-zidan-show-file-meta', s.showFileMeta ? 'true' : 'false');
    }
    attrs += attr('accept', s.accept);
    if (s.multiple) attrs += '\n  multiple';
    if (s.required) attrs += '\n  required';
    if (s.disabled) attrs += '\n  disabled';
    return '<input' + attrs + '\n>';
  }

  function checkboxMarkup(s, withAttrs) {
    var attrs = ' id="pg-checkbox"' + '\n  type="checkbox"' + '\n  name="newsletter"';
    if (withAttrs) {
      attrs += '\n  data-zidan="checkbox"';
      attrs += attr('data-zidan-variant', s.variant);
      if (s.variant === 'switch') attrs += attr('data-zidan-switch-style', s.switchStyle);
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-label', s.label);
      attrs += attr('data-zidan-description', s.description);
      attrs += attr('data-zidan-hint', s.hint);
      if (s.indeterminate) attrs += '\n  data-zidan-indeterminate';
    }
    if (s.checked) attrs += '\n  checked';
    if (s.required) attrs += '\n  required';
    if (s.disabled) attrs += '\n  disabled';
    return '<label class="pg-check">\n  <input' + attrs.replace(/\n  /g, '\n    ') + '\n  >' + escapeText(s.label) + '\n</label>';
  }

  function radioMarkup(s, withAttrs) {
    var attrs = ' id="pg-radio"' + '\n  class="zidan-field"';
    if (withAttrs) {
      attrs += '\n  data-zidan="radio-group"';
      attrs += attr('data-zidan-variant', s.variant);
      attrs += themeAttrs(s);
      if (s.deselectable) attrs += '\n  data-zidan-deselectable';
    }
    if (s.disabled) attrs += '\n  disabled';
    var lines = ['<fieldset' + attrs + '\n>', '  <legend>' + escapeText(s.legend) + '</legend>'];
    PLANS.forEach(function (plan, index) {
      lines.push('  <label><input type="radio" name="plan" value="' + plan[0] + '"' + (index === 0 ? ' checked' : '') + '>' + plan[1] + '</label>');
    });
    lines.push('</fieldset>');
    return lines.join('\n');
  }

  function textMarkup(s, withAttrs) {
    var isTextarea = s.type === 'textarea';
    var isRange = s.type === 'range';
    var attrs = ' id="pg-text"';
    if (!isTextarea) attrs += '\n  type="' + s.type + '"';
    attrs += '\n  name="' + (s.type === 'password' ? 'password' : (isRange ? 'budget' : 'email')) + '"';
    if (withAttrs) {
      attrs += '\n  data-zidan="' + (isTextarea ? 'textarea' : 'input') + '"';
      attrs += themeAttrs(s);
      attrs += attr('data-zidan-label', s.label);
      attrs += attr('data-zidan-hint', s.hint);
      if (s.autoIcon) attrs += '\n  data-zidan-auto-icon="true"';
      if (!s.autoIcon && s.icon) attrs += attr('data-zidan-icon', s.icon);
      if (s.icon || s.autoIcon) attrs += attr('data-zidan-icon-position', s.iconPosition);
      attrs += attr('data-zidan-prefix', s.prefix);
      attrs += attr('data-zidan-suffix', s.suffix);
      if (s.clearable) attrs += '\n  data-zidan-clear';
      if (s.reveal) attrs += '\n  data-zidan-reveal';
      attrs += attr('data-zidan-counter', s.counter);
      if (s.type === 'number' && s.stepper !== 'false') attrs += attr('data-zidan-stepper', s.stepper);
      if (s.type === 'tel' && s.phone) {
        attrs += '\n  data-zidan-phone="true"';
        attrs += attr('data-zidan-phone-country', s.phoneCountry);
        attrs += attr('data-zidan-phone-format', s.phoneFormat);
      }
      if (isRange) {
        attrs += attr('data-zidan-range-variant', s.rangeVariant);
        attrs += attr('data-zidan-range-minmax', s.rangeMinMax ? 'true' : 'false');
        attrs += attr('data-zidan-range-bubble-mode', s.rangeBubbleMode);
        attrs += attr('data-zidan-range-bubble-position', s.rangeBubblePosition);
        attrs += attr('data-zidan-range-fill', s.rangeFill ? 'true' : 'false');
        attrs += attr('data-zidan-range-min-label', s.rangeMinLabel);
        attrs += attr('data-zidan-range-max-label', s.rangeMaxLabel);
        attrs += attr('data-zidan-range-ticks', s.rangeTicks);
        if (s.rangeTickLabels) attrs += '\n  data-zidan-range-tick-labels="true"';
        attrs += attr('data-zidan-output', '#pg-text-output');
      }
      if ((s.type === 'date' || s.type === 'time') && s.pickerButton) attrs += '\n  data-zidan-picker-button';
    }
    if (!isTextarea && s.type !== 'range') attrs += attr('placeholder', s.placeholder);
    if (isTextarea) attrs += '\n  rows="4"';
    if (isRange) {
      attrs += attr('min', s.rangeMin);
      attrs += attr('max', s.rangeMax);
      attrs += attr('step', s.rangeStep);
      attrs += attr('value', s.rangeValue);
    }
    if (s.required) attrs += '\n  required';
    if (s.disabled) attrs += '\n  disabled';
    var tag = isTextarea ? 'textarea' : 'input';
    var markup = '<label for="pg-text">' + escapeText(s.label) + '</label>\n<' + tag + attrs + '\n>';
    if (isTextarea) markup += '</textarea>';
    if (isRange) markup += '\n<output id="pg-text-output" for="pg-text">' + s.rangeValue + '</output>';
    return markup;
  }

  var MARKUP = {
    select: selectMarkup,
    file: fileMarkup,
    checkbox: checkboxMarkup,
    radio: radioMarkup,
    text: textMarkup
  };

  /* ------------------------------------------------------------------ *
   * Generated JavaScript
   * ------------------------------------------------------------------ */

  function jsOptions(kind, s) {
    var out = '';
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
    }
    if (kind === 'file') {
      add('variant', s.variant);
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('title', s.title);
      add('dropHint', s.dropHint);
      add('accept', s.accept);
      add('maxFiles', Number(s.maxFiles) || 0);
      add('maxSizeMB', Number(s.maxSizeMB) || 0);
      add('autoUpload', s.autoUpload);
      add('simulateUpload', s.simulateUpload);
      add('showPreview', s.showPreview);
      add('showFileMeta', s.showFileMeta);
    }
    if (kind === 'checkbox') {
      add('variant', s.variant);
      if (s.variant === 'switch') add('switchStyle', s.switchStyle);
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('label', s.label);
      add('description', s.description);
      add('hint', s.hint);
      add('indeterminate', s.indeterminate);
    }
    if (kind === 'radio') {
      add('variant', s.variant);
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('deselectable', s.deselectable);
    }
    if (kind === 'text') {
      add('theme', s.theme);
      add('framework', s.framework);
      add('layout', s.layout);
      add('label', s.label);
      add('hint', s.hint);
      add('autoIcon', s.autoIcon);
      if (!s.autoIcon) add('icon', s.icon);
      if (s.icon || s.autoIcon) add('iconPosition', s.iconPosition);
      add('prefix', s.prefix);
      add('suffix', s.suffix);
      if (s.type !== 'range') add('clearable', s.clearable);
      if (s.type === 'password') add('reveal', s.reveal);
      if (s.counter !== '' && Number(s.counter) > 0) add('counter', Number(s.counter));
      if (s.type === 'number' && s.stepper !== 'false') add('stepper', s.stepper);
      if (s.type === 'tel' && s.phone) {
        add('phone', true);
        add('phoneCountry', s.phoneCountry);
        add('phoneFormat', s.phoneFormat);
      }
      if (s.type === 'range') {
        add('rangeVariant', s.rangeVariant);
        add('rangeMinMax', s.rangeMinMax);
        add('rangeBubbleMode', s.rangeBubbleMode);
        add('rangeBubblePosition', s.rangeBubblePosition);
        add('rangeFill', s.rangeFill);
        add('rangeMinLabel', s.rangeMinLabel);
        add('rangeMaxLabel', s.rangeMaxLabel);
        if (String(s.rangeTicks || '').trim()) {
          var tickValues = String(s.rangeTicks).split(',').map(Number).filter(function (value) { return isFinite(value); });
          if (tickValues.length) add('rangeTicks', tickValues);
        }
        add('rangeTickLabels', s.rangeTickLabels);
        add('output', '#pg-text-output');
      }
      if ((s.type === 'date' || s.type === 'time') && s.pickerButton) add('pickerButton', true);
    }
    if (!out) return '{}';
    return '{\n' + out.replace(/,\n$/, '\n') + '}';
  }

  function jsSnippet(kind, s) {
    var selector = '#pg-' + kind;
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
    } else if (kind === 'checkbox') {
      lines.push("const input = document.querySelector('" + selector + "');");
      lines.push('input.checked = ' + (s.checked ? 'true' : 'false') + ';');
      if (s.indeterminate) lines.push('input.indeterminate = true;');
      if (s.required) lines.push('input.required = true;');
      if (s.disabled) lines.push('input.disabled = true;');
      lines.push('');
      lines.push('const checkbox = zidanField(input, ' + jsOptions(kind, s) + ');');
    } else if (kind === 'radio') {
      lines.push("const group = document.querySelector('" + selector + "');");
      if (s.disabled) lines.push('group.disabled = true;');
      lines.push('');
      lines.push('const plan = zidanField(group, ' + jsOptions(kind, s) + ');');
    } else if (kind === 'text') {
      lines.push("const input = document.querySelector('" + selector + "');");
      if (s.type !== 'range' && s.type !== 'textarea') lines.push('input.placeholder = ' + JSON.stringify(s.placeholder) + ';');
      if (s.type === 'range') {
        lines.push('input.min = ' + JSON.stringify(String(s.rangeMin)) + ';');
        lines.push('input.max = ' + JSON.stringify(String(s.rangeMax)) + ';');
        lines.push('input.step = ' + JSON.stringify(String(s.rangeStep)) + ';');
        lines.push('input.value = ' + JSON.stringify(String(s.rangeValue)) + ';');
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

  function destroyInstances() {
    instances.forEach(function (instance) {
      if (instance && typeof instance.destroy === 'function' && !instance.destroyed) instance.destroy();
    });
    instances = [];
  }

  function initPreview() {
    var kind = KINDS[active];
    var s = states[active];
    var withAttrs = runMode === 'attrs';
    stage.innerHTML = MARKUP[active](s, withAttrs);

    if (withAttrs) {
      if (window.initZidanSelects) window.initZidanSelects(stage);
      if (window.initZidanForms) window.initZidanForms(stage);
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
    else if (active === 'checkbox') value = instance.isChecked();
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
    htmlCode.textContent = MARKUP[active](s, true);
    jsCode.textContent = jsSnippet(active, s);
  }

  function refreshValue() {
    updateValue();
  }

  /* ------------------------------------------------------------------ *
   * Events
   * ------------------------------------------------------------------ */

  function syncState(kindKey) {
    var kind = KINDS[kindKey];
    var s = states[kindKey];
    if (kindKey === 'text' && s.type !== 'tel') s.phone = false;
  }

  function selectKind(key, focus) {
    if (!KINDS[key]) return;
    active = key;
    if (window.history && history.replaceState) history.replaceState(null, '', '#' + key);
    Array.prototype.slice.call(tabs.querySelectorAll('button')).forEach(function (button) {
      var on = button.getAttribute('data-kind') === key;
      button.setAttribute('aria-selected', on ? 'true' : 'false');
      button.tabIndex = on ? 0 : -1;
      if (on && focus) button.focus();
    });
    panel.setAttribute('aria-labelledby', 'pg-tab-' + key);
    renderOptions();
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
