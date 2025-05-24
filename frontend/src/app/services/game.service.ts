import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GameRoom {
  id: string;
  player1_id: string;
  player2_id: string | null;
  status: 'WAITING' | 'ONGOING' | 'FINISHED';
  current_turn: string;
  winner_id: string;
  created_at: Date;
  is_vs_computer: boolean;
}

export interface GameMove {
  id: string;
  game_room_id: string;
  user_id: string;
  word: string;
  created_at: Date;
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

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = `${environment.apiUrl}/game`;

  constructor(private http: HttpClient) {}

  createGame(user_id: string): Observable<{ game: GameRoom; shareableLink: string }> {
    return this.http.post<{ game: GameRoom; shareableLink: string }>(`${this.apiUrl}/create`, { user_id });
  }

  joinGame(gameId: string, user_id: string): Observable<{ game: GameRoom }> {
    return this.http.post<{ game: GameRoom }>(`${this.apiUrl}/${gameId}/join`, { user_id });
  }

  getGame(gameId: string): Observable<{ game: GameRoom }> {
    return this.http.get<{ game: GameRoom }>(`${this.apiUrl}/${gameId}`);
  }

  submitMove(gameId: string, user_id: string, word: string): Observable<{ move: GameMove }> {
    return this.http.post<{ move: GameMove }>(`${this.apiUrl}/${gameId}/move`, { user_id, word });
  }

  getMoves(gameId: string): Observable<{ moves: GameMove[] }> {
    return this.http.get<{ moves: GameMove[] }>(`${this.apiUrl}/${gameId}/moves`);
  }

  endGame(gameId: string, winnerId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${gameId}/end`, { 
      winnerId 
    });
  }

  createGameVsComputer(user_id: string): Observable<{ game: GameRoom; }> {
    return this.http.post<{ game: GameRoom }>(`${this.apiUrl}/create-vs-computer`, { user_id });
  }

  getGameScores(gameId: string): Observable<{ scores: { [key: string]: PlayerScore } }> {
    return this.http.get<{ scores: { [key: string]: PlayerScore } }>(`${this.apiUrl}/${gameId}/scores`);
  }
}