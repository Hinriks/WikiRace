import { useState } from 'react';
import type { Puzzle } from '../types';
import { getPuzzleNumber } from '../hooks/useTodaysPuzzle';
import { StatsModal } from './StatsModal';
import { CreateChallengeModal } from './CreateChallengeModal';
import styles from './HomeScreen.module.css';

interface Props {
  puzzle: Puzzle;
  onStart: () => void;
  alreadyPlayed?: boolean;
  streak?: number;
  isCustom?: boolean;
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
          <span className={styles.footerDot}>·</span>
          <div className={styles.socialLinks}>
            <a href="https://x.com/WikiRaceDaily" className={styles.socialLink} target="_blank" rel="noopener noreferrer" aria-label="Follow on X">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://www.reddit.com/r/WikiRaceio" className={styles.socialLink} target="_blank" rel="noopener noreferrer" aria-label="Join our Reddit community">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
            </a>
          </div>
        </footer>
      )}

      {showStats && <StatsModal onClose={() => setShowStats(false)} />}
      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
      {showCreateChallenge && <CreateChallengeModal onClose={() => setShowCreateChallenge(false)} />}
    </div>
  );
}
