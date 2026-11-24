#!/usr/bin/env node
/**
 * Print the CHANGELOG.md body for one version, to use as a GitHub Release body.
 *
 *   node scripts/changelog-section.mjs 2.4.0
 *
 * Prints everything under `## [2.4.0]` up to the next `## [` heading, without the heading
 * itself. Prints nothing and exits 0 when the version has no section, so the release
 * workflow can fall back to `--generate-notes`.
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const version = process.argv[2];
  if (!version) {
    console.error('usage: node scripts/changelog-section.mjs <version>');
    process.exit(2);
  }
  const markdown = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  const body = changelogSection(markdown, version);
  if (body) process.stdout.write(body + '\n');
}
