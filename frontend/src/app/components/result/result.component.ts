import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { GameService, GameRoom, GameMove } from '../../services/game.service';

@Component({
  selector: 'app-result',
  templateUrl: './result.component.html',
  styleUrls: ['./result.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule
  ]
})
export class ResultComponent implements OnInit {
  game: GameRoom | null = null;
  moves: GameMove[] = [];
  currentUserId: string = '';

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentUserId = localStorage.getItem('user_id') || '';
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const gameId = params['id'];
      this.loadGameResult(gameId);
    });
  }

  get isWinner(): boolean {
    return this.game?.winner_id === this.currentUserId;
  }

  private loadGameResult(gameId: string) {
    this.gameService.getGame(gameId).subscribe({
      next: (response) => {
        this.game = response.game;
        this.loadMoves(gameId);
      },
      error: (error: { message: string }) => {
        console.error('Error loading game result:', error);
        this.router.navigate(['/']);
      }
    });
  }

  private loadMoves(gameId: string) {
    this.gameService.getMoves(gameId).subscribe({
      next: (response) => {
        this.moves = response.moves;
      },
      error: (error: { message: string }) => console.error('Error loading moves:', error)
    });
  }

  getPlayerWordCount(): number {
    return this.moves.filter(move => move.user_id === this.currentUserId).length;
  }

  playAgain() {
    // Start a new game
    const guestId = 'guest_' + Math.random().toString(36).substring(2);
    localStorage.setItem('user_id', guestId);
    
    this.gameService.createGame(guestId).subscribe({
      next: (response) => {
        localStorage.setItem('gameId', response.game.id);
        this.router.navigate(['/waiting-room', response.game.id]);
      },
      error: (error: { message: string }) => console.error('Error creating new game:', error)
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }
}
