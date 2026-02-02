/*
  # Add coach flag to players

  1. Changes to players table
    - Add `is_coach` column (boolean) to mark players as coaches
    - Default value is false (most players are not coaches)

  2. Notes
    - Coaches will be excluded from apero rotation, carpool assignments, and match schedules
    - This helps distinguish coaching staff from active players
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'is_coach'
  ) THEN
    ALTER TABLE players ADD COLUMN is_coach boolean DEFAULT false;
  END IF;
END $$;