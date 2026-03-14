import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import type { Puzzle, GameResult } from '../types';
import { getPuzzleNumber, getTodayUTC } from '../hooks/useTodaysPuzzle';
import { CreateChallengeModal } from './CreateChallengeModal';
import styles from './ResultsScreen.module.css';

interface Props {
  puzzle: Puzzle;
  result: GameResult;
  streak?: number;
  isCustom?: boolean;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return `${s}.${ms}s`;
}

function formatShareTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
  return `0:${String(s).padStart(2, '0')}`;
}

function buildChallengeUrl(puzzle: Puzzle): string {
  return `${window.location.origin}?from=${encodeURIComponent(puzzle.start_article)}&to=${encodeURIComponent(puzzle.end_article)}`;
}

function buildShareText(puzzle: Puzzle, result: GameResult, isCustom: boolean): string {
  const siteUrl = isCustom ? buildChallengeUrl(puzzle) : window.location.origin;
  const header = isCustom ? 'WikiRace Custom Challenge' : `WikiRace #${getPuzzleNumber()}`;
  const lines = [
    header,
    `${puzzle.start_article} → ${puzzle.end_article}`,
    result.won
      ? `${result.clicks} click${result.clicks !== 1 ? 's' : ''} · ${formatShareTime(result.timeSeconds)}`
      : `Gave up after ${result.clicks} click${result.clicks !== 1 ? 's' : ''}`,
    ``,
    siteUrl,
  ];
  return lines.join('\n');
}

export function ResultsScreen({ puzzle, result, streak = 0, isCustom = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const confettiFired = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on mount only
  useEffect(() => {
    if (result.won && !confettiFired.current) {
      confettiFired.current = true;
      // First burst
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.5 },
        colors: ['#D63E1F', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'],
      });
      // Second burst with delay
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#D63E1F', '#F59E0B', '#10B981'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#D63E1F', '#F59E0B', '#10B981'],
        });
      }, 300);
    }

    // Submit result to Supabase (fire and forget)
    if (result.won && !submitted) {
      setSubmitted(true);
      const hasConfig =
        import.meta.env.VITE_SUPABASE_URL &&
        import.meta.env.VITE_SUPABASE_ANON_KEY &&
        !import.meta.env.VITE_SUPABASE_URL.includes('your_supabase');

      if (hasConfig) {
        supabase.from('results').insert({
          puzzle_date: getTodayUTC(),
          clicks: result.clicks,
          time_seconds: parseFloat(result.timeSeconds.toFixed(2)),
          path: result.path,
        }).then(() => {
          // Silent — we don't show submission status to the user
        });
      }
    }
  }, []);

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  const handleShare = async () => {
    await copyToClipboard(buildShareText(puzzle, result, isCustom));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareChallenge = async () => {
    await copyToClipboard(buildChallengeUrl(puzzle));
    setCopiedChallenge(true);
    setTimeout(() => setCopiedChallenge(false), 2500);
  };

  const puzzleNum = getPuzzleNumber();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logo}>WikiRace</div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          {/* Status heading */}
          <div className={styles.status}>
            {result.won ? (
              <>
                <div className={styles.statusIcon}>✓</div>
                <h1 className={styles.statusTitle}>You made it!</h1>
                <p className={styles.statusSub}>
                  {isCustom ? 'Custom challenge complete' : `Puzzle #${puzzleNum} complete`}
                </p>
                {!isCustom && streak > 0 && (
                  <div className={styles.streakPill}>{streak >= 3 && '🔥 '}{streak} day streak</div>
                )}
              </>
            ) : (
              <>
                <div className={`${styles.statusIcon} ${styles.statusIconGiveUp}`}>✕</div>
                <h1 className={styles.statusTitle}>Better luck next time</h1>
                <p className={styles.statusSub}>
                  {isCustom ? 'Custom challenge — you gave up' : `Puzzle #${puzzleNum} — you gave up`}
                </p>
              </>
            )}
          </div>

          {/* Route */}
          <div className={styles.route}>
            <span className={styles.routeStart}>{puzzle.start_article}</span>
            <span className={styles.routeArrow}>→</span>
            <span className={styles.routeEnd}>{puzzle.end_article}</span>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{result.clicks}</span>
              <span className={styles.statLabel}>clicks</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statNum}>{formatTime(result.timeSeconds)}</span>
              <span className={styles.statLabel}>time</span>
            </div>
          </div>

          {/* Path taken */}
          <div className={styles.pathSection}>
            <div className={styles.pathLabel}>Your path</div>
            <div className={styles.path}>
              {result.path.map((title, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: path steps can repeat the same article
                <span key={i} className={styles.pathItem}>
                  {i > 0 && <span className={styles.pathSep}>→</span>}
                  <span className={i === result.path.length - 1 && result.won ? styles.pathFinal : styles.pathNode}>
                    {title}
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <button type="button" className={styles.shareBtn} onClick={handleShare}>
              {copied ? (
                <>
                  <span className={styles.shareIcon}>✓</span>
                  Copied to clipboard!
                </>
              ) : (
                <>
                  <span className={styles.shareIcon}>⬡</span>
                  Share result
                </>
              )}
            </button>
            {isCustom && (
              <button type="button" className={styles.shareThisBtn} onClick={handleShareChallenge}>
                {copiedChallenge ? (
                  <><span className={styles.shareIcon}>✓</span> Link copied!</>
                ) : (
                  <><span className={styles.shareIcon}>⚑</span> Share this challenge</>
                )}
              </button>
            )}
            <button type="button" className={styles.challengeBtn} onClick={() => setShowCreateChallenge(true)}>
              <span className={styles.shareIcon}>+</span>
              Create custom challenge
            </button>
          </div>
        </div>

        {!isCustom && (
          <p className={styles.comeback}>
            Come back tomorrow for a new puzzle.
          </p>
        )}
      </main>

      {showCreateChallenge && (
        <CreateChallengeModal onClose={() => setShowCreateChallenge(false)} />
      )}
    </div>
  );
}
