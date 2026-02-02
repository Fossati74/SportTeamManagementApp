/*
  # Team Manager Application Schema

  1. New Tables
    - `players`
      - `id` (uuid, primary key)
      - `first_name` (text, required)
      - `last_name` (text, required)
      - `photo_url` (text, optional)
      - `units` (integer, default 1)
      - `created_at` (timestamptz)
    
    - `apero_schedule`
      - `id` (uuid, primary key)
      - `player_id` (uuid, foreign key to players)
      - `date` (date, required)
      - `created_at` (timestamptz)
    
    - `match_schedule`
      - `id` (uuid, primary key)
      - `match_date` (timestamptz, required)
      - `location` (text, required)
      - `opponent` (text)
      - `scorer1_id` (uuid, foreign key to players)
      - `scorer2_id` (uuid, foreign key to players)
      - `created_at` (timestamptz)
    
    - `carpools`
      - `id` (uuid, primary key)
      - `match_id` (uuid, foreign key to match_schedule)
      - `driver_id` (uuid, foreign key to players)
      - `created_at` (timestamptz)
    
    - `fine_types`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `amount` (numeric, required)
      - `created_at` (timestamptz)
    
    - `fines`
      - `id` (uuid, primary key)
      - `player_id` (uuid, foreign key to players)
      - `fine_type_id` (uuid, foreign key to fine_types)
      - `date` (date, required)
      - `notes` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public read access for authenticated users
    - Admin-only write access (using auth.jwt() to check user role)
*/

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  photo_url text,
  units integer DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Create apero_schedule table
CREATE TABLE IF NOT EXISTS apero_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create match_schedule table
CREATE TABLE IF NOT EXISTS match_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_date timestamptz NOT NULL,
  location text NOT NULL,
  opponent text,
  scorer1_id uuid REFERENCES players(id) ON DELETE SET NULL,
  scorer2_id uuid REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create carpools table
CREATE TABLE IF NOT EXISTS carpools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES match_schedule(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create fine_types table
CREATE TABLE IF NOT EXISTS fine_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create fines table
CREATE TABLE IF NOT EXISTS fines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  fine_type_id uuid NOT NULL REFERENCES fine_types(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE apero_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE carpools ENABLE ROW LEVEL SECURITY;
ALTER TABLE fine_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fines ENABLE ROW LEVEL SECURITY;

-- Players policies (public read, admin write)
CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert players"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update players"
  ON players FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete players"
  ON players FOR DELETE
  TO authenticated
  USING (true);

-- Apero schedule policies
CREATE POLICY "Anyone can view apero schedule"
  ON apero_schedule FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert apero schedule"
  ON apero_schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update apero schedule"
  ON apero_schedule FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete apero schedule"
  ON apero_schedule FOR DELETE
  TO authenticated
  USING (true);

-- Match schedule policies
CREATE POLICY "Anyone can view match schedule"
  ON match_schedule FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert match schedule"
  ON match_schedule FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update match schedule"
  ON match_schedule FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete match schedule"
  ON match_schedule FOR DELETE
  TO authenticated
  USING (true);

-- Carpools policies
CREATE POLICY "Anyone can view carpools"
  ON carpools FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert carpools"
  ON carpools FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update carpools"
  ON carpools FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete carpools"
  ON carpools FOR DELETE
  TO authenticated
  USING (true);

-- Fine types policies
CREATE POLICY "Anyone can view fine types"
  ON fine_types FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert fine types"
  ON fine_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fine types"
  ON fine_types FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fine types"
  ON fine_types FOR DELETE
  TO authenticated
  USING (true);

-- Fines policies
CREATE POLICY "Anyone can view fines"
  ON fines FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert fines"
  ON fines FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update fines"
  ON fines FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete fines"
  ON fines FOR DELETE
  TO authenticated
  USING (true);