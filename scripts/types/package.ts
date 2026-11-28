/**
 * Consumer-style type test: imports resolve through package.json "exports"
 * (not relative file paths), so a broken types route fails `npm run types`.
 * Compiled twice — moduleResolution "Bundler" and "NodeNext".
 */
import ZidanFormDefault, {
  ZidanForm,
  ZidanSelect,
  ZidanTextField,
  ZidanFileUpload,
  zidanField,
  zidanSelect,
  formatPhone,
  detectPhoneCountry,
  type SelectOptions,
  type FieldOptions,
  type UploadHandler,
  type SelectItemInput
} from 'zidan-select';
import {
  ZidanSelect as SelectOnly,
  zidanSelect as selectOnlyFactory,
  type SelectOptions as SelectOnlyOptions
} from 'zidan-select/select';
import {
  ZidanFileUpload as FileOnly,
  zidanField as fileOnlyFactory,
  type FileFieldOptions
} from 'zidan-select/file';

const options: SelectOptions = { mode: 'tags', maxTags: 3, onChange: ({ value }) => void value };
const items: SelectItemInput[] = [{ value: 'a', label: 'A' }, { label: 'B', value: 'b' }];
const select = zidanSelect('#pick', options) as ZidanSelect;
select.setOptions(items).setValue(['a'], { silent: true });
const read: string | string[] | null = select.getValue();
void read;

const selectOnlyOptions: SelectOnlyOptions = { fetchPageSize: 10, autoLoadMore: true };
const selectOnly = selectOnlyFactory('#pick', selectOnlyOptions) as SelectOnly;
selectOnly.hasMoreResults();

const uploader: UploadHandler = (file, { onProgress, complete }) => {
  void file;
  onProgress(50);
  complete({ url: 'https://example.com/f' });
};
const fileOptions: FileFieldOptions = { maxFiles: 2, uploadHandler: uploader };
const fileOnly = fileOnlyFactory('#files', fileOptions) as FileOnly;
fileOnly.getUploadState().length;

const fieldOptions: FieldOptions = { validate: (value) => value !== '' };
const text = zidanField('#name', fieldOptions) as ZidanTextField;
text.setValue('Ada').formatPhone('+14155552671');
const files = zidanField('#files', fileOptions) as ZidanFileUpload;
files.getFiles();

formatPhone('+14155552671', 'US', 'national');
detectPhoneCountry('+14155552671');
ZidanForm.init(document, { force: true });
ZidanFormDefault.version;
void select;
