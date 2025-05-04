import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WordMeaning } from '../../services/word.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-word-search',
  templateUrl: './word-search.component.html',
  styleUrls: ['./word-search.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    LoadingSpinnerComponent
  ]
})
export class WordSearchComponent {
  @Input() wordMeaning: WordMeaning | null = null;

  constructor(private loadingService: LoadingService) {}

  playAudio(audioUrl: string | undefined) {
    if (audioUrl) {
      this.loadingService.setLoading(true);
      const audio = new Audio(audioUrl);
      audio.play()
        .then(() => this.loadingService.setLoading(false))
        .catch(error => {
          console.error('Error playing audio:', error);
          this.loadingService.setLoading(false);
        });
    }
  }
}