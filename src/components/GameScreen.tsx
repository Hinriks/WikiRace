import { useState, useEffect, useCallback, useRef } from 'react';
import { ArticleView } from './ArticleView';
import { useWikiArticle } from '../hooks/useWikiArticle';
import { useTimer } from '../hooks/useTimer';
import type { Puzzle, GameResult } from '../types';
import styles from './GameScreen.module.css';

interface Props {
  puzzle: Puzzle;
  onEnd: (result: GameResult) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function GameScreen({ puzzle, onEnd }: Props) {
  // Use refs for mutable game state so handlers stay stable
  const clicksRef = useRef(0);
  const pathRef = useRef<string[]>([]);
  const timerStartedRef = useRef(false);
  const gameEndedRef = useRef(false);

  // Display state (synced from refs)
  const [clicksDisplay, setClicksDisplay] = useState(0);
  const [pathDisplay, setPathDisplay] = useState<string[]>([]);
  const [articleHtml, setArticleHtml] = useState('');
  const [articleTitle, setArticleTitle] = useState('');
  const [gameEnded, setGameEnded] = useState(false);
  const [showGiveUpConfirm, setShowGiveUpConfirm] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { loading, fetchArticle } = useWikiArticle();
  const loadingRef = useRef(false);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const { elapsed, start, stop } = useTimer();
  const breadcrumbEndRef = useRef<HTMLDivElement>(null);

  // Core navigation logic
  const loadArticle = useCallback(async (title: string): Promise<string | null> => {
    setLoadError(null);
    const result = await fetchArticle(title);
    if (!result) {
      setLoadError('Failed to load article. Please try again.');
      return null;
    }
    setArticleHtml(result.html);
    setArticleTitle(result.title);
    return result.title;
  }, [fetchArticle]);

  // Initial load (no click counted, no timer start yet)
  useEffect(() => {
    const init = async () => {
      const title = await loadArticle(puzzle.start_article);
      if (title) {
        pathRef.current = [title];
        setPathDisplay([title]);
      }
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll breadcrumbs to end when path updates
  useEffect(() => {
    breadcrumbEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
  }, [pathDisplay]);

  const checkWin = useCallback((canonicalTitle: string, finalClicks: number, finalPath: string[], stopFn: () => number) => {
    if (canonicalTitle.toLowerCase() === puzzle.end_article.toLowerCase()) {
      const time = stopFn();
      setGameEnded(true);
      gameEndedRef.current = true;
      onEnd({ clicks: finalClicks, timeSeconds: time, path: finalPath, won: true });
    }
  }, [puzzle.end_article, onEnd]);

  const handleNavigate = useCallback(async (title: string) => {
    if (loadingRef.current || gameEndedRef.current) return;

    clicksRef.current += 1;
    setClicksDisplay(clicksRef.current);

    if (!timerStartedRef.current) {
      start();
      timerStartedRef.current = true;
    }

    const canonicalTitle = await loadArticle(title);
    if (!canonicalTitle) return;

    const newPath = [...pathRef.current, canonicalTitle];
    pathRef.current = newPath;
    setPathDisplay(newPath);

    window.scrollTo({ top: 0, behavior: 'smooth' });
    checkWin(canonicalTitle, clicksRef.current, newPath, stop);
  }, [loadArticle, start, stop, checkWin]);

  const handleBack = useCallback(async () => {
    if (loadingRef.current || gameEndedRef.current || pathRef.current.length <= 1) return;

    clicksRef.current += 1;
    setClicksDisplay(clicksRef.current);

    if (!timerStartedRef.current) {
      start();
      timerStartedRef.current = true;
    }

    const newPath = pathRef.current.slice(0, -1);
    const prevTitle = newPath[newPath.length - 1];

    const canonicalTitle = await loadArticle(prevTitle);
    if (!canonicalTitle) return;

    pathRef.current = newPath;
    setPathDisplay(newPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [loadArticle, start]);

  const handleGiveUp = useCallback(() => {
    const time = timerStartedRef.current ? stop() : 0;
    setGameEnded(true);
    gameEndedRef.current = true;
    onEnd({
      clicks: clicksRef.current,
      timeSeconds: time,
      path: [...pathRef.current],
      won: false,
    });
  }, [stop, onEnd]);

  return (
    <div className={styles.wrapper}>
      {/* Sticky top bar */}
      <div className={styles.bar}>
        <div className={styles.barInner}>
          <div className={styles.barLogo}>WikiRace</div>

          <div className={styles.barTarget}>
            <span className={styles.barTargetLabel}>Target</span>
            <span className={styles.barTargetName}>{puzzle.end_article}</span>
          </div>

          <div className={styles.barStats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{clicksDisplay}</span>
              <span className={styles.statLabel}>clicks</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>{formatTime(elapsed)}</span>
              <span className={styles.statLabel}>time</span>
            </div>
          </div>

          <button
            className={styles.giveUpBtn}
            onClick={() => setShowGiveUpConfirm(true)}
            disabled={gameEnded}
          >
            Give up
          </button>
        </div>
      </div>

      {/* Breadcrumb trail */}
      <div className={styles.breadcrumbWrap}>
        <div className={styles.breadcrumb}>
          {pathDisplay.map((title, i) => (
            <span key={i} className={styles.breadcrumbItem}>
              {i > 0 && <span className={styles.breadcrumbSep}>›</span>}
              <span className={i === pathDisplay.length - 1 ? styles.breadcrumbCurrent : styles.breadcrumbPast}>
                {title}
              </span>
            </span>
          ))}
          <div ref={breadcrumbEndRef} />
        </div>
      </div>

      {/* Article area */}
      <div className={styles.content}>
        <div className={styles.contentInner}>

          {/* Back button */}
          {pathDisplay.length > 1 && (
            <button
              className={styles.backBtn}
              onClick={handleBack}
              disabled={loading || gameEnded}
            >
              ← Back
              <span className={styles.backCost}>+1 click</span>
            </button>
          )}

          {/* Loading state */}
          {loading && (
            <div className={styles.loadingBar}>
              <div className={styles.loadingBarFill} />
            </div>
          )}

          {/* Article title */}
          {articleTitle && (
            <h1 className={styles.articleTitle}>{articleTitle}</h1>
          )}

          {/* Error state */}
          {loadError && (
            <div className={styles.errorBox}>
              <p>{loadError}</p>
              <button
                className={styles.retryBtn}
                onClick={() => pathDisplay.length > 0 && loadArticle(pathDisplay[pathDisplay.length - 1])}
              >
                Try again
              </button>
            </div>
          )}

          {/* Article content */}
          <ArticleView
            html={articleHtml}
            onNavigate={handleNavigate}
            disabled={loading || gameEnded}
          />
        </div>
      </div>

      {/* Give up confirmation dialog */}
      {showGiveUpConfirm && (
        <div className={styles.overlay} onClick={() => setShowGiveUpConfirm(false)}>
          <div className={styles.dialog} onClick={e => e.stopPropagation()}>
            <h3 className={styles.dialogTitle}>Give up?</h3>
            <p className={styles.dialogBody}>
              You're {clicksDisplay} click{clicksDisplay !== 1 ? 's' : ''} in. Are you sure you want to stop?
            </p>
            <div className={styles.dialogActions}>
              <button className={styles.dialogCancel} onClick={() => setShowGiveUpConfirm(false)}>
                Keep going
              </button>
              <button className={styles.dialogConfirm} onClick={handleGiveUp}>
                Give up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
