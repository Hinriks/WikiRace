import { TwitterApi } from 'twitter-api-v2';
import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_TOKEN_SECRET',
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

const twitter = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

function getTodayUTC() {
  return new Date().toISOString().split('T')[0];
}

function getPuzzleNumber(dateStr) {
  const start = new Date('2026-03-13T00:00:00Z');
  const today = new Date(`${dateStr}T00:00:00Z`);
  const diffDays = Math.round((today - start) / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

async function main() {
  const today = getTodayUTC();
  console.log(`Fetching puzzle for ${today}...`);

  const { data: puzzle, error } = await supabase
    .from('daily_puzzles')
    .select('start_article, end_article')
    .eq('date', today)
    .single();

  if (error || !puzzle) {
    console.error('No puzzle found for today:', today, error?.message);
    process.exit(1);
  }

  const puzzleNum = getPuzzleNumber(today);

  const tweet = [
    `WikiRace #${puzzleNum}`,
    ``,
    `Today: ${puzzle.start_article} → ${puzzle.end_article}`,
    ``,
    `Navigate Wikipedia from one article to the other using only links. Free, no account needed.`,
    ``,
    `Play → wikirace.io/?utm_source=twitter`,
  ].join('\n');

  console.log('Posting tweet:\n', tweet);

  await twitter.v2.tweet(tweet);
  console.log('Tweet posted successfully.');
}

main().catch((err) => {
  console.error('Failed to post tweet:', err?.message || err);
  process.exit(1);
});
