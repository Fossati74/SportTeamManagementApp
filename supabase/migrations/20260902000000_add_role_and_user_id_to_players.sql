/*
  # Add role/email/user_id to players, then rename to members

  !! Apply after the 20260831120xxx collectif/profiles migrations.

  1. Changes
    - Add `role` (defaults to 'user', same values as the old `profiles.role`),
      `email`, and `user_id` (nullable, unique, references auth.users) to `players`.
      `user_id` is nullable on purpose: a roster entry can exist before the person
      has a login account, or forever without one.
    - `players.collectif_id` is currently NOT NULL (every roster player belongs to
      a collectif). `profiles.collectif_id` was nullable, reserved for super_admin
      operator accounts that aren't tied to any single collectif. Since a
      super_admin now needs a `members` row too, relax the constraint back to
      "required unless super_admin" - the exact rule `profiles` used to enforce.
    - Rename `players` to `members`. A rename does not break existing foreign keys
      (`fines.player_id`, `carpools.team1_player1_id`, etc. keep pointing at the
      same table under its new name automatically) nor existing RLS policies
      (Postgres tracks them by OID, not by name).

  2. Not done here
    - No data is migrated yet (see 20260902000100_migrate_profiles_into_members.sql).
    - `current_app_role()` / `current_collectif_id()` still read `profiles` at the
      end of this migration - they are redefined in
      20260902000200_rewrite_rls_for_members.sql, once the data migration has run.
*/

ALTER TABLE players ADD COLUMN role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('super_admin', 'admin', 'user'));

ALTER TABLE players ADD COLUMN email text;

ALTER TABLE players ADD COLUMN user_id uuid REFERENCES auth.users(id) UNIQUE;

ALTER TABLE players ALTER COLUMN collectif_id DROP NOT NULL;

ALTER TABLE players ADD CONSTRAINT collectif_required_unless_super_admin
  CHECK (role = 'super_admin' OR collectif_id IS NOT NULL);

ALTER TABLE players RENAME TO members;
