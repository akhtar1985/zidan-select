#!/usr/bin/env node
/**
 * Verify what npm would publish, from the outside:
 *
 *   1. a dependency-free copy can rebuild dist/ through the prepare hook;
 *   2. the packed tarball stays small and free of generated HTML/screenshots;
 *   3. every export subpath resolves for CJS and ESM consumers;
 *   4. the shipped declarations compile under bundler and node16 resolution.
 *
 * Run with `npm run pack:check`; the Package workflow runs the same command.
 */
import { execFileSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'zidan-pack-check-'));
const packDir = path.join(work, 'pack');
const consumer = path.join(work, 'consumer');
const rebuild = path.join(work, 'rebuild');
let failures = 0;

function step(name, fn) {
  try {
    const detail = fn();
    console.log('ok   ' + name + (detail ? ' — ' + detail : ''));
  } catch (error) {
    failures += 1;
    console.log('FAIL ' + name + ' — ' + error.message);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function copyTree(source, target) {
  const skip = new Set(['.git', 'node_modules', 'dist', '.build', 'quality-labs/reports', '.freebuff', 'zidan-select-lab-kit']);
  fs.cpSync(source, target, {
    recursive: true,
    filter: (file) => {
      const rel = file.slice(source.length + 1).split(path.sep).join('/');
      return rel === '' || !skip.has(rel);
    }
  });
}

function pack() {
  fs.mkdirSync(packDir, { recursive: true });
  const out = execSync('npm pack --json --pack-destination ' + packDir, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const parsed = JSON.parse(out.slice(out.indexOf('[')));
  return parsed[0];
}

try {
  step('a dependency-free copy rebuilds dist through prepare', () => {
    copyTree(root, rebuild);
    execFileSync(process.execPath, [path.join(rebuild, 'scripts', 'build.mjs')], { cwd: rebuild, stdio: 'pipe' });
    for (const file of ['dist/select/zidan-select.js', 'dist/file/zidan-file.js', 'dist/select/zidan-select.d.ts', 'dist/plugin-core.css']) {
      assert(fs.existsSync(path.join(rebuild, file)), 'missing after prepare: ' + file);
    }
    return 'dist/select, dist/file and CSS present without node_modules';
  });

  const info = pack();
  step('package contents stay lean', () => {
    const names = info.files.map((entry) => entry.path);
    const heavy = names.filter((name) => /\.(?:png|html)$/.test(name));
    assert(heavy.length === 0, 'generated HTML or screenshots shipped: ' + heavy.join(', '));
    for (const required of ['CHANGELOG.md', 'README.md', 'LICENSE', 'zidan-form.d.ts', 'zidan-form.mjs', 'docs/options.md']) {
      assert(names.includes(required), 'required package file missing: ' + required);
    }
    assert(info.size < 600 * 1024, 'tarball grew to ' + Math.round(info.size / 1024) + ' kB (budget 600 kB)');
    return names.length + ' files, ' + Math.round(info.size / 1024) + ' kB packed, ' + Math.round(info.unpackedSize / 1024) + ' kB unpacked';
  });

  step('every export subpath resolves for CJS and ESM', () => {
    fs.mkdirSync(consumer, { recursive: true });
    fs.writeFileSync(path.join(consumer, 'package.json'), JSON.stringify({ name: 'zidan-consumer', private: true, version: '1.0.0' }, null, 2));
    const tarball = path.join(packDir, info.filename);
    const localTarball = path.join(consumer, info.filename);
    fs.copyFileSync(tarball, localTarball);
    let installedBy = 'npm install';
    try {
      execSync('npm install ./' + info.filename + ' --no-audit --no-fund', { cwd: consumer, stdio: 'pipe' });
    } catch (error) {
      const output = String(error.stderr || error.stdout || error.message);
      // Sandboxed npm builds can forbid changing the lifecycle-script policy.
      // Unpacking the tarball into node_modules is what npm would install.
      if (!/allow-scripts/i.test(output)) throw new Error('npm install failed: ' + output.slice(0, 600));
      const target = path.join(consumer, 'node_modules', 'zidan-select');
      fs.mkdirSync(target, { recursive: true });
      const tarPath = path.relative(target, localTarball).split(path.sep).join('/');
      execFileSync('tar', ['-xzf', tarPath, '--strip-components=1'], { cwd: target, stdio: 'pipe' });
      installedBy = 'tarball extraction';
    }
    const probe = [
      "const fs = require('fs');",
      "const pkg = require('zidan-select/package.json');",
      "const rootApi = require('zidan-select');",
      "const select = require('zidan-select/select');",
      "const file = require('zidan-select/file');",
      "const min = require('zidan-select/min');",
      "for (const [name, fn] of [['root', rootApi.zidanSelect], ['select', select.zidanSelect], ['file', file.zidanField], ['min', min.zidanSelect]]) if (typeof fn !== 'function') throw new Error('missing ' + name + ' export');",
      "for (const sub of ['css/core', 'css/theme', 'css/core.min', 'css/theme.min', 'select/css/core', 'select/css/theme.min', 'file/css/core', 'file/css/theme.min']) { if (!fs.existsSync(require.resolve('zidan-select/' + sub))) throw new Error('missing subpath ' + sub); }",
      "console.log(pkg.version);"
    ].join('\n');
    fs.writeFileSync(path.join(consumer, 'probe.cjs'), probe);
    const version = execFileSync(process.execPath, ['probe.cjs'], { cwd: consumer, encoding: 'utf8' }).trim();
    const esm = [
      "import ZidanForm from 'zidan-select';",
      "import { ZidanSelect, zidanSelect } from 'zidan-select/select';",
      "import { ZidanFileUpload } from 'zidan-select/file';",
      "if (typeof ZidanForm !== 'object' || typeof ZidanSelect !== 'function' || typeof zidanSelect !== 'function' || typeof ZidanFileUpload !== 'function') throw new Error('bad ESM exports');",
      "console.log('ok');"
    ].join('\n');
    fs.writeFileSync(path.join(consumer, 'probe.mjs'), esm);
    execFileSync(process.execPath, ['probe.mjs'], { cwd: consumer, stdio: 'pipe' });
    return 'version ' + version + ', CSS subpaths, CJS + ESM (' + installedBy + ')';
  });

  step('shipped declarations compile for bundler and node16 consumers', () => {
    const usage = [
      "import ZidanFormDefault, { ZidanForm, ZidanSelect, ZidanTextField, ZidanFileUpload, initZidanForms, zidanField, zidanSelect, type SelectOptions, type FieldRule } from 'zidan-select';",
      "import { ZidanSelect as SelectOnly, zidanSelect as selectOnlyFactory, type SelectOptions as SelectOnlyOptions } from 'zidan-select/select';",
      "import { ZidanFileUpload as FileOnly, zidanField as fileOnlyFactory, type FileFieldOptions } from 'zidan-select/file';",
      "const options: SelectOptions = { mode: 'combobox', onChange: ({ value }) => void value };",
      "const single = zidanSelect('#a', options) as ZidanSelect;",
      "single.setValue(['a']);",
      "single.open();",
      "const rule: FieldRule = async () => 'Taken';",
      "const field = zidanField('#email', { validate: rule }) as ZidanTextField;",
      "field.setPhoneFormat('e164');",
      "const files = zidanField('#files', { uploadHandler: (file, { onProgress }) => { void file; onProgress(50); } }) as ZidanFileUpload;",
      "files.uploadAll();",
      "const fileOptions: FileFieldOptions = { maxFiles: 5, accept: 'image/*' };",
      "const fileOnly = fileOnlyFactory('#upload', fileOptions) as FileOnly;",
      "void fileOnly.getUploadState();",
      "const selectOnly = selectOnlyFactory('#pick', { fetchPageSize: 10 } as SelectOnlyOptions) as SelectOnly;",
      "void selectOnly.hasMoreResults();",
      "initZidanForms(document, { showValidState: true });",
      "ZidanForm.get('#email');",
      "ZidanFormDefault.version;",
      "void [single, field, files];"
    ].join('\n');
    fs.writeFileSync(path.join(consumer, 'usage.ts'), usage);
    for (const [name, moduleResolution] of [['bundler', 'bundler'], ['node16', 'node16']]) {
      fs.writeFileSync(path.join(consumer, 'tsconfig.' + name + '.json'), JSON.stringify({
        compilerOptions: {
          strict: true,
          noEmit: true,
          skipLibCheck: false,
          target: 'ES2020',
          module: moduleResolution === 'node16' ? 'node16' : 'esnext',
          moduleResolution: moduleResolution,
          lib: ['ES2020', 'DOM']
        },
        files: ['usage.ts']
      }, null, 2));
      const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');
      assert(fs.existsSync(tsc), 'typescript is required: npm ci');
      try {
        execFileSync(process.execPath, [tsc, '-p', 'tsconfig.' + name + '.json'], { cwd: consumer, stdio: 'pipe' });
      } catch (error) {
        throw new Error(name + ' resolution failed: ' + String(error.stdout || error.stderr || error.message).slice(0, 800));
      }
    }
    return 'bundler + node16';
  });
} finally {
  fs.rmSync(work, { recursive: true, force: true });
}

console.log(failures ? '\n' + failures + ' package check(s) failed' : '\npackage checks passed');
process.exit(failures ? 1 : 0);