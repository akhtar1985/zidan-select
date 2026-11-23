import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const source = fs.readFileSync(path.join(root, 'zidan-form.js'), 'utf8');
const dom = new JSDOM('<!doctype html><body><form><input id="email" name="email" type="email"></form></body>', {
  runScripts: 'dangerously',
  url: 'https://example.test/'
});
dom.window.eval(source);
const { window } = dom;
const input = window.document.getElementById('email');
let calls = 0;
const field = window.zidanField(input, {
  validate: (value) => new Promise((resolve) => {
    calls += 1;
    setTimeout(() => resolve(value === 'taken@example.com' ? 'Already registered.' : true), 5);
  })
});

const pending = field.validate();
console.log('pending return is thenable:', !!pending && typeof pending.then === 'function');
console.log('pending flag:', field.pending, 'aria-busy:', input.getAttribute('aria-busy'));
console.log('root class:', field.root.className);
const invalid = await pending;
console.log('resolved:', invalid, 'pending:', field.pending, 'error:', field.errorMessage, 'native:', input.validationMessage);
input.value = 'free@example.com';
const ok = await field.validate();
console.log('valid resolve:', ok, 'error:', field.errorMessage, 'native:', JSON.stringify(input.validationMessage), 'calls:', calls);
field.destroy();
