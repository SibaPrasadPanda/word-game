import { Server } from 'socket.io';
import { config } from '../config/config';

export class SocketService {
    private io: Server;

    constructor(server: any) {
        this.io = new Server(server, {
            cors: {
                origin: config.corsOrigin,
                methods: ['GET', 'POST']
            }
        });

        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('joinGame', (gameId) => {
                socket.join(`game_${gameId}`);
                console.log(`Client ${socket.id} joined game ${gameId}`);
            });

            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);
            });
        });
    }

    notifyGameUpdate(gameId: string, data: any) {
        this.io.to(`game_${gameId}`).emit('gameUpdate', data);
    }

    notifyMovesUpdate(gameId: string, data: any) {
        this.io.to(`game_${gameId}`).emit('movesUpdate', data);
    }
}