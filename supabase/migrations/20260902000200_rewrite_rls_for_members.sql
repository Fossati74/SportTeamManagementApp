/*
  # Point RLS at members instead of profiles, lock down sensitive columns, drop profiles

  !! Apply only after 20260902000100_migrate_profiles_into_members.sql (every
  !! auth.users account must already have a matching members.user_id row, or it
  !! loses all access the moment this migration runs).

  1. Helper functions
    - `current_app_role()` / `current_collectif_id()` now read `members` by
      `user_id = auth.uid()` instead of `profiles` by `id = auth.uid()`.

  2. `members` policies
    - Same rules the old `players` policies already enforced (carried over
      automatically by the table rename in 20260902000000, so functionally
      nothing changes here) - renamed only, for clarity now that the table also
      holds account/role data.

  3. Column-level lockdown (new requirement introduced by the merge)
    - Before this merge, `role`/`collectif_id` lived in `profiles`, which regular
      admins could not write to at all (only super_admin, or the `invite-user`
      edge function via the service-role key). Now that they're plain columns on
      `members`, the existing "Admins update members" row-level policy would let
      any admin UPDATE them on any member of their own collectif - e.g.
      self-promote to 'super_admin', or move a member to a different collectif -
      straight from the browser, bypassing every check `invite-user` performs.
      Column-level GRANT/REVOKE closes this: `authenticated` keeps UPDATE only on
      the roster fields; `role`, `collectif_id`, `email`, `user_id` become
      writable only by `service_role` (used exclusively server-side, in edge
      functions), regardless of what the row-level policy would otherwise allow.

  4. `profiles` - dropped, fully superseded by `members`. Its own policies are
     dropped automatically along with the table.
*/

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.current_collectif_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT collectif_id FROM members WHERE user_id = auth.uid()
$$;

-- ============ members policies (renamed from "players", same rules) ============
DROP POLICY IF EXISTS "Scoped select players" ON members;
DROP POLICY IF EXISTS "Admins insert players" ON members;
DROP POLICY IF EXISTS "Admins update players" ON members;
DROP POLICY IF EXISTS "Admins delete players" ON members;

CREATE POLICY "Scoped select members" ON members FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert members" ON members FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update members" ON members FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete members" ON members FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ column-level lockdown ============
REVOKE UPDATE ON members FROM authenticated;

GRANT UPDATE (
  first_name, last_name, photo_url, phone_number, units, manual_payment,
  paid_amount, participates_in_fund, is_coach, carpooling, scoreboard,
  thursday_aperitif, pin
) ON members TO authenticated;

-- ============ profiles - fully superseded by members ============
DROP TABLE IF EXISTS profiles;
