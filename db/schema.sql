-- ============================================================================
-- PetBikroy — D1 schema
--
-- Apply with:
--   wrangler d1 execute petbikroy --local  --file=db/schema.sql
--   wrangler d1 execute petbikroy --remote --file=db/schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- taxonomy --

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  emoji       TEXT NOT NULL DEFAULT '🐾',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subcategories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category_id, name)
);
CREATE INDEX IF NOT EXISTS idx_subcat_cat ON subcategories(category_id);

CREATE TABLE IF NOT EXISTS locations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS areas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  location_id TEXT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  UNIQUE (location_id, name)
);
CREATE INDEX IF NOT EXISTS idx_area_loc ON areas(location_id);

-- ------------------------------------------------------------------- ads --

-- status:    pending | active | rejected | sold
-- kind:      sale | adoption | service
-- Both are constrained so bad data cannot reach the front end.
CREATE TABLE IF NOT EXISTS ads (
  id                TEXT PRIMARY KEY,
  category_id       TEXT NOT NULL REFERENCES categories(id),
  subcategory       TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  price             INTEGER NOT NULL DEFAULT 0,
  negotiable        INTEGER NOT NULL DEFAULT 0,
  kind              TEXT NOT NULL DEFAULT 'sale'
                      CHECK (kind IN ('sale','adoption','service')),
  location_id       TEXT NOT NULL REFERENCES locations(id),
  area              TEXT NOT NULL,
  age               TEXT NOT NULL DEFAULT '',
  gender            TEXT NOT NULL DEFAULT '',
  vaccinated        INTEGER NOT NULL DEFAULT 0,
  condition         TEXT NOT NULL DEFAULT 'New',
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','active','rejected','sold')),
  featured          INTEGER NOT NULL DEFAULT 0,
  views             INTEGER NOT NULL DEFAULT 0,
  contact_name      TEXT NOT NULL,
  contact_phone     TEXT NOT NULL,
  contact_email     TEXT NOT NULL DEFAULT '',
  -- Owners manage their ad with a secret token instead of an account.
  -- Only the SHA-256 of the token is stored.
  owner_token_hash  TEXT NOT NULL,
  rejection_reason  TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  published_at      TEXT
);

CREATE INDEX IF NOT EXISTS idx_ads_status   ON ads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_category ON ads(category_id, status);
CREATE INDEX IF NOT EXISTS idx_ads_location ON ads(location_id, status);
CREATE INDEX IF NOT EXISTS idx_ads_owner    ON ads(owner_token_hash);
CREATE INDEX IF NOT EXISTS idx_ads_featured ON ads(featured, status);

CREATE TABLE IF NOT EXISTS ad_photos (
  id         TEXT PRIMARY KEY,
  ad_id      TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  r2_key     TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_photos_ad ON ad_photos(ad_id, sort_order);

-- --------------------------------------------------------------- accounts --

CREATE TABLE IF NOT EXISTS admins (
  id              TEXT PRIMARY KEY,
  email           TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL DEFAULT '',
  password_hash   TEXT NOT NULL,
  password_salt   TEXT NOT NULL,
  iterations      INTEGER NOT NULL,
  role            TEXT NOT NULL DEFAULT 'admin'
                    CHECK (role IN ('admin','moderator')),
  is_active       INTEGER NOT NULL DEFAULT 1,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TEXT,
  last_login_at   TEXT,
  created_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id   TEXT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  ip         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_sessions_admin   ON sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ------------------------------------------------------- moderation / ops --

CREATE TABLE IF NOT EXISTS reports (
  id               TEXT PRIMARY KEY,
  ad_id            TEXT NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
  reason           TEXT NOT NULL,
  note             TEXT NOT NULL DEFAULT '',
  reporter_contact TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'open'
                     CHECK (status IN ('open','resolved','dismissed')),
  created_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    TEXT,
  actor_email TEXT NOT NULL DEFAULT '',
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id   TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Per-IP throttling for public write endpoints (posting ads, reports,
-- uploads, login attempts). Rows are cheap and swept on write.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket     TEXT PRIMARY KEY,
  count      INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate_expires ON rate_limits(expires_at);
