#!/usr/bin/env node
/**
 * Build the publishable dist/ folder.
 *
 * The library has no runtime or build dependency: zidan-form.js is already a
 * UMD-compatible classic script and zidan-form.mjs is its ESM wrapper. This
 * script only assembles dist/ (plus a CJS entry) and, if esbuild happens to be
 * installed, writes minified copies. Nothing is required for the repo to work.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const assets = ['zidan-form.js', 'zidan-form.mjs', 'plugin-core.css', 'plugin-theme.css'];

await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(dist, { recursive: true });

for (const asset of assets) {
  await fs.copyFile(path.join(root, asset), path.join(dist, asset));
}

await fs.writeFile(
  path.join(dist, 'zidan-form.cjs'),
  "'use strict';\nmodule.exports = require('../zidan-form.js');\n",
  'utf8'
);

let minified = false;
try {
  const esbuild = await import('esbuild');
  await esbuild.build({
    entryPoints: [path.join(root, 'zidan-form.js')],
    outfile: path.join(dist, 'zidan-form.min.js'),
    bundle: false,
    minify: true,
    target: ['es2019'],
    legalComments: 'inline',
    logLevel: 'silent'
  });
  for (const css of ['plugin-core.css', 'plugin-theme.css']) {
    await esbuild.build({
      entryPoints: [path.join(root, css)],
      outfile: path.join(dist, css.replace('.css', '.min.css')),
      minify: true,
      logLevel: 'silent'
    });
  }
  minified = true;
} catch (err) {
  if (err && err.code !== 'ERR_MODULE_NOT_FOUND') throw err;
}

console.log('built dist/ (' + assets.length + ' files + CJS entry)');
console.log(minified ? 'minified copies written with esbuild' : 'esbuild not installed — skipped minified copies');
