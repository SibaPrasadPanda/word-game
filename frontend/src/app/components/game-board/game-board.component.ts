import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { interval, Subject, Subscription } from 'rxjs';
import { takeWhile, debounceTime, switchMap, catchError } from 'rxjs/operators';
import { GameService, GameRoom, GameMove, PlayerScore } from '../../services/game.service';
import { WordService, WordMeaning } from '../../services/word.service';
import { MatCard, MatCardContent } from '@angular/material/card';
import { WordSearchComponent } from '../word-search/word-search.component';
import { ComputerplayerService } from '../../services/computerplayer.service';
import { SocketService } from '../../services/socket.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-game-board',
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCard,
    MatCardContent,
    WordSearchComponent,
    LoadingSpinnerComponent
  ]
})
export class GameBoardComponent implements OnInit, OnDestroy {
  @ViewChild('scrollArea') private scrollAreaElement!: ElementRef;
  @ViewChild('wordInput') private wordInputElement!: ElementRef<HTMLInputElement>;
  game: GameRoom | null = null;
  moves: GameMove[] = [];
  currentWord: string = '';
  currentWordMeaning: WordMeaning | null = null;
  currentUserId: string = '';
  private pollSubscription?: Subscription;
  private gameUpdateSubscription?: Subscription;
  private movesUpdateSubscription?: Subscription;
  private scoresSubscription?: Subscription;
  errorMessage: string = '';
  private isComputerMoveInProgress = false;
  private pollInterval = 3000; // Start with 3 seconds
  private maxPollInterval = 10000; // Max 10 seconds
  private gameUpdateSubject = new Subject<string>();
  private movesUpdateSubject = new Subject<string>();
  playerScores: { [key: string]: PlayerScore } = {};

  // Blitz Turn Timer
  timeLeft: number = 15;
  private timerInterval?: any;

  // Tactical Power-Ups state
  powerUps = {
    skipUsed: false,
    revealUsed: false,
    freezeUsed: false
  };
  hints: string[] = [];

  // Live Reactions floating state
  reactions: { emoji: string; id: number; styleRight: number }[] = [];
  private nextReactionId = 0;
  private socketReactionSubscription?: Subscription;

  constructor(
    private gameService: GameService,
    private wordService: WordService,
    private computerPlayer: ComputerplayerService,
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router,
    private loadingService: LoadingService
  ) {
    this.currentUserId = localStorage.getItem('user_id') || '';
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const gameId = params['id'];
      if (gameId) {
        // Clear any previous state/timers first
        this.clearTimer();
        this.hints = [];
        this.reactions = [];
        this.errorMessage = '';
        this.currentWord = '';
        this.currentWordMeaning = null;

        this.loadPowerUps(gameId);
        this.loadInitialData(gameId);
        this.setupWebSocket(gameId);
      }
    });
  }

  ngOnDestroy() {
    this.clearTimer();
    this.socketService.disconnect();
    this.gameUpdateSubject.complete();
    this.movesUpdateSubject.complete();
    this.scoresSubscription?.unsubscribe();
    this.gameUpdateSubscription?.unsubscribe();
    this.movesUpdateSubscription?.unsubscribe();
    this.socketReactionSubscription?.unsubscribe();
  }

  private loadInitialData(gameId: string) {
    this.loadGame(gameId);
    this.loadMoves(gameId);
  }

  private loadGame(gameId: string) {
    this.loadingService.setLoading(true);
    this.gameService.getGame(gameId).subscribe({
      next: (response) => {
        if (response.game.status === 'FINISHED' && response.game.winner_id === this.currentUserId) {
          if (!this.game || this.game.status !== 'FINISHED') {
            this.triggerConfetti();
          }
        }

        this.game = response.game;
        this.handleTurnChange();

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
        this.loadingService.setLoading(false);
      },
      error: (error: { message: string }) => {
        console.error('Error loading game:', error);
        this.router.navigate(['/']);
        this.loadingService.setLoading(false);
      }
    });
  }

  private loadMoves(gameId: string) {
    this.gameService.getMoves(gameId).subscribe({
      next: (response) => {
        this.moves = response.moves;
        this.handleTurnChange();
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error: { message: string }) => console.error('Error loading moves:', error)
    });
  }

  private setupWebSocket(gameId: string) {
    // Unsubscribe from previous subscriptions to avoid duplicate event calls
    this.gameUpdateSubscription?.unsubscribe();
    this.movesUpdateSubscription?.unsubscribe();
    this.scoresSubscription?.unsubscribe();
    this.socketReactionSubscription?.unsubscribe();

    this.socketService.joinGame(gameId);
    
    this.gameUpdateSubscription = this.socketService.onGameUpdate().subscribe({
      next: (data) => {
        if (data.game.status === 'FINISHED' && data.game.winner_id === this.currentUserId) {
          if (!this.game || this.game.status !== 'FINISHED') {
            this.triggerConfetti();
          }
        }

        this.game = data.game;
        this.handleTurnChange();
        
        if (this.game?.is_vs_computer && !this.isYourTurn && !this.isGameEnded) {
          if (!this.isComputerMoveInProgress) {
            setTimeout(() => this.makeComputerMove(), 1000);
          }
        }
      }
    });

    this.movesUpdateSubscription = this.socketService.onMovesUpdate().subscribe({
      next: (data) => {
        this.moves = data.moves;
        this.handleTurnChange();
      }
    });

    this.scoresSubscription = this.socketService.onGameUpdate().subscribe(() => {
      this.updateScores();
    });

    this.socketReactionSubscription = this.socketService.onReactionReceived().subscribe({
      next: (data) => {
        this.showReaction(data.emoji);
      }
    });
  }

  private updateScores() {
    if (!this.game) return;
    
    this.gameService.getGameScores(this.game.id).subscribe({
      next: (response) => {
        this.playerScores = response.scores;
      },
      error: (error) => {
        console.error('Error fetching scores:', error);
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

    const word = this.currentWord.toLowerCase().trim();

    // Client-side: minimum length guard (instant feedback, no network round-trip)
    if (word.length < 3) {
      this.showError('Word must be at least 3 letters long');
      return;
    }

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

    this.loadingService.setLoading(true);
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
            this.loadingService.setLoading(false);
          },
          error: (error: any) => {
            console.error('Error submitting word:', error);
            // Angular HttpErrorResponse: server body is in error.error
            const msg = error?.error?.error || error?.error?.message || error?.message || 'Failed to submit word';
            this.showError(msg);
            this.loadingService.setLoading(false);
          }
        });
      },
      error: () => {
        this.showError('Invalid word. Please check spelling.');
        this.loadingService.setLoading(false);
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
    if (this.currentWordMeaning && this.currentWordMeaning.word.toLowerCase() === word.toLowerCase()) {
      this.currentWordMeaning = null;
      return;
    }
    this.loadingService.setLoading(true);
    this.wordService.getWordMeaning(word).subscribe({
      next: (meaning) => {
        this.currentWordMeaning = meaning;
        this.loadingService.setLoading(false);
      },
      error: (error: { message: string }) => {
        this.showError('Word not found in dictionary');
        this.loadingService.setLoading(false);
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
    const isVsComputer = this.game?.is_vs_computer || false;
    this.clearTimer();

    if (isVsComputer) {
      this.gameService.createGameVsComputer(this.currentUserId).subscribe({
        next: (response) => {
          this.router.navigate(['/game', response.game.id]);
        },
        error: (error) => this.showError('Failed to create new game')
      });
    } else {
      this.gameService.createGame(this.currentUserId).subscribe({
        next: (response) => {
          this.router.navigate(['/game', response.game.id]);
        },
        error: (error) => this.showError('Failed to create new game')
      });
    }
  }

  private makeComputerMove() {
    if (!this.game || !this.moves.length || this.isComputerMoveInProgress) return;

    this.isComputerMoveInProgress = true;
    this.loadingService.setLoading(true);
    const lastWord = this.moves[this.moves.length - 1].word;
    const startLetter = lastWord.charAt(lastWord.length - 1);

    this.computerPlayer.findWord(startLetter).subscribe({
      next: (word) => {
        if (this.isDuplicateWord(word)) {
          console.log('Computer found duplicate word, trying again...');
          this.isComputerMoveInProgress = false;
          this.loadingService.setLoading(false);
          this.makeComputerMove();
          return;
        }

        this.wordService.getWordMeaning(word).subscribe({
          next: () => {
            this.gameService.submitMove(this.game!.id, 'computer', word).subscribe({
              next: (response) => {
                this.loadGame(this.game!.id);
                this.isComputerMoveInProgress = false;
                this.loadingService.setLoading(false);
              },
              error: (error) => {
                console.error('Computer move error:', error);
                this.isComputerMoveInProgress = false;
                this.loadingService.setLoading(false);
                if (error.message?.includes('already been used')) {
                  this.makeComputerMove();
                }
              }
            });
          },
          error: () => {
            this.isComputerMoveInProgress = false;
            this.loadingService.setLoading(false);
            this.makeComputerMove();
          }
        });
      },
      error: () => {
        console.error('Could not find word for computer');
        this.isComputerMoveInProgress = false;
        this.loadingService.setLoading(false);
      }
    });
  }

  private scrollToBottom(): void {
    try {
      this.scrollAreaElement.nativeElement.scrollTop = this.scrollAreaElement.nativeElement.scrollHeight;
    } catch(err) { }
  }

  // Blitz Timer & Turn Helpers
  private handleTurnChange() {
    this.clearTimer();
    this.hints = []; // Clear hints on turn change

    if (!this.game || this.isGameEnded) return;

    if (this.isYourTurn) {
      this.timeLeft = 15;
      this.timerInterval = setInterval(() => {
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.clearTimer();
          this.handleTimeOut();
        }
      }, 1000);
      // Auto-focus the input so the player can type immediately
      setTimeout(() => {
        this.wordInputElement?.nativeElement?.focus();
      }, 150);
    }
  }

  private clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private handleTimeOut() {
    this.showError('Time is up! You lost the match.');
    this.surrender();
  }

  // Tactical Power-Ups
  usePowerUp(type: 'skip' | 'reveal' | 'freeze') {
    if (!this.game || this.isGameEnded || !this.isYourTurn) return;

    if (type === 'skip' && !this.powerUps.skipUsed) {
      this.gameService.skipTurn(this.game.id, this.currentUserId).subscribe({
        next: (response) => {
          this.powerUps.skipUsed = true;
          this.savePowerUps();
          this.loadGame(this.game!.id);
        },
        error: (err) => this.showError('Failed to skip turn: ' + err.message)
      });
    } else if (type === 'freeze' && !this.powerUps.freezeUsed) {
      this.timeLeft += 10;
      this.powerUps.freezeUsed = true;
      this.savePowerUps();
    } else if (type === 'reveal' && !this.powerUps.revealUsed) {
      const lastWord = this.moves.length > 0 ? this.moves[this.moves.length - 1].word : '';
      const startLetter = lastWord ? lastWord.charAt(lastWord.length - 1) : 'a';

      this.computerPlayer.findHints(startLetter).subscribe({
        next: (wordHints) => {
          this.hints = wordHints;
          this.powerUps.revealUsed = true;
          this.savePowerUps();
        },
        error: () => this.showError('Could not retrieve hints')
      });
    }
  }

  useHint(hintWord: string) {
    this.currentWord = hintWord;
    this.hints = [];
  }

  private loadPowerUps(gameId: string) {
    const data = localStorage.getItem(`powerups_${gameId}`);
    if (data) {
      this.powerUps = JSON.parse(data);
    } else {
      this.powerUps = {
        skipUsed: false,
        revealUsed: false,
        freezeUsed: false
      };
    }
  }

  private savePowerUps() {
    if (this.game) {
      localStorage.setItem(`powerups_${this.game.id}`, JSON.stringify(this.powerUps));
    }
  }

  // Live Reactions
  sendEmoji(emoji: string) {
    if (!this.game) return;
    this.socketService.sendReaction(this.game.id, emoji);
    this.showReaction(emoji);
  }

  private showReaction(emoji: string) {
    const reactionId = this.nextReactionId++;
    const styleRight = Math.floor(Math.random() * 40) + 10; // Random offset between 10px and 50px
    this.reactions.push({ emoji, id: reactionId, styleRight });

    setTimeout(() => {
      this.reactions = this.reactions.filter(r => r.id !== reactionId);
    }, 2500);
  }

  // Confetti Animation
  triggerConfetti() {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = ['#0071e3', '#34c759', '#ff3b30', '#ff9500', '#af52de', '#ffcc00'];
    const particles: any[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        r: Math.random() * 6 + 4,
        d: Math.random() * canvas.height,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.random() * 10 - 5,
        tiltAngleIncremental: Math.random() * 0.07 + 0.02,
        tiltAngle: 0
      });
    }

    let animationFrameId: number;
    const duration = 4000; // 4 seconds of confetti
    const startTime = Date.now();

    const draw = () => {
      if (Date.now() - startTime > duration) {
        cancelAnimationFrame(animationFrameId);
        canvas.remove();
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, idx) => {
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.tilt = Math.sin(p.tiltAngle - idx / 3) * 15;

        ctx.beginPath();
        ctx.lineWidth = p.r;
        ctx.strokeStyle = p.color;
        ctx.moveTo(p.x + p.tilt + p.r / 2, p.y);
        ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
        ctx.stroke();

        if (p.y > canvas.height) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
  }
}
