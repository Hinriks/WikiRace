import { useState, useCallback } from 'react';
import type { Puzzle } from '../types';

const MIN_ARTICLE_LENGTH = 15000; // bytes — filters out stubs and very short articles
const BAD_PREFIXES = ['List of', 'Lists of', 'Index of', 'Outline of'];
const BAD_SUFFIXES = ['(disambiguation)'];

interface WikiPage {
  title: string;
  length: number;
}

function isGoodArticle(page: WikiPage): boolean {
  return page.length >= MIN_ARTICLE_LENGTH
      && !BAD_PREFIXES.some(p => page.title.startsWith(p))
      && !BAD_SUFFIXES.some(s => page.title.endsWith(s));
}

async function fetchCandidates(): Promise<string[]> {
  const url =
    'https://en.wikipedia.org/w/api.php?action=query&generator=random' +
    '&grnnamespace=0&grnlimit=50&grnfilterredir=nonredirects&prop=info&format=json&origin=*';
  const res = await fetch(url);
  const data = await res.json();
  const pages: WikiPage[] = Object.values(data.query.pages as Record<string, WikiPage>);
  return pages.filter(isGoodArticle).map(p => p.title);
}

// Retries up to MAX_ATTEMPTS times, accumulating candidates across rounds until we have 2
const MAX_ATTEMPTS = 3;

async function fetchTwoRandomArticles(): Promise<[string, string]> {
  const collected: string[] = [];
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const batch = await fetchCandidates();
    for (const title of batch) {
      if (!collected.includes(title)) collected.push(title);
      if (collected.length >= 2) return [collected[0], collected[1]];
    }
  }
  throw new Error('Could not find enough valid articles after retries');
}

export function useRandomPuzzle() {
  const [loading, setLoading] = useState(false);

  const fetchRandomPuzzle = useCallback(async (): Promise<Puzzle> => {
    setLoading(true);
    try {
      const [start, end] = await fetchTwoRandomArticles();
      return { id: 0, date: '', start_article: start, end_article: end };
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchRandomPuzzle, randomLoading: loading };
}
