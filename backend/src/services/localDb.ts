import { GameRoom, GameMove, Difficulty } from '../models/types';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (Uses Application Default Credentials in GCP)
if (!getApps().length) {
  initializeApp({
    projectId: 'word-chain-game-2026'
  });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

class LocalDb {
  async createGameRoom(player1_id: string, is_vs_computer = false, difficulty: Difficulty = 'normal', target_score?: number): Promise<GameRoom> {
    const docRef = db.collection('gameRooms').doc();
    const gameRoom: GameRoom = {
      id: docRef.id,
      player1_id,
      player2_id: is_vs_computer ? 'computer' : null,
      status: is_vs_computer ? 'ONGOING' : 'WAITING',
      current_turn: player1_id,
      winner_id: null,
      created_at: new Date().toISOString(),
      is_vs_computer,
      difficulty,
      target_score
    };
    await docRef.set(gameRoom);
    return gameRoom;
  }

  async getGameRoom(id: string): Promise<GameRoom | null> {
    const doc = await db.collection('gameRooms').doc(id).get();
    return doc.exists ? (doc.data() as GameRoom) : null;
  }

  async updateGameRoom(id: string, updates: Partial<GameRoom>): Promise<GameRoom> {
    const docRef = db.collection('gameRooms').doc(id);
    await docRef.update(updates);
    const doc = await docRef.get();
    return doc.data() as GameRoom;
  }

  async createGameMove(game_room_id: string, user_id: string, word: string): Promise<GameMove> {
    const docRef = db.collection('gameRooms').doc(game_room_id).collection('moves').doc();
    const move: GameMove = {
      id: docRef.id,
      game_room_id,
      user_id,
      word: word.toLowerCase(),
      created_at: new Date().toISOString()
    };
    await docRef.set(move);
    return move;
  }

  async getGameMoves(game_room_id: string): Promise<GameMove[]> {
    const snapshot = await db.collection('gameRooms').doc(game_room_id).collection('moves').orderBy('created_at').get();
    return snapshot.docs.map((doc: any) => doc.data() as GameMove);
  }

  async getGameMovesByWord(game_room_id: string, word: string): Promise<GameMove[]> {
    const snapshot = await db.collection('gameRooms').doc(game_room_id).collection('moves').where('word', '==', word.toLowerCase()).get();
    return snapshot.docs.map((doc: any) => doc.data() as GameMove);
  }
}

export const localDb = new LocalDb();
