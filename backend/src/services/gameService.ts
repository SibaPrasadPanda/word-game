import { config } from '../config/config';

import { GameRoom, GameMove, WordScore, PlayerScore, Difficulty, DIFFICULTY_CONFIG } from '../models/types';
import { localDb } from './localDb';

export class GameService {
  async createGame(user_id: string, targetScore?: number) {
    return await localDb.createGameRoom(user_id, false, 'normal', targetScore);
  }

  async joinGame(gameId: string, player2Id: string): Promise<GameRoom> {
    try {
      const existingGame = await localDb.getGameRoom(gameId);

      if (!existingGame) {
        throw new Error('Game not found');
      }

      if (existingGame.status !== 'WAITING') {
        throw new Error('Game is not available to join');
      }

      if (existingGame.player1_id === player2Id) {
        throw new Error('Cannot join your own game');
      }

      const updatedGame = await localDb.updateGameRoom(gameId, {
        player2_id: player2Id,
        status: 'ONGOING',
        current_turn: existingGame.player1_id
      });

      return updatedGame;

    } catch (error: any) {
      console.error('Join game error:', error);
      throw error;
    }
  }

  async submitMove(gameId: string, user_id: string, word: string): Promise<GameMove> {
    try {
        // Get game first so we can check difficulty
        const game = await localDb.getGameRoom(gameId);
        if (!game) throw new Error('Game not found');

        // Validate the move (passes difficulty for min length check)
        await this.validateMove(gameId, word, game.difficulty || 'normal');

        // Update turn accurately
        const nextTurn = user_id === game.player1_id ? (game.player2_id || 'computer') : game.player1_id;
        await localDb.updateGameRoom(gameId, { current_turn: nextTurn });

        // Insert the move
        const move = await localDb.createGameMove(gameId, user_id, word);

        const moves = await localDb.getGameMoves(gameId);
        
        // Check for target score win condition
        if (game.target_score) {
            let totalScore = 0;
            for (const m of moves) {
                if (m.user_id === user_id) {
                    const wordScore = this.calculateWordScore(m.word, game.difficulty || 'normal');
                    totalScore += wordScore.totalScore;
                }
            }
            
            if (totalScore >= game.target_score) {
                // End game immediately, user won!
                await this.endGame(gameId, user_id);

                return move;
            }
        }

        // Notify clients about the new move


        // Update game state and notify
        const updatedGame = await localDb.getGameRoom(gameId);


        return move;
    } catch (error: any) {
        console.error('Submit move error:', error);
        throw error;
    }
  }

  private async validateMove(gameId: string, word: string, difficulty: Difficulty = 'normal'): Promise<void> {
    const settings = DIFFICULTY_CONFIG[difficulty];
    const minLen = settings.minWordLength;

    if (!word || word.trim().length < minLen) {
      throw new Error(`Word must be at least ${minLen} letters long`);
    }

    if (!/^[a-zA-Z]+$/.test(word)) {
      throw new Error('Word must contain only alphabetic characters');
    }

    const existingMoves = await localDb.getGameMovesByWord(gameId, word);
    if (existingMoves && existingMoves.length > 0) {
      throw new Error('This word has already been used in this game');
    }

    const moves = await localDb.getGameMoves(gameId);
    const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

    if (lastMove) {
      const lastWord = lastMove.word;
      if (word.charAt(0).toLowerCase() !== lastWord.charAt(lastWord.length - 1).toLowerCase()) {
        throw new Error('Word must start with the last letter of the previous word');
      }
    }
  }

  private async updateGameTurn(gameId: string, currentUserId: string): Promise<void> {
    const gameRoom = await localDb.getGameRoom(gameId);
    if (!gameRoom) throw new Error('Game not found');
    const nextTurn = gameRoom.player1_id === currentUserId ? gameRoom.player2_id || '' : gameRoom.player1_id;
    await localDb.updateGameRoom(gameId, { current_turn: nextTurn });
  }

  async endGame(gameId: string, winnerId: string): Promise<void> {
    const game = await localDb.updateGameRoom(gameId, {
      status: 'FINISHED',
      winner_id: winnerId
    });
    console.log('winnerId', winnerId);

  }

  async createGameVsComputer(user_id: string, difficulty: Difficulty = 'normal', targetScore?: number): Promise<GameRoom> {
    return await localDb.createGameRoom(user_id, true, difficulty, targetScore);
  }

  async skipTurn(gameId: string, user_id: string): Promise<GameRoom> {
    const game = await localDb.getGameRoom(gameId);
    if (!game) throw new Error('Game not found');
    if (game.current_turn !== user_id) throw new Error('Not your turn');

    const nextTurn = game.player1_id === user_id ? game.player2_id || '' : game.player1_id;
    const updatedGame = await localDb.updateGameRoom(gameId, { current_turn: nextTurn });


    return updatedGame;
  }

  private calculateWordScore(word: string, difficulty: Difficulty = 'normal'): WordScore {
    const multiplier = DIFFICULTY_CONFIG[difficulty].xpMultiplier;
    const baseScore = word.length;
    let bonusScore = 0;

    if (word.length >= 8) {
      bonusScore = 5;
    } else if (word.length >= 5) {
      bonusScore = 3;
    }

    const rawTotal = baseScore + bonusScore;
    return {
      word,
      baseScore,
      bonusScore,
      totalScore: Math.round(rawTotal * multiplier)
    };
  }

  async calculateGameScores(gameId: string): Promise<{ [key: string]: PlayerScore }> {
    const moves = await localDb.getGameMoves(gameId);
    const game = await localDb.getGameRoom(gameId);
    const difficulty = game?.difficulty || 'normal';

    const scores: { [key: string]: PlayerScore } = {};

    moves.forEach((move: GameMove) => {
      if (!scores[move.user_id]) {
        scores[move.user_id] = {
          userId: move.user_id,
          words: [],
          totalScore: 0
        };
      }

      const wordScore = this.calculateWordScore(move.word, difficulty);
      scores[move.user_id].words.push(wordScore);
      scores[move.user_id].totalScore += wordScore.totalScore;
    });

    return scores;
  }
}