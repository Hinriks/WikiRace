import { useState } from 'react';
import type { Puzzle } from '../types';
import { getPuzzleNumber } from '../hooks/useTodaysPuzzle';
import { getStats } from '../hooks/useStats';
import { CreateChallengeModal } from './CreateChallengeModal';
import styles from './HomeScreen.module.css';

interface Props {
  puzzle: Puzzle;
  onStart: () => void;
  alreadyPlayed?: boolean;
  streak?: number;
  isCustom?: boolean;
}

function StatsModal({ onClose }: { onClose: () => void }) {
  const stats = getStats();
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;
  const avgClicks = stats.wins > 0
    ? Math.round(stats.totalWinClicks / stats.wins)
    : null;

  function formatBestTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
    return `${s}s`;
  }

  function formatGameTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    if (m > 0) return `${m}:${String(s).padStart(2, '0')}`;
    return `0:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className={styles.overlay}>
      <button type="button" className={styles.overlayClose} onClick={onClose} aria-label="Close modal" />
      <div className={styles.modal} role="dialog" aria-label="Your stats">
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className={styles.modalTitle}>Your stats</h2>
        {stats.gamesPlayed === 0 ? (
          <p className={styles.statsEmpty}>Play your first puzzle to see your stats here.</p>
        ) : (
          <>
            <div className={styles.statsGrid}>
              <div className={styles.statCell}>
                <span className={styles.statNum}>{stats.gamesPlayed}</span>
                <span className={styles.statLabel}>Played</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statNum}>{winRate}%</span>
                <span className={styles.statLabel}>Win rate</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statNum}>{stats.bestClicks ?? '—'}</span>
                <span className={styles.statLabel}>Fewest clicks</span>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statNum}>{avgClicks ?? '—'}</span>
                <span className={styles.statLabel}>Avg clicks</span>
              </div>
            </div>
            {stats.bestTime !== null && (
              <p className={styles.bestTime}>
                Best time <strong>{formatBestTime(stats.bestTime)}</strong>
              </p>
            )}
            {stats.recentGames.length > 0 && (
              <div className={styles.recentSection}>
                <div className={styles.recentLabel}>Recent games</div>
                <div className={styles.recentList}>
                  {stats.recentGames.map((game, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: ordered list, index is stable
                    <div key={i} className={styles.recentRow}>
                      <span className={styles.recentRoute}>
                        {game.start} <span className={styles.recentArrow}>→</span> {game.end}
                      </span>
                      <span className={styles.recentResult}>
                        {game.won
                          ? <><span className={styles.recentClicks}>{game.clicks}</span> · {formatGameTime(game.timeSeconds)}</>
                          : <span className={styles.recentGaveUp}>gave up</span>
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.overlay}>
      <button type="button" className={styles.overlayClose} onClick={onClose} aria-label="Close modal" />
      <div className={styles.modal} role="dialog" aria-label="How to play">
        <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className={styles.modalTitle}>How to play</h2>
        <ol className={styles.rulesList}>
          <li>
            <span><strong>Navigate Wikipedia</strong> from the start article to the target article by clicking links within the article text.</span>
          </li>
          <li>
            <span><strong>Fewer clicks is better.</strong> Time is a tiebreaker, but reaching the target efficiently is the real goal.</span>
          </li>
          <li>
            <span><strong>Links are highlighted</strong> in blue — only internal Wikipedia article links are clickable. External links, references, and navigation boxes are disabled.</span>
          </li>
          <li>
            <span><strong>Going back</strong> still counts as a click, so choose wisely.</span>
          </li>
          <li>
            <span><strong>Everyone gets the same puzzle</strong> each day. A new challenge drops at midnight UTC.</span>
          </li>
          <li>
            <span><strong>Share your result</strong> when you finish — without spoiling the path for others.</span>
          </li>
        </ol>
        <div className={styles.modalTip}>
          <strong>Tip:</strong> Think about broad topics — geography, science, history, culture — that connect almost everything on Wikipedia.
        </div>
      </div>
    </div>
  );
}

export function HomeScreen({ puzzle, onStart, alreadyPlayed, streak = 0, isCustom = false }: Props) {
  const [showStats, setShowStats] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const puzzleNumber = getPuzzleNumber();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logo}>WikiRace</div>
        <div className={styles.headerActions}>
          {!isCustom && (
            <button type="button" className={styles.statsBtn} onClick={() => setShowStats(true)}>
              Stats
            </button>
          )}
          <button type="button" className={styles.howToBtn} onClick={() => setShowHowTo(true)}>
            How to play
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={isCustom ? styles.customLabel : styles.puzzleLabel}>
          {isCustom ? 'Custom Challenge' : `Daily Puzzle #${puzzleNumber}`}
        </div>

        {!isCustom && streak > 0 && (
          <div className={styles.streak}>
            {streak >= 3 && '🔥 '}{streak} day streak
          </div>
        )}

        <div className={styles.challenge}>
          <div className={styles.articleCard}>
            <span className={styles.articleRole}>Start</span>
            <span className={styles.articleName}>{puzzle.start_article}</span>
          </div>

          <div className={styles.arrow}>
            <svg width="48" height="20" viewBox="0 0 48 20" fill="none" aria-hidden="true">
              <path d="M0 10 H40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M34 4 L42 10 L34 16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <div className={styles.articleCard}>
            <span className={styles.articleRole}>Target</span>
            <span className={styles.articleName}>{puzzle.end_article}</span>
          </div>
        </div>

        <p className={styles.subtitle}>
          {isCustom
            ? 'A friend challenged you to this route. Navigate Wikipedia links to reach the target in as few clicks as possible.'
            : 'Navigate Wikipedia links to reach the target in as few clicks as possible.'}
        </p>

        {!isCustom && alreadyPlayed ? (
          <div className={styles.alreadyPlayed}>
            You've already played today's puzzle. Come back tomorrow!
          </div>
        ) : (
          <button type="button" className={styles.startBtn} onClick={onStart}>
            {isCustom ? 'Accept Challenge' : 'Start Playing'}
          </button>
        )}

        <button
          type="button"
          className={styles.createChallengeLink}
          onClick={() => setShowCreateChallenge(true)}
        >
          Create custom challenge
        </button>
      </main>

      {!isCustom && (
        <footer className={styles.footer}>
          A new puzzle every day at midnight UTC
          <span className={styles.footerDot}>·</span>
          <a
            href="https://ko-fi.com/hinriks"
            className={styles.kofiLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            Support on Ko-fi
          </a>
        </footer>
      )}

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      {showCreateChallenge && <CreateChallengeModal onClose={() => setShowCreateChallenge(false)} />}
    </div>
  );
}
