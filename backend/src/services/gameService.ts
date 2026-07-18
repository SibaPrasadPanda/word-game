import { config } from '../config/config';
import { socketService } from '../index';
import { GameRoom, GameMove, WordScore, PlayerScore } from '../models/types';
import { localDb } from './localDb';

export class GameService {
  async createGame(user_id: string) {
    return await localDb.createGameRoom(user_id, false);
  }

  async joinGame(gameId: string, player2Id: string): Promise<GameRoom> {
    try {
      // First check if the game exists and is available to join
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

      // Update game room with new player
      const updatedGame = await localDb.updateGameRoom(gameId, {
        player2_id: player2Id,
        status: 'ONGOING',
        current_turn: existingGame.player1_id // Set turn back to player 1
      });

      return updatedGame;

    } catch (error: any) {
      console.error('Join game error:', error);
      throw error;
    }
  }

  async submitMove(gameId: string, user_id: string, word: string): Promise<GameMove> {
    try {
        // First validate the move
        await this.validateMove(gameId, word);

        // Get current game state
        const game = await localDb.getGameRoom(gameId);

        if (!game) {
            throw new Error('Game not found');
        }

        // For computer games, update turn to player1
        if (game.is_vs_computer) {
            await localDb.updateGameRoom(gameId, { current_turn: game.player1_id });
        }

        // Insert the move
        const move = await localDb.createGameMove(gameId, user_id, word);

        // Notify clients about the new move
        const moves = await localDb.getGameMoves(gameId);

        socketService.notifyMovesUpdate(gameId, { moves });

        // Update game state and notify
        const updatedGame = await localDb.getGameRoom(gameId);

        socketService.notifyGameUpdate(gameId, { game: updatedGame });

        return move;
    } catch (error: any) {
        console.error('Submit move error:', error);
        throw error;
    }
}

  private async validateMove(gameId: string, word: string): Promise<void> {
    if (!word || word.trim().length < 3) {
      throw new Error('Word must be at least 3 letters long');
    }

    if (!/^[a-zA-Z]+$/.test(word)) {
      throw new Error('Word must contain only alphabetic characters');
    }

    const existingMoves = await localDb.getGameMovesByWord(gameId, word);

    if (existingMoves && existingMoves.length > 0) {
      throw new Error('This word has already been used in this game');
    }
    // Get last move
    const moves = await localDb.getGameMoves(gameId);
    const lastMove = moves.length > 0 ? moves[moves.length - 1] : null;

    if (lastMove) {
      // Check if word starts with last letter of previous word
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

    // Notify clients about game end
    socketService.notifyGameUpdate(gameId, { game });
  }

  async createGameVsComputer(user_id: string): Promise<GameRoom> {
    return await localDb.createGameRoom(user_id, true);
  }

  async skipTurn(gameId: string, user_id: string): Promise<GameRoom> {
    const game = await localDb.getGameRoom(gameId);
    if (!game) throw new Error('Game not found');
    if (game.current_turn !== user_id) throw new Error('Not your turn');

    const nextTurn = game.player1_id === user_id ? game.player2_id || '' : game.player1_id;
    const updatedGame = await localDb.updateGameRoom(gameId, { current_turn: nextTurn });

    socketService.notifyGameUpdate(gameId, { game: updatedGame });
    return updatedGame;
  }

  private calculateWordScore(word: string): WordScore {
    const baseScore = word.length;
    let bonusScore = 0;
    
    // Bonus points for longer words
    if (word.length >= 8) {
      bonusScore = 5;
    } else if (word.length >= 5) {
      bonusScore = 3;
    }

    return {
      word,
      baseScore,
      bonusScore,
      totalScore: baseScore + bonusScore
    };
  }

  async calculateGameScores(gameId: string): Promise<{ [key: string]: PlayerScore }> {
    const moves = await localDb.getGameMoves(gameId);

    const scores: { [key: string]: PlayerScore } = {};

    moves.forEach((move: GameMove) => {
      if (!scores[move.user_id]) {
        scores[move.user_id] = {
          userId: move.user_id,
          words: [],
          totalScore: 0
        };
      }

      const wordScore = this.calculateWordScore(move.word);
      scores[move.user_id].words.push(wordScore);
      scores[move.user_id].totalScore += wordScore.totalScore;
    });

    return scores;
  }
}