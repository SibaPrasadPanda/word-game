import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { WordService } from './word.service';

@Injectable({
  providedIn: 'root'
})
export class ComputerplayerService {
  private wordsApiUrl = 'https://api.datamuse.com/words';

  constructor(
    private http: HttpClient,
    private wordService: WordService
  ) {}

  findWord(startsWith: string): Observable<string> {
    return this.http.get<any[]>(`${this.wordsApiUrl}?sp=${startsWith}*`).pipe(
      map(words => {
        if (!words.length) throw new Error('No word found');
        // Get a random word from first 10 results
        const randomIndex = Math.floor(Math.random() * Math.min(10, words.length));
        return words[randomIndex].word;
      })
    );
  }
}