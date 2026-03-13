import { getTodayUTC } from './useTodaysPuzzle';

const STORAGE_KEY = 'wikirace_v1';
const STREAK_KEY = '_streak';

interface StreakData {
  count: number;
  lastWonDate: string;
  lastPlayedDate: string;
}

function getYesterdayUTC(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getStreak(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    const streak: StreakData | undefined = data[STREAK_KEY];
    if (!streak) return 0;

    const today = getTodayUTC();
    const yesterday = getYesterdayUTC();

    // Played today and gave up — streak is 0
    if (streak.lastPlayedDate === today && streak.lastWonDate !== today) return 0;
    // Won today
    if (streak.lastWonDate === today) return streak.count;
    // Won yesterday, haven't played today yet — streak still alive
    if (streak.lastWonDate === yesterday && streak.lastPlayedDate === yesterday) return streak.count;

    return 0;
  } catch {
    return 0;
  }
}

/** Call this when a game ends. Returns the new streak count. */
export function updateStreak(won: boolean): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const streak: StreakData | undefined = data[STREAK_KEY];
    const today = getTodayUTC();
    const yesterday = getYesterdayUTC();

    let newCount = 0;

    if (won) {
      if (streak?.lastWonDate === today) {
        // Already recorded a win today — don't double-count
        return streak.count;
      } else if (streak?.lastWonDate === yesterday) {
        newCount = streak.count + 1;
      } else {
        newCount = 1;
      }
    }

    data[STREAK_KEY] = {
      count: newCount,
      lastWonDate: won ? today : (streak?.lastWonDate ?? ''),
      lastPlayedDate: today,
    } satisfies StreakData;

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newCount;
  } catch {
    return won ? 1 : 0;
  }
}
