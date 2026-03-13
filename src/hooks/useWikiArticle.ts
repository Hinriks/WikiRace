import { useState, useCallback } from 'react';

export interface WikiResult {
  html: string;
  title: string;
}

// Module-level promise cache — shared across all hook instances and component mounts.
// Stores the in-flight or resolved promise so concurrent callers share one request.
// Failed fetches are evicted so the next caller retries fresh.
const cache = new Map<string, Promise<WikiResult | null>>();

function doFetch(title: string): Promise<WikiResult | null> {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    format: 'json',
    origin: '*',
    prop: 'text|displaytitle',
    disableeditsection: '1',
    redirects: '1',
  });
  return fetch(`https://en.wikipedia.org/w/api.php?${params}`)
    .then(res => {
      if (!res.ok) throw new Error('Network error');
      return res.json();
    })
    .then((data): WikiResult => {
      if (data.error) throw new Error(data.error.info || 'Article not found');
      return { html: data.parse.text['*'], title: data.parse.title };
    })
    .catch(err => {
      // Evict on failure so the next real fetch retries
      cache.delete(title);
      throw err;
    });
}

function getOrFetch(title: string): Promise<WikiResult | null> {
  if (!cache.has(title)) {
    cache.set(title, doFetch(title));
  }
  // biome-ignore lint/style/noNonNullAssertion: set above
  return cache.get(title)!;
}

/** Fire-and-forget: warm the cache while the home screen is visible. */
export function prefetchArticle(title: string): void {
  getOrFetch(title).catch(() => {/* evicted by doFetch on failure */});
}

export function useWikiArticle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = useCallback(async (title: string): Promise<WikiResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await getOrFetch(title);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchArticle };
}
