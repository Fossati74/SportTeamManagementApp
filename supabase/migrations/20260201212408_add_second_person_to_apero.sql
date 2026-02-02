/*
  # Add Second Person to Apero Schedule

  1. Changes
    - Rename player_id to person1_id for clarity
    - Add person2_id to allow 2 people per apero
  
  2. Notes
    - Both person1_id and person2_id are optional to allow flexibility
    - This allows assigning 1 or 2 people per Thursday apero
*/

-- Add person2_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apero_schedule' AND column_name = 'person2_id'
  ) THEN
    ALTER TABLE apero_schedule ADD COLUMN person2_id uuid REFERENCES players(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Rename player_id to person1_id for consistency
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apero_schedule' AND column_name = 'player_id'
  ) THEN
    ALTER TABLE apero_schedule RENAME COLUMN player_id TO person1_id;
  END IF;
END $$;