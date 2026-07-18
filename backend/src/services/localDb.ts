import { GameRoom, GameMove } from '../models/types';
import crypto from 'crypto';

class LocalDb {
  private gameRooms: Map<string, GameRoom> = new Map();
  private gameMoves: Map<string, GameMove[]> = new Map(); // game_room_id -> moves

  async createGameRoom(player1_id: string, is_vs_computer = false): Promise<GameRoom> {
    const id = crypto.randomUUID();
    const gameRoom: GameRoom = {
      id,
      player1_id,
      player2_id: is_vs_computer ? 'computer' : null,
      status: is_vs_computer ? 'ONGOING' : 'WAITING',
      current_turn: player1_id,
      winner_id: null,
      created_at: new Date().toISOString(),
      is_vs_computer
    };
    this.gameRooms.set(id, gameRoom);
    this.gameMoves.set(id, []);
    return gameRoom;
  }

  async getGameRoom(id: string): Promise<GameRoom | null> {
    return this.gameRooms.get(id) || null;
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom> {
    const room = this.gameRooms.get(id);
    if (!room) {
      throw new Error('Game room not found');
    }
    const updated = { ...room, ...updates };
    this.gameRooms.set(id, updated);
    return updated;
  }

  async createGameMove(game_room_id: string, user_id: string, word: string): Promise<GameMove> {
    const id = crypto.randomUUID();
    const move: GameMove = {
      id,
      game_room_id,
      user_id,
      word: word.toLowerCase(),
      created_at: new Date().toISOString()
    };
    const moves = this.gameMoves.get(game_room_id) || [];
    moves.push(move);
    this.gameMoves.set(game_room_id, moves);
    return move;
  }

  async getGameMoves(game_room_id: string): Promise<GameMove[]> {
    return this.gameMoves.get(game_room_id) || [];
  }

  async getGameMovesByWord(game_room_id: string, word: string): Promise<GameMove[]> {
    const moves = this.gameMoves.get(game_room_id) || [];
    return moves.filter(m => m.word.toLowerCase() === word.toLowerCase());
  }
}

export const localDb = new LocalDb();
