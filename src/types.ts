export interface Puzzle {
  id: number;
  date: string;
  start_article: string;
  end_article: string;
}

export interface GameResult {
  clicks: number;
  timeSeconds: number;
  path: string[];
  won: boolean;
}

export type Screen = 'home' | 'game' | 'result';
