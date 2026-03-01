ALTER TABLE users ADD COLUMN force_logout_after TEXT;

CREATE INDEX IF NOT EXISTS idx_users_force_logout_after
  ON users(force_logout_after);
