/*
  # Update Carpools for Weekend Selection

  1. Changes
    - Add weekend_date column (date field for selecting the weekend)
    - Keep existing driver_id and match_id for backward compatibility
  
  2. Notes
    - The weekend_date will represent the Saturday of the chosen weekend
    - We keep match_id nullable for backward compatibility
*/

-- Add weekend_date column
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carpools' AND column_name = 'weekend_date') THEN
    ALTER TABLE carpools ADD COLUMN weekend_date date;
  END IF;
END $$;

-- Make match_id nullable
DO $$
BEGIN
  ALTER TABLE carpools ALTER COLUMN match_id DROP NOT NULL;
END $$;