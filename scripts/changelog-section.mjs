#!/usr/bin/env node
/**
 * Print the CHANGELOG.md body for one version, to use as a GitHub Release body.
 *
 *   node scripts/changelog-section.mjs 2.4.0
 *   node scripts/changelog-section.mjs 2.4.0 --output .build/notes-2.4.0.md
 *
 * Prints everything under `## [2.4.0]` up to the next `## [` heading, without the heading
 * itself. Prints nothing and exits 0 when the version has no section, so the release
 * workflow can fall back to `--generate-notes`.
 *
 * Prefer `--output <file>` over a shell redirect. A `>` redirect writes UTF-16LE with a BOM
 * in Windows PowerShell 5.1, and `gh release create --notes-file` then reads those bytes as
 * UTF-8, so the published release body becomes garbage like "### Added". `--output` writes
 * the file here with an explicit UTF-8 encoding on every platform.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Body of the `## [version]` section, or '' when the changelog has no such section. */
export function changelogSection(markdown, version) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const heading = new RegExp(`^## \\[${escaped}\\][^\\n]*$`, 'm').exec(markdown);
  if (!heading) return '';
  const rest = markdown.slice(heading.index + heading[0].length);
  const end = rest.search(/^## \[/m);
  return (end === -1 ? rest : rest.slice(0, end)).trim();
}

function parseArgs(argv) {
  const flags = {version: '', output: ''};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--output' || arg === '-o') flags.output = argv[i += 1] || '';
    else if (arg.startsWith('--output=')) flags.output = arg.slice('--output='.length);
    else if (!flags.version) flags.version = arg;
  }
  return flags;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const {version, output} = parseArgs(process.argv.slice(2));
  if (!version) {
    console.error('usage: node scripts/changelog-section.mjs <version> [--output <file>]');
    process.exit(2);
  }
  const markdown = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8').replace(/^\uFEFF/, '');
  const body = changelogSection(markdown, version);
  // Always write UTF-8, whether or not the version has a section, so `--output` never leaves
  // a stale file behind and `gh` never sees a UTF-16 BOM.
  if (output) {
    fs.mkdirSync(path.dirname(path.resolve(output)), {recursive: true});
    fs.writeFileSync(output, body ? body + '\n' : '', 'utf8');
    if (body) console.error(`wrote ${output} (${body.split('\n').length} lines, UTF-8)`);
  } else if (body) {
    process.stdout.write(body + '\n');
  }
}
