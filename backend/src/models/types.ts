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