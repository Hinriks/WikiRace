import { getStats } from '../hooks/useStats';
import styles from './HomeScreen.module.css';

interface Props {
  onClose: () => void;
}

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

export function StatsModal({ onClose }: Props) {
  const stats = getStats();
  const winRate = stats.gamesPlayed > 0
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;
  const avgClicks = stats.wins > 0
    ? Math.round(stats.totalWinClicks / stats.wins)
    : null;

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
