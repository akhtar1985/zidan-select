#!/usr/bin/env node
/**
 * Exa web search for docs/research work on the plugin.
 *
 *   npm run search -- "z-index stacking for custom select dropdowns"
 *   npm run search -- "custom select accessibility" --num 8
 *
 * The API key is read from EXA_API_KEY (see .env.example); it is never logged.
 * Import { searchWeb } from this file to use it from another script.
 */
import { pathToFileURL } from 'node:url';
import { Exa } from 'exa-js';

const DEFAULT_NUM_RESULTS = 5;

function apiKey() {
  const key = (process.env.EXA_API_KEY || '').trim();
  if (!key) {
    throw new Error('EXA_API_KEY is not set. Copy .env.example to .env, add your key from https://dashboard.exa.ai/api-keys, then set it in your shell.');
  }
  return key;
}

let client;

/** Shared Exa client, created on first use. */
export function exaClient() {
  if (!client) client = new Exa(apiKey());
  return client;
}

/**
 * Search the web with Exa and return results with highlights.
 * @param {string} query
 * @param {{ numResults?: number, type?: 'auto' | 'neural' | 'keyword' | 'fast', includeDomains?: string[], excludeDomains?: string[] }} [options]
 */
export async function searchWeb(query, options = {}) {
  if (!query || !query.trim()) throw new Error('searchWeb needs a non-empty query.');
  const response = await exaClient().search(query.trim(), {
    type: options.type || 'auto',
    numResults: options.numResults || DEFAULT_NUM_RESULTS,
    includeDomains: options.includeDomains,
    excludeDomains: options.excludeDomains,
    contents: { highlights: true }
  });
  return response.results || [];
}

/** Plain-text rendering of search results for the terminal. */
export function formatResults(results) {
  if (!results.length) return 'No results.';
  return results.map((result, index) => {
    const lines = [index + 1 + '. ' + (result.title || '(untitled)'), '   ' + result.url];
    for (const highlight of (result.highlights || []).slice(0, 2)) {
      lines.push('   \u2022 ' + highlight.replace(/\s+/g, ' ').trim());
    }
    return lines.join('\n');
  }).join('\n\n');
}

async function main(argv) {
  const args = [];
  let numResults = DEFAULT_NUM_RESULTS;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--num') {
      numResults = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i].startsWith('--num=')) {
      numResults = Number(argv[i].slice('--num='.length));
    } else {
      args.push(argv[i]);
    }
  }
  const query = args.join(' ').trim();
  if (!query) {
    console.log('Usage: npm run search -- "your question" [--num 5]');
    process.exitCode = 1;
    return;
  }
  if (!Number.isFinite(numResults) || numResults < 1) {
    console.log('--num needs a positive number.');
    process.exitCode = 1;
    return;
  }
  try {
    const results = await searchWeb(query, { numResults });
    console.log(formatResults(results));
  } catch (err) {
    console.error('Exa search failed: ' + err.message);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main(process.argv.slice(2));
}
