/*
  # Add manual payment field to players

  1. Changes
    - Add `manual_payment` column to `players` table
      - Type: numeric(10,2) to store monetary values with 2 decimal places
      - Default: 0.00
      - Description: Allows manual adjustment of total payments for importing historical data

  2. Notes
    - This field represents historical payments from previous systems
    - Total player payment = sum of fines + manual_payment
    - Useful for migrating data from other applications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'manual_payment'
  ) THEN
    ALTER TABLE players ADD COLUMN manual_payment numeric(10,2) DEFAULT 0.00 NOT NULL;
  END IF;
END $$;