import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { GameService } from '../../services/game.service';
import { CommonModule, NgIf } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,NgIf
  ]
})
export class HomeComponent {
  gameLink: string = '';
  shareableLink: string = '';

  constructor(
    private gameService: GameService,
    private router: Router
  ) {}

  async createGame() {
    // For now, create a temporary guest user ID
    const guestId = 'guest_' + Math.random().toString(36).substring(2);
    
    this.gameService.createGame(guestId).subscribe({
      next: (response) => {
        this.shareableLink = response.shareableLink;
        localStorage.setItem('user_id', guestId);
        localStorage.setItem('gameId', response.game.id);
        this.router.navigate(['/waiting-room', response.game.id]);
      },
      error: (error: { message: string }) => {
        console.error('Error creating game:', error);
        // TODO: Add error handling UI
      }
    });
  }

  joinGame() {
    if (!this.gameLink) return;

    const gameId = this.extractGameId(this.gameLink);
    if (!gameId) {
      console.error('Invalid game link');
      return;
    }

    const guestId = 'guest_' + Math.random().toString(36).substring(2);
    
    this.gameService.joinGame(gameId, guestId).subscribe({
      next: (response) => {
        localStorage.setItem('user_id', guestId);
        localStorage.setItem('gameId', gameId);
        this.router.navigate(['/game', gameId]);
      },
      error: (error: { message: string }) => {
        console.error('Error joining game:', error);
        // TODO: Add error handling UI
      }
    });
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareableLink);
    // TODO: Add copy confirmation UI
  }

  private extractGameId(link: string): string | null {
    const segments = link.split('/');
    return segments[segments.length - 1] || null;
  }
}
