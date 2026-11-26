/**
 * Type definitions for ZidanForm / zidan-select.
 * https://github.com/akhtar1985/zidan-select
 */

export type SelectMode = 'select' | 'combobox' | 'tags';
export type SelectLayout =
  | 'classic-clean'
  | 'floating-label'
  | 'soft-pill'
  | 'bordered-brutalist'
  | 'glass-elevated';
export type Framework = 'auto' | 'none' | 'vanilla' | 'bootstrap' | 'tailwind' | 'bulma' | 'foundation';
export type Theme = 'default' | 'modern' | 'minimal' | 'dark' | 'glass';
export type FieldLayout = 'stacked' | 'inline' | 'card' | 'compact' | 'floating' | 'outlined';
export type Scrollbar = 'default' | 'thin' | 'fancy' | 'hover' | 'hidden';
export type ValidationState = 'valid' | 'invalid' | null | undefined;
export type PhoneFormat = 'national' | 'international' | 'e164';

export interface SelectItem {
  value: string | number;
  label?: string;
  group?: string | null;
  disabled?: boolean;
  data?: unknown;
}

export interface SelectGroup {
  label?: string;
  group?: string;
  options: SelectItemInput[];
}

export type SelectItemInput = string | number | SelectItem | SelectGroup;

export interface FetchContext {
  /** Zero-based page index; the first request uses page 0. */
  page: number;
  pageSize: number;
  append: boolean;
  instance: ZidanSelect;
}

export interface FetchPage {
  items?: SelectItemInput[];
  options?: SelectItemInput[];
  results?: SelectItemInput[];
  hasMore?: boolean;
  total?: number;
}

export type FetchResult = SelectItemInput[] | FetchPage;

export type FetchOptions = (
  query: string,
  signal?: AbortSignal,
  context?: FetchContext
) => FetchResult | Promise<FetchResult>;

export interface SelectCallbacks {
  filterOption?(item: SelectItem, query: string, context: { instance: ZidanSelect; mode: SelectMode; caseSensitive: boolean; selected: boolean }): boolean;
  renderOption?(item: SelectItem, context: { index: number; selected: boolean; active: boolean; query: string; instance: ZidanSelect }): string | Node | null | undefined;
  renderSelected?(item: Pick<SelectItem, 'value' | 'label'>, context: { index: number; instance: ZidanSelect }): string | Node | null | undefined;
  renderTag?(item: Pick<SelectItem, 'value' | 'label'>, context: { index: number; instance: ZidanSelect; disabled: boolean }): string | Node | null | undefined;
  validateTag?(tag: string, tags: SelectItem[], context: { instance: ZidanSelect }): boolean | string | void;
  formatTag?(tag: string, context: { instance: ZidanSelect; tags: SelectItem[] }): string;
  onInit?(detail: { instance: ZidanSelect; mode: SelectMode; value: unknown }): void;
  onChange?(detail: { value: unknown; previousValue?: unknown; item?: SelectItem; instance: ZidanSelect }): void;
  onSelect?(detail: { value: unknown; item: SelectItem; instance: ZidanSelect }): void;
  onOpen?(detail: { instance: ZidanSelect }): void;
  onClose?(detail: { instance: ZidanSelect }): void;
  onTagAdd?(detail: { tag: string; value: SelectItem[]; instance: ZidanSelect }): void;
  onTagRemove?(detail: { tag: string; value: SelectItem[]; instance: ZidanSelect }): void;
  /** `page` is the zero-based index used by fetchOptions; the first follow-up page is 1. */
  onLoadMore?(detail: { page: number; query: string; instance: ZidanSelect }): void;
  onError?(detail: { error?: unknown; message: string; callback?: string; instance: ZidanSelect }): void;
}

export interface SelectOptions extends SelectCallbacks {
  mode?: SelectMode;
  layout?: SelectLayout;
  theme?: Theme | string;
  themeFramework?: Framework;
  id?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  options?: SelectItemInput[] | null;
  value?: string | string[] | null;
  label?: string | null;
  ariaLabel?: string;
  placeholder?: string | null;
  multiple?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  closeOnSelect?: boolean | null;
  maxDropdownHeight?: number;
  noResultsText?: string;
  emptyText?: string;
  loadingText?: string;
  clearText?: string;
  fetchOptions?: FetchOptions | null;
  debounce?: number;
  minChars?: number;
  allowFreeText?: boolean;
  searchValues?: boolean;
  /** > 0 enables paged fetchOptions() results and a load-more footer */
  fetchPageSize?: number;
  autoLoadMore?: boolean;
  cacheResults?: boolean;
  loadMoreText?: string;
  /** AJAX without JS: GET this URL and the select builds its own fetchOptions */
  fetchUrl?: string | null;
  fetchMethod?: string;
  /** Query-string parameter for the search term (set to '' to omit it) */
  fetchQueryParam?: string;
  /** 1-based page parameter (set to '' to omit it) */
  fetchPageParam?: string;
  /** When set, send skip = page * pageSize instead of fetchPageParam */
  fetchSkipParam?: string | null;
  fetchPageSizeParam?: string;
  /** Dot path to the array of rows in the JSON body, e.g. 'data.items' */
  fetchItemsPath?: string | null;
  /** Dot path to the total row count, used to decide hasMore */
  fetchTotalPath?: string | null;
  /** Dot path to a boolean hasMore flag */
  fetchHasMorePath?: string | null;
  fetchHeaders?: Record<string, string> | null;
  fetchCredentials?: RequestCredentials;
  maxTags?: number;
  minTagLength?: number;
  maxTagLength?: number;
  caseSensitive?: boolean;
  delimiters?: string[];
  commitOnTab?: boolean;
  commitOnBlur?: boolean;
  suggestions?: SelectItemInput[] | null;
  valueDelimiter?: string;
  customClasses?: { [key: string]: string };
  validation?: ValidationState;
  scrollbar?: Scrollbar;
}

export interface SelectAsyncState {
  query: string;
  page: number;
  hasMore: boolean;
  loading: boolean;
  fetchingMore: boolean;
  error: string | null;
}

export interface AsyncValidationContext {
  signal?: AbortSignal;
  field: ZidanFieldBase;
  instance: ZidanFieldBase;
}

export type AsyncRuleResult = boolean | string | Error | void | null | undefined;
export type RuleResult = AsyncRuleResult | Promise<AsyncRuleResult>;
export type FieldRule = (value: unknown, field: ZidanFieldBase, context: AsyncValidationContext) => RuleResult;
export type DateRule = (value: string, date: Date, field: ZidanTextField, context: AsyncValidationContext) => RuleResult;

export interface FieldMessages {
  required: string;
  email: string;
  url: string;
  pattern: string;
  min: string;
  max: string;
  step: string;
  minlength: string;
  maxlength: string;
  badInput: string;
  phone: string;
  integer: string;
  date: string;
  weekend: string;
  dateDisabled: string;
  fileType: string;
  fileSize: string;
  fileCount: string;
  pending: string;
  generic: string;
  [key: string]: string;
}

export interface FieldOptions {
  theme?: Theme | string;
  framework?: Framework;
  layout?: FieldLayout;
  validation?: ValidationState;
  messages?: Partial<FieldMessages>;
  /** sync rules return boolean | message; promise results get a pending state */
  validate?: FieldRule;
  alwaysValidate?: boolean;
  showValidState?: boolean;
  label?: string;
  hint?: string;
  uploadUrl?: string;
  uploadHandler?: UploadHandler;
  [key: string]: unknown;
}

export interface UploadContext {
  file: File;
  field: ZidanFileUpload;
  formData: FormData;
  signal: AbortSignal;
  onProgress(percent: number): void;
  complete(result?: unknown): void;
  fail(error?: unknown): void;
}

export type UploadHandler = (file: File, context: UploadContext) => void | Promise<unknown>;

export interface FileFieldOptions extends FieldOptions {
  variant?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
  uploadUrl?: string;
  uploadHandler?: UploadHandler;
  simulateUpload?: boolean;
  autoUpload?: boolean;
  previews?: boolean;
}

export interface TextFieldOptions extends FieldOptions {
  icon?: string;
  iconPosition?: 'left' | 'right';
  prefix?: string;
  suffix?: string;
  clearable?: boolean;
  counter?: number;
  output?: HTMLOutputElement | string;
  stepper?: boolean | string;
  stepperStep?: number;
  phone?: boolean | {
    country?: string;
    format?: PhoneFormat;
    showCountry?: boolean;
    countries?: string[];
    validate?: boolean;
  };
  phoneCountry?: string;
  phoneFormat?: PhoneFormat;
  rangeVariant?: 'default' | 'gradient' | 'stepped' | 'minimal';
  rangeBubble?: boolean;
  rangeBubbleMode?: 'always' | 'active' | 'never';
  rangeBubblePosition?: 'top' | 'bottom';
  rangeFill?: boolean;
  rangeMinMax?: boolean;
  rangeTicks?: number[] | number | string;
  rangeTickLabels?: boolean;
  rangeMinLabel?: string;
  rangeMaxLabel?: string;
  rangeFormat?: string | ((value: number, field: ZidanTextField) => string);
  rangeLabels?: Record<string, string>;
  disableWeekends?: boolean;
  disabledDates?: string[] | string | ((value: string, date: Date) => boolean);
  validateDate?: DateRule;
  rows?: number;
}

export interface UploadState {
  file: File;
  name: string;
  size: number;
  status: 'idle' | 'uploading' | 'success' | 'error' | 'canceled' | string;
  progress: number;
  error: string;
  result: unknown;
}

export class ZidanFieldBase {
  constructor(target: HTMLElement, options?: FieldOptions, kind?: string);
  readonly el: HTMLElement;
  readonly root: HTMLElement;
  readonly kind: string;
  readonly opts: FieldOptions & { messages: FieldMessages };
  validation: ValidationState;
  errorMessage: string | null;
  pending: boolean;
  setTheme(theme: Theme | string): this;
  setFramework(framework: Framework): this;
  setLayout(layout: FieldLayout): this;
  setError(message?: string | null): this;
  clearError(): this;
  setValidation(state: ValidationState): this;
  getValidation(): ValidationState;
  isPending(): boolean;
  /** boolean for sync rules, Promise<boolean> when an async rule runs */
  validate(): boolean | Promise<boolean>;
  checkAsync(): Promise<boolean>;
  getValue(): unknown;
  setValue(value: unknown): this;
  update(): this;
  refresh(): this;
  on<K extends EventTarget>(node: K | null, type: string, handler: EventListener, config?: boolean | AddEventListenerOptions): this;
  emit(name: string, detail?: Record<string, unknown>): this;
  destroy(): this;
}

export class ZidanSelect {
  constructor(target: string | HTMLSelectElement | HTMLElement, options?: SelectOptions);
  readonly el: HTMLElement;
  readonly root: HTMLElement;
  readonly mode: SelectMode;
  readonly layout: SelectLayout;
  open(): this;
  close(): this;
  toggle(): this;
  getValue(): string | string[];
  setValue(value: string | number | Array<string | number> | null, options?: { silent?: boolean }): this;
  /** Resets the value; `{ silent: true }` skips `zidan:change` and `onChange`. */
  clear(config?: { silent?: boolean }): this;
  setOptions(options: SelectItemInput[] | null): this;
  addTag(label: string, data?: unknown): boolean;
  removeTag(tagOrIndex: string | number): boolean;
  getTags(): SelectItem[];
  enable(): this;
  disable(): this;
  setLayout(layout: SelectLayout): this;
  setFramework(framework: Framework): this;
  setScrollbar(scrollbar: Scrollbar): this;
  setValidation(state: ValidationState): this;
  isOpen(): boolean;
  refresh(): this;
  on(eventName: string, handler: (event: CustomEvent<Record<string, unknown>>) => void): this;
  off(eventName: string, handler?: (event: CustomEvent<Record<string, unknown>>) => void): this;
  announce(message: string): this;
  /** fetch the next page (remote pagination) */
  loadMore(): this | Promise<SelectItem[]>;
  hasMoreResults(): boolean;
  getAsyncState(): SelectAsyncState;
  clearCache(): this;
  refreshOptions(): this | Promise<SelectItem[]>;
  destroy(): this;

  static readonly version: string;
  static cacheLimit: number;
  static defaults: SelectOptions;
  static icons: Record<string, string>;
  static registerIcon(name: string, markup: string): typeof ZidanSelect;
  static layouts: SelectLayout[];
  static frameworks: Framework[];
  static scrollbars: Scrollbar[];
  static instances: ZidanSelect[];
  static get(target: string | Element | null): ZidanSelect | null;
  static destroyAll(): void;
}

export class ZidanCheckbox extends ZidanFieldBase {
  constructor(target: HTMLInputElement, options?: FieldOptions);
  isChecked(): boolean;
  setChecked(checked: boolean): this;
  setIndeterminate(value: boolean): this;
}

export class ZidanRadioGroup extends ZidanFieldBase {
  constructor(target: HTMLElement | HTMLInputElement | RadioNodeList, options?: FieldOptions);
  getValue(): string;
  setValue(value: string): this;
}

export class ZidanFileUpload extends ZidanFieldBase {
  constructor(target: HTMLInputElement, options?: FileFieldOptions);
  readonly hasUploader: boolean;
  getFiles(): File[];
  getUploadState(): UploadState[];
  addFiles(files: File[] | FileList): this;
  replaceFiles(files: File[] | FileList): this;
  removeFile(index: number | File): this;
  clear(): this;
  uploadAll(): this | Promise<boolean>;
  uploadFile(file: File): this | Promise<unknown>;
  cancelUpload(file: File): this;
  cancelAll(): this;
  retryUpload(file: File): this;
  setVariant(variant: string): this;
  setUploader(handler: UploadHandler | string | null): this;
}

export class ZidanTextField extends ZidanFieldBase {
  constructor(target: HTMLInputElement | HTMLTextAreaElement, options?: TextFieldOptions);
  readonly phone: { country: string; format: PhoneFormat } | null;
  stepUp(times?: number): this;
  stepDown(times?: number): this;
  setStepper(enabled: boolean): this;
  openPicker(): this;
  showPicker(): this;
  getPhoneCountry(): string;
  setPhoneCountry(iso: string): this;
  setPhoneFormat(format: PhoneFormat): this;
  formatPhone(value?: string): string;
  getValue(): string;
  setValue(value: string | number | null): this;
}

export interface ZidanFormStatic {
  version: string;
  themes: string[];
  frameworks: string[];
  fieldLayouts: string[];
  fields: ZidanFieldBase[];
  messages: FieldMessages;
  icons: Record<string, string>;
  variants: {
    checkbox?: string[];
    switch?: string[];
    radio?: string[];
    file?: string[];
    range?: string[];
  };
  stepperModes?: string[];
  phoneCountries?: Record<string, { name: string; code: string; min: number; max: number }>;
  phoneFormats?: PhoneFormat[];
  api: Record<string, unknown> | null;
  registerIcon(name: string, markup: string): typeof ZidanSelect | ZidanFormStatic | undefined;
  get(target: string | Element | null): ZidanFieldBase | null;
  init(scope?: Document | Element, options?: FieldOptions & { force?: boolean }): ZidanFieldBase[];
  field: typeof zidanField;
  refresh(scope?: Document | Element): ZidanFieldBase[];
  destroyAll(): ZidanFormStatic;
  observe(scope?: Element, options?: FieldOptions): MutationObserver | null;
  formatPhone?(value: string, country?: string, format?: PhoneFormat): string;
  detectPhoneCountry?(value: string): string;
}

export const ZidanForm: ZidanFormStatic;

export function zidanSelect(target: string | Element | ArrayLike<Element>, options?: SelectOptions): ZidanSelect | ZidanSelect[];
export function initZidanSelects(container?: Document | Element, options?: SelectOptions): ZidanSelect[];
export function zidanField(target: string | Element, options?: FieldOptions): ZidanFieldBase | null;
export function zidanField(target: ArrayLike<Element>, options?: FieldOptions): ZidanFieldBase[];
export function initZidanForms(container?: Document | Element, options?: FieldOptions & { force?: boolean }): ZidanFieldBase[];
export function registerIcon(name: string, markup: string): typeof ZidanSelect | ZidanFormStatic | undefined;
export function formatPhone(value: string, country?: string, format?: PhoneFormat): string;
export function detectPhoneCountry(value: string): string;

export interface AutoInitTarget {
  selector: string;
  options?: SelectOptions | FieldOptions;
}

export interface AutoInitConfig {
  autoInit?: boolean;
  selector?: string | AutoInitTarget | Array<string | AutoInitTarget>;
  targets?: Array<string | AutoInitTarget>;
  selectors?: Array<string | AutoInitTarget>;
  fieldTargets?: Array<string | AutoInitTarget>;
  formTargets?: Array<string | AutoInitTarget>;
  options?: SelectOptions;
  fieldOptions?: FieldOptions;
  fields?: FieldOptions;
}

export default ZidanForm;
