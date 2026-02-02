/*
  # Update Match Schedule for Weekend Structure

  1. Changes
    - Add columns for saturday assignments (person1-4)
    - Add columns for sunday assignments (person1-4)
    - Keep existing match_date, location, opponent fields
  
  2. Notes
    - Allows up to 4 people per Saturday and 4 per Sunday
    - Maintains backward compatibility with existing data
*/

-- Add Saturday person columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'saturday_person1_id') THEN
    ALTER TABLE match_schedule ADD COLUMN saturday_person1_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'saturday_person2_id') THEN
    ALTER TABLE match_schedule ADD COLUMN saturday_person2_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'saturday_person3_id') THEN
    ALTER TABLE match_schedule ADD COLUMN saturday_person3_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'saturday_person4_id') THEN
    ALTER TABLE match_schedule ADD COLUMN saturday_person4_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add Sunday person columns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'sunday_person1_id') THEN
    ALTER TABLE match_schedule ADD COLUMN sunday_person1_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'sunday_person2_id') THEN
    ALTER TABLE match_schedule ADD COLUMN sunday_person2_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'sunday_person3_id') THEN
    ALTER TABLE match_schedule ADD COLUMN sunday_person3_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_schedule' AND column_name = 'sunday_person4_id') THEN
    ALTER TABLE match_schedule ADD COLUMN sunday_person4_id uuid REFERENCES players(id) ON DELETE SET NULL;
  END IF;
END $$;