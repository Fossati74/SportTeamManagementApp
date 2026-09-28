/*
  # Let super_admin actually write into any collectif's data

  1. Problem
    - Every domain table's "Admins insert/update/delete X" policy currently reads
      `current_app_role() IN ('admin', 'super_admin') AND collectif_id = current_collectif_id()`.
      For a super_admin, `current_collectif_id()` is NULL (they aren't scoped to any
      one collectif), so `collectif_id = NULL` is never true - meaning a super_admin
      can today SELECT everything (that policy already has a standalone `OR
      current_app_role() = 'super_admin'`), but cannot INSERT/UPDATE/DELETE
      anything, anywhere. This blocks the new "enter a collectif as its admin"
      feature in the Super Admin dashboard.

  2. Fix
    - Split the condition so `super_admin` bypasses the collectif match entirely,
      the same way the SELECT policies already do:
      `current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND
      collectif_id = current_collectif_id())`.
    - Applied to every table with this pattern: members, apero_schedule,
      match_schedule, carpools, fine_types, fines, expenses,
      expense_participants, carpool_proposals (update/delete only - its insert
      policy already had the OR form), beers, event_debts.
    - `activity_log`'s insert policy already used the OR form - untouched.
*/

-- ============ members ============
DROP POLICY IF EXISTS "Admins insert members" ON members;
DROP POLICY IF EXISTS "Admins update members" ON members;
DROP POLICY IF EXISTS "Admins delete members" ON members;

CREATE POLICY "Admins insert members" ON members FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update members" ON members FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete members" ON members FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ apero_schedule ============
DROP POLICY IF EXISTS "Admins insert apero schedule" ON apero_schedule;
DROP POLICY IF EXISTS "Admins update apero schedule" ON apero_schedule;
DROP POLICY IF EXISTS "Admins delete apero schedule" ON apero_schedule;

CREATE POLICY "Admins insert apero schedule" ON apero_schedule FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update apero schedule" ON apero_schedule FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete apero schedule" ON apero_schedule FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ match_schedule ============
DROP POLICY IF EXISTS "Admins insert match schedule" ON match_schedule;
DROP POLICY IF EXISTS "Admins update match schedule" ON match_schedule;
DROP POLICY IF EXISTS "Admins delete match schedule" ON match_schedule;

CREATE POLICY "Admins insert match schedule" ON match_schedule FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update match schedule" ON match_schedule FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete match schedule" ON match_schedule FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ carpools ============
DROP POLICY IF EXISTS "Admins insert carpools" ON carpools;
DROP POLICY IF EXISTS "Admins update carpools" ON carpools;
DROP POLICY IF EXISTS "Admins delete carpools" ON carpools;

CREATE POLICY "Admins insert carpools" ON carpools FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update carpools" ON carpools FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete carpools" ON carpools FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ fine_types ============
DROP POLICY IF EXISTS "Admins insert fine types" ON fine_types;
DROP POLICY IF EXISTS "Admins update fine types" ON fine_types;
DROP POLICY IF EXISTS "Admins delete fine types" ON fine_types;

CREATE POLICY "Admins insert fine types" ON fine_types FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update fine types" ON fine_types FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete fine types" ON fine_types FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ fines ============
DROP POLICY IF EXISTS "Admins insert fines" ON fines;
DROP POLICY IF EXISTS "Admins update fines" ON fines;
DROP POLICY IF EXISTS "Admins delete fines" ON fines;

CREATE POLICY "Admins insert fines" ON fines FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update fines" ON fines FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete fines" ON fines FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ expenses ============
DROP POLICY IF EXISTS "Admins insert expenses" ON expenses;
DROP POLICY IF EXISTS "Admins update expenses" ON expenses;
DROP POLICY IF EXISTS "Admins delete expenses" ON expenses;

CREATE POLICY "Admins insert expenses" ON expenses FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update expenses" ON expenses FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete expenses" ON expenses FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ expense_participants ============
DROP POLICY IF EXISTS "Admins insert expense participants" ON expense_participants;
DROP POLICY IF EXISTS "Admins delete expense participants" ON expense_participants;

CREATE POLICY "Admins insert expense participants" ON expense_participants FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete expense participants" ON expense_participants FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ carpool_proposals (insert policy already used the OR form) ============
DROP POLICY IF EXISTS "Admins update carpool proposals" ON carpool_proposals;
DROP POLICY IF EXISTS "Admins delete carpool proposals" ON carpool_proposals;

CREATE POLICY "Admins update carpool proposals" ON carpool_proposals FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete carpool proposals" ON carpool_proposals FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ beers ============
DROP POLICY IF EXISTS "Admins insert beers" ON beers;
DROP POLICY IF EXISTS "Admins update beers" ON beers;
DROP POLICY IF EXISTS "Admins delete beers" ON beers;

CREATE POLICY "Admins insert beers" ON beers FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update beers" ON beers FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete beers" ON beers FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

-- ============ event_debts ============
DROP POLICY IF EXISTS "Admins insert event debts" ON event_debts;
DROP POLICY IF EXISTS "Admins update event debts" ON event_debts;
DROP POLICY IF EXISTS "Admins delete event debts" ON event_debts;

CREATE POLICY "Admins insert event debts" ON event_debts FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins update event debts" ON event_debts FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()))
  WITH CHECK (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));

CREATE POLICY "Admins delete event debts" ON event_debts FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));
