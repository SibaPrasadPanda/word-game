export type Difficulty = 'easy' | 'normal' | 'hard' | 'expert';

export interface DifficultySettings {
  timerSeconds: number;
  minWordLength: number;
  xpMultiplier: number;
  aiResponseMs: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultySettings> = {
  easy:   { timerSeconds: 30, minWordLength: 3, xpMultiplier: 0.75, aiResponseMs: 2500 },
  normal: { timerSeconds: 15, minWordLength: 3, xpMultiplier: 1.0,  aiResponseMs: 1000 },
  hard:   { timerSeconds: 10, minWordLength: 4, xpMultiplier: 1.5,  aiResponseMs: 500  },
  expert: { timerSeconds: 7,  minWordLength: 5, xpMultiplier: 2.0,  aiResponseMs: 250  },
};

export interface User {
  id: string;
  username: string;
  isGuest: boolean;
}

export interface GameMove {
  id: string;
  game_room_id: string;
  user_id: string;
  word: string;
  created_at: string;
}

export interface GameRoom {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: 'WAITING' | 'ONGOING' | 'FINISHED';
  current_turn: string;
  winner_id: string | null;
  created_at: string;
  is_vs_computer?: boolean;
  difficulty?: Difficulty;
  target_score?: number;
}

export interface WordScore {
  word: string;
  baseScore: number;
  bonusScore: number;
  totalScore: number;
}

export interface PlayerScore {
  userId: string;
  words: WordScore[];
  totalScore: number;
}