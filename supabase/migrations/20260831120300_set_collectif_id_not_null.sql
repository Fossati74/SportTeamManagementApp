/*
  # Make collectif_id required on every domain table

  !! DO NOT RUN THIS MIGRATION UNTIL the updated frontend (the build that stamps
  !! `collectif_id` on every INSERT - see AuthContext/PlayerModal/AperoSchedule/
  !! MatchSchedule/CarpoolManager/FinesManager/FineTypeManager) is deployed and
  !! confirmed live. Applying this beforehand will break inserts from any client
  !! still running the old build. Verify first with, e.g.:
  !!   SELECT count(*) FROM players WHERE collectif_id IS NULL;
  !! (repeat per table) - all should return 0 - before applying.

  1. Changes
    - Flip `collectif_id` to NOT NULL on every domain table, now that all existing
      rows are backfilled and new inserts are expected to always supply it.
*/

ALTER TABLE players ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE apero_schedule ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE match_schedule ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE carpools ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE fine_types ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE fines ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE activity_log ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE carpool_proposals ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE expenses ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE expense_participants ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE beers ALTER COLUMN collectif_id SET NOT NULL;
ALTER TABLE event_debts ALTER COLUMN collectif_id SET NOT NULL;
