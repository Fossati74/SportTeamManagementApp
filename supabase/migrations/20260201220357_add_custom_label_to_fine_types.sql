/*
  # Add Custom Label to Fine Types

  1. Changes
    - Add custom_label column to fine_types table (optional text field)
  
  2. Notes
    - Allows custom text like "Paye ton pack" in addition to the amount
    - The label is optional and can be used for personalized messages
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fine_types' AND column_name = 'custom_label'
  ) THEN
    ALTER TABLE fine_types ADD COLUMN custom_label text;
  END IF;
END $$;