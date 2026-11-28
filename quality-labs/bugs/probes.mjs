#!/usr/bin/env node
/** Focused jsdom probes for defects that are not covered by the main suite. */
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { root } from '../shared/common.mjs';

const source = fs.readFileSync(path.join(root, 'zidan-form.js'), 'utf8');

function boot(body) {
  const dom = new JSDOM('<!doctype html><html><body>' + body + '</body></html>', { runScripts: 'dangerously', url: 'https://zidan.test/' });
  dom.window.eval(source);
  return dom.window;
}

export function radioChangeProbe() {
  const window = boot('<form><fieldset id="rg" data-zidan="radio-group"><label><input type="radio" name="p" value="a" checked> A</label><label><input type="radio" name="p" value="b"> B</label></fieldset></form>');
  const group = window.zidanField('#rg', { deselectable: true });
  let emitted = 0;
  let callbacks = 0;
  const original = group.emit.bind(group);
  group.emit = (name, detail) => { if (name === 'change') emitted += 1; return original(name, detail); };
  group.opts.onChange = () => { callbacks += 1; };
  const input = window.document.querySelector('input[value="a"]');
  input.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }));
  input.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const afterClick = { emitted, callbacks, checked: input.checked };
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  const afterNative = { emitted, callbacks };
  group.destroy();
  return {
    id: 'ZS-BUG-RADIO-DESELECT',
    name: 'Deselectable radio reports one change, not two',
    status: afterClick.emitted === 0 && afterClick.callbacks === 0 && afterNative.emitted === 1 && afterNative.callbacks === 1 ? 'PASS' : 'FAIL',
    severity: 'medium',
    detail: 'BUG-003 regression: the deselect click must not emit a second change before the native change event.',
    evidence: JSON.stringify({ afterClick, afterNative })
  };
}

export function setOptionsErrorProbe() {
  const window = boot('<select id="s"><option value="a">A</option><option value="b">B</option><option value="c">C</option></select>');
  const select = window.zidanSelect('#s');
  select.open();
  select.error = 'Network failed';
  select.loadMoreError = 'More failed';
  select.activeIndex = 2;
  select.setOptions([{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]);
  const result = { error: select.error, loadMoreError: select.loadMoreError, activeIndex: select.activeIndex };
  select.destroy();
  return {
    id: 'ZS-BUG-SETOPTIONS-ERROR',
    name: 'setOptions clears stale fetch errors and resets the active row',
    status: result.error === null && result.loadMoreError === null && result.activeIndex === 0 ? 'PASS' : 'FAIL',
    severity: 'medium',
    detail: 'BUG-004/028 regression: a successful option replacement must not keep old errors or a stale active index.',
    evidence: JSON.stringify(result)
  };
}

export function existingFieldFactoryProbe() {
  const window = boot('<textarea id="t" data-zidan-input></textarea>');
  const first = window.zidanField('#t');
  const second = window.zidanField('#t');
  const result = {
    firstType: Array.isArray(first) ? 'array' : typeof first,
    secondType: Array.isArray(second) ? 'array' : typeof second,
    secondLength: Array.isArray(second) ? second.length : null,
    existing: !!window.document.getElementById('t').__zidanField
  };
  if (first && !Array.isArray(first)) first.destroy();
  return {
    id: 'ZS-BUG-FIELD-FACTORY-IDEMPOTENT',
    name: 'Repeated zidanField() call returns the existing instance',
    status: result.secondType === 'object' && result.secondLength === null ? 'PASS' : 'FAIL',
    severity: 'low',
    detail: 'Calling zidanField() again for an already enhanced element returns an empty array instead of the existing field instance.',
    evidence: JSON.stringify(result)
  };
}