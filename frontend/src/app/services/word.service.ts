import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WordMeaning {
  word: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{
      definition: string;
      example?: string;
    }>;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class WordService {
  private apiUrl = `${environment.apiUrl}/word`;

  constructor(private http: HttpClient) {}

  getWordMeaning(word: string): Observable<WordMeaning> {
    return this.http.get<WordMeaning>(`${this.apiUrl}/${word}/meaning`);
  }
}