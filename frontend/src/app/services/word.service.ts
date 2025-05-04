import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface License {
  name: string;
  url: string;
}

export interface Phonetic {
  text?: string;
  audio?: string;
  sourceUrl?: string;
  license?: License;
}

export interface WordMeaning {
  word: string;
  phonetics: Phonetic[];
  meanings: Meaning[];
  license: License;
  sourceUrls: string[];
}

export interface Meaning {
  partOfSpeech: string;
  definitions: WordDefinition[];
  synonyms: string[];
  antonyms: string[];
}

export interface WordDefinition {
  definition: string;
  synonyms: string[];
  antonyms: string[];
  example?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WordService {
  private apiUrl = 'https://api.dictionaryapi.dev/api/v2/entries/en';

  constructor(private http: HttpClient) {}

  getWordMeaning(word: string): Observable<WordMeaning> {
    return this.http.get<WordMeaning[]>(`${this.apiUrl}/${word}`).pipe(
      map(response => response[0]),
      catchError(error => {
        console.error('Dictionary API error:', error);
        throw new Error(error.status === 404 ? 
          'Word not found in dictionary' : 
          'Failed to fetch word meaning');
      })
    );
  }

  // Helper method to get audio URL if available
  getAudioUrl(word: WordMeaning): string | null {
    const phoneticWithAudio = word.phonetics.find(p => p.audio);
    return phoneticWithAudio?.audio || null;
  }

  // Helper method to get readable phonetic text
  getPhoneticText(word: WordMeaning): string | null {
    const phoneticWithText = word.phonetics.find(p => p.text);
    return phoneticWithText?.text || null;
  }
}