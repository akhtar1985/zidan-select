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
export type Theme = 'default' | 'modern' | 'minimal' | 'dark' | 'glass' | 'auto';
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

/* ------------------------------------------------------------------ *
 * Events
 *
 * Every custom event is dispatched on `instance.root`, bubbles, and is
 * prefixed with `zidan:`. `emit()` always adds `instance` (and `kind` for
 * fields), so the detail types below keep an open index signature: the
 * payload of a shared name such as `zidan:change` differs per field type.
 * ------------------------------------------------------------------ */
export interface ZidanEventDetail {
  instance?: ZidanSelect | ZidanFieldBase;
  kind?: string;
  [key: string]: unknown;
}

export interface ZidanChangeDetail extends ZidanEventDetail {
  /** New value: string or array for selects, boolean for checkboxes, File[] for uploads */
  value?: unknown;
  previousValue?: unknown;
  item?: SelectItem;
  checked?: boolean;
  files?: File[];
}

export interface ZidanInitDetail extends ZidanEventDetail {
  mode?: SelectMode;
  layout?: string;
  framework?: string;
  variant?: string;
  type?: string;
  stepper?: boolean;
  phone?: boolean;
  range?: boolean;
}

export interface ZidanSelectEventDetail extends ZidanEventDetail {
  value?: unknown;
  item?: SelectItem;
  label?: string;
}

export interface ZidanTagEventDetail extends ZidanEventDetail {
  tag: string;
  value: SelectItem[];
}

export interface ZidanTagEditDetail extends ZidanEventDetail {
  tag: string;
  label: string;
  previousLabel: string;
  index: number;
}

export interface ZidanTagMoveDetail extends ZidanEventDetail {
  tag: string;
  from: number;
  to: number;
  value: SelectItem[];
}

export interface ZidanValidationDetail extends ZidanEventDetail {
  state: ValidationState;
  message?: string;
}

export interface ZidanAsyncValidationDetail extends ZidanEventDetail {
  valid: boolean;
  message?: string;
  error?: unknown;
}

export interface ZidanErrorDetail extends ZidanEventDetail {
  error?: unknown;
  message: string;
  /** Name of the callback that threw, when an `onX` handler raised */
  callback?: string;
  action?: string;
}

export interface ZidanInputDetail extends ZidanEventDetail {
  value: string;
}

export interface ZidanStepDetail extends ZidanEventDetail {
  value: number;
  direction: 'up' | 'down';
  step: number;
}

export interface ZidanIconClickDetail extends ZidanEventDetail {
  icon: string;
  position: 'left' | 'right';
}

export interface ZidanPhoneDetail extends ZidanEventDetail {
  country?: string;
  format?: PhoneFormat;
}

export interface ZidanPickerDetail extends ZidanEventDetail {
  type: string;
}

export interface ZidanRevealDetail extends ZidanEventDetail {
  visible: boolean;
}

export interface ZidanRemoveDetail extends ZidanEventDetail {
  file: File;
  index: number;
}

export interface ZidanUploadDetail extends ZidanEventDetail {
  file: File;
  name: string;
  size?: number;
  position?: number;
  progress?: number;
  result?: unknown;
  error?: unknown;
  message?: string;
  attempts?: number;
  attempt?: number;
  nextAttempt?: number;
  delay?: number;
}

export interface ZidanEventMap {
  'zidan:async-validation': ZidanAsyncValidationDetail;
  'zidan:change': ZidanChangeDetail;
  'zidan:clear': ZidanEventDetail;
  'zidan:close': ZidanEventDetail;
  'zidan:destroy': ZidanEventDetail;
  'zidan:error': ZidanErrorDetail;
  'zidan:icon-click': ZidanIconClickDetail;
  'zidan:init': ZidanInitDetail;
  'zidan:input': ZidanInputDetail;
  'zidan:load-more': ZidanEventDetail & { page?: number; query?: string };
  'zidan:no-results': ZidanEventDetail & { query?: string };
  'zidan:open': ZidanEventDetail;
  'zidan:phone-country': ZidanPhoneDetail;
  'zidan:phone-format': ZidanPhoneDetail;
  'zidan:picker': ZidanPickerDetail;
  'zidan:remove': ZidanRemoveDetail;
  'zidan:reveal': ZidanRevealDetail;
  'zidan:select': ZidanSelectEventDetail;
  'zidan:step': ZidanStepDetail;
  'zidan:tag-add': ZidanTagEventDetail;
  'zidan:tag-edit': ZidanTagEditDetail;
  'zidan:tag-move': ZidanTagMoveDetail;
  'zidan:tag-remove': ZidanTagEventDetail;
  'zidan:upload-cancel': ZidanUploadDetail;
  'zidan:upload-error': ZidanUploadDetail;
  'zidan:upload-progress': ZidanUploadDetail;
  'zidan:upload-queued': ZidanUploadDetail;
  'zidan:upload-retry': ZidanUploadDetail;
  'zidan:upload-start': ZidanUploadDetail;
  'zidan:upload-success': ZidanUploadDetail;
  'zidan:validation': ZidanValidationDetail;
}

export type ZidanEventName = keyof ZidanEventMap;

/** Dispatched on the <form> element by ZidanForm.validate() */
export interface ZidanFormEventMap {
  'zidan:validate': { valid: boolean; form: HTMLFormElement; fields: ZidanFieldBase[] };
}

export type ZidanFormEventName = keyof ZidanFormEventMap;

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
  onTagMove?(detail: { tag: string; from: number; to: number; value: SelectItem[]; instance: ZidanSelect }): void;
  onTagEdit?(detail: { tag: string; label: string; previousLabel: string; index: number; instance: ZidanSelect }): void;
  /** `page` is the zero-based index used by fetchOptions; the first follow-up page is 1. */
  onLoadMore?(detail: { page: number; query: string; instance: ZidanSelect }): void;
  onError?(detail: { error?: unknown; message: string; callback?: string; instance: ZidanSelect }): void;
}

export interface SelectLocale {
  noResultsText?: string;
  emptyText?: string;
  loadingText?: string;
  clearText?: string;
  loadMoreText?: string;
  placeholder?: string;
  requiredText?: string;
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
  /** Announced when a required select is empty on submit */
  requiredText?: string;
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
  /** Extra query parameters merged into every declarative request */
  fetchParams?: Record<string, string | number | boolean | null | undefined> | null;
  /** POST/PUT/PATCH body; objects serialise to JSON with a Content-Type header */
  fetchBody?: Record<string, unknown> | unknown[] | string | null;
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
  /** Drag chips (mouse) or Alt+Arrow (keyboard) to reorder tags */
  reorderable?: boolean;
  /** Double-click or F2 a chip to rename its label in place */
  editable?: boolean;
  caseSensitive?: boolean;
  delimiters?: string[];
  commitOnTab?: boolean;
  commitOnBlur?: boolean;
  suggestions?: SelectItemInput[] | null;
  valueDelimiter?: string;
  customClasses?: { [key: string]: string };
  validation?: ValidationState;
  scrollbar?: Scrollbar;
  /** Fold diacritics so "cafe" matches "Café" (default true) */
  accentInsensitive?: boolean;
  /** Wrap the matching part of an option label in <mark class="zs-match"> */
  highlightMatches?: boolean;
  /** Row windowing for large local lists: false | true | 'auto' | minimum row count */
  virtual?: boolean | 'auto' | number;
  /** Row count that turns virtual: 'auto' on (default 150) */
  virtualThreshold?: number;
  /** Fixed row height in px for virtual lists (0 = measure) */
  itemHeight?: number;
  /** Jump to options by typing letters in a non-searchable select */
  typeAhead?: boolean;
  typeAheadTimeout?: number;
  /** Built-in UI strings: 'en' | 'es' | 'fr' | 'de' | 'ar' or a custom pack */
  locale?: SelectLocale | string | null;
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
  fileMin: string;
  fileTotalSize: string;
  pending: string;
  generic: string;
  [key: string]: string;
}

export type UploadUrl = string | ((file: File, field: ZidanFileUpload) => string);

export interface FieldCallbacks {
  /** Text, number, phone, date and range inputs plus textareas */
  onInput?(detail: { instance: ZidanFieldBase; value: unknown }): void;
  onValidation?(detail: { instance: ZidanFieldBase; state: ValidationState; message?: string }): void;
  /** Fires when an input icon is rendered as a button (iconClickable or a date/time picker) */
  onIconClick?(detail: { instance: ZidanFieldBase; icon: string; position: 'left' | 'right' }): void;
  onStep?(detail: { instance: ZidanFieldBase; value: number; direction: 'up' | 'down' }): void;
  onPicker?(detail: { instance: ZidanFieldBase; type: string }): void;
  onPhoneCountry?(detail: { instance: ZidanFieldBase; country: string }): void;
  onPhoneFormat?(detail: { instance: ZidanFieldBase; format: PhoneFormat }): void;
  /** File uploads: a file was removed from the list */
  onRemove?(detail: { instance: ZidanFileUpload; file: File; index: number }): void;
  onUploadStart?(detail: ZidanUploadDetail): void;
  onUploadProgress?(detail: ZidanUploadDetail): void;
  onUploadSuccess?(detail: ZidanUploadDetail): void;
  /** Alias of onUploadSuccess */
  onUpload?(detail: ZidanUploadDetail): void;
  onUploadError?(detail: ZidanUploadDetail): void;
  onUploadCancel?(detail: ZidanUploadDetail): void;
}
export interface FieldOptions extends FieldCallbacks {
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
  /* --- shared field options (inputs, textareas, checkboxes, radios, files) --- */
  /** Use the built-in icon for the input type (mail, phone, calendar, clock, search, link, hash, palette) */
  autoIcon?: boolean;
  /** Accessible name for a decorative or custom icon */
  iconLabel?: string;
  /** Render the icon as a button and emit zidan:icon-click */
  iconClickable?: boolean;
  /** Add check/alert glyphs driven by the validation state */
  validationIcon?: boolean;
  /** Second line for card, tile, button and minimal checkbox/radio variants */
  description?: string;
  /** Radio group: fallback description per value */
  descriptions?: Record<string, string>;
  /** Radio group: fallback label per value */
  labels?: Record<string, string>;
  /** Text/aria label for the clear-all button */
  clearLabel?: string;
  /** Password reveal toggle */
  reveal?: boolean;
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  /** Checkbox starts mixed */
  indeterminate?: boolean;
  /** Checkbox/switch visual variant, e.g. 'switch' */
  switchStyle?: string;
  /** Switch styles: text shown on the checked / unchecked side */
  onLabel?: string;
  offLabel?: string;
  /** Stepper: [inline] position of the +/- buttons */
  stepperPosition?: 'left' | 'right';
  /** Add a wrapping border around the field (theme hook) */
  stepperWrap?: boolean;
  /** Press and hold repeats the step (default true) */
  stepperLongPress?: boolean;
  /** Hold delay before repeating, ms (default 420) */
  stepperDelay?: number;
  /** Repeat interval, ms (default 90) */
  stepperInterval?: number;
  stepperUpLabel?: string;
  stepperDownLabel?: string;
  /** Phone fields: show the searchable country picker (default true) */
  phoneCountrySelect?: boolean;
  phoneCountries?: string[];
  phoneCountryLabel?: string;
  phoneCountrySearchText?: string;
  phoneCountryEmptyText?: string;
  /** Add a picker button when no icon is present */
  pickerButton?: boolean;
  /** Registered icon name for the picker button (default calendar/clock) */
  pickerIcon?: string;
  pickerLabel?: string;  uploadUrl?: UploadUrl;
  uploadHandler?: UploadHandler;
  /** Escape hatch: undocumented options and framework-specific passthroughs */
  [key: string]: unknown;
}

export interface UploadContext {
  file: File;
  field: ZidanFileUpload;
  formData: FormData;
  signal: AbortSignal | null;
  onProgress(percent: number): void;
  complete(result?: unknown): void;
  fail(error?: unknown): void;
}

export type UploadHandler = (file: File, context: UploadContext) => void | Promise<unknown>;
export type UploadMethod = string | ((file: File, field: ZidanFileUpload) => string);
export type UploadParams = string | URLSearchParams | Record<string, unknown> |
  ((file: File, field: ZidanFileUpload) => string | URLSearchParams | Record<string, unknown>);

export interface DownscaleOptions {
  /** Longest edge in px (default 1920) */
  maxWidth?: number;
  maxHeight?: number;
  /** JPEG/WebP quality, 0.1–1 (default 0.85) */
  quality?: number;
  /** Skip files already smaller than this many bytes */
  maxBytes?: number;
  /** Output MIME type; defaults to JPEG (PNG stays PNG) */
  mime?: string;
  /** Re-encode even when the resized file would be bigger */
  force?: boolean;
}

export interface FileFieldOptions extends FieldOptions {
  variant?: string;
  accept?: string;
  multiple?: boolean;
  /** Minimum selection size before the field is invalid (0 = no minimum) */
  minFiles?: number;
  maxFiles?: number;
  /** Per-file byte limit */
  maxSize?: number;
  maxSizeMB?: number;
  /** Combined bytes for all selected files */
  maxTotalSize?: number;
  maxTotalSizeMB?: number;
  uploadUrl?: UploadUrl;
  uploadHandler?: UploadHandler;
  uploadField?: string;
  uploadMethod?: UploadMethod;
  uploadParams?: UploadParams;
  uploadData?: Record<string, unknown> | ((file: File, field: ZidanFileUpload) => Record<string, unknown>);
  uploadHeaders?: Record<string, string | string[]> | ((file: File, field: ZidanFileUpload) => Record<string, string | string[]>);
  /** Alias of uploadHeaders */
  headers?: Record<string, string | string[]> | ((file: File, field: ZidanFileUpload) => Record<string, string | string[]>);
  uploadResponsePath?: string;
  uploadErrorPath?: string;
  /** Abort and report a timeout after this many milliseconds (0 = no timeout) */
  uploadTimeout?: number;
  /** Automatic retries for retryable failures (network, 408, 429, 5xx) */
  uploadRetries?: number;
  uploadRetryDelay?: number;
  /** Parallel XHR/handler uploads; 0 means unlimited */
  uploadConcurrency?: number;
  withCredentials?: boolean;
  uploadWithCredentials?: boolean;
  simulateUpload?: boolean;
  simulateDuration?: number;
  autoUpload?: boolean;
  previews?: boolean;
  showFileMeta?: boolean;
  showPreview?: boolean;
  showClear?: boolean;
  showRemove?: boolean;
  showCancel?: boolean;
  showRetry?: boolean;
  showStatus?: boolean;
  allowPaste?: boolean;
  statusFormat?: (context: UploadStatusContext) => string;
  onUploadQueued?: (context: {
    file: File; name: string; size: number; position: number; instance: ZidanFileUpload;
  }) => void;
  onUploadRetry?: (context: {
    file: File; name: string; attempt: number; nextAttempt: number; delay: number;
    error: unknown; message: string; instance: ZidanFileUpload;
  }) => void;
  queuedLabel?: string;
  retryingLabel?: string;
  uploadedLabel?: string;
  failedLabel?: string;
  canceledLabel?: string;
  cancelLabel?: string;
  retryLabel?: string;
  progressTemplate?: string;
  replaceTitle?: string;
  /** Resize images in the browser before upload: true or limits */
  downscale?: boolean | DownscaleOptions;
  downscaleMaxWidth?: number;
  downscaleMaxHeight?: number;
  downscaleQuality?: number;
  downscaleMaxBytes?: number;
  downscaleMime?: string;
  downscaleForce?: boolean;
  /** Custom uploader; alias of uploadHandler */
  upload?: UploadHandler;
  /** Upload target variant: dropzone, button, avatar, gallery, compact */
  fileVariant?: string;
  uploadIcon?: string;
  /** Dropzone headline (default Choose a file) */
  title?: string;
  dropHint?: string;
  /** Decorate a rendered file row after the default markup exists */
  renderFile?(item: HTMLElement, context: { file: File; index: number; state: UploadState; field: ZidanFileUpload }): void;}

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
  /** Input mask: # digit, A letter, * letter or digit (e.g. '(###) ###-####') */
  mask?: string;
  /** Grow a textarea to fit its content (optionally capped in px) */
  autogrow?: boolean;
  autogrowMax?: number;
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
  status: 'idle' | 'queued' | 'uploading' | 'retrying' | 'done' | 'error' | 'canceled' | string;
  progress: number;
  error: string;
  result: unknown;
  attempts: number;
}

export interface UploadStatusContext {
  files: File[];
  states: UploadState[];
  total: number;
  uploading: number;
  failed: number;
  done: number;
  error: string;
  field: ZidanFileUpload;
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
  /** Register a DOM listener that is removed by destroy() */
  on(node: EventTarget | null, type: string, handler: EventListener, config?: boolean | AddEventListenerOptions): this;
  emit<K extends ZidanEventName>(name: K, detail?: ZidanEventMap[K]): this;
  emit(name: string, detail?: Record<string, unknown>): this;
  /** Call an `onX` callback if the consumer supplied one; exceptions become zidan:error */
  call<K extends keyof FieldCallbacks>(callbackName: K, payload?: Parameters<NonNullable<FieldCallbacks[K]>>[0]): ReturnType<NonNullable<FieldCallbacks[K]>> | undefined;
  call<T = unknown>(callbackName: string, payload?: unknown): T | undefined;
  /** Native elements that carry the field's validity (radios return every input) */
  validationTargets(): HTMLElement[];
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
  /** Single mode returns null when nothing is selected; multiple/tags always return an array. */
  getValue(): string | string[] | null;
  setValue(value: string | number | Array<string | number> | null, options?: { silent?: boolean }): this;
  /** Resets the value; `{ silent: true }` skips `zidan:change` and `onChange`. */
  clear(config?: { silent?: boolean }): this;
  setOptions(options: SelectItemInput[] | null): this;
  addTag(label: string, data?: unknown): boolean;
  removeTag(tagOrIndex: string | number): boolean;
  /** Current tag values, in order (strings — use getValue() for the same list) */
  getTags(): string[];
  /** Selected option objects, in selection order */
  getSelectedItems(): Array<{ value: string; label: string }>;
  /** Move a tag/chip to another index (tags mode); returns false when unchanged */
  moveTag(from: number | string, to: number): boolean;
  /** Rename a tag label in place (tags mode); returns false when unchanged */
  editTag(tagOrIndex: number | string, label: string): boolean;
  /** Multiple mode: add every non-disabled option, keeping the current order */
  selectAll(config?: { silent?: boolean }): this;
  /** Multiple mode: clear the selection */
  deselectAll(config?: { silent?: boolean }): this;
  /** Multiple mode: select all unless every option is already selected */
  toggleAll(config?: { silent?: boolean }): this;
  /** Multiple mode: true when every non-disabled option is selected */
  areAllSelected(): boolean;
  enable(): this;
  disable(): this;
  setTheme(theme: Theme | string): this;
  setLayout(layout: SelectLayout): this;
  setFramework(framework: Framework): this;
  setScrollbar(scrollbar: Scrollbar): this;
  setValidation(state: ValidationState): this;
  isOpen(): boolean;
  refresh(): this;
  /** Subscribe to a zidan:* event; the handler receives the typed CustomEvent */
  on<K extends ZidanEventName>(eventName: K, handler: (event: CustomEvent<ZidanEventMap[K]>) => void): this;
  on(eventName: string, handler: (event: CustomEvent<Record<string, unknown>>) => void): this;
  off<K extends ZidanEventName>(eventName: K, handler?: (event: CustomEvent<ZidanEventMap[K]>) => void): this;
  off(eventName: string, handler?: (event: CustomEvent<Record<string, unknown>>) => void): this;
  emit<K extends ZidanEventName>(name: K, detail?: ZidanEventMap[K]): this;
  emit(name: string, detail?: Record<string, unknown>): this;
  /** Call an `onX` callback if supplied; exceptions emit zidan:error and then onError */
  call<K extends keyof SelectCallbacks>(callbackName: K, payload?: Parameters<NonNullable<SelectCallbacks[K]>>[0]): ReturnType<NonNullable<SelectCallbacks[K]>> | undefined;
  call<T = unknown>(callbackName: string, payload?: unknown): T | undefined;
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
  static locales: Record<string, SelectLocale>;
  static icons: Record<string, string>;
  static registerIcon(name: string, markup: string): typeof ZidanSelect;
  static layouts: SelectLayout[];
  static frameworks: Framework[];
  static scrollbars: Scrollbar[];
  static instances: ZidanSelect[];
  static get(target: string | Element | null): ZidanSelect | null;
  /** Destroy only the select instances inside a document, element or selector */
  static destroy(scope?: Document | Element | string): number;
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
  getFileState(target: number | File | string): UploadState | null;
  addFiles(files: File[] | FileList): this;
  replaceFiles(files: File[] | FileList): this;
  removeFile(target: number | File | string): this;
  removeFiles(targets: Array<number | File | string> | FileList): this;
  clear(): this;
  uploadAll(): this | Promise<boolean>;
  uploadFile(file: File): this;
  isUploading(): boolean;
  whenUploaded(): Promise<UploadState[]>;
  cancelUpload(file: File): this;
  cancelAll(): this;
  retryUpload(file: File): this;
  retryAll(): this;
  setVariant(variant: string): this;
  setUploader(handler: UploadHandler | string | null): this;
  setUploadUrl(url: string | null): this;
  setUploadOptions(options: FileFieldOptions): this;
}

export class ZidanTextField extends ZidanFieldBase {
  constructor(target: HTMLInputElement | HTMLTextAreaElement, options?: TextFieldOptions);
  readonly phone: { country: string; format: PhoneFormat } | null;
  readonly mask: { pattern: string } | null;
  readonly autogrow: { max: number } | null;
  stepUp(times?: number): this;
  stepDown(times?: number): this;
  setStepper(enabled: boolean): this;
  openPicker(): this;
  showPicker(): this;
  getPhoneCountry(): string;
  setPhoneCountry(iso: string): this;
  setPhoneFormat(format: PhoneFormat): this;
  formatPhone(value?: string): string;
  /** Value with mask literals removed */
  getUnmaskedValue(): string;
  /** Re-measure a textarea after external content changes */
  refreshAutogrow(): this;
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
  locales: Record<string, SelectLocale>;
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
  /** Destroy only the fields and selects inside a document, element or selector */
  destroy(scope?: Document | Element | string): number;
  destroyAll(): ZidanFormStatic;
  observe(scope?: Element, options?: FieldOptions): MutationObserver | null;
  formatPhone?(value: string, country?: string, format?: PhoneFormat): string;
  detectPhoneCountry?(value: string): string;
  /** Format a value with a mask pattern (# digit, A letter, * alphanumeric) */
  mask?(value: string, pattern: string): string;
  /** Strip punctuation/mask literals, keeping letters and digits */
  unmask?(value: string): string;
  /** Browser-side image resize helper; resolves to the original when no work is needed */
  downscaleImage?(file: File, options?: DownscaleOptions): Promise<File>;
  /** Serialised form values; repeated names become arrays */
  serialize(target: string | HTMLFormElement | Element, options?: { files?: boolean }): Record<string, FormDataEntryValue | FormDataEntryValue[]>;
  /** Runs every enhanced field's validate() plus native constraints, focuses the first invalid field */
  validate(target: string | HTMLFormElement | Element, options?: { focus?: boolean }): Promise<boolean>;
}

declare global {
  interface HTMLElementEventMap {
    'zidan:async-validation': CustomEvent<ZidanAsyncValidationDetail>;
    'zidan:change': CustomEvent<ZidanChangeDetail>;
    'zidan:clear': CustomEvent<ZidanEventDetail>;
    'zidan:close': CustomEvent<ZidanEventDetail>;
    'zidan:destroy': CustomEvent<ZidanEventDetail>;
    'zidan:error': CustomEvent<ZidanErrorDetail>;
    'zidan:icon-click': CustomEvent<ZidanIconClickDetail>;
    'zidan:init': CustomEvent<ZidanInitDetail>;
    'zidan:input': CustomEvent<ZidanInputDetail>;
    'zidan:load-more': CustomEvent<ZidanEventDetail & { page?: number; query?: string }>;
    'zidan:no-results': CustomEvent<ZidanEventDetail & { query?: string }>;
    'zidan:open': CustomEvent<ZidanEventDetail>;
    'zidan:phone-country': CustomEvent<ZidanPhoneDetail>;
    'zidan:phone-format': CustomEvent<ZidanPhoneDetail>;
    'zidan:picker': CustomEvent<ZidanPickerDetail>;
    'zidan:remove': CustomEvent<ZidanRemoveDetail>;
    'zidan:reveal': CustomEvent<ZidanRevealDetail>;
    'zidan:select': CustomEvent<ZidanSelectEventDetail>;
    'zidan:step': CustomEvent<ZidanStepDetail>;
    'zidan:tag-add': CustomEvent<ZidanTagEventDetail>;
    'zidan:tag-edit': CustomEvent<ZidanTagEditDetail>;
    'zidan:tag-move': CustomEvent<ZidanTagMoveDetail>;
    'zidan:tag-remove': CustomEvent<ZidanTagEventDetail>;
    'zidan:upload-cancel': CustomEvent<ZidanUploadDetail>;
    'zidan:upload-error': CustomEvent<ZidanUploadDetail>;
    'zidan:upload-progress': CustomEvent<ZidanUploadDetail>;
    'zidan:upload-queued': CustomEvent<ZidanUploadDetail>;
    'zidan:upload-retry': CustomEvent<ZidanUploadDetail>;
    'zidan:upload-start': CustomEvent<ZidanUploadDetail>;
    'zidan:upload-success': CustomEvent<ZidanUploadDetail>;
    'zidan:validation': CustomEvent<ZidanValidationDetail>;
    /** Dispatched on the <form> by ZidanForm.validate() */
    'zidan:validate': CustomEvent<ZidanFormEventMap['zidan:validate']>;
  }
}

export const ZidanForm: ZidanFormStatic;

export function zidanSelect(target: string | Element | ArrayLike<Element>, options?: SelectOptions): ZidanSelect | ZidanSelect[];
export function initZidanSelects(container?: Document | Element, options?: SelectOptions): ZidanSelect[];
export function zidanField(target: string | Element, options?: FieldOptions): ZidanFieldBase | null;
export function zidanField(target: ArrayLike<Element>, options?: FieldOptions): ZidanFieldBase[];
export function initZidanForms(container?: Document | Element, options?: FieldOptions & { force?: boolean }): ZidanFieldBase[];
export function registerIcon(name: string, markup: string): typeof ZidanSelect | ZidanFormStatic | undefined;

/** Browser-side image resize helper; resolves to the original when no work is needed */
export function downscaleImage(file: File, options?: DownscaleOptions): Promise<File>;
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
