/*
  # Add collectif_id to every domain table

  1. Changes
    - Add a nullable `collectif_id uuid REFERENCES collectifs(id)` column to every
      table that holds club/team data, so rows can later be scoped to a collectif.
    - Kept nullable here on purpose: this migration must ship, then be backfilled
      (next migration), then the frontend must be deployed to start stamping
      `collectif_id` on new inserts, and only then should the column be flipped to
      NOT NULL (see 20260831120300_set_collectif_id_not_null.sql). Doing this in one
      step would break every INSERT from the still-deployed old frontend build.

  2. Notes
    - `beers` and `event_debts` exist in the live database but were never captured by
      a migration file in this repo (confirmed by querying the live REST API - both
      tables exist with rows). They are included here since they need the same
      tenancy scoping as every other domain table.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'players' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE players ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'apero_schedule' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE apero_schedule ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_schedule' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE match_schedule ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpools' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE carpools ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fine_types' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE fine_types ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fines' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE fines ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_log' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE activity_log ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'carpool_proposals' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE carpool_proposals ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'expense_participants' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE expense_participants ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beers' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE beers ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'event_debts' AND column_name = 'collectif_id'
  ) THEN
    ALTER TABLE event_debts ADD COLUMN collectif_id uuid REFERENCES collectifs(id);
  END IF;
END $$;
