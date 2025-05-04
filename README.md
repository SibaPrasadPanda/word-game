# Word Chain Game

A real-time multiplayer word game where players take turns creating words that start with the last letter of the previous word.

## Table of Contents
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Game Rules](#game-rules)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Component Structure](#component-structure)
- [Services](#services)
- [Testing](#testing)
- [Deployment](#deployment)

## Features

### Core Game Features
- Real-time multiplayer gameplay
- Player vs Player mode
- Player vs Computer mode
- Word validation with dictionary API
- Word meaning lookups with pronunciation
- Turn-based gameplay
- Word chain validation
- Duplicate word prevention
- Surrender option
- Game state persistence

### User Features
- Guest user support
- Sharable game links
- Real-time game state updates
- Word history tracking
- Game status indicators
- Turn indicators
- Error notifications

### Technical Features
- Real-time updates using polling
- REST API integration
- Dictionary API integration
- Error handling
- Loading states
- Responsive design
- State management
- Data persistence

## Technology Stack

### Frontend
- **Framework**: Angular 16
- **UI Components**: Angular Material
- **Styling**: SCSS
- **HTTP Client**: Angular HttpClient
- **Routing**: Angular Router
- **State Management**: Services & Observables
- **API Integration**: 
  - Dictionary API (api.dictionaryapi.dev)
  - Datamuse API (api.datamuse.com)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: HTTP Polling
- **API**: RESTful
- **Security**: Row Level Security (RLS)

## Architecture

### Frontend Architecture
```
frontend/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── game-board/
│   │   │   ├── home/
│   │   │   ├── waiting-room/
│   │   │   └── word-search/
│   │   ├── services/
│   │   │   ├── game.service.ts
│   │   │   ├── word.service.ts
│   │   │   └── computer-player.service.ts
│   │   └── interfaces/
│   └── environments/
```

### Backend Architecture
```
backend/
├── src/
│   ├── controllers/
│   │   └── game.controller.ts
│   ├── services/
│   │   └── game.service.ts
│   ├── routes/
│   │   └── game.routes.ts
│   └── middleware/
```

## Game Rules

1. Players take turns entering words
2. Each word must:
   - Start with the last letter of the previous word
   - Be a valid English word
   - Not have been used before in the game
3. Game ends when:
   - A player surrenders
   - A player disconnects
   - No valid words are available

## API Documentation

### Game Endpoints

#### Create Game
```
POST /game/create
Body: { user_id: string }
Response: { game: GameRoom, shareableLink: string }
```

#### Join Game
```
POST /game/:gameId/join
Body: { user_id: string }
Response: { game: GameRoom }
```

#### Submit Move
```
POST /game/:gameId/move
Body: { user_id: string, word: string }
Response: { move: GameMove }
```

#### Get Game State
```
GET /game/:gameId
Response: { game: GameRoom }
```

#### End Game
```
POST /game/:gameId/end
Body: { winnerId: string }
Response: { message: string }
```

## Database Schema

### Game Rooms Table
```sql
CREATE TABLE game_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    player1_id TEXT NOT NULL,
    player2_id TEXT,
    status TEXT DEFAULT 'WAITING',
    current_turn TEXT,
    winner_id TEXT,
    is_vs_computer BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Game Moves Table
```sql
CREATE TABLE game_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_room_id UUID REFERENCES game_rooms(id),
    user_id TEXT NOT NULL,
    word TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Component Structure

### GameBoardComponent
- Manages game state
- Handles word submission
- Validates moves
- Controls turn flow
- Manages computer moves
- Shows word history

### WordSearchComponent
- Displays word definitions
- Shows phonetic pronunciation
- Plays audio pronunciation
- Lists synonyms and antonyms

### HomeComponent
- Creates new games
- Handles game joining
- Generates sharable links
- Manages game modes

## Services

### GameService
- Manages game state
- Handles API communication
- Validates moves
- Updates game status

### WordService
- Integrates with Dictionary API
- Validates words
- Provides word meanings
- Manages pronunciations

### ComputerPlayerService
- Generates computer moves
- Integrates with Datamuse API
- Validates word chains
- Manages computer turn logic

## Testing

### Unit Tests
- Component tests
- Service tests
- Utility function tests
- API integration tests

### E2E Tests
- Game flow tests
- Word validation tests
- Turn management tests
- Error handling tests

## Deployment

### Frontend Deployment
1. Build production bundle:
```bash
ng build --configuration production
```

### Backend Deployment
1. Build TypeScript:
```bash
npm run build
```

### Environment Variables
```env
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
FRONTEND_URL=your_frontend_url
```

## License

MIT License