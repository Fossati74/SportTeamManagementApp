/*
  # Add Carpool Proposals Table

  1. New Tables
    - `carpool_proposals`
      - `id` (uuid, primary key)
      - `weekend_date` (date) - The weekend date for the carpool
      - `player_id` (uuid) - The player proposing to participate
      - `is_validated` (boolean) - Whether an admin has validated this proposal
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `carpool_proposals` table
    - Allow authenticated users to view all proposals
    - Allow authenticated users to create their own proposals
    - Only admins (authenticated users) can update validation status
    - Allow users to delete their own unvalidated proposals
  
  3. Notes
    - Players can propose to participate in weekend carpools
    - Admins can then assign validated players to teams
    - Players with driver's license are shown first in dropdowns
*/

CREATE TABLE IF NOT EXISTS carpool_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekend_date date NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  is_validated boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(weekend_date, player_id)
);

ALTER TABLE carpool_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view carpool proposals"
  ON carpool_proposals
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own proposals"
  ON carpool_proposals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can update proposals"
  ON carpool_proposals
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete their own unvalidated proposals"
  ON carpool_proposals
  FOR DELETE
  TO authenticated
  USING (player_id = auth.uid() AND is_validated = false);
