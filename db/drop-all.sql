-- ============================================================================
-- PetBikroy — drop every table
--
-- Destructive. This deletes the whole database: ads, members, photos, reports,
-- settings, sessions, rate limits, the audit log and the admin accounts.
--
-- `db/schema.sql` only ever creates tables that do not exist yet, so it cannot
-- upgrade a database that was made by an older version of the schema. When you
-- already have a database (for example one seeded before member accounts
-- existed), run these three commands in order:
--
--   npx wrangler d1 execute petbikroy --remote --file=db/drop-all.sql
--   npx wrangler d1 execute petbikroy --remote --file=db/schema.sql
--   npx wrangler d1 execute petbikroy --remote --file=db/seed.sql
--
-- Then recreate your admin account, because the admins table goes too:
--
--   node tools/create-admin.mjs --remote --email you@example.com
--
-- For local development the same three steps are `npm run db:drop`,
-- `npm run db:schema` and `npm run db:seed`.
-- ============================================================================

-- Children before parents: SQLite refuses to drop a table while a row
-- somewhere still points at it.
DROP TABLE IF EXISTS ad_photos;     -- -> ads
DROP TABLE IF EXISTS reports;       -- -> ads
DROP TABLE IF EXISTS sessions;      -- -> admins, users
DROP TABLE IF EXISTS ads;           -- -> users, categories, locations
DROP TABLE IF EXISTS areas;         -- -> locations
DROP TABLE IF EXISTS subcategories;  -- -> categories
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS admins;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS rate_limits;
