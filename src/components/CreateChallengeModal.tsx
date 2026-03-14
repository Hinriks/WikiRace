import { useState, useRef, useCallback } from 'react';
import styles from './CreateChallengeModal.module.css';

interface ArticleFieldProps {
  label: string;
  placeholder: string;
  onConfirm: (title: string) => void;
  onClear: () => void;
}

function ArticleField({ label, placeholder, onConfirm, onClear }: ArticleFieldProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searching, setSearching] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams({
        action: 'opensearch',
        search: q,
        limit: '6',
        namespace: '0',
        format: 'json',
        origin: '*',
      });
      const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
      const data = await res.json();
      const results: string[] = data[1] ?? [];
      setSuggestions(results);
      setOpen(results.length > 0);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (confirmed) {
      setConfirmed(false);
      onClear();
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 280);
  };

  const selectSuggestion = (title: string) => {
    setQuery(title);
    setConfirmed(true);
    setSuggestions([]);
    setOpen(false);
    onConfirm(title);
  };

  const handleBlur = () => {
    // Small delay so onMouseDown on suggestions fires before blur closes the list
    setTimeout(() => setOpen(false), 160);
  };

  const inputId = `article-field-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={inputId}>{label}</label>
      <div className={styles.inputRow}>
        <input
          id={inputId}
          className={`${styles.input} ${confirmed ? styles.inputConfirmed : ''}`}
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
        {confirmed && <span className={styles.check}>✓</span>}
        {searching && <span className={styles.spinner} />}
      </div>
      {open && suggestions.length > 0 && (
        <ul className={styles.dropdown}>
          {suggestions.map(title => (
            <li key={title}>
              <button
                type="button"
                className={styles.suggestion}
                onMouseDown={() => selectSuggestion(title)}
              >
                {title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface Props {
  onClose: () => void;
}

export function CreateChallengeModal({ onClose }: Props) {
  const [startArticle, setStartArticle] = useState('');
  const [endArticle, setEndArticle] = useState('');
  const [copied, setCopied] = useState(false);

  const sameArticle = startArticle && endArticle && startArticle === endArticle;
  const canGenerate = !!(startArticle && endArticle && !sameArticle);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    const url = `${window.location.origin}?from=${encodeURIComponent(startArticle)}&to=${encodeURIComponent(endArticle)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.overlayClose}
        onClick={onClose}
        aria-label="Close"
      />
      <div className={styles.modal} role="dialog" aria-label="Create a challenge">
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
          ✕
        </button>

        <h2 className={styles.title}>Create a challenge</h2>
        <p className={styles.subtitle}>
          Pick a start and target article. Share the link — friends race the same route.
        </p>

        <div className={styles.fields}>
          <ArticleField
            label="Start article"
            placeholder="e.g. Pizza"
            onConfirm={setStartArticle}
            onClear={() => setStartArticle('')}
          />

          <div className={styles.connector} aria-hidden="true">
            <svg width="16" height="40" viewBox="0 0 16 40" fill="none" role="img">
              <title>arrow down</title>
              <path d="M8 0 L8 32" stroke="var(--border-strong)" strokeWidth="1.5" strokeDasharray="3 3"/>
              <path d="M3 28 L8 36 L13 28" stroke="var(--border-strong)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <ArticleField
            label="Target article"
            placeholder="e.g. Samurai"
            onConfirm={setEndArticle}
            onClear={() => setEndArticle('')}
          />
        </div>

        {sameArticle && (
          <p className={styles.errorMsg}>Start and target must be different articles.</p>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            {copied ? (
              <><span className={styles.btnIcon}>✓</span> Link copied!</>
            ) : (
              <><span className={styles.btnIcon}>⚑</span> Copy challenge link</>
            )}
          </button>

          <button
            type="button"
            className={styles.playBtn}
            disabled={!canGenerate}
            onClick={() => {
              if (!canGenerate) return;
              window.location.href = `${window.location.origin}?from=${encodeURIComponent(startArticle)}&to=${encodeURIComponent(endArticle)}`;
            }}
          >
            Play it yourself →
          </button>
        </div>
      </div>
    </div>
  );
}
