/**
 * ZidanForm — ES module entry point.
 *
 * The library core is a classic script so the exact same file works through
 * <script src="zidan-form.js">, in WordPress/Shopify themes and in bundlers.
 * This wrapper re-exports the named API for `import` users:
 *
 *   import { ZidanForm, initZidanForms, zidanField } from './zidan-form.mjs';
 *
 * https://github.com/akhtar1985/zidan-select
 */
import './zidan-form.js';

const api = typeof window !== 'undefined' ? window : globalThis;

if (!api.ZidanForm) {
  throw new Error('ZidanForm: core script did not initialise (no DOM available?).');
}

export const ZidanForm = api.ZidanForm;
export const ZidanSelect = api.ZidanSelect;
export const ZidanCheckbox = api.ZidanCheckbox;
export const ZidanRadioGroup = api.ZidanRadioGroup;
export const ZidanFileUpload = api.ZidanFileUpload;
export const ZidanTextField = api.ZidanTextField;
export const zidanSelect = api.zidanSelect;
export const zidanField = api.zidanField;
export const initZidanSelects = api.initZidanSelects;
export const initZidanForms = api.initZidanForms;

export default ZidanForm;
