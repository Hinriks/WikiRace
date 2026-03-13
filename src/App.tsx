import { useState, useCallback } from 'react';
import { HomeScreen } from './components/HomeScreen';
import { GameScreen } from './components/GameScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { useTodaysPuzzle, getTodayUTC } from './hooks/useTodaysPuzzle';
import { getStreak, updateStreak } from './hooks/useStreak';
import type { Screen, GameResult } from './types';

const STORAGE_KEY = 'wikirace_v1';

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
  const { puzzle, loading } = useTodaysPuzzle();
  const storedResult = getStoredResult();

  const [screen, setScreen] = useState<Screen>(storedResult ? 'result' : 'home');
  const [gameResult, setGameResult] = useState<GameResult | null>(storedResult);
  const [streak, setStreak] = useState(() => getStreak());

  const handleStart = useCallback(() => {
    setScreen('game');
  }, []);

  const handleGameEnd = useCallback((result: GameResult) => {
    storeResult(result);
    setStreak(updateStreak(result.won));
    setGameResult(result);
    setScreen('result');
  }, []);

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

  if (screen === 'home') {
    return <HomeScreen puzzle={puzzle} onStart={handleStart} streak={streak} />;
  }

  if (screen === 'game') {
    return <GameScreen puzzle={puzzle} onEnd={handleGameEnd} />;
  }

  if (screen === 'result' && gameResult) {
    return <ResultsScreen puzzle={puzzle} result={gameResult} streak={streak} />;
  }

  return null;
}
