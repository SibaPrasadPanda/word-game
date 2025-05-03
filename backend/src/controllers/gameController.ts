import { Request, Response } from 'express';
import { GameService } from '../services/gameService';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    throw new Error('Missing Supabase credentials in environment variables');
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const gameService = new GameService();

export class GameController {
    createGame = async (req: Request, res: Response) => {
        try {
            const { user_id } = req.body;
            const game = await gameService.createGame(user_id);
            res.json({ game, shareableLink: `${process.env.FRONTEND_URL}/game/${game.id}` });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    joinGame = async (req: Request, res: Response) => {
        try {
            const { gameId } = req.params;
            const { user_id } = req.body;
            const game = await gameService.joinGame(gameId, user_id);
            res.json({ game });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    submitMove = async (req: Request, res: Response) => {
        try {
            const { gameId } = req.params;
            const { user_id, word } = req.body;
            const move = await gameService.submitMove(gameId, user_id, word);
            res.json({ move });
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    }

    getGame = async (req: Request, res: Response) => {
        try {
            const { gameId } = req.params;
            const { data: game } = await supabase
                .from('game_rooms')
                .select()
                .eq('id', gameId)
                .single();

            if (!game) {
                return res.status(404).json({ error: 'Game not found' });
            }

            res.json({ game });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    getMoves = async (req: Request, res: Response) => {
        try {
            const { gameId } = req.params;
            const { data: moves } = await supabase
                .from('game_moves')
                .select()
                .eq('game_room_id', gameId)
                .order('created_at', { ascending: true });

            res.json({ moves });
        } catch (error) {
            res.status(500).json({ error: (error as Error).message });
        }
    }

    endGame = async (req: Request, res: Response) => {
        try {
            const { gameId } = req.params;
            const { winnerId } = req.body;
      
            await gameService.endGame(gameId, winnerId);
            res.status(200).json({ message: 'Game ended successfully' });
          } catch (error: any) {
            res.status(400).json({ error: error.message });
          }
    }
}