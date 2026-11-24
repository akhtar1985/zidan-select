#!/usr/bin/env node
/**
 * Builds HTML pages for the Markdown guides in docs/.
 *
 *   node scripts/docs.mjs _site/docs      # used by .github/workflows/pages.yml
 *   node scripts/docs.mjs .build/docs     # local preview
 *
 * The Markdown files stay the single source of truth; this script turns them into styled,
 * self-contained pages so the demo and the docs index never send readers to GitHub for a
 * document that belongs on the site. Internal .md links are rewritten to the generated .html
 * pages, headings get GitHub-style ids so existing #anchors keep working, and docs/*.html,
 * docs/index.html and docs/validation.html (authored pages) are never overwritten.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

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
function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) =>
    `<img src="${src}" alt="${escapeHtml(alt)}" loading="lazy">`);
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
    const target = href.replace(/\.md(#[^)]*)?$/, (_, hash) => '.html' + (hash || ''));
    const external = /^https?:/i.test(target);
    return `<a href="${target}"${external ? ' rel="noopener"' : ''}>${inline(label)}</a>`;
  });
  out = out.replace(/<((?:https?:\/\/|mailto:)[^>\s]+)>/g, (_, href) =>
    `<a href="${href}" rel="noopener">${escapeHtml(href)}</a>`);

  out = escapeHtml(out)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');

  return out.replace(/\u0000(\d+)\u0000/g, (_, index) => codes[Number(index)]);
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

function template(page, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} — ZidanForm docs</title>
  <meta name="description" content="${escapeHtml(page.blurb)}">
  <link rel="canonical" href="https://akhtar1985.github.io/zidan-select/docs/${page.out}.html">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(page.title)} — ZidanForm docs">
  <meta property="og:description" content="${escapeHtml(page.blurb)}">
  <meta property="og:url" content="https://akhtar1985.github.io/zidan-select/docs/${page.out}.html">
  <style>
    :root { --doc-ink:#16181d; --doc-muted:#616774; --doc-line:#e4e7ef; --doc-accent:#3355d8; --doc-bg:#f7f8fc; --doc-code:#11141b; }
    * { box-sizing: border-box; }
    body { margin:0; background:var(--doc-bg); color:var(--doc-ink); font:16px/1.65 "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
    a { color: var(--doc-accent); }
    .doc-top { border-bottom:1px solid var(--doc-line); background:#fff; }
    .doc-top-inner { max-width:920px; margin:0 auto; padding:14px 20px; display:flex; flex-wrap:wrap; gap:10px 18px; align-items:center; font-size:.86rem; }
    .doc-top a[aria-current="page"] { font-weight:700; text-decoration:none; }
    .doc-brand { font-weight:800; margin-right:auto; }
    main { max-width:920px; margin:0 auto; padding:30px 20px 70px; background:var(--doc-bg); }
    h1 { margin:0 0 6px; font-size:clamp(1.5rem,3vw,2rem); letter-spacing:-.02em; }
    .doc-blurb { margin:0 0 26px; color:var(--doc-muted); }
    h2 { margin:34px 0 10px; font-size:1.3rem; letter-spacing:-.01em; }
    h3 { margin:26px 0 8px; font-size:1.06rem; }
    h4 { margin:20px 0 6px; font-size:.95rem; }
    table { width:100%; border-collapse:collapse; font-size:.9rem; }
    .table-wrap { overflow-x:auto; margin:14px 0 22px; border:1px solid var(--doc-line); border-radius:10px; background:#fff; }
    th, td { text-align:left; vertical-align:top; padding:8px 12px; border-bottom:1px solid var(--doc-line); }
    th { background:#f1f3fa; font-weight:700; }
    tr:last-child td { border-bottom:0; }
    code { background:#eef0f8; padding:1px 5px; border-radius:5px; font:0.86em/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre { margin:14px 0 22px; padding:14px 16px; border-radius:10px; background:var(--doc-code); color:#dbe4ff; overflow:auto; }
    pre code { background:none; padding:0; color:inherit; font-size:.82rem; }
    blockquote { margin:14px 0; padding:10px 16px; border-left:3px solid var(--doc-accent); background:#fff; border-radius:0 8px 8px 0; color:var(--doc-muted); }
    hr { border:0; border-top:1px solid var(--doc-line); margin:28px 0; }
    footer { max-width:920px; margin:0 auto; padding:0 20px 50px; font-size:.84rem; color:var(--doc-muted); }
  </style>
</head>
<body>
  <header class="doc-top">
    <div class="doc-top-inner">
      <a class="doc-brand" href="../index.html">ZidanForm</a>
      <a href="index.html">Docs</a>
      <a href="options.html"${page.out === 'options' ? ' aria-current="page"' : ''}>Options</a>
      <a href="validation-guide.html"${page.out === 'validation-guide' ? ' aria-current="page"' : ''}>Validation</a>
      <a href="theming.html"${page.out === 'theming' ? ' aria-current="page"' : ''}>Theming</a>
      <a href="frameworks.html"${page.out === 'frameworks' ? ' aria-current="page"' : ''}>Frameworks</a>
      <a href="comparison.html"${page.out === 'comparison' ? ' aria-current="page"' : ''}>Comparison</a>
      <a href="build.html"${page.out === 'build' ? ' aria-current="page"' : ''}>Build</a>
      <a href="html-and-wordpress.html"${page.out === 'html-and-wordpress' ? ' aria-current="page"' : ''}>HTML &amp; WordPress</a>
      <a href="../ajax.html">AJAX demo</a>
    </div>
  </header>
  <main>
    <h1>${escapeHtml(page.title)}</h1>
    <p class="doc-blurb">${escapeHtml(page.blurb)}</p>
${body}
  </main>
  <footer>
    Markdown source: <a href="https://github.com/akhtar1985/zidan-select/blob/main/docs/${page.source}.md" rel="noopener">docs/${page.source}.md</a>.
    Generated by <code>scripts/docs.mjs</code> — edit the Markdown, not this page.
  </footer>
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
