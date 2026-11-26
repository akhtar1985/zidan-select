#!/usr/bin/env node
/**
 * Builds HTML pages for the Markdown guides in docs/.
 *
 *   node scripts/docs.mjs _site/docs      # used by .github/workflows/pages.yml
 *   node scripts/docs.mjs .build/docs     # local preview
 *
 * The Markdown files stay the single source of truth; this script turns them into styled
 * pages that share the demo header, design tokens and documentation layout, so the demo and
 * the docs index never send readers to GitHub for a document that belongs on the site.
 * Internal .md links are rewritten to the generated .html pages, headings get GitHub-style ids
 * so existing #anchors keep working, and docs/index.html and docs/validation.html (authored
 * pages) are never overwritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** The package version, so the generated pages cannot drift from package.json. */
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;

/** source Markdown -> output page */
const PAGES = [
  {source: 'options', out: 'options', title: 'Options & data attributes', blurb: 'Every JS option, data attribute, callback, event and instance method.'},
  {source: 'theming', out: 'theming', title: 'Theming', blurb: 'Tokens, presets, layouts, framework adapters and custom themes.'},
  {source: 'frameworks', out: 'frameworks', title: 'Framework integration', blurb: 'React, Next.js, Vue, Angular and state-sync patterns.'},
  {source: 'comparison', out: 'comparison', title: 'Why ZidanForm & comparison', blurb: 'Feature matrix, trade-offs and migration notes.'},
  {source: 'validation', out: 'validation-guide', title: 'Validation compatibility', blurb: 'Native constraints, jQuery Validation, JustValidate, Parsley and submit guards.'},
  {source: 'build', out: 'build', title: 'Build & publish', blurb: 'Repository layout, scripts, subset builds, releases and Pages.'},
  {source: 'html-and-wordpress', out: 'html-and-wordpress', title: 'Static HTML & WordPress cookbook', blurb: 'Copy-paste pages, select-only and file-only builds, WordPress, Shopify and troubleshooting.'}
];

const AUTHORED = new Set(['index.html', 'validation.html']);

const escapeHtml = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

function slugify(text) {
  return text.toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Inline Markdown: code spans, links, bold, italics, autolinks. */
function inline(text, tokens = []) {
  const hold = html => {
    tokens.push(html);
    return `\u0000${tokens.length - 1}\u0000`;
  };
  let out = text.replace(/`([^`]+)`/g, (_, code) => hold(`<code>${escapeHtml(code)}</code>`));

  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
    hold(`<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy">`));
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const sitePage = /^\.\.\/(?:index|advanced|playground|api|ajax|shopify)\.html(?:#.*)?$/.test(href);
    const target = href.startsWith('../') && !sitePage
      ? 'https://github.com/akhtar1985/zidan-select/blob/main/' + href.slice(3)
      : href.replace(/\.md(#[^)]*)?$/, (_, hash) => '.html' + (hash || ''));
    const external = /^https?:/i.test(target);
    return hold(`<a href="${escapeHtml(target)}"${external ? ' rel="noopener"' : ''}>${inline(label, tokens)}</a>`);
  });
  out = out.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (_, href) =>
    hold(`<a href="${escapeHtml(href)}" rel="noopener">${escapeHtml(href)}</a>`));

  out = escapeHtml(out)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => tokens[Number(index)]);
}

function convert(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html = [];
  let index = 0;

  const isTable = line => /^\s*\|/.test(line);
  const isFence = line => /^\s*```/.test(line);

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (isFence(line)) {
      const language = line.trim().slice(3).trim();
      const body = [];
      index += 1;
      while (index < lines.length && !isFence(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      html.push(`<pre><code${language ? ` class="language-${escapeHtml(language)}"` : ''}>${escapeHtml(body.join('\n'))}</code></pre>`);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      const text = heading[2].trim();
      // The page template already renders the document title as <h1>.
      const level = depth === 1 ? 2 : depth;
      html.push(`<h${level} id="${slugify(text)}">${inline(text)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      html.push('<hr>');
      index += 1;
      continue;
    }

    if (isTable(line)) {
      const rows = [];
      while (index < lines.length && isTable(lines[index])) {
        rows.push(lines[index].trim());
        index += 1;
      }
      const cells = row => row.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      const head = cells(rows[0]);
      const bodyRows = rows.slice(1).filter(row => !/^\|?[\s:|-]+\|?$/.test(row.replace(/\s/g, '')));
      html.push('<div class="table-wrap"><table><thead><tr>'
        + head.map(cell => `<th>${inline(cell)}</th>`).join('')
        + '</tr></thead><tbody>'
        + bodyRows.map(row => '<tr>' + cells(row).map(cell => `<td>${inline(cell)}</td>`).join('') + '</tr>').join('')
        + '</tbody></table></div>');
      continue;
    }

    if (/^\s*>/.test(line)) {
      const body = [];
      while (index < lines.length && /^\s*>/.test(lines[index])) {
        body.push(lines[index].replace(/^\s*>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${convert(body.join('\n'))}</blockquote>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*[-*+]\s+/, ''));
        index += 1;
        while (index < lines.length && /^\s{2,}\S/.test(lines[index]) && !/^\s*[-*+]\s+/.test(lines[index])) {
          items[items.length - 1] += ' ' + lines[index].trim();
          index += 1;
        }
      }
      html.push('<ul>' + items.map(item => `<li>${inline(item)}</li>`).join('') + '</ul>');
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
        items.push(lines[index].replace(/^\s*\d+\.\s+/, ''));
        index += 1;
      }
      html.push('<ol>' + items.map(item => `<li>${inline(item)}</li>`).join('') + '</ol>');
      continue;
    }

    const paragraph = [];
    while (index < lines.length && lines[index].trim()
      && !isFence(lines[index]) && !isTable(lines[index]) && !/^\s*(#{1,4})\s/.test(lines[index])
      && !/^\s*>/.test(lines[index]) && !/^\s*[-*+]\s+/.test(lines[index]) && !/^\s*\d+\.\s+/.test(lines[index])) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    html.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }

  return html.join('\n');
}

function siteHeader(page) {
  const current = name => page.out === name ? ' aria-current="page"' : '';
  return `<a class="skip-link" href="#docs-main">Skip to content</a>
  <div class="bg-orbs" aria-hidden="true"><span class="orb"></span></div>
  <header class="site-header">
    <a class="brand" href="../index.html">
      <span class="logo-mark" aria-hidden="true">Z</span>
      <span>
        <span class="brand-name">ZidanForm</span>
        <span class="brand-sub">v${version} · zero dependencies</span>
      </span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
      <span class="nav-toggle-bars" aria-hidden="true"><span></span><span></span><span></span></span>
      <span>Menu</span>
    </button>
    <nav class="header-nav" id="site-nav" aria-label="Project links">
      <a href="../index.html">Demo</a>
      <a href="../advanced.html">Advanced</a>
      <a href="../playground.html">Playground</a>
      <a href="../api.html">API</a>
      <a href="../ajax.html">AJAX</a>
      <a href="../shopify.html">Shopify</a>
      <a href="../index.html#compare">Compare</a>
      <a href="../index.html#faq">FAQ</a>
      <details class="nav-docs">
        <summary>Docs</summary>
        <div class="nav-docs-panel">
          <a href="index.html"${page.out === 'index' ? ' aria-current="page"' : ''}>Documentation index</a>
          <a href="options.html"${current('options')}>Options &amp; data attributes</a>
          <a href="comparison.html"${current('comparison')}>Why &amp; comparison</a>
          <a href="frameworks.html"${current('frameworks')}>Frameworks</a>
          <a href="html-and-wordpress.html"${current('html-and-wordpress')}>HTML &amp; WordPress</a>
          <a href="validation-guide.html"${current('validation-guide')}>Validation</a>
          <a href="theming.html"${current('theming')}>Theming</a>
          <a href="build.html"${current('build')}>Build &amp; publish</a>
        </div>
      </details>
      <a href="https://github.com/akhtar1985/zidan-select">GitHub</a>
      <a href="https://www.npmjs.com/package/zidan-select">npm</a>
      <label class="sr-only" for="quick-theme">Page theme</label>
      <select id="quick-theme" aria-label="Page theme">
        <option value="default">Default theme</option>
        <option value="modern">Modern</option>
        <option value="minimal">Minimal</option>
        <option value="dark">Dark</option>
        <option value="glass">Glass</option>
        <option value="auto">Auto (OS)</option>
      </select>
    </nav>
  </header>`;
}

function siteFooter() {
  return `<footer class="site-footer">
    <div class="wrap">
      <p>
        <strong>ZidanForm</strong> — MIT licensed, no dependencies.
        <a href="../index.html">Demo</a> ·
        <a href="../playground.html">Playground</a> ·
        <a href="index.html">Documentation</a> ·
        <a href="https://github.com/akhtar1985/zidan-select">GitHub</a>
      </p>
    </div>
  </footer>
  <script src="../nav.js"></script>`;
}

function template(page, body) {
  return `<!DOCTYPE html>
<html lang="en" data-zs-theme="default" data-zs-framework="none">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} — ZidanForm docs</title>
  <meta name="description" content="${escapeHtml(page.blurb)}">
  <link rel="canonical" href="https://akhtar1985.github.io/zidan-select/docs/${page.out}.html">
  <meta name="theme-color" content="#4f6bed">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="ZidanForm">
  <meta property="og:title" content="${escapeHtml(page.title)} — ZidanForm docs">
  <meta property="og:description" content="${escapeHtml(page.blurb)}">
  <meta property="og:url" content="https://akhtar1985.github.io/zidan-select/docs/${page.out}.html">
  <meta property="og:image" content="https://akhtar1985.github.io/zidan-select/docs/demo-inputs.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="stylesheet" href="../plugin-core.css">
  <link rel="stylesheet" href="../plugin-theme.css">
  <link rel="stylesheet" href="../demo.css">
  <link rel="stylesheet" href="../nav.css">
  <link rel="stylesheet" href="../docs.css">
</head>
<body>
  ${siteHeader(page)}
  <main id="docs-main" class="wrap docs-main">
    <section class="hero docs-hero" aria-labelledby="docs-title">
      <p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span> Documentation · reference</p>
      <h1 id="docs-title">${escapeHtml(page.title)}</h1>
      <p class="doc-blurb">${escapeHtml(page.blurb)}</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="../playground.html">Try the playground</a>
        <a class="btn" href="index.html">All documentation</a>
        <a class="btn" href="../advanced.html">Advanced API</a>
      </div>
    </section>
    <div class="docs-content">
${body}
    </div>
    <p class="doc-source-note">
      Markdown source: <a href="https://github.com/akhtar1985/zidan-select/blob/main/docs/${page.source}.md" rel="noopener">docs/${page.source}.md</a>.
      Generated by <code>scripts/docs.mjs</code> — edit the Markdown, not this page.
    </p>
  </main>
  ${siteFooter()}
</body>
</html>
`;
}

function main() {
  const target = path.resolve(root, process.argv[2] || 'docs');
  fs.mkdirSync(target, {recursive: true});
  let built = 0;

  for (const page of PAGES) {
    if (AUTHORED.has(page.out + '.html')) {
      console.warn(`  ! skipping ${page.out}.html (authored page)`);
      continue;
    }
    const sourcePath = path.join(root, 'docs', page.source + '.md');
    if (!fs.existsSync(sourcePath)) {
      console.warn(`  ! missing docs/${page.source}.md`);
      continue;
    }
    const markdown = fs.readFileSync(sourcePath, 'utf8');
    const body = convert(markdown);
    fs.writeFileSync(path.join(target, page.out + '.html'), template(page, body));
    built += 1;
    console.log(`  ✓ docs/${page.source}.md → ${path.relative(root, path.join(target, page.out + '.html'))}`);
  }

  console.log(`\n  ${built} documentation page(s) written to ${path.relative(root, target) || target}\n`);
}

main();
