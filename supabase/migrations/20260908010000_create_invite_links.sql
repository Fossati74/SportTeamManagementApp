/*
  # Store a copy of every invite link sent, for support/debugging

  1. Problem
    - `invite-user` currently calls `auth.admin.inviteUserByEmail`, which sends the
      invite email via Supabase's own mailer and never returns the link itself (by
      design - it's meant to only ever reach the invited person's inbox). When a
      player can't get in, there's nothing to inspect: no way to tell whether the
      mail was ever generated, what the link was, or when.

  2. Changes
    - New `invite_links` table: one row per invite link actually generated
      (member_id, collectif_id, email, the full link, created_at). Populated by the
      `invite-user` edge function, which switches from `inviteUserByEmail` to
      `auth.admin.generateLink` (the only API that returns the link) and sends the
      email itself via SMTP so the emailed link and the stored one are always the
      exact same token - no risk of a second generateLink call invalidating the one
      that was actually mailed out.

  3. Security
    - A row here is functionally a bearer credential (whoever holds the link can
      activate that account) until used or expired - not a bug report to hand out
      casually. RLS restricts SELECT to the admin of that collectif (or
      super_admin), same pattern as every other table. No INSERT/UPDATE/DELETE
      policy for `authenticated`: only the edge function's service-role key writes
      here, which bypasses RLS entirely - regular clients, including admins, can
      never insert or tamper with these rows via the API.
*/

CREATE TABLE IF NOT EXISTS invite_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid REFERENCES members(id) ON DELETE CASCADE,
  collectif_id uuid NOT NULL REFERENCES collectifs(id),
  email text NOT NULL,
  link text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view own collectif invite links" ON invite_links;
CREATE POLICY "Admins view own collectif invite links" ON invite_links FOR SELECT TO authenticated
  USING (current_app_role() = 'super_admin' OR (current_app_role() = 'admin' AND collectif_id = current_collectif_id()));
