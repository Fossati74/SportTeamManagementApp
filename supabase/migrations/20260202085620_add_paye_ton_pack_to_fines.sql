/*
  # Add paye_ton_pack field to fines table

  1. Changes
    - Add `paye_ton_pack` (boolean, default false) column to `fines` table
    
  2. Purpose
    - Track whether a player needs to pay their pack in addition to the fine
    - Used for team pack management and tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fines' AND column_name = 'paye_ton_pack'
  ) THEN
    ALTER TABLE fines ADD COLUMN paye_ton_pack boolean DEFAULT false;
  END IF;
END $$;