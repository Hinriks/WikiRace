import { useState, useCallback } from 'react';
import type { Screen, GameResult, Puzzle } from '../types';
import { getTodayUTC } from '../hooks/useTodaysPuzzle';
import styles from './DevPanel.module.css';

const STORAGE_KEY = 'wikirace_v1';

interface Props {
  screen: Screen;
  setScreen: (s: Screen) => void;
  gameResult: GameResult | null;
  setGameResult: (r: GameResult | null) => void;
  streak: number;
  setStreak: (n: number) => void;
  puzzle: Puzzle;
}

function readStorage(): string {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.stringify(JSON.parse(raw), null, 2) : '{}';
  } catch {
    return '{}';
  }
}

export function DevPanel({ screen, setScreen, gameResult, setGameResult, streak, setStreak, puzzle }: Props) {
  const [open, setOpen] = useState(false);
  const [storageRaw, setStorageRaw] = useState('');
  const [storageError, setStorageError] = useState<string | null>(null);
  const [streakInput, setStreakInput] = useState(String(streak));

  const openPanel = useCallback(() => {
    setStorageRaw(readStorage());
    setStreakInput(String(streak));
    setStorageError(null);
    setOpen(true);
  }, [streak]);

  const closePanel = useCallback(() => setOpen(false), []);

  const navigateTo = useCallback((s: Screen) => {
    if (s === 'result' && !gameResult) {
      // Auto-create a mock win so the result screen has data to show
      const mock: GameResult = {
        clicks: 4,
        timeSeconds: 52,
        path: [puzzle.start_article, 'Intermediate Article', 'Another Step', puzzle.end_article],
        won: true,
      };
      const data = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; } })();
      data[getTodayUTC()] = mock;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setGameResult(mock);
      setStorageRaw(JSON.stringify(data, null, 2));
    }
    setScreen(s);
  }, [gameResult, puzzle, setScreen, setGameResult]);

  const clearToday = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      delete data[getTodayUTC()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setGameResult(null);
      setStorageRaw(JSON.stringify(data, null, 2));
    } catch {}
  }, [setGameResult]);

  const setMockResult = useCallback((won: boolean) => {
    const result: GameResult = {
      clicks: won ? 4 : 9,
      timeSeconds: won ? 52 : 187,
      path: won
        ? [puzzle.start_article, 'Intermediate Article', 'Another Step', puzzle.end_article]
        : [puzzle.start_article, 'Dead End', 'Another Dead End'],
      won,
    };
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      data[getTodayUTC()] = result;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStorageRaw(JSON.stringify(data, null, 2));
    } catch {}
    setGameResult(result);
    setScreen('result');
  }, [puzzle, setGameResult, setScreen]);

  const applyStreak = useCallback(() => {
    const count = parseInt(streakInput, 10);
    if (Number.isNaN(count) || count < 0) return;
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      const today = getTodayUTC();
      data['_streak'] = { count, lastWonDate: today, lastPlayedDate: today };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setStreak(count);
      setStorageRaw(JSON.stringify(data, null, 2));
    } catch {}
  }, [streakInput, setStreak]);

  const saveStorage = useCallback(() => {
    try {
      const parsed = JSON.parse(storageRaw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      setStorageError(null);
    } catch {
      setStorageError('Invalid JSON — not saved');
    }
  }, [storageRaw]);

  const resetStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setStorageRaw('{}');
    setGameResult(null);
    setStreak(0);
    setStorageError(null);
  }, [setGameResult, setStreak]);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={openPanel} aria-label="Open dev tools" title="Dev tools">
        {'</>'}
      </button>

      {open && (
        <div className={styles.backdrop}>
          <button
            type="button"
            className={styles.backdropClose}
            onClick={closePanel}
            aria-label="Close dev panel"
          />
          <div
            className={styles.panel}
            role="dialog"
            aria-label="Dev tools panel"
          >
            <div className={styles.panelHeader}>
              <span className={styles.panelTitle}>Dev Panel</span>
              <button type="button" className={styles.closeBtn} onClick={closePanel} aria-label="Close">✕</button>
            </div>

            {/* Screen navigation */}
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Screen</div>
              <div className={styles.chipRow}>
                {(['home', 'game', 'result'] as Screen[]).map(s => (
                  <button
                    type="button"
                    key={s}
                    className={`${styles.chip} ${screen === s ? styles.chipActive : ''}`}
                    onClick={() => navigateTo(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className={styles.hint}>
                Current puzzle: <em>{puzzle.start_article}</em> → <em>{puzzle.end_article}</em>
              </div>
            </section>

            {/* Quick actions */}
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Quick actions</div>
              <div className={styles.chipRow}>
                <button type="button" className={styles.chip} onClick={clearToday}>Clear today</button>
                <button type="button" className={styles.chip} onClick={() => setMockResult(true)}>Mock win</button>
                <button type="button" className={styles.chip} onClick={() => setMockResult(false)}>Mock loss</button>
              </div>
            </section>

            {/* Streak */}
            <section className={styles.section}>
              <div className={styles.sectionLabel}>Streak (current: {streak})</div>
              <div className={styles.inlineRow}>
                <input
                  className={styles.numberInput}
                  type="number"
                  min={0}
                  value={streakInput}
                  onChange={e => setStreakInput(e.target.value)}
                />
                <button type="button" className={styles.chip} onClick={applyStreak}>Apply</button>
              </div>
            </section>

            {/* LocalStorage editor */}
            <section className={`${styles.section} ${styles.storageSection}`}>
              <div className={styles.storageHeader}>
                <span className={styles.sectionLabel}>localStorage · wikirace_v1</span>
                <button type="button" className={styles.iconBtn} onClick={() => setStorageRaw(readStorage())} title="Refresh">↻</button>
              </div>
              {storageError && <div className={styles.error}>{storageError}</div>}
              <textarea
                className={styles.editor}
                value={storageRaw}
                onChange={e => setStorageRaw(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
              <div className={styles.editorActions}>
                <button type="button" className={`${styles.chip} ${styles.chipDanger}`} onClick={resetStorage}>Reset all</button>
                <button type="button" className={`${styles.chip} ${styles.chipSave}`} onClick={saveStorage}>Save</button>
              </div>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
