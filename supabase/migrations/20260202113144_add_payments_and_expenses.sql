/*
  # Add payments and expenses tracking

  1. Changes to players table
    - Add `paid_amount` column to track what each player has paid

  2. New Tables
    - `expenses`
      - `id` (uuid, primary key)
      - `description` (text) - Description of the expense (e.g., "Repas de Noël")
      - `amount` (numeric) - Amount spent
      - `date` (date) - Date of expense
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on `expenses` table
    - Add policies for authenticated users to manage expenses
*/

-- Add paid_amount column to players table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE players ADD COLUMN paid_amount numeric DEFAULT 0;
  END IF;
END $$;

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses (authenticated users can view all)
CREATE POLICY "Anyone can view expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can insert expenses
CREATE POLICY "Authenticated users can insert expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update expenses
CREATE POLICY "Authenticated users can update expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated users can delete expenses
CREATE POLICY "Authenticated users can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (true);