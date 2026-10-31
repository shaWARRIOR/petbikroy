-- ============================================================================
-- Upgrade: add the auto-moderation columns to an existing `ads` table
--
-- Run this against the PRODUCTION database when /api/me/ads and /api/ads
-- return 500 after enabling auto-moderation. It is non-destructive: it only
-- adds missing columns (existing rows get an empty '' default) and recreates
-- the index if absent. It does NOT touch your existing ads, members or data.
--
-- The auto-moderation commit added `auto_decision`, `auto_reason` and the
-- `idx_ads_auto` index to a table that `db/schema.sql` builds with
-- `CREATE TABLE IF NOT EXISTS`, so that file cannot add those columns to a
-- database that already existed. This file is the surgical upgrade for it.
--
-- (The earlier member-accounts commit already added `rejection_reason`, and the
-- site worked before auto-moderation, so it is present and intentionally left
-- out here.)
--
-- D1 runs the whole file as one transaction and aborts on the first error, so
-- run this only against the production database. If a statement reports
-- "column already exists", that column is present — just delete that line and
-- re-run.
--
--   npx wrangler d1 execute petbikroy --remote --file=db/upgrade-moderation.sql
-- ============================================================================

ALTER TABLE ads
  ADD COLUMN auto_decision TEXT NOT NULL DEFAULT ''
  CHECK (auto_decision IN ('', 'approved', 'held', 'rejected'));

ALTER TABLE ads ADD COLUMN auto_reason TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ads_auto ON ads(auto_decision, status);
