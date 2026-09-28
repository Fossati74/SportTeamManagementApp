/*
  # Backfill existing rows into the default collectif

  1. Changes
    - Every existing row in every domain table currently has a NULL `collectif_id`
      (added nullable in the previous migration). Assign them all to the single
      default collectif seeded in 20260831120000_create_collectifs_and_profiles.sql,
      so no data is orphaned before `collectif_id` is made NOT NULL.
*/

DO $$
DECLARE
  default_collectif_id uuid;
BEGIN
  SELECT id INTO default_collectif_id FROM collectifs ORDER BY created_at LIMIT 1;

  UPDATE players SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE apero_schedule SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE match_schedule SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE carpools SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE fine_types SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE fines SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE activity_log SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE carpool_proposals SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE expenses SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE expense_participants SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE beers SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
  UPDATE event_debts SET collectif_id = default_collectif_id WHERE collectif_id IS NULL;
END $$;
