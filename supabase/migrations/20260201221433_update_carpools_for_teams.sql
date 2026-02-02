/*
  # Update Carpools for Team Structure

  1. Changes
    - Remove driver_id and passengers columns from carpools
    - Add team1_player1_id through team1_player5_id columns
    - Add team2_player1_id through team2_player5_id columns
    - Each weekend can now have 2 teams of up to 5 players each
  
  2. Notes
    - This allows for more flexible team organization
    - Total of 10 players can be assigned per weekend
*/

DO $$
BEGIN
  -- Drop old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'driver_id'
  ) THEN
    ALTER TABLE carpools DROP COLUMN driver_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'passengers'
  ) THEN
    ALTER TABLE carpools DROP COLUMN passengers;
  END IF;

  -- Add team 1 player columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team1_player1_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team1_player1_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team1_player2_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team1_player2_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team1_player3_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team1_player3_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team1_player4_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team1_player4_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team1_player5_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team1_player5_id uuid REFERENCES players(id);
  END IF;

  -- Add team 2 player columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team2_player1_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team2_player1_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team2_player2_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team2_player2_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team2_player3_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team2_player3_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team2_player4_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team2_player4_id uuid REFERENCES players(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'team2_player5_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN team2_player5_id uuid REFERENCES players(id);
  END IF;
END $$;
