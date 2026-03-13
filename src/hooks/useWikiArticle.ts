import { useState, useCallback } from 'react';

export interface WikiResult {
  html: string;
  title: string;
}

export function useWikiArticle() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchArticle = useCallback(async (title: string): Promise<WikiResult | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        action: 'parse',
        page: title,
        format: 'json',
        origin: '*',
        prop: 'text|displaytitle',
        disableeditsection: '1',
        redirects: '1',
      });
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      if (data.error) throw new Error(data.error.info || 'Article not found');
      return {
        html: data.parse.text['*'],
        title: data.parse.title,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchArticle };
}
