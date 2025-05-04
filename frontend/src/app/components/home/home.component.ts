import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { GameService } from '../../services/game.service';
import { CommonModule, NgIf } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

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
    MatIconModule,NgIf,
    LoadingSpinnerComponent
  ]
})
export class HomeComponent {
  gameLink: string = '';
  shareableLink: string = '';
  errorMessage: string = '';

  constructor(
    private gameService: GameService,
    private router: Router,
    private loadingService: LoadingService
  ) {}

  async createGame() {
    const guestId = 'guest_' + Math.random().toString(36).substring(2);
    localStorage.setItem('user_id', guestId);
    
    this.loadingService.setLoading(true);
    this.gameService.createGame(guestId).subscribe({
      next: (response) => {
        this.shareableLink = response.shareableLink;
        localStorage.setItem('gameId', response.game.id);
        this.router.navigate(['/waiting-room', response.game.id]);
        this.loadingService.setLoading(false);
      },
      error: (error: { message: string }) => {
        this.showError(error.message || 'Failed to create game');
        this.loadingService.setLoading(false);
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
    localStorage.setItem('user_id', guestId);
    
    this.loadingService.setLoading(true);
    this.gameService.joinGame(gameId, guestId).subscribe({
      next: (response) => {
        localStorage.setItem('gameId', gameId);
        this.router.navigate(['/game', gameId]);
        this.loadingService.setLoading(false);
      },
      error: (error: { message: string }) => {
        this.showError(error.message || 'Failed to join game');
        this.loadingService.setLoading(false);
      }
    });
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareableLink);
    // TODO: Add copy confirmation UI
  }

  createGameVsComputer() {
    const guestId = 'guest_' + Math.random().toString(36).substring(2);
    
    this.gameService.createGameVsComputer(guestId).subscribe({
      next: (response) => {
        localStorage.setItem('user_id', guestId);
        localStorage.setItem('gameId', response.game.id);
        // Navigate directly to game since no waiting needed for computer
        this.router.navigate(['/game', response.game.id]);
      },
      error: (error: { message: string }) => {
        this.showError(error.message || 'Failed to create game vs computer');
        this.loadingService.setLoading(false);
      }
    });
  }

  private showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  private extractGameId(link: string): string | null {
    const segments = link.split('/');
    return segments[segments.length - 1] || null;
  }
}
