-- ============================================================================
-- Upgrade: add the buyer ⇄ seller messaging tables
--
-- Run this against the PRODUCTION database when /api/messages/* endpoints
-- return 500 (for example POST /api/messages/conversations with
-- "Something went wrong on our side."). The messaging system was added in a
-- later commit, but `db/schema.sql` builds its tables with
-- `CREATE TABLE IF NOT EXISTS`, so a database created before that commit never
-- got the `conversations` and `messages` tables — every write then 500s.
--
-- This is non-destructive: it only creates the two tables and their indexes.
-- It does not touch ads, members or any existing data.
--
-- D1 runs the whole file as one transaction and aborts on the first error, so
-- run this only against the production database. If a statement reports a
-- table/index already exists, just delete that line and re-run.
--
--   npx wrangler d1 execute petbikroy --remote --file=db/upgrade-messaging.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,
  ad_id           TEXT REFERENCES ads(id) ON DELETE CASCADE,
  seller_id       TEXT NOT NULL REFERENCES users(id),
  buyer_id        TEXT NOT NULL REFERENCES users(id),
  created_at      TEXT NOT NULL,
  last_message_at TEXT NOT NULL DEFAULT '',
  CHECK (seller_id != buyer_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants
  ON conversations(seller_id, buyer_id, ad_id);
CREATE INDEX IF NOT EXISTS idx_conv_buyer
  ON conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_seller
  ON conversations(seller_id, last_message_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id              TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       TEXT NOT NULL,
  body            TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'sent'
                  CHECK (status IN ('sent', 'read')),
  created_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_conv
  ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id, created_at);
