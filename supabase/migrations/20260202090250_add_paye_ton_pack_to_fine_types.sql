/*
  # Add Paye ton Pack option to Fine Types

  1. Changes
    - Add `paye_ton_pack` boolean column to `fine_types` table
    - Default value is `false` for existing and new fine types
    - Remove `paye_ton_pack` from `fines` table as it's now managed at type level
  
  2. Notes
    - This allows configuring the "paye ton pack" option at the fine type level
    - When a fine type has `paye_ton_pack = true`, all fines of that type will count as "paye ton pack"
*/

-- Add paye_ton_pack to fine_types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fine_types' AND column_name = 'paye_ton_pack'
  ) THEN
    ALTER TABLE fine_types ADD COLUMN paye_ton_pack boolean DEFAULT false;
  END IF;
END $$;

-- Remove paye_ton_pack from fines table as it's now at type level
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fines' AND column_name = 'paye_ton_pack'
  ) THEN
    ALTER TABLE fines DROP COLUMN paye_ton_pack;
  END IF;
END $$;