/*
  # Create collectifs and profiles (multi-tenant roles)

  1. New Tables
    - `collectifs`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `created_at` (timestamptz)
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `role` (text) - 'super_admin' | 'admin' | 'user'
      - `collectif_id` (uuid, references collectifs, nullable only for super_admin)
      - `email` (text)
      - `created_at` (timestamptz)

  2. Helper functions
    - `current_app_role()` / `current_collectif_id()` - SECURITY DEFINER functions used by
      RLS policies on every table to read the calling user's role/collectif without
      recursing through `profiles`' own RLS policies. Named `current_app_role` (not
      `current_role`) because `current_role` is a reserved SQL keyword (equivalent to
      `current_user`) and Postgres rejects `current_role()` with a syntax error when
      called with parentheses.

  3. Security
    - Enable RLS on `collectifs` and `profiles`
    - `collectifs`: super_admin sees/manages all; admin/user see only their own
    - `profiles`: everyone can read their own row; super_admin can read/manage all
    - No client-facing INSERT policy on `profiles` - rows are created by the
      `invite-user` edge function using the service role key, which bypasses RLS

  4. Data
    - Seeds one default collectif ("Collectif par défaut")
    - Promotes the pre-existing club admin account (fossati.tom74@gmail.com) to
      `admin` of that default collectif, if it already exists in auth.users
    - Promotes the operator account (theo.cacard@gmail.com) to `super_admin`, if it
      already exists in auth.users
*/

CREATE TABLE IF NOT EXISTS collectifs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collectifs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'user')),
  collectif_id uuid REFERENCES collectifs(id),
  email text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT collectif_required_unless_super_admin
    CHECK (role = 'super_admin' OR collectif_id IS NOT NULL)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions: SECURITY DEFINER so they can read `profiles` without triggering
-- `profiles`' own RLS policies (which would otherwise recurse).
-- Named `current_app_role`, not `current_role`: `current_role` is a reserved SQL
-- keyword (a niladic function like `current_user`), so `current_role()` with
-- parentheses is a syntax error in Postgres.
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_collectif_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT collectif_id FROM profiles WHERE id = auth.uid()
$$;

-- profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR current_app_role() = 'super_admin');

DROP POLICY IF EXISTS "Super admins manage profiles" ON profiles;
CREATE POLICY "Super admins manage profiles"
  ON profiles FOR ALL
  TO authenticated
  USING (current_app_role() = 'super_admin')
  WITH CHECK (current_app_role() = 'super_admin');

-- collectifs policies
DROP POLICY IF EXISTS "Scoped select collectifs" ON collectifs;
CREATE POLICY "Scoped select collectifs"
  ON collectifs FOR SELECT
  TO authenticated
  USING (current_app_role() = 'super_admin' OR id = current_collectif_id());

DROP POLICY IF EXISTS "Super admins manage collectifs" ON collectifs;
CREATE POLICY "Super admins manage collectifs"
  ON collectifs FOR ALL
  TO authenticated
  USING (current_app_role() = 'super_admin')
  WITH CHECK (current_app_role() = 'super_admin');

-- Seed one default collectif, if none exists yet
INSERT INTO collectifs (name)
SELECT 'Collectif par défaut'
WHERE NOT EXISTS (SELECT 1 FROM collectifs);

-- Promote the pre-existing club admin account to admin of the default collectif
INSERT INTO profiles (id, role, collectif_id, email)
SELECT id, 'admin', (SELECT id FROM collectifs ORDER BY created_at LIMIT 1), email
FROM auth.users
WHERE email = 'fossati.tom74@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Promote the operator account to super_admin, if it exists
INSERT INTO profiles (id, role, collectif_id, email)
SELECT id, 'super_admin', NULL, email
FROM auth.users
WHERE email = 'theo.cacard@gmail.com'
ON CONFLICT (id) DO NOTHING;
