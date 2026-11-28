#!/usr/bin/env node
/**
 * One-command release for zidan-select.
 *
 *   npm run release -- patch --note "Fix the thing that broke"
 *   npm run release -- minor
 *   npm run release -- 2.4.0 --dry-run
 *
 * Bumps package.json, package-lock.json, the JS banner and VERSION constant, both CSS
 * banners, the README/CDN URLs, the demo pages and the docs; rolls `## [Unreleased]` in
 * CHANGELOG.md into a dated section; runs the type check and the test suite; then commits
 * `Release X.Y.Z` and creates the annotated tag `vX.Y.Z`.
 *
 * Pushing that tag (`git push origin main --follow-tags`) runs
 * .github/workflows/release.yml, which publishes to npm with provenance.
 *
 * Flags:
 *   --dry-run        print the plan, write nothing
 *   --no-commit      edit files and the changelog, skip the commit and tag
 *   --skip-checks    skip `npm run types` and `npm test`
 *   --note "text"    changelog bullet for when `## [Unreleased]` is empty
 */
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** Files that carry the version as plain text. */
const TEXT_SITES = [
  'zidan-form.js',
  'plugin-core.css',
  'plugin-theme.css',
  'README.md',
  'index.html',
  'advanced.html',
  'api.html',
  'ajax.html',
  'playground.html',
  'shopify.html',
  'lab.html',
  'docs/index.html',
  'docs/validation.html',
  'docs/build.md',
  'docs/html-and-wordpress.md'
];

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z][0-9A-Za-z.-]*)?$/;

function fail(message) {
  console.error('\n  ✗ ' + message + '\n');
  process.exit(1);
}

function parseArgs(argv) {
  const flags = {dryRun: false, commit: true, checks: true, note: ''};
  const words = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') flags.dryRun = true;
    else if (arg === '--no-commit') flags.commit = false;
    else if (arg === '--skip-checks') flags.checks = false;
    else if (arg === '--note') flags.note = argv[i += 1] || '';
    else if (arg.startsWith('--note=')) flags.note = arg.slice('--note='.length);
    else if (arg === '--help' || arg === '-h') flags.help = true;
    else if (arg.startsWith('-')) fail(`Unknown flag ${arg}. See --help.`);
    else words.push(arg);
  }
  return {flags, words};
}

function bump(current, kind) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) fail(`Cannot ${kind}-bump the prerelease version ${current}; pass an explicit version.`);
  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);
  if (kind === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (kind === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }
  return `${major}.${minor}.${patch}`;
}

function compareVersions(a, b) {
  const left = a.split('-')[0].split('.').map(Number);
  const right = b.split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return 0;
}

/** package.json keeps its own 2-space formatting, so edit it as JSON, not text. */
function bumpJson(relative, current, next, summary) {
  const file = path.join(root, relative);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.version !== current) {
    fail(`${relative} reports ${data.version}, expected ${current}.`);
  }
  data.version = next;
  if (data.packages && data.packages['']) {
    if (data.packages[''].version !== current) {
      fail(`${relative} packages[""].version reports ${data.packages[''].version}, expected ${current}.`);
    }
    data.packages[''].version = next;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  summary.push(`${relative}: version ${current} → ${next}`);
}

/** A CDN pin: the full jsDelivr URL or the `…@X.Y.Z` shorthand used in the cookbook tables. */
const CDN_PIN = /(?:zidan-select|…)@\d+\.\d+\.\d+/g;

/**
 * Everything else carries the version inside a banner, a URL or a sentence. CDN pins are matched
 * by shape, not by `current`: they may lag package.json until that version is published, and a
 * delayed pin must still catch up on the next release instead of sticking forever.
 */
function bumpText(relative, current, next, summary) {
  const file = path.join(root, relative);
  const source = fs.readFileSync(file, 'utf8');
  const pins = source.match(CDN_PIN) || [];
  const repinned = source.replace(CDN_PIN, pin => pin.replace(/@\d+\.\d+\.\d+$/, '@' + next));
  const hits = repinned.split(current).length - 1;
  if (!pins.length && !hits) fail(`${relative} does not contain ${current}; refusing a partial bump.`);
  fs.writeFileSync(file, repinned.split(current).join(next));
  const total = pins.length + hits;
  summary.push(`${relative}: ${total} replacement${total === 1 ? '' : 's'}`);
}

/** Move `## [Unreleased]` under a dated heading, leaving a fresh empty section. */
function rollChangelog(version, date, note) {
  const file = path.join(root, 'CHANGELOG.md');
  const markdown = fs.readFileSync(file, 'utf8');
  const heading = /\n## \[Unreleased\][^\n]*\n/.exec(markdown);
  if (!heading) fail('CHANGELOG.md needs a "## [Unreleased]" heading before its first release.');
  const start = heading.index + heading[0].length;
  const next = markdown.indexOf('\n## [', start);
  if (next === -1) {
    fail('CHANGELOG.md needs at least one released section after "## [Unreleased]".');
  }
  const pending = markdown.slice(start, next).trim();
  const notes = [pending, note ? '- ' + note.trim() : ''].filter(Boolean).join('\n');
  if (!notes) {
    fail('Nothing to release: write notes under "## [Unreleased]" or pass --note "what changed".');
  }
  const releaseNotes = /^### /m.test(notes) ? notes : '### Changed\n\n' + notes;
  const prefix = markdown.slice(0, start).replace(/\s*$/, '\n');
  const section = `\n## [${version}] - ${date}\n\n${releaseNotes}\n`;
  const updated = prefix + section + markdown.slice(next);
  fs.writeFileSync(file, updated);
  return releaseNotes.split('\n').length;
}

function git(command) {
  return execSync('git ' + command, {cwd: root, encoding: 'utf8'}).trim();
}

function main() {
  const {flags, words} = parseArgs(process.argv.slice(2));

  if (flags.help) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^[\s\S]*?\/\*\*/, ''));
    return;
  }

  const pkgFile = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const current = pkg.version;
  const target = words[0];

  if (!target) fail('Usage: npm run release -- <patch|minor|major|X.Y.Z> [--note "what changed"]');

  const next = ['patch', 'minor', 'major'].includes(target) ? bump(current, target) : target;
  if (!SEMVER.test(next)) fail(`"${next}" is not a semantic version.`);
  if (next === current) fail(`Version is already ${current}.`);
  if (compareVersions(next, current) < 0) fail(`${next} is lower than the current ${current}.`);

  if (flags.commit && !flags.dryRun) {
    const dirty = git('status --porcelain --untracked-files=no');
    if (dirty) {
      fail('Commit or stash your tracked changes first, so the release commit holds only the bump:\n\n' + dirty);
    }
    try {
      git('rev-parse -q --verify refs/tags/v' + next);
      fail(`Tag v${next} already exists; pick another version.`);
    } catch (error) {
      if (!/Command failed/.test(String(error.stderr || error.message))) throw error;
    }
  }

  const date = new Date().toISOString().slice(0, 10);
  const summary = [];

  if (flags.dryRun) {
    console.log(`\n  Release ${current} → ${next} (dry run, nothing written)\n`);
    console.log('  Would bump: package.json, package-lock.json, ' + TEXT_SITES.join(', '));
    console.log(`  Would roll CHANGELOG.md: ## [Unreleased] → ## [${next}] - ${date}`);
    console.log(`  Would commit "Release ${next}" and tag v${next}\n`);
    return;
  }

  bumpJson('package.json', current, next, summary);
  bumpJson('package-lock.json', current, next, summary);
  for (const relative of TEXT_SITES) bumpText(relative, current, next, summary);
  const lines = rollChangelog(next, date, flags.note);

  console.log(`\n  Release ${current} → ${next}\n`);
  for (const line of summary) console.log('  ✓ ' + line);
  console.log(`  ✓ CHANGELOG.md: ${lines} line(s) under [${next}] - ${date}\n`);

  if (flags.checks) {
    console.log('  Running npm run types && npm test…\n');
    execSync('npm run types && npm test', {cwd: root, stdio: 'inherit'});
  }

  if (!flags.commit) {
    console.log('\n  Files updated. Commit and tag when ready:\n');
    console.log(`    git commit -am "Release ${next}" && git tag -a v${next} -m "Release ${next}"\n`);
    return;
  }

  const changed = ['package.json', 'package-lock.json', 'CHANGELOG.md', ...TEXT_SITES];
  execSync('git add ' + changed.map(name => JSON.stringify(name)).join(' '), {cwd: root, stdio: 'inherit'});
  execSync(`git commit -m "Release ${next}"`, {cwd: root, stdio: 'inherit'});
  execSync(`git tag -a v${next} -m "Release ${next}"`, {cwd: root, stdio: 'inherit'});

  console.log(`\n  Committed and tagged v${next}. Publish with:\n`);
  console.log('    git push origin main --follow-tags\n');
  console.log('  The tag runs .github/workflows/release.yml, which publishes to npm\n');
  console.log('  with provenance. Follow it with: gh run watch\n');
}

main();
