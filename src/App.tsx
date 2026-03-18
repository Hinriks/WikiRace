import { useState, useCallback, useEffect } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { DevPanel } from './components/DevPanel';
import { useTodaysPuzzle, getTodayUTC } from './hooks/useTodaysPuzzle';
import { getStreak, updateStreak } from './hooks/useStreak';
import { updateStats } from './hooks/useStats';
import { prefetchArticle } from './hooks/useWikiArticle';
import type { Screen, GameResult, Puzzle } from './types';

const STORAGE_KEY = 'wikirace_v1';

// Parse ?from=X&to=Y once at load time — null when not a custom challenge
const _urlParams = new URLSearchParams(window.location.search);
const _f = _urlParams.get('from')?.trim() || null;
const _t = _urlParams.get('to')?.trim() || null;
const UTM_SOURCE = _urlParams.get('utm_source')?.trim() || undefined;
const CUSTOM_PUZZLE: Puzzle | null = (_f && _t)
  ? { id: 0, date: '', start_article: _f, end_article: _t }
  : null;
const IS_CUSTOM = CUSTOM_PUZZLE !== null;

function getStoredResult(): GameResult | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const today = getTodayUTC();
    return data[today] ?? null;
  } catch {
    return null;
  }
}

function storeResult(result: GameResult) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[getTodayUTC()] = result;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export default function App() {
  const { puzzle: dailyPuzzle, loading: dailyLoading } = useTodaysPuzzle();

  // For custom challenges, build the puzzle immediately from URL params
  const puzzle: Puzzle | null = CUSTOM_PUZZLE ?? dailyPuzzle;
  const loading = IS_CUSTOM ? false : dailyLoading;

  const [screen, setScreen] = useState<Screen>(() => {
    if (IS_CUSTOM) return 'home';
    const stored = getStoredResult();
    return stored ? 'result' : 'home';
  });
  const [gameResult, setGameResult] = useState<GameResult | null>(() =>
    IS_CUSTOM ? null : getStoredResult()
  );
  const [streak, setStreak] = useState(() => getStreak());

  const handleStart = useCallback(() => {
    setScreen('game');
  }, []);

  const handleGameEnd = useCallback((result: GameResult) => {
    if (!IS_CUSTOM) {
      storeResult(result);
      setStreak(updateStreak(result.won));
      if (puzzle) updateStats(result, puzzle);
    }
    setGameResult(result);
    setScreen('result');
  }, [puzzle]);

  const handlePlayAgain = useCallback(() => {
    setGameResult(null);
    setScreen('home');
  }, []);

  // Warm the article cache while the player is on the home screen
  useEffect(() => {
    if (puzzle && screen === 'home') {
      prefetchArticle(puzzle.start_article);
    }
  }, [puzzle, screen]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="logo">WikiRace</div>
        <div className="spinner" />
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="app-loading">
        <div className="logo">WikiRace</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          No puzzle today. Check back soon!
        </p>
      </div>
    );
  }

  const devPanel = import.meta.env.DEV && (
    <DevPanel
      screen={screen}
      setScreen={setScreen}
      gameResult={gameResult}
      setGameResult={setGameResult}
      streak={streak}
      setStreak={setStreak}
      puzzle={puzzle}
    />
  );

  if (screen === 'home') {
    return <>{<HomeScreen puzzle={puzzle} onStart={handleStart} streak={streak} isCustom={IS_CUSTOM} />}{devPanel}</>;
  }

  if (screen === 'game') {
    return <><GameScreen puzzle={puzzle} onEnd={handleGameEnd} />{devPanel}</>;
  }

  if (screen === 'result' && gameResult) {
    return <><ResultsScreen puzzle={puzzle} result={gameResult} streak={streak} isCustom={IS_CUSTOM} source={UTM_SOURCE} onPlayAgain={IS_CUSTOM ? handlePlayAgain : undefined} />{devPanel}</>;
  }

  return <>{devPanel}</>;
}
