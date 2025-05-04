import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { interval, Subject, Subscription } from 'rxjs';
import { takeWhile, debounceTime, switchMap, catchError } from 'rxjs/operators';
import { GameService, GameRoom, GameMove } from '../../services/game.service';
import { WordService, WordMeaning } from '../../services/word.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WordSearchComponent } from '../word-search/word-search.component';
import { ComputerplayerService } from '../../services/computerplayer.service';
import { SocketService } from '../../services/socket.service';

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
    MatCardContent,
    WordSearchComponent
  ]
})
export class GameBoardComponent implements OnInit, OnDestroy {
  @ViewChild('wordHistory') private wordHistoryElement!: ElementRef;
  game: GameRoom | null = null;
  moves: GameMove[] = [];
  currentWord: string = '';
  currentWordMeaning: WordMeaning | null = null;
  currentUserId: string = '';
  private pollSubscription?: Subscription;
  errorMessage: string = '';
  private isComputerMoveInProgress = false;
  private pollInterval = 3000; // Start with 3 seconds
  private maxPollInterval = 10000; // Max 10 seconds
  private gameUpdateSubject = new Subject<string>();
  private movesUpdateSubject = new Subject<string>();

  constructor(
    private gameService: GameService,
    private wordService: WordService,
    private computerPlayer: ComputerplayerService,
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.currentUserId = localStorage.getItem('user_id') || '';
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const gameId = params['id'];
      if (gameId) {
        this.loadInitialData(gameId);
        this.setupWebSocket(gameId);
      }
    });
  }

  ngOnDestroy() {
    this.socketService.disconnect();
    this.gameUpdateSubject.complete();
    this.movesUpdateSubject.complete();
  }

  private loadInitialData(gameId: string) {
    this.loadGame(gameId);
    this.loadMoves(gameId);
  }

  private loadGame(gameId: string) {
    this.gameService.getGame(gameId).subscribe({
      next: (response) => {
        this.game = response.game;

        // Make computer move if it's computer's turn
        if (this.game.is_vs_computer && !this.isYourTurn && !this.isGameEnded) {
          // Add delay and check if move is not already in progress
          if (!this.isComputerMoveInProgress) {
            setTimeout(() => this.makeComputerMove(), 1000);
          }
        }

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
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error: { message: string }) => console.error('Error loading moves:', error)
    });
  }

  private setupWebSocket(gameId: string) {
    this.socketService.joinGame(gameId);
    
    this.socketService.onGameUpdate().subscribe({
      next: (data) => {
        this.game = data.game;
        
        if (this.game?.is_vs_computer && !this.isYourTurn && !this.isGameEnded) {
          if (!this.isComputerMoveInProgress) {
            setTimeout(() => this.makeComputerMove(), 1000);
          }
        }
      }
    });

    this.socketService.onMovesUpdate().subscribe({
      next: (data) => {
        this.moves = data.moves;
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

    // First validate word exists in dictionary
    this.wordService.getWordMeaning(word).subscribe({
      next: () => {
        // Word is valid, proceed with submission
        const gameId = this.game!.id;
        this.gameService.submitMove(gameId, this.currentUserId, word).subscribe({
          next: (response) => {
            this.currentWord = '';
            this.loadGame(gameId);
            setTimeout(() => this.scrollToBottom(), 100);
          },
          error: (error: { message: string }) => {
            console.error('Error submitting word:', error);
            this.showError(error.message);
          }
        });
      },
      error: () => {
        this.showError('Invalid word. Please check spelling.');
      }
    });
  }

  playAudio(audioUrl: string) {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(error => {
        console.error('Error playing audio:', error);
        this.showError('Could not play pronunciation');
      });
    }
  }

  lookupWord(word: string) {
    this.wordService.getWordMeaning(word).subscribe({
      next: (meaning) => {
        this.currentWordMeaning = meaning;
        // Remove audio play from here since we now have a dedicated button
      },
      error: (error: { message: string }) => {
        this.showError('Word not found in dictionary');
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
        // Force immediate game state update
        this.game!.status = 'FINISHED';
        this.game!.winner_id = opponentId;
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

    if (this.isWinner) {
      return 'Congratulations! You won the game!';
    }
    return 'Game Over - You surrendered!';
  }

  startNewGame() {
    this.gameService.createGame(this.currentUserId).subscribe({
      next: (response) => {
        this.router.navigate(['/game', response.game.id]);
      },
      error: (error) => this.showError('Failed to create new game')
    });
  }

  private makeComputerMove() {
    if (!this.game || !this.moves.length || this.isComputerMoveInProgress) return;

    this.isComputerMoveInProgress = true;
    const lastWord = this.moves[this.moves.length - 1].word;
    const startLetter = lastWord.charAt(lastWord.length - 1);

    this.computerPlayer.findWord(startLetter).subscribe({
      next: (word) => {
        // Check if word is already used before validating with dictionary
        if (this.isDuplicateWord(word)) {
          console.log('Computer found duplicate word, trying again...');
          this.isComputerMoveInProgress = false;
          this.makeComputerMove();
          return;
        }

        this.wordService.getWordMeaning(word).subscribe({
          next: () => {
            this.gameService.submitMove(this.game!.id, 'computer', word).subscribe({
              next: (response) => {
                this.loadGame(this.game!.id);
                this.isComputerMoveInProgress = false;
              },
              error: (error) => {
                console.error('Computer move error:', error);
                this.isComputerMoveInProgress = false;
                // If error is due to duplicate word, try again
                if (error.message?.includes('already been used')) {
                  this.makeComputerMove();
                }
              }
            });
          },
          error: () => {
            // Try another word if invalid or duplicate
            this.isComputerMoveInProgress = false;
            this.makeComputerMove();
          }
        });
      },
      error: () => {
        console.error('Could not find word for computer');
        this.isComputerMoveInProgress = false;
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.wordHistoryElement.nativeElement.scrollTop = this.wordHistoryElement.nativeElement.scrollHeight;
    } catch(err) { }
  }

}
