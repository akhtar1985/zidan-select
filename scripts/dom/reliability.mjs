/**
 * Production-reliability DOM tests: accessibility wiring, teardown/memory
 * behaviour and form-validation integration. Registered by run.mjs so they run
 * through `npm test` with the rest of the jsdom suite.
 */

export function registerReliabilityTests({ test, boot, wait, assert }) {
  test('a11y: an author label names the replacement combobox', () => {
    const window = boot('<label for="s">Country</label><select id="s"><option value="us">United States</option></select>');
    const select = window.zidanSelect('#s');
    const label = window.document.querySelector('label[for="s"]');
    assert.ok(label.id, 'the author label gets an id so it can be referenced');
    assert.equal(select.input.getAttribute('aria-labelledby'), label.id);
    assert.equal(window.document.getElementById(select.input.getAttribute('aria-labelledby')).textContent, 'Country');
    select.destroy();
  });

  test('a11y: a native aria-label carries over to the combobox', () => {
    const window = boot('<select id="s" aria-label="Shipping country"><option value="us">US</option></select>');
    const select = window.zidanSelect('#s');
    assert.equal(select.input.getAttribute('aria-label'), 'Shipping country');
    select.destroy();
  });

  test('a11y: combobox state and active option stay in sync', () => {
    const window = boot('<select id="s"><option value="a">Alpha</option><option value="b">Beta</option></select>');
    const select = window.zidanSelect('#s');
    assert.equal(select.input.getAttribute('aria-expanded'), 'false');
    select.open();
    assert.equal(select.input.getAttribute('aria-expanded'), 'true');
    const controls = select.input.getAttribute('aria-controls');
    assert.ok(controls, 'aria-controls must name the listbox');
    assert.equal(window.document.getElementById(controls), select.dropdown);
    assert.equal(select.dropdown.getAttribute('role'), 'listbox');
    select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    const active = select.input.getAttribute('aria-activedescendant');
    assert.ok(active, 'arrow navigation must set aria-activedescendant');
    assert.ok(window.document.getElementById(active), 'aria-activedescendant must reference a rendered option');
    select.destroy();
  });

  test('regression BUG-031: opening a selected combobox starts on its value', () => {
    const window = boot('<select id="s"><option value="">Choose</option><option value="a">Alpha</option><option value="b">Beta</option></select>');
    const select = window.zidanSelect('#s');
    select.setValue('b');
    select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(select.opened, true);
    assert.equal(select.activeIndex, 2, 'the selected option, not the placeholder, is active when the menu opens');
    const active = select.input.getAttribute('aria-activedescendant');
    assert.ok(active, 'the active option is exposed to assistive technology');
    assert.match(window.document.getElementById(active).textContent, /Beta/);
    select.input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    assert.equal(select.getValue(), 'b', 'Enter keeps the current selection instead of clearing it');
    assert.equal(select.el.value, 'b');
    select.destroy();
  });

  test('regression BUG-032: zidanField repeat init returns the existing instance', () => {
    const window = boot('<input id="t">');
    const first = window.zidanField('#t');
    const second = window.zidanField('#t');
    assert.strictEqual(second, first, 'repeat init returns the existing instance');
    assert.equal(window.document.querySelectorAll('.zs-field').length, 1, 'repeat init does not wrap the control twice');
    const forced = window.zidanField('#t', { force: true });
    assert.notStrictEqual(forced, first, 'force builds a fresh instance');
    assert.equal(window.document.querySelectorAll('.zs-field').length, 1, 'force replaces the wrapper instead of stacking one');
    forced.destroy();
  });

  test('a11y: an invalid field marks the control and links the message', () => {
    const window = boot('<input id="t" data-zidan-input>');
    const field = window.zidanField('#t');
    field.setError('At least 2 characters');
    assert.equal(field.el.getAttribute('aria-invalid'), 'true');
    const described = (field.el.getAttribute('aria-describedby') || '').split(/\s+/);
    assert.ok(described.includes('t-error'), 'the error paragraph is referenced by aria-describedby');
    assert.equal(window.document.getElementById('t-error').textContent, 'At least 2 characters');
    assert.equal(window.document.getElementById('t-error').getAttribute('role'), 'status');
    field.clearError();
    assert.equal(field.el.getAttribute('aria-invalid'), null);
    assert.equal((field.el.getAttribute('aria-describedby') || '').includes('t-error'), false);
    field.destroy();
  });

  test('a11y: enhanced controls never duplicate element ids', () => {
    const window = boot([
      '<form>',
      '<label for="country">Country</label><select id="country" data-zidan-select><option value="us">US</option></select>',
      '<label><input id="agree" type="checkbox" data-zidan="checkbox"> Agree</label>',
      '<fieldset id="plan" data-zidan="radio-group"><legend>Plan</legend><label><input type="radio" name="plan" value="a" checked> A</label></fieldset>',
      '<input id="docs" type="file" data-zidan="file">',
      '<input id="name" data-zidan-input>',
      '</form>'
    ].join(''));
    window.ZidanForm.init(window.document);
    const seen = new Set();
    for (const node of window.document.querySelectorAll('[id]')) {
      assert.ok(!seen.has(node.id), 'duplicate id: ' + node.id);
      seen.add(node.id);
    }
    window.ZidanForm.destroy();
  });

  test('lifecycle: destroy is idempotent and cleans every registry', () => {
    const window = boot('<select id="s"><option value="a">A</option></select><input id="t" data-zidan-input>');
    const select = window.zidanSelect('#s');
    const field = window.zidanField('#t');
    assert.equal(window.ZidanForm.fields.length, 1);
    assert.equal(window.ZidanSelect.instances.length, 1);
    select.destroy().destroy();
    field.destroy().destroy();
    assert.equal(window.ZidanForm.fields.length, 0);
    assert.equal(window.ZidanSelect.instances.length, 0);
    assert.equal(window.document.getElementById('s-input'), null, 'the select wrapper is removed');
    assert.ok(window.document.getElementById('t'), 'the author input survives field teardown');
    assert.equal(field.destroyed, true);
  });

  test('memory: repeated init/destroy cycles leave nothing behind', () => {
    const window = boot('<div id="host"></div>');
    const host = window.document.getElementById('host');
    const baseline = host.children.length;
    for (let i = 0; i < 25; i += 1) {
      host.innerHTML = '<select class="fresh"><option value="a">A</option></select>';
      const select = window.zidanSelect('.fresh');
      select.on('change', () => {});
      assert.equal(select.listeners.size, 1, 'the live select tracks its listeners');
      select.destroy();
      assert.equal(select.listeners.size, 0, 'destroy clears the instance listener registry');
      assert.equal(host.querySelectorAll('.zs-root').length, 0, 'no wrapper survives destroy');
    }
    assert.equal(host.children.length, baseline + 1, 'only the author select remains');
    assert.equal(window.ZidanForm.fields.length, 0);
    assert.equal(window.ZidanSelect.instances.length, 0);
  });

  test('lifecycle: a wrapper detached before destroy still tears down safely', () => {
    const window = boot('<select id="s"><option value="a">A</option></select>');
    const select = window.zidanSelect('#s');
    select.root.parentNode.removeChild(select.root);
    assert.doesNotThrow(() => select.destroy());
    assert.equal(window.ZidanSelect.instances.length, 0);
    assert.equal(select.native.hidden, false, 'the native select is restored even when detached');
  });

  test('validation: enhanced values and rules agree with the native form', async () => {
    const window = boot([
      '<form id="f">',
      '<select id="s" name="country" required data-zidan-select><option value="">Pick</option><option value="us">US</option></select>',
      '<input id="email" name="email" type="email" required>',
      '<input id="name" name="name" data-zidan-input>',
      '</form>'
    ].join(''));
    const select = window.zidanSelect('#s');
    const name = window.zidanField('#name', { validate: (value) => value.trim().length >= 2 });
    const form = window.document.getElementById('f');

    assert.equal(form.checkValidity(), false, 'the native required select blocks submission');
    assert.equal(await window.ZidanForm.validate(form, { focus: false }), false);

    select.setValue('us');
    window.document.getElementById('email').value = 'a@b.co';
    name.setValue('A');
    assert.equal(await window.ZidanForm.validate(form, { focus: false }), false, 'the custom rule still fails');
    name.setValue('Ada');
    assert.equal(await window.ZidanForm.validate(form, { focus: false }), true);
    assert.equal(form.checkValidity(), true);

    const data = window.ZidanForm.serialize(form);
    assert.equal(data.country, 'us');
    assert.equal(data.email, 'a@b.co');
    assert.equal(data.name, 'Ada');
    select.destroy();
    name.destroy();
  });
}
