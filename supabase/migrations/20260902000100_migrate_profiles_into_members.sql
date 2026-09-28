/*
  # Migrate profiles data into members, and backfill orphaned auth.users

  1. `profiles` -> `members`
    - For every existing `profiles` row, create a new `members` row: fresh id,
      `user_id` = the auth account id, `role`/`collectif_id`/`email` copied over.
      `first_name`/`last_name` are seeded from the email's local part (there is no
      reliable key to match a `profiles` row to an existing `players`/`members`
      roster row - `players` never had an email column) - fix the display name by
      hand afterwards via the normal member edit UI.
    - If an admin/super_admin account turns out to already be an existing roster
      player, merge them by hand after this migration: point the existing player's
      `user_id` at that auth account and delete the duplicate row this migration
      created for them.

  2. Orphaned `auth.users` -> `members`
    - Same bug as originally reported: any `auth.users` account with neither a
      `profiles` row nor a linked `members` row can't see anything once RLS is
      collectif-scoped. Backfill one `members` row per orphaned account, role
      'user', default collectif - least-privilege default, promote by hand if an
      account actually needs admin.

  Verification (run before and after applying):
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN members m ON m.user_id = au.id
    WHERE m.id IS NULL;
  -- should return 0 rows after this migration.
*/

DO $$
DECLARE
  default_collectif_id uuid;
BEGIN
  SELECT id INTO default_collectif_id FROM collectifs ORDER BY created_at LIMIT 1;

  INSERT INTO members (id, user_id, role, collectif_id, email, first_name, last_name)
  SELECT
    gen_random_uuid(),
    p.id,
    p.role,
    p.collectif_id,
    p.email,
    COALESCE(NULLIF(split_part(p.email, '@', 1), ''), 'Membre'),
    ''
  FROM profiles p
  WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.user_id = p.id);

  INSERT INTO members (id, user_id, role, collectif_id, email, first_name, last_name)
  SELECT
    gen_random_uuid(),
    au.id,
    'user',
    default_collectif_id,
    au.email,
    COALESCE(NULLIF(split_part(au.email, '@', 1), ''), 'Membre'),
    ''
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM members m WHERE m.user_id = au.id);
END $$;
