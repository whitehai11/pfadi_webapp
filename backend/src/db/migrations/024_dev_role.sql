-- Add 'dev' role to the allowed roles (rebuild table to change CHECK constraint)
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT NOT NULL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user', 'materialwart', 'dev')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  force_logout_after TEXT,
  avatar_path TEXT,
  avatar_updated_at TEXT
);
INSERT INTO users_new SELECT * FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
