/*
  # Add License and Email to Players

  1. Changes
    - Add `has_license` (boolean, default false) to players table
    - Add `email` (text, optional) to players table
  
  2. Notes
    - has_license will be used to filter eligible drivers for carpools
    - email will be used for notifications
*/

-- Add has_license column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'has_license'
  ) THEN
    ALTER TABLE players ADD COLUMN has_license boolean DEFAULT false;
  END IF;
END $$;

-- Add email column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'email'
  ) THEN
    ALTER TABLE players ADD COLUMN email text;
  END IF;
END $$;