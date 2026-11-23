import ZidanFormDefault, {
  ZidanForm,
  ZidanSelect,
  ZidanTextField,
  ZidanFileUpload,
  initZidanForms,
  zidanField,
  zidanSelect,
  type FetchContext,
  type FetchPage,
  type SelectOptions,
  type FieldRule
} from '../../zidan-form';
import {
  ZidanSelect as SelectOnly,
  zidanSelect as selectOnlyFactory,
  type SelectOptions as SelectOnlyOptions
} from '../../dist/select/zidan-select';
import {
  ZidanFileUpload as FileOnly,
  zidanField as fileOnlyFactory,
  type FileFieldOptions
} from '../../dist/file/zidan-file';

const selectOptions: SelectOptions = {
  mode: 'combobox',
  fetchPageSize: 20,
  autoLoadMore: true,
  cacheResults: true,
  loadMoreText: 'More',
  fetchOptions: (query, signal, context): FetchPage => {
    const ctx: FetchContext = context as FetchContext;
    void query;
    void signal;
    return { items: [{ value: 'a', label: 'A' }], hasMore: ctx.page < 3 };
  },
  onChange: ({ value }) => void value
};

const select = zidanSelect('#country', selectOptions) as ZidanSelect;
select.loadMore();
select.getAsyncState().hasMore;
select.setValue(['us', 'de']);
ZidanSelect.cacheLimit = 100;

const asyncRule: FieldRule = async (_value, _field, context) => {
  await new Promise((resolve) => setTimeout(resolve, 10));
  if (context.signal?.aborted) return true;
  return 'Taken';
};

const field = zidanField('#email', { validate: asyncRule }) as ZidanTextField;
const outcome = field.validate();
if (typeof outcome !== 'boolean') {
  outcome.then((valid) => void valid);
}
field.isPending();
field.setPhoneFormat('e164');

const files = zidanField('#files', {
  uploadHandler: (file, { onProgress, complete, signal }) => {
    void file;
    void signal;
    onProgress(50);
    complete({ url: 'https://example.com/file' });
  },
  validate: (value) => (Array.isArray(value) && value.length > 3 ? 'Too many' : true)
}) as ZidanFileUpload;
files.uploadAll();

const fileOptions: FileFieldOptions = { maxFiles: 5, accept: 'image/*' };
const fileOnly = fileOnlyFactory('#upload', fileOptions) as FileOnly;
fileOnly.getUploadState();

const selectOnly: SelectOnly = selectOnlyFactory('#pick', { fetchPageSize: 10 } as SelectOnlyOptions) as SelectOnly;
selectOnly.hasMoreResults();

initZidanForms(document, { showValidState: true });
ZidanForm.get('#email');
ZidanFormDefault.version;
