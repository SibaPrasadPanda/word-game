import { Injectable, inject } from '@angular/core';
import { Firestore, doc, docData, collection, collectionData, query, orderBy } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private firestore: Firestore = inject(Firestore);

  joinGame(gameId: string): void {
    // No-op for Firestore, joining is just listening.
  }

  onGameUpdate(gameId: string): Observable<any> {
    const docRef = doc(this.firestore, `gameRooms/${gameId}`);
    return docData(docRef, { idField: 'id' });
  }

  onMovesUpdate(gameId: string): Observable<any> {
    const colRef = collection(this.firestore, `gameRooms/${gameId}/moves`);
    const q = query(colRef, orderBy('created_at', 'asc'));
    return collectionData(q, { idField: 'id' });
  }

  disconnect(): void {
    // Subscriptions handled by consumers
  }

  // Reactions can be stored in a subcollection or transient, but let's mock for now or use HTTP
  sendReaction(gameId: string, emoji: string): void {
    console.log('Reactions not implemented in Firestore yet');
  }

  onReactionReceived(): Observable<any> {
    return new Observable();
  }
}