ALTER TABLE users ADD COLUMN avatar_path TEXT;
ALTER TABLE users ADD COLUMN avatar_updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_avatar_updated_at
  ON users(avatar_updated_at);
