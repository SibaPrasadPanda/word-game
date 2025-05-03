import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { interval, Subscription, takeWhile } from 'rxjs';
import { GameService, GameRoom, GameMove } from '../../services/game.service';
import { WordService, WordMeaning } from '../../services/word.service';
import { MatCard, MatCardContent } from '@angular/material/card';

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCard,
    MatCardContent
  ]
})
export class GameBoardComponent implements OnInit, OnDestroy {
  game: GameRoom | null = null;
  moves: GameMove[] = [];
  currentWord: string = '';
  currentWordMeaning: WordMeaning | null = null;
  currentUserId: string = '';
  private pollSubscription?: Subscription;
  errorMessage: string = '';

  constructor(
    private gameService: GameService,
    private wordService: WordService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentUserId = localStorage.getItem('user_id') || '';
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const gameId = params['id'];
      this.loadGame(gameId);
      this.setupPolling(gameId);
    });
  }

  ngOnDestroy() {
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  private loadGame(gameId: string) {
    this.gameService.getGame(gameId).subscribe({
      next: (response) => {
        this.game = response.game;
        
        // Only load moves if game is not finished
        if (!this.isGameEnded) {
          this.loadMoves(gameId);
        }

        // If game just ended, unsubscribe from polling
        if (this.isGameEnded && this.pollSubscription) {
          this.pollSubscription.unsubscribe();
        }
      },
      error: (error: { message: string }) => {
        console.error('Error loading game:', error);
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

  private setupPolling(gameId: string) {
    this.pollSubscription = interval(3000).pipe(
      takeWhile(() => !this.isGameEnded) // Stop polling when game ends
    ).subscribe(() => {
      if (!this.isGameEnded) {
        this.loadGame(gameId);
      }
    });
  }
  

  private isDuplicateWord(word: string): boolean {
    return this.moves.some(move => move.word.toLowerCase() === word.toLowerCase());
  }

  get isYourTurn(): boolean {
    if (!this.game) return false;

    // Player 1's turn when moves length is even (0, 2, 4...)
    // Player 2's turn when moves length is odd (1, 3, 5...)
    const isPlayer1 = this.currentUserId === this.game.player1_id;
    const isEvenMoves = this.moves.length % 2 === 0;

    return (isPlayer1 && isEvenMoves) || (!isPlayer1 && !isEvenMoves);
  }

  get opponentId(): string | null {
    if (!this.game) return null;
    return this.currentUserId === this.game.player1_id
      ? this.game.player2_id
      : this.game.player1_id;
  }

  get turnIndicator(): string {
    if (!this.game) return '';
    if (this.isYourTurn) {
      return "It's your turn!";
    }
    return "Opponent's turn";
  }

  getWordHint(): string {
    if (this.moves.length === 0) {
      return 'Enter any word to start';
    }
    const lastWord = this.moves[this.moves.length - 1].word;
    const lastLetter = lastWord.charAt(lastWord.length - 1);
    return `Enter a word starting with '${lastLetter}'`;
  }

  private showError(message: string) {
    this.errorMessage = message;
    // Clear error after 3 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  private validateWordChain(word: string): boolean {
    if (this.moves.length === 0) return true;

    const lastWord = this.moves[this.moves.length - 1].word;
    const lastLetter = lastWord.charAt(lastWord.length - 1);
    const firstLetter = word.charAt(0);

    return lastLetter.toLowerCase() === firstLetter.toLowerCase();
  }

  submitWord() {
    if (!this.currentWord || !this.game || !this.isYourTurn) {
      return;
    }

    const word = this.currentWord.toLowerCase();

    // Check if word starts with last letter of previous word
    if (!this.validateWordChain(word)) {
      this.showError(`Word must start with '${this.moves[this.moves.length - 1].word.slice(-1)}'`);
      return;
    }

    // Check for duplicate word
    if (this.isDuplicateWord(word)) {
      this.showError('This word has already been used!');
      return;
    }

    const gameId = this.game.id;
    this.gameService.submitMove(gameId, this.currentUserId, word).subscribe({
      next: (response) => {
        this.currentWord = '';
        this.moves = [...this.moves, response.move];
        this.loadGame(gameId);
      },
      error: (error: { message: string }) => {
        console.error('Error submitting word:', error);
        this.showError(error.message);
      }
    });
  }

  lookupWord(word: string) {
    this.wordService.getWordMeaning(word).subscribe({
      next: (meaning) => {
        this.currentWordMeaning = meaning;
      },
      error: (error: { message: string }) => {
        console.error('Error looking up word:', error);
        // TODO: Add error handling UI
      }
    });
  }

  surrender() {
    if (!this.game) return;

    const opponentId = this.currentUserId === this.game.player1_id
      ? this.game.player2_id
      : this.game.player1_id;

    if (!opponentId) return;

    this.gameService.endGame(this.game.id, opponentId).subscribe({
      next: () => {
        this.showError('You surrendered. Your opponent wins!');
        if (this.game) {
          this.game.status = 'FINISHED';
        }
        if (this.game) {
          this.game.winner_id = opponentId;
        }
        // this.loadGame(this.game!.id);
      },
      error: (error: { message: string }) => {
        this.showError('Failed to surrender: ' + error.message);
      }
    });
  }

  get isGameEnded(): boolean {
    return this.game?.status === 'FINISHED';
  }

  get isWinner(): boolean {
    return this.game?.winner_id === this.currentUserId;
  }

  get gameEndMessage(): string {
    if (!this.isGameEnded) return '';
    return this.isWinner ?
      'Congratulations! You won the game!' :
      'Game Over - Your opponent won!';
  }

  startNewGame() {
    this.gameService.createGame(this.currentUserId).subscribe({
      next: (response) => {
        this.router.navigate(['/game', response.game.id]);
      },
      error: (error) => this.showError('Failed to create new game')
    });
  }

}
