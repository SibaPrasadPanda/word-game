import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { WaitingRoomComponent } from './components/waiting-room/waiting-room.component';
import { ResultComponent } from './components/result/result.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'game/:id', component: GameBoardComponent },
  { path: 'waiting-room/:id', component: WaitingRoomComponent },
  { path: 'result/:id', component: ResultComponent },
  { path: '**', redirectTo: '' }
];
