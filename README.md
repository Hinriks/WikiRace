# WikiRace

A daily Wikipedia link-racing game. Navigate from a start article to a target article using only internal Wikipedia links. Reach the target in as few clicks as possible.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. In the SQL Editor, run the contents of `supabase/schema.sql` — this creates the tables, enables RLS, adds policies, and seeds 60 daily puzzles
3. Copy your project URL and anon key from **Settings → API**

### 3. Configure environment variables

Create a `.env.local` file (or edit the existing one):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Without these, the app falls back to hardcoded puzzles and runs fully offline.

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy

**Vercel** (recommended):
1. Push to GitHub
2. Import the repo on [vercel.com](https://vercel.com)
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in project settings → Environment Variables
4. Deploy

**Netlify**:
Same process — add env vars in Site settings → Environment variables.

## Adding more puzzles

Run this SQL in the Supabase SQL Editor:

```sql
insert into daily_puzzles (date, start_article, end_article) values
  ('2026-06-01', 'Your Start Article', 'Your End Article');
```

Dates must be unique. The app fetches today's puzzle by UTC date.

## Tech stack

- React + Vite + TypeScript
- Supabase (PostgreSQL + REST)
- Wikipedia MediaWiki API
- canvas-confetti

## Project structure

```
src/
├── App.tsx                   — Screen routing, localStorage state
├── types.ts                  — Shared TypeScript types
├── lib/supabase.ts           — Supabase client
├── data/fallbackPuzzles.ts   — Offline fallback puzzle list
├── hooks/
│   ├── useTimer.ts           — Precise timer using requestAnimationFrame
│   ├── useWikiArticle.ts     — Wikipedia MediaWiki API fetcher
│   └── useTodaysPuzzle.ts    — Fetches today's puzzle from Supabase
├── components/
│   ├── HomeScreen.tsx        — Start screen with challenge display
│   ├── GameScreen.tsx        — Main game: article viewer + nav bar
│   ├── ResultsScreen.tsx     — End screen with stats + share
│   └── ArticleView.tsx       — Renders Wikipedia HTML, intercepts links
└── styles/article.css        — Scoped Wikipedia content styles
```
