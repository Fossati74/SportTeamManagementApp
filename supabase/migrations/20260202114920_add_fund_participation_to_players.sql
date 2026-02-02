/*
  # Add fund participation to players

  1. Changes to players table
    - Add `participates_in_fund` column (boolean) to track if player participates in team fund
    - Default value is true (everyone participates by default)

  2. Notes
    - Players who don't participate in the fund will receive a credit for their share of expenses
    - This ensures fair distribution of costs
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'participates_in_fund'
  ) THEN
    ALTER TABLE players ADD COLUMN participates_in_fund boolean DEFAULT true;
  END IF;
END $$;