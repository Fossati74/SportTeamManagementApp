/*
  # Add a per-collectif IBAN for the fund's payment instructions

  1. Problem
    - The "pay a fine" screen showed a single IBAN hardcoded in the frontend
      (src/components/Fines/FinesManager.tsx). Now that the app is multi-tenant,
      every collectif would display the same bank account, sending every club's
      members' transfers to one club's bank - a real bug, not just a placeholder.

  2. Changes
    - Add nullable `iban text` to `collectifs`.
    - New "Admins update own collectif" policy: lets an `admin` edit their own
      collectif row (previously only `super_admin` could write to `collectifs` at
      all, via the existing "Super admins manage collectifs" ALL policy).
    - Column-level lockdown, same pattern as members' role/collectif_id
      (20260902000200): `authenticated` gets UPDATE only on `iban`, not `name` -
      there is no rename-collectif feature client-side, so no reason to widen
      access to it.
*/

ALTER TABLE collectifs ADD COLUMN IF NOT EXISTS iban text;

DROP POLICY IF EXISTS "Admins update own collectif" ON collectifs;
CREATE POLICY "Admins update own collectif" ON collectifs FOR UPDATE TO authenticated
  USING (current_app_role() = 'admin' AND id = current_collectif_id())
  WITH CHECK (current_app_role() = 'admin' AND id = current_collectif_id());

REVOKE UPDATE ON collectifs FROM authenticated;
GRANT UPDATE (iban) ON collectifs TO authenticated;
