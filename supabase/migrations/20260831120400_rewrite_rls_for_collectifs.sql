/*
  # Rewrite RLS policies to be collectif-scoped, remove anonymous access

  !! Apply only after 20260831120300_set_collectif_id_not_null.sql, and in the same
  !! deploy as the frontend changes that remove public self-signup - this is the
  !! migration where anonymous/cross-collectif access actually goes away.

  1. Changes
    - Every table's old "anyone can view" / "any authenticated user can write"
      policies are dropped and replaced with collectif-scoped ones:
      - SELECT: super_admin sees everything; admin/user see only rows in their own
        collectif (`current_collectif_id()`), and only when authenticated - no more
        `TO public`/anonymous read access anywhere.
      - INSERT/UPDATE/DELETE: restricted to `admin`/`super_admin` of that collectif,
        except `carpool_proposals` (see below) which preserves today's behavior of
        letting any authenticated collectif member propose a carpool.

  2. `carpool_proposals` - preserved behavior, not redesigned
    - Today, any authenticated user can propose any player for carpool duty (there is
      no link between an auth account and a specific `players` row), and the existing
      "delete own unvalidated proposal" policy compares `player_id = auth.uid()`,
      which can never match since `player_id` references `players.id` - so that
      policy has likely never actually matched anything for a non-admin caller. This
      migration intentionally preserves that exact behavior (per product decision),
      only adding collectif scoping around it - it does not add an account-to-player
      link or fix the dormant policy.

  3. `beers` / `event_debts` - RLS was never enabled
    - Confirmed via `pg_policies` against the live database: these two tables (added
      outside this repo's tracked migrations) have zero existing policies and RLS was
      never turned on for them at all - they were fully open to anyone with the anon
      key. This migration explicitly enables RLS on both before adding policies.

  4. `weekend_carpools` / `weekend_schedule` - dropped, confirmed unused
    - Confirmed via `pg_policies` these two legacy tables still exist with fully
      public "anyone can view" policies, and confirmed via an exhaustive grep of
      `src/` (including every dynamic `.from(table)` call site) that no code
      anywhere references them - the app uses `carpools`/`match_schedule` instead.
      Dropped here rather than migrated, since keeping dead, publicly-readable
      tables around defeats the point of this migration.
*/

-- ============ players ============
DROP POLICY IF EXISTS "Anyone can view players" ON players;
DROP POLICY IF EXISTS "Authenticated users can insert players" ON players;
DROP POLICY IF EXISTS "Authenticated users can update players" ON players;
DROP POLICY IF EXISTS "Authenticated users can delete players" ON players;

CREATE POLICY "Scoped select players" ON players FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert players" ON players FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update players" ON players FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete players" ON players FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ apero_schedule ============
DROP POLICY IF EXISTS "Anyone can view apero schedule" ON apero_schedule;
DROP POLICY IF EXISTS "Authenticated users can insert apero schedule" ON apero_schedule;
DROP POLICY IF EXISTS "Authenticated users can update apero schedule" ON apero_schedule;
DROP POLICY IF EXISTS "Authenticated users can delete apero schedule" ON apero_schedule;

CREATE POLICY "Scoped select apero schedule" ON apero_schedule FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert apero schedule" ON apero_schedule FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update apero schedule" ON apero_schedule FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete apero schedule" ON apero_schedule FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ match_schedule ============
DROP POLICY IF EXISTS "Anyone can view match schedule" ON match_schedule;
DROP POLICY IF EXISTS "Authenticated users can insert match schedule" ON match_schedule;
DROP POLICY IF EXISTS "Authenticated users can update match schedule" ON match_schedule;
DROP POLICY IF EXISTS "Authenticated users can delete match schedule" ON match_schedule;

CREATE POLICY "Scoped select match schedule" ON match_schedule FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert match schedule" ON match_schedule FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update match schedule" ON match_schedule FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete match schedule" ON match_schedule FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ carpools ============
DROP POLICY IF EXISTS "Anyone can view carpools" ON carpools;
DROP POLICY IF EXISTS "Authenticated users can insert carpools" ON carpools;
DROP POLICY IF EXISTS "Authenticated users can update carpools" ON carpools;
DROP POLICY IF EXISTS "Authenticated users can delete carpools" ON carpools;

CREATE POLICY "Scoped select carpools" ON carpools FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert carpools" ON carpools FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update carpools" ON carpools FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete carpools" ON carpools FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ fine_types ============
DROP POLICY IF EXISTS "Anyone can view fine types" ON fine_types;
DROP POLICY IF EXISTS "Authenticated users can insert fine types" ON fine_types;
DROP POLICY IF EXISTS "Authenticated users can update fine types" ON fine_types;
DROP POLICY IF EXISTS "Authenticated users can delete fine types" ON fine_types;

CREATE POLICY "Scoped select fine types" ON fine_types FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert fine types" ON fine_types FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update fine types" ON fine_types FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete fine types" ON fine_types FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ fines ============
DROP POLICY IF EXISTS "Anyone can view fines" ON fines;
DROP POLICY IF EXISTS "Authenticated users can insert fines" ON fines;
DROP POLICY IF EXISTS "Authenticated users can update fines" ON fines;
DROP POLICY IF EXISTS "Authenticated users can delete fines" ON fines;

CREATE POLICY "Scoped select fines" ON fines FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert fines" ON fines FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update fines" ON fines FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete fines" ON fines FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ expenses ============
DROP POLICY IF EXISTS "Anyone can view expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON expenses;

CREATE POLICY "Scoped select expenses" ON expenses FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert expenses" ON expenses FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update expenses" ON expenses FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete expenses" ON expenses FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ expense_participants ============
DROP POLICY IF EXISTS "Anyone can view expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Authenticated users can insert expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Authenticated users can delete expense participants" ON expense_participants;

CREATE POLICY "Scoped select expense participants" ON expense_participants FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert expense participants" ON expense_participants FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete expense participants" ON expense_participants FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ activity_log ============
DROP POLICY IF EXISTS "Anyone can view activity log" ON activity_log;
DROP POLICY IF EXISTS "Authenticated users can insert activity log" ON activity_log;

CREATE POLICY "Scoped select activity log" ON activity_log FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Members insert activity log" ON activity_log FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

-- ============ carpool_proposals (preserved behavior, see header note) ============
DROP POLICY IF EXISTS "Anyone can view carpool proposals" ON carpool_proposals;
DROP POLICY IF EXISTS "Users can create their own proposals" ON carpool_proposals;
DROP POLICY IF EXISTS "Admins can update proposals" ON carpool_proposals;
DROP POLICY IF EXISTS "Users can delete their own unvalidated proposals" ON carpool_proposals;

CREATE POLICY "Scoped select carpool proposals" ON carpool_proposals FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

-- Any authenticated member of the collectif can propose - unchanged from today's
-- "any authenticated user" behavior, now additionally scoped to their collectif.
CREATE POLICY "Members create carpool proposals" ON carpool_proposals FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins update carpool proposals" ON carpool_proposals FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete carpool proposals" ON carpool_proposals FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- Preserved as-is: this comparison (`player_id = auth.uid()`) has never actually
-- matched anything, since `player_id` references `players.id`, not `auth.users.id`.
-- Kept verbatim (plus collectif scoping) rather than redesigned - see header note.
CREATE POLICY "Users can delete their own unvalidated proposals" ON carpool_proposals FOR DELETE TO authenticated
  USING (player_id = auth.uid() AND is_validated = false AND collectif_id = current_collectif_id());

-- ============ beers (RLS never enabled - see header note 3) ============
ALTER TABLE beers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoped select beers" ON beers FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert beers" ON beers FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update beers" ON beers FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete beers" ON beers FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ event_debts (RLS never enabled - see header note 3) ============
ALTER TABLE event_debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoped select event debts" ON event_debts FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR collectif_id = current_collectif_id());

CREATE POLICY "Admins insert event debts" ON event_debts FOR INSERT TO authenticated
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins update event debts" ON event_debts FOR UPDATE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id())
  WITH CHECK (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

CREATE POLICY "Admins delete event debts" ON event_debts FOR DELETE TO authenticated
  USING (current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id());

-- ============ weekend_carpools / weekend_schedule (dropped - see header note 4) ============
DROP TABLE IF EXISTS weekend_carpools;
DROP TABLE IF EXISTS weekend_schedule;
