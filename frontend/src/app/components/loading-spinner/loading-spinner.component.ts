import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  template: `
    <div class="spinner-overlay" *ngIf="loading$ | async">
      <div class="spinner-container">
        <mat-spinner diameter="50"></mat-spinner>
        <span class="loading-text">Loading...</span>
      </div>
    </div>
  `,
  styles: [`
    .spinner-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(255, 255, 255, 0.8);
      backdrop-filter: blur(3px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
    }

    .spinner-container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .loading-text {
      color: #4f46e5;
      font-size: 1rem;
      font-weight: 500;
    }

    :host {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 99999;
    }

    :host .spinner-overlay {
      pointer-events: all;
    }
  `]
})
export class LoadingSpinnerComponent implements OnInit {
  loading$: any

  constructor(private loadingService: LoadingService) {}
    ngOnInit(): void {
        this.loading$ = this.loadingService.loading$;
    }
}