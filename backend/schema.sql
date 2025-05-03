-- Enable UUID extension first
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create game_rooms table first (before enabling RLS)
CREATE TABLE IF NOT EXISTS game_rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player1_id TEXT NOT NULL,
  player2_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('WAITING', 'ONGOING', 'FINISHED')),
  current_turn TEXT NOT NULL,
  winner_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create game_moves table
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  game_room_id UUID NOT NULL REFERENCES game_rooms(id),
  user_id TEXT NOT NULL,
  word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_moves_game_room_id ON game_moves(game_room_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_status ON game_rooms(status);

-- Enable Row Level Security after table creation
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for game_rooms
CREATE POLICY "Anyone can read game rooms"
  ON game_rooms
  FOR SELECT
  USING (true);

CREATE POLICY "Players can update their own games"
  ON game_rooms
  FOR UPDATE
  USING (
    auth.uid()::text = player1_id OR
    auth.uid()::text = player2_id
  );

-- Add RLS policies for game_moves
CREATE POLICY "Anyone can read game moves"
  ON game_moves
  FOR SELECT
  USING (true);

CREATE POLICY "Players can insert moves in their games"
  ON game_moves
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_rooms
      WHERE id = game_room_id
      AND (player1_id = auth.uid()::text OR player2_id = auth.uid()::text)
    )
  );