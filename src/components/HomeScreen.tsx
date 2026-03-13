import { useState } from 'react';
import type { Puzzle } from '../types';
import { getPuzzleNumber } from '../hooks/useTodaysPuzzle';
import styles from './HomeScreen.module.css';

interface Props {
  puzzle: Puzzle;
  onStart: () => void;
  alreadyPlayed?: boolean;
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className={styles.modalTitle}>How to play</h2>
        <ol className={styles.rulesList}>
          <li>
            <strong>Navigate Wikipedia</strong> from the start article to the target article by clicking links within the article text.
          </li>
          <li>
            <strong>Fewer clicks is better.</strong> Time is a tiebreaker, but reaching the target efficiently is the real goal.
          </li>
          <li>
            <strong>Links are highlighted</strong> in blue — only internal Wikipedia article links are clickable. External links, references, and navigation boxes are disabled.
          </li>
          <li>
            <strong>Going back</strong> still counts as a click, so choose wisely.
          </li>
          <li>
            <strong>Everyone gets the same puzzle</strong> each day. A new challenge drops at midnight UTC.
          </li>
          <li>
            <strong>Share your result</strong> when you finish — without spoiling the path for others.
          </li>
        </ol>
        <div className={styles.modalTip}>
          <strong>Tip:</strong> Think about broad topics — geography, science, history, culture — that connect almost everything on Wikipedia.
        </div>
      </div>
    </div>
  );
}

export function HomeScreen({ puzzle, onStart, alreadyPlayed }: Props) {
  const [showHowTo, setShowHowTo] = useState(false);
  const puzzleNumber = getPuzzleNumber();

  return (
    <div className={styles.wrapper}>
      <header className={styles.header}>
        <div className={styles.logo}>WikiRace</div>
        <button className={styles.howToBtn} onClick={() => setShowHowTo(true)}>
          How to play
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.puzzleLabel}>
          Daily Puzzle #{puzzleNumber}
        </div>

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
          Navigate Wikipedia links to reach the target in as few clicks as possible.
        </p>

        {alreadyPlayed ? (
          <div className={styles.alreadyPlayed}>
            You've already played today's puzzle. Come back tomorrow!
          </div>
        ) : (
          <button className={styles.startBtn} onClick={onStart}>
            Start Playing
          </button>
        )}
      </main>

      <footer className={styles.footer}>
        A new puzzle every day at midnight UTC
      </footer>

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
