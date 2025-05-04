import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ComputerplayerService {
  private dataMuseUrl = 'https://api.datamuse.com/words';
  private randomWordUrl = 'https://random-word-api.herokuapp.com/word';
  private wordsApiUrl = 'https://api.wordnik.com/v4/words.json/randomWord';

  // Large set of common words for fallback
  private commonWords: { [key: string]: string[] } = {
    a: ['apple', 'amazing', 'adventure', 'afternoon', 'answer'],
    b: ['banana', 'beautiful', 'bridge', 'bright', 'brave'],
    c: ['coffee', 'computer', 'creative', 'candy', 'circle'],
    d: ['dance', 'dream', 'dinner', 'diamond', 'dragon'],
    e: ['eagle', 'earth', 'energy', 'evening', 'exercise'],
    f: ['flower', 'friend', 'future', 'forest', 'freedom'],
    g: ['garden', 'gentle', 'glass', 'golden', 'grace'],
    h: ['happy', 'heart', 'honey', 'health', 'heaven'],
    i: ['island', 'impact', 'image', 'idea', 'inspire'],
    j: ['journey', 'justice', 'jungle', 'jacket', 'juice'],
    k: ['kitchen', 'kindness', 'kingdom', 'knight', 'knowledge'],
    l: ['laugh', 'light', 'letter', 'library', 'love'],
    m: ['music', 'magic', 'morning', 'mountain', 'miracle'],
    n: ['nature', 'night', 'noble', 'north', 'needle'],
    o: ['ocean', 'orange', 'olive', 'origin', 'observe'],
    p: ['peace', 'planet', 'purple', 'pencil', 'party'],
    q: ['quiet', 'queen', 'quick', 'quality', 'quest'],
    r: ['river', 'rainbow', 'rabbit', 'rain', 'rose'],
    s: ['summer', 'sunshine', 'smile', 'silver', 'star'],
    t: ['table', 'tree', 'time', 'travel', 'truth'],
    u: ['umbrella', 'unity', 'unique', 'universe', 'urban'],
    v: ['voice', 'violet', 'vision', 'village', 'value'],
    w: ['water', 'window', 'wonder', 'wisdom', 'world'],
    x: ['xylophone'],
    y: ['yellow', 'young', 'youth', 'year', 'yesterday'],
    z: ['zebra', 'zero', 'zone', 'zoom', 'zest']
  };

  constructor(private http: HttpClient) {}

  findWord(startsWith: string): Observable<string> {
    const letter = startsWith.toLowerCase();
    
    // Try DataMuse API first
    return this.http.get<any[]>(`${this.dataMuseUrl}?sp=${letter}*&max=50`).pipe(
      switchMap(words => {
        if (words.length > 0) {
          const randomIndex = Math.floor(Math.random() * words.length);
          return of(words[randomIndex].word);
        }
        // If DataMuse fails, use fallback words
        return this.getFallbackWord(letter);
      }),
      catchError(() => this.getFallbackWord(letter))
    );
  }

  private getFallbackWord(letter: string): Observable<string> {
    // Get words from our fallback dictionary for this letter
    const fallbackWords = this.commonWords[letter] || [];
    
    if (fallbackWords.length > 0) {
      const randomIndex = Math.floor(Math.random() * fallbackWords.length);
      return of(fallbackWords[randomIndex]);
    }

    // If somehow we don't have fallback words, create a simple word
    return of(letter + this.getRandomSuffix());
  }

  private getRandomSuffix(): string {
    const suffixes = ['able', 'ing', 'ation', 'ful', 'ness', 'ment', 'ly', 'ish', 'ous'];
    return suffixes[Math.floor(Math.random() * suffixes.length)];
  }
}