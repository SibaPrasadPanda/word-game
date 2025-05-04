import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-success-message',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="success-message" *ngIf="message" [@fadeInOut]>
      <mat-icon>check_circle</mat-icon>
      <span>{{ message }}</span>
    </div>
  `,
  styles: [`
    .success-message {
      background: rgba(34, 197, 94, 0.1);
      color: #16a34a;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      font-weight: 500;
      text-align: center;
      animation: slideIn 0.3s ease-out;
      border-left: 4px solid #16a34a;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class SuccessMessageComponent {
  @Input() message: string = '';
}