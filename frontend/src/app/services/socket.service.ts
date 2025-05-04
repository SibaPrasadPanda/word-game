import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.apiUrl);
  }

  joinGame(gameId: string): void {
    this.socket.emit('joinGame', gameId);
  }

  onGameUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('gameUpdate', (data) => {
        observer.next(data);
      });
    });
  }

  onMovesUpdate(): Observable<any> {
    return new Observable(observer => {
      this.socket.on('movesUpdate', (data) => {
        observer.next(data);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}