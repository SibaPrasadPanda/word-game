import { Router, Request, Response } from 'express';
import { GameController } from '../controllers/gameController';

const router = Router();
const gameController = new GameController();

// Create a new game
router.post('/create', gameController.createGame);

// Join an existing game
router.post('/:gameId/join', gameController.joinGame);

// Get game information
router.get('/:gameId', gameController.getGame);

// Submit a move
router.post('/:gameId/move', gameController.submitMove);

// Get all moves for a game
router.get('/:gameId/moves', gameController.getMoves);

// End game (surrender)
router.post('/:gameId/end', gameController.endGame);

export default router;