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

const core = api.ZidanForm.api || api;

export const ZidanForm = api.ZidanForm;
export const ZidanSelect = core.ZidanSelect;
export const ZidanCheckbox = core.ZidanCheckbox;
export const ZidanRadioGroup = core.ZidanRadioGroup;
export const ZidanFileUpload = core.ZidanFileUpload;
export const ZidanTextField = core.ZidanTextField;
export const zidanSelect = core.zidanSelect;
export const zidanField = core.zidanField;
export const initZidanSelects = core.initZidanSelects;
export const initZidanForms = core.initZidanForms;
export const downscaleImage = core.downscaleImage;
export const registerIcon = core.registerIcon;
export const formatPhone = core.formatPhone;
export const detectPhoneCountry = core.detectPhoneCountry;

export default ZidanForm;
