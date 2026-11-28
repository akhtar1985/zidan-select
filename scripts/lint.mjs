/* Syntax-checks every first-party script in the repository.
   `npm run lint` runs this file; `npm test` imports `sourceFiles()` so the
   shipped bundles and the development scripts share one list. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.freebuff', 'zidan-select-lab-kit', 'reports', 'coverage']);

export function sourceFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (entry.name.startsWith('.')) continue;
      const rel = dir ? dir + '/' + entry.name : entry.name;
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(rel);
      } else if (/\.m?js$/.test(entry.name) && !/\.min\.js$/.test(entry.name)) {
        files.push(rel);
      }
    }
  };
  walk('');
  return files.sort();
}

function main() {
  const files = sourceFiles();
  const failed = [];
  for (const file of files) {
    try {
      execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
    } catch (error) {
      failed.push(file);
      console.error('FAIL ' + file + '\n' + String(error.stderr || error.message).trim());
    }
  }
  if (failed.length) {
    console.error('lint: ' + failed.length + ' of ' + files.length + ' files failed');
    process.exitCode = 1;
    return;
  }
  console.log('lint: syntax ok in ' + files.length + ' files');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
