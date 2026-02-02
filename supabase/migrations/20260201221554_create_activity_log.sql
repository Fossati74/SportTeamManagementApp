/*
  # Create Activity Log Table

  1. New Tables
    - `activity_log`
      - `id` (uuid, primary key)
      - `action` (text) - Type of action performed (e.g., "fine_added", "fine_deleted", "fine_type_added")
      - `description` (text) - Human-readable description of the action
      - `user_id` (uuid) - User who performed the action (nullable for public reads)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `activity_log` table
    - Allow public read access to view activity history
    - Only authenticated users can insert new activity logs
*/

CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  description text NOT NULL,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view activity log"
  ON activity_log
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can insert activity log"
  ON activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
