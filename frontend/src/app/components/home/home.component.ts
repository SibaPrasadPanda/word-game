import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { GameService } from '../../services/game.service';
import { CommonModule, NgIf } from '@angular/common';
import { LoadingService } from '../../services/loading.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { Auth, user } from '@angular/fire/auth';
import {
  UserProgressService,
  Difficulty,
  DIFFICULTY_CONFIG,
  DifficultySettings,
  UserProgress,
  LEVEL_TIERS
} from '../../services/user-progress.service';

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
    MatIconModule,
    LoadingSpinnerComponent,
    RouterModule
  ]
})
export class HomeComponent implements OnInit {
  private auth: Auth = inject(Auth);
  user$ = user(this.auth);

  playerName = '';
  gameLink: string = '';
  shareableLink: string = '';
  errorMessage: string = '';

  selectedDifficulty: Difficulty = 'normal';
  difficulties: { key: Difficulty; settings: DifficultySettings }[] = [
    { key: 'easy',   settings: DIFFICULTY_CONFIG['easy']   },
    { key: 'normal', settings: DIFFICULTY_CONFIG['normal'] },
    { key: 'hard',   settings: DIFFICULTY_CONFIG['hard']   },
    { key: 'expert', settings: DIFFICULTY_CONFIG['expert'] },
  ];

  gameMode: 'endless' | 'target' = 'endless';
  targetScore: number = 100;

  userProgress!: UserProgress;

  constructor(
    private gameService: GameService,
    private router: Router,
    private loadingService: LoadingService,
    private userProgressService: UserProgressService
  ) {}

  ngOnInit() {
    this.userProgress = this.userProgressService.getProgress();
  }

  async createGame() {
    const guestId = 'guest_' + Math.random().toString(36).substring(2);
    localStorage.setItem('user_id', guestId);

    this.loadingService.setLoading(true);
    const passTarget = this.gameMode === 'target' ? this.targetScore : undefined;
    this.gameService.createGame(guestId, passTarget).subscribe({
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
  }

  createGameVsComputer() {
    const guestId = 'guest_' + Math.random().toString(36).substring(2);

    const passTarget = this.gameMode === 'target' ? this.targetScore : undefined;
    this.gameService.createGameVsComputer(guestId, this.selectedDifficulty, passTarget).subscribe({
      next: (response) => {
        localStorage.setItem('user_id', guestId);
        localStorage.setItem('gameId', response.game.id);
        this.router.navigate(['/game', response.game.id]);
      },
      error: (error: { message: string }) => {
        this.showError(error.message || 'Failed to create game vs computer');
        this.loadingService.setLoading(false);
      }
    });
  }

  selectDifficulty(d: Difficulty) {
    this.selectedDifficulty = d;
  }

  private showError(message: string) {
    this.errorMessage = message;
    setTimeout(() => { this.errorMessage = ''; }, 3000);
  }

  private extractGameId(link: string): string | null {
    const segments = link.split('/');
    return segments[segments.length - 1] || null;
  }
}
