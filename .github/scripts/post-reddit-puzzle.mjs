import Snoowrap from 'snoowrap';
import { createClient } from '@supabase/supabase-js';

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_USERNAME',
  'REDDIT_PASSWORD',
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

const reddit = new Snoowrap({
  userAgent: 'WikiRaceBot/1.0 (by /u/WikiRaceBot)',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
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
  const { start_article, end_article } = puzzle;

  const title = `WikiRace #${puzzleNum} — ${start_article} → ${end_article}`;

  const body = [
    `Today's puzzle is live! Navigate from **${start_article}** to **${end_article}** using only Wikipedia links.`,
    ``,
    `🔗 Play here → [wikirace.io](https://wikirace.io/?utm_source=reddit)`,
    ``,
    `---`,
    ``,
    `**Drop your score in the comments!** How many clicks did it take you, and what path did you find? Mark your solution as a spoiler so you don't ruin it for anyone who hasn't played yet — use \`>!your path here!<\` to hide it.`,
    ``,
    `Free to play, no account needed. Good luck!`,
  ].join('\n');

  console.log('Posting to r/wikiraceio...');
  console.log('Title:', title);

  await reddit.getSubreddit('wikiraceio').submitSelfpost({ title, text: body });

  console.log('Reddit post submitted successfully.');
}

main().catch((err) => {
  console.error('Failed to post to Reddit:', err?.message || err);
  process.exit(1);
});
