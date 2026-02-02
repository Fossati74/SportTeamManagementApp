/*
  # Add expense participants tracking

  1. New Tables
    - `expense_participants`
      - `id` (uuid, primary key)
      - `expense_id` (uuid, foreign key to expenses)
      - `player_id` (uuid, foreign key to players)
      - `created_at` (timestamp)
      - Tracks which players participate in each expense

  2. Security
    - Enable RLS on `expense_participants` table
    - Add policies for authenticated users to manage expense participants

  3. Notes
    - When an expense is created, all players with `participates_in_fund = false` 
      should be added to expense_participants by default
    - The expense amount will be divided by the number of participants
    - Players not participating in the fund will see their share as a credit
*/

-- Create expense_participants table
CREATE TABLE IF NOT EXISTS expense_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(expense_id, player_id)
);

-- Enable RLS on expense_participants
ALTER TABLE expense_participants ENABLE ROW LEVEL SECURITY;

-- Policies for expense_participants
CREATE POLICY "Anyone can view expense participants"
  ON expense_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert expense participants"
  ON expense_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete expense participants"
  ON expense_participants FOR DELETE
  TO authenticated
  USING (true);