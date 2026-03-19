import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import type { Puzzle, GameResult } from '../types';
import { getPuzzleNumber, getTodayUTC } from '../hooks/useTodaysPuzzle';
import { useDailyStats } from '../hooks/useDailyStats';
import { CreateChallengeModal } from './CreateChallengeModal';
import { StatsModal } from './StatsModal';
import styles from './ResultsScreen.module.css';

interface Props {
  puzzle: Puzzle;
  result: GameResult;
  streak?: number;
  isCustom?: boolean;
  isRandom?: boolean;
  source?: string;
  onPlayAgain?: () => void;
  onPlayAnotherRandom?: () => void;
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

function buildShareText(puzzle: Puzzle, result: GameResult, isCustom: boolean, isRandom: boolean): string {
  const siteUrl = isCustom ? buildChallengeUrl(puzzle) : window.location.origin;
  const header = isCustom ? 'WikiRace Custom Challenge' : isRandom ? 'WikiRace Random Challenge' : `WikiRace #${getPuzzleNumber()}`;
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

export function ResultsScreen({ puzzle, result, streak = 0, isCustom = false, isRandom = false, source, onPlayAgain, onPlayAnotherRandom }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedChallenge, setCopiedChallenge] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showDailyAvg, setShowDailyAvg] = useState(false);
  const confettiFired = useRef(false);
  const submitted = useRef(false);
  const dailyStats = useDailyStats(getTodayUTC(), !isCustom && !isRandom);

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
    if (result.won && !submitted.current) {
      submitted.current = true;
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
          source: source ?? null,
        }).then(() => {});
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

  function logShareEvent() {
    const hasConfig =
      import.meta.env.VITE_SUPABASE_URL &&
      import.meta.env.VITE_SUPABASE_ANON_KEY &&
      !import.meta.env.VITE_SUPABASE_URL.includes('your_supabase');
    if (hasConfig) {
      supabase.from('share_events').insert({
        puzzle_date: getTodayUTC(),
        is_custom: isCustom,
      }).then(() => {});
    }
  }

  const handleShare = async () => {
    const text = buildShareText(puzzle, result, isCustom, isRandom);
    logShareEvent();
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeShare = async () => {
    const text = buildShareText(puzzle, result, isCustom, isRandom);
    logShareEvent();
    try {
      await navigator.share({ title: 'WikiRace', text });
    } catch {
      // User cancelled or share failed — no feedback needed
    }
  };

  const handleShareChallenge = async () => {
    const url = buildChallengeUrl(puzzle);
    logShareEvent();
    await copyToClipboard(url);
    setCopiedChallenge(true);
    setTimeout(() => setCopiedChallenge(false), 2500);
  };

  const handleNativeShareChallenge = async () => {
    const url = buildChallengeUrl(puzzle);
    logShareEvent();
    try {
      await navigator.share({ title: 'WikiRace Challenge', url });
    } catch {
      // User cancelled or share failed — no feedback needed
    }
  };

  const puzzleNum = getPuzzleNumber();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <a href={window.location.origin} className={styles.logo}>WikiRace</a>
        {!isCustom && !isRandom && (
          <button type="button" className={styles.statsBtn} onClick={() => setShowStats(true)}>
            Stats
          </button>
        )}
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
                  {isRandom ? 'Random challenge complete' : isCustom ? 'Custom challenge complete' : `Puzzle #${puzzleNum} complete`}
                </p>
                {!isCustom && !isRandom && streak > 0 && (
                  <div className={styles.streakPill}>{streak >= 3 && '🔥 '}{streak} day streak</div>
                )}
              </>
            ) : (
              <>
                <div className={`${styles.statusIcon} ${styles.statusIconGiveUp}`}>✕</div>
                <h1 className={styles.statusTitle}>Better luck next time</h1>
                <p className={styles.statusSub}>
                  {isRandom ? 'Random challenge — you gave up' : isCustom ? 'Custom challenge — you gave up' : `Puzzle #${puzzleNum} — you gave up`}
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

          {dailyStats && dailyStats.count >= 2 && (
            <div className={styles.dailyAvgRow}>
              {showDailyAvg ? (
                <div className={styles.dailyAvgReveal}>
                  <div className={styles.dailyAvgStat}>
                    <span className={styles.dailyAvgNum}>{dailyStats.avgClicks}</span>
                    <span className={styles.dailyAvgLabel}>avg clicks</span>
                  </div>
                  <div className={styles.dailyAvgDivider} />
                  <div className={styles.dailyAvgStat}>
                    <span className={styles.dailyAvgNum}>{formatTime(dailyStats.avgTime)}</span>
                    <span className={styles.dailyAvgLabel}>avg time</span>
                  </div>
                  <button type="button" className={styles.dailyAvgClose} onClick={() => setShowDailyAvg(false)} aria-label="Hide">
                    ✕
                  </button>
                </div>
              ) : (
                <button type="button" className={styles.dailyAvgToggle} onClick={() => setShowDailyAvg(true)}>
                  View daily average
                </button>
              )}
            </div>
          )}

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
            <div className={styles.shareRow}>
              <button type="button" className={styles.shareBtn} onClick={handleShare}>
                {copied ? (
                  <><span className={styles.shareIcon}>✓</span> Copied!</>
                ) : (
                  <><span className={styles.shareIcon}>⬡</span> Share result</>
                )}
              </button>
              {'share' in navigator && (
                <button type="button" className={styles.nativeShareBtn} onClick={handleNativeShare} title="Share via...">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </button>
              )}
            </div>
            {isCustom && onPlayAgain && (
              <button type="button" className={styles.playAgainBtn} onClick={onPlayAgain}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Play again
              </button>
            )}
            {isRandom && onPlayAnotherRandom && (
              <button type="button" className={styles.playAgainBtn} onClick={onPlayAnotherRandom}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Play another random
              </button>
            )}
            {!isCustom && !isRandom && onPlayAnotherRandom && (
              <button type="button" className={styles.challengeBtn} onClick={onPlayAnotherRandom}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
                Play a random challenge
              </button>
            )}
            {isCustom && (
              <div className={styles.shareRow}>
                <button type="button" className={styles.shareThisBtn} onClick={handleShareChallenge}>
                  {copiedChallenge ? (
                    <><span className={styles.shareIcon}>✓</span> Link copied!</>
                  ) : (
                    <><span className={styles.shareIcon}>⚑</span> Share this challenge</>
                  )}
                </button>
                {'share' in navigator && (
                  <button type="button" className={styles.nativeShareBtnOutline} onClick={handleNativeShareChallenge} title="Share via...">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </button>
                )}
              </div>
            )}
            <button type="button" className={styles.challengeBtn} onClick={() => setShowCreateChallenge(true)}>
              <span className={styles.shareIcon}>+</span>
              Create custom challenge
            </button>
          </div>

          <div className={styles.communitySection}>
            <div className={styles.communityDivider}>
              <span className={styles.communityLabel}>Join the community</span>
            </div>
            <div className={styles.communityBtns}>
              <a href="https://x.com/WikiRaceDaily" className={styles.communityBtn} target="_blank" rel="noopener noreferrer">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                @WikiRaceDaily
              </a>
              <a href="https://www.reddit.com/r/WikiRaceio" className={styles.communityBtn} target="_blank" rel="noopener noreferrer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                r/WikiRaceio
              </a>
            </div>
          </div>
        </div>

        {!isCustom && !isRandom && (
          <p className={styles.comeback}>
            Come back tomorrow for a new puzzle.
          </p>
        )}
        <p className={styles.followPrompt}>
          <a href="https://x.com/WikiRaceDaily" target="_blank" rel="noopener noreferrer" className={styles.followLink}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Follow @WikiRaceDaily for daily puzzle reminders
          </a>
        </p>

        <p className={styles.kofi}>
          Enjoying WikiRace?{' '}
          <a
            href="https://ko-fi.com/hinriks"
            target="_blank"
            rel="noopener noreferrer"
          >
            Support on Ko-fi
          </a>
        </p>
      </main>

      {showCreateChallenge && (
        <CreateChallengeModal onClose={() => setShowCreateChallenge(false)} />
      )}
      {showStats && (
        <StatsModal onClose={() => setShowStats(false)} />
      )}
    </div>
  );
}
