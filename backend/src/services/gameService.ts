import { supabase } from '../index';
import { GameRoom, GameMove } from '../models/types';

export class GameService {
  async createGame(user_id: string) {
    const { data: game, error } = await supabase
      .from('game_rooms')
      .insert([
        {
          player1_id: user_id,
          status: 'WAITING',
          current_turn: user_id
        }
      ])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return game;
  }

  async joinGame(gameId: string, player2Id: string): Promise<GameRoom> {
    try {
      // First check if the game exists and is available to join
      const { data: existingGame, error: fetchError } = await supabase
        .from('game_rooms')
        .select()
        .eq('id', gameId)
        .single();

      if (fetchError) {
        console.error('Fetch game error:', fetchError);
        throw new Error('Game not found');
      }

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
      const { data: updatedGame, error: updateError } = await supabase
        .from('game_rooms')
        .update({
          player2_id: player2Id,
          status: 'ONGOING',
          current_turn: existingGame.player1_id // Set turn back to player 1
        })
        .eq('id', gameId)
        .eq('status', 'WAITING') // Additional check
        .select()
        .single();

      if (updateError) {
        console.error('Update game error:', updateError);
        throw new Error(`Failed to update game: ${updateError.message}`);
      }

      if (!updatedGame) {
        throw new Error('Game not found or already joined');
      }

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
      const { data: game } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', gameId)
        .single();

      if (!game) {
        throw new Error('Game not found');
      }

      // Insert the move
      const { data: move, error: moveError } = await supabase
        .from('game_moves')
        .insert([{
          game_room_id: gameId,
          user_id,
          word
        }])
        .select()
        .single();

      if (moveError) throw moveError;

      // Update the game's current turn to the other player
      const nextTurn = user_id === game.player1_id ? game.player2_id : game.player1_id;

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ current_turn: nextTurn })
        .eq('id', gameId);

      if (updateError) throw updateError;

      return move;
    } catch (error: any) {
      console.error('Submit move error:', error);
      throw error;
    }
  }

  private async validateMove(gameId: string, word: string): Promise<void> {
    const { data: existingMoves, error: movesError } = await supabase
      .from('game_moves')
      .select('word')
      .eq('game_room_id', gameId)
      .eq('word', word.toLowerCase());

    if (movesError) throw movesError;

    if (existingMoves && existingMoves.length > 0) {
      throw new Error('This word has already been used in this game');
    }
    // Get last move
    const { data: lastMove } = await supabase
      .from('game_moves')
      .select()
      .eq('game_room_id', gameId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (lastMove) {
      // Check if word starts with last letter of previous word
      const lastWord = lastMove.word;
      if (word.charAt(0).toLowerCase() !== lastWord.charAt(lastWord.length - 1).toLowerCase()) {
        throw new Error('Word must start with the last letter of the previous word');
      }
    }

    // Check if word has been used before in this game
    const { data: existingMove } = await supabase
      .from('game_moves')
      .select()
      .eq('game_room_id', gameId)
      .eq('word', word)
      .single();

    if (existingMove) {
      throw new Error('Word has already been used in this game');
    }

    // TODO: Add dictionary API validation
  }

  private async updateGameTurn(gameId: string, currentUserId: string): Promise<void> {
    const { data: gameRoom } = await supabase
      .from('game_rooms')
      .select()
      .eq('id', gameId)
      .single();

    if (!gameRoom) throw new Error('Game not found');

    const nextTurn = gameRoom.player1_id === currentUserId ? gameRoom.player2_id : gameRoom.player1_id;

    await supabase
      .from('game_rooms')
      .update({ current_turn: nextTurn })
      .eq('id', gameId);
  }

  async endGame(gameId: string, winnerId: string): Promise<void> {
    const { error } = await supabase
        .from('game_rooms')
        .update({ 
            status: 'FINISHED',
            winner_id: winnerId 
        })
        .eq('id', gameId);

    if (error) {
        console.error('End game error:', error);
        throw new Error('Failed to end game');
    }
}
}