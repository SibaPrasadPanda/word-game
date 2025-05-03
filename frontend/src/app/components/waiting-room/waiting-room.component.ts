import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, Subscription } from 'rxjs';
import { GameService } from '../../services/game.service';

@Component({
  selector: 'app-waiting-room',
  templateUrl: './waiting-room.component.html',
  styleUrls: ['./waiting-room.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class WaitingRoomComponent implements OnInit, OnDestroy {
  shareableLink: string = '';
  private gameId: string = '';
  private pollSubscription?: Subscription;

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.gameId = params['id'];
      this.shareableLink = `${window.location.origin}/game/${this.gameId}`;
      this.setupPolling();
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  private setupPolling() {
    this.pollSubscription = interval(2000).subscribe(() => {
      this.checkGameStatus();
    });
  }

  private checkGameStatus() {
    this.gameService.getGame(this.gameId).subscribe({
      next: (response) => {
        if (response.game.status === 'ONGOING') {
          this.router.navigate(['/game', this.gameId]);
        }
      },
      error: (error: { message: string }) => {
        console.error('Error checking game status:', error);
        this.router.navigate(['/']);
      }
    });
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareableLink);
  }

  cancelGame() {
    this.router.navigate(['/']);
  }
}
