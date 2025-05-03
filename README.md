# Word Chain Game

A multiplayer word game where players take turns creating words that start with the last letter of the previous word.

## Features

- Two-player word chain game
- Real-time game state updates
- Word meaning lookups
- Sharable game links
- Guest user support

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account and project

## Setup

1. Clone the repository
2. Set up the backend:
   ```bash
   cd backend
   npm install
   # Create .env file with your Supabase credentials
   npm run dev
   ```

3. Set up the frontend:
   ```bash
   cd frontend
   npm install
   ng serve
   ```

4. Configure Supabase:
   - Create a new Supabase project
   - Create the following tables:
     - game_rooms
     - game_moves
   - Copy your project URL and anon key to the backend .env file

## Development

- Backend runs on http://localhost:3000
- Frontend runs on http://localhost:4200

## Environment Variables

### Backend (.env)
```
PORT=3000
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here
FRONTEND_URL=http://localhost:4200
```

## License

MIT