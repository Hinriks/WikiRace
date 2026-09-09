/**
 * validate_puzzles.mjs
 *
 * Checks all future WikiRace puzzles against the Wikipedia API.
 *
 * Detects:
 *   REDIRECT       — stored title is a redirect; canonical target is known
 *   DISAMBIGUATION — page is a disambiguation hub, not a real article
 *   MISSING        — page does not exist on Wikipedia at all
 *
 * Usage:
 *   node .github/scripts/validate_puzzles.mjs          # report only
 *   node .github/scripts/validate_puzzles.mjs --fix    # auto-fix issues
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Load .env and .env.local from project root
// ---------------------------------------------------------------------------

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..', '..');

function loadEnvFile(path) {
  try {
    const lines = readFileSync(path, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      const value = rest.join('=').trim().replace(/^["']|["']$/g, '');
      if (!(key.trim() in process.env)) process.env[key.trim()] = value;
    }
  } catch {
    // file doesn't exist — fine
  }
}

loadEnvFile(resolve(root, '.env'));
loadEnvFile(resolve(root, '.env.local'));

// Map VITE_SUPABASE_URL → SUPABASE_URL if not already set
if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
  process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_KEY;
const OPENAI_KEY       = process.env.OPENAI_API_KEY ?? '';
const WIKI_API         = 'https://en.wikipedia.org/w/api.php';
const FIX_MODE         = process.argv.includes('--fix');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------------------------------------------------------------------------
// Wikipedia
// ---------------------------------------------------------------------------

/**
 * Check up to 50 titles at once.
 * Returns a Map of lowerCasedTitle -> { status, canonical }
 *   status: 'ok' | 'redirect' | 'disambiguation' | 'missing'
 */
async function wikiCheckTitles(titles) {
  const params = new URLSearchParams({
    action: 'query',
    prop: 'info|pageprops',
    redirects: '1',
    format: 'json',
    origin: '*',
    titles: titles.join('|'),
  });

  const res = await fetch(`${WIKI_API}?${params}`, {
    headers: { 'User-Agent': 'WikiRace-PuzzleValidator/1.0' },
  });
  const data = await res.json();
  const query = data.query ?? {};

  // redirect map: lower-cased input -> canonical target
  const redirectMap = new Map();
  for (const r of query.redirects ?? []) {
    redirectMap.set(r.from.toLowerCase(), r.to);
  }

  // normalisation map
  const normaliseMap = new Map();
  for (const n of query.normalized ?? []) {
    normaliseMap.set(n.from.toLowerCase(), n.to);
  }

  // index results by lower-cased canonical title
  const byCanonical = new Map();
  for (const page of Object.values(query.pages ?? {})) {
    const canonical = page.title ?? '';
    if ('missing' in page) {
      byCanonical.set(canonical.toLowerCase(), { status: 'missing', canonical: null });
    } else if (page.pageprops?.disambiguation !== undefined) {
      byCanonical.set(canonical.toLowerCase(), { status: 'disambiguation', canonical });
    } else {
      byCanonical.set(canonical.toLowerCase(), { status: 'ok', canonical });
    }
  }

  const output = new Map();
  for (const title of titles) {
    const key = title.toLowerCase();

    if (redirectMap.has(key)) {
      const target = redirectMap.get(key);
      const targetInfo = byCanonical.get(target.toLowerCase()) ?? { status: 'ok', canonical: target };
      if (targetInfo.status === 'disambiguation') {
        output.set(key, { status: 'disambiguation', canonical: target });
      } else if (targetInfo.status === 'missing') {
        output.set(key, { status: 'missing', canonical: null });
      } else {
        output.set(key, { status: 'redirect', canonical: target });
      }
      continue;
    }

    const normKey = normaliseMap.get(key)?.toLowerCase() ?? key;
    output.set(key, byCanonical.get(normKey) ?? { status: 'missing', canonical: null });
  }

  return output;
}

async function wikiVerifyTitle(title) {
  const results = await wikiCheckTitles([title]);
  const info = results.get(title.toLowerCase());
  return info?.status === 'ok' ? info.canonical : null;
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

async function openaiSuggestReplacement(badTitle, reason, role, otherTitle) {
  if (!OPENAI_KEY) return null;

  const otherRole = role === 'start' ? 'end' : 'start';
  const prompt =
    `The WikiRace puzzle has a ${role} article titled "${badTitle}" ` +
    `which cannot be used because it is a ${reason} page on Wikipedia.\n\n` +
    `The other article in this puzzle (the ${otherRole}) is "${otherTitle}".\n\n` +
    `Please suggest a replacement Wikipedia article that:\n` +
    `1. Is a real, standalone English Wikipedia article (not a redirect, not a disambiguation page, not a list page).\n` +
    `2. Is well-known and recognisable to a general audience.\n` +
    `3. Is on a similar topic to the original title if possible.\n` +
    `4. Is NOT the same as the other article in the puzzle.\n\n` +
    `Respond with ONLY the exact Wikipedia article title. No explanation, no markdown.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    console.error(`  [OpenAI error] ${res.status}: ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Fetching puzzles from ${today} onwards...`);

  const { data: rows, error } = await supabase
    .from('daily_puzzles')
    .select('id, date, start_article, end_article')
    .gte('date', today)
    .order('date', { ascending: true });

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  if (!rows?.length) {
    console.log('No future puzzles found.');
    return;
  }

  console.log(`Found ${rows.length} puzzle(s) to validate.\n`);

  // Collect unique titles
  const allTitles = [...new Set(rows.flatMap(r => [r.start_article, r.end_article]))];

  // Query Wikipedia in batches of 50
  const wikiResults = new Map();
  const batchSize = 50;
  for (let i = 0; i < allTitles.length; i += batchSize) {
    const batch = allTitles.slice(i, i + batchSize);
    console.log(`Checking Wikipedia batch ${Math.floor(i / batchSize) + 1} (${batch.length} titles)...`);
    const results = await wikiCheckTitles(batch);
    for (const [k, v] of results) wikiResults.set(k, v);
    if (i + batchSize < allTitles.length) await sleep(500);
  }

  console.log('');

  // Find issues
  const issues = [];
  for (const row of rows) {
    for (const field of ['start_article', 'end_article']) {
      const title = row[field];
      const info = wikiResults.get(title.toLowerCase()) ?? { status: 'missing', canonical: null };
      if (info.status !== 'ok') {
        issues.push({ ...info, puzzleId: row.id, date: row.date, field, title, row });
      }
    }
  }

  if (!issues.length) {
    console.log('All puzzles look good!');
    return;
  }

  console.log(`Found ${issues.length} issue(s):\n`);
  for (const issue of issues) {
    const hint = issue.status === 'redirect' ? ` → "${issue.canonical}"` : '';
    console.log(`  [${issue.status.toUpperCase()}] ${issue.date} | ${issue.field}: "${issue.title}"${hint}`);
  }

  if (!FIX_MODE) {
    console.log('\nRun with --fix to auto-fix issues.');
    process.exit(1);
  }

  console.log('\nApplying fixes...\n');

  let fixed = 0;
  const unfixable = [];

  for (const issue of issues) {
    const { puzzleId, date, field, title, status, row } = issue;
    const otherField = field === 'start_article' ? 'end_article' : 'start_article';
    const role = field === 'start_article' ? 'start' : 'end';

    if (status === 'redirect') {
      const newTitle = issue.canonical;
      console.log(`  [AUTO-FIX REDIRECT] ${date} | ${field}: "${title}" → "${newTitle}"`);
      const { error } = await supabase
        .from('daily_puzzles')
        .update({ [field]: newTitle })
        .eq('id', puzzleId);
      if (error) {
        console.error(`    ERROR: ${error.message}`);
        unfixable.push(issue);
      } else {
        fixed++;
      }
      continue;
    }

    // disambiguation or missing — ask OpenAI
    const suggestion = await openaiSuggestReplacement(title, status, role, row[otherField]);
    if (!suggestion) {
      console.log(`  [UNFIXABLE] ${date} | ${field}: "${title}" — no OpenAI suggestion`);
      unfixable.push(issue);
      continue;
    }

    await sleep(300);
    const verified = await wikiVerifyTitle(suggestion);
    if (!verified) {
      console.log(`  [UNFIXABLE] ${date} | ${field}: "${title}" — OpenAI suggested "${suggestion}" but it failed Wikipedia check`);
      unfixable.push(issue);
      continue;
    }

    console.log(`  [AI-FIX ${status.toUpperCase()}] ${date} | ${field}: "${title}" → "${verified}"`);
    const { error } = await supabase
      .from('daily_puzzles')
      .update({ [field]: verified })
      .eq('id', puzzleId);
    if (error) {
      console.error(`    ERROR: ${error.message}`);
      unfixable.push(issue);
    } else {
      fixed++;
    }
  }

  console.log(`\nSummary: ${fixed} fixed, ${unfixable.length} need manual attention.`);

  if (unfixable.length) {
    console.log('\nPuzzles requiring manual attention:');
    for (const issue of unfixable) {
      console.log(`  ${issue.date} | ${issue.field}: "${issue.title}" [${issue.status.toUpperCase()}]`);
    }
    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
