CREATE TABLE users_new (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'materialwart')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO users_new (id, email, password_hash, role, status, created_at, updated_at)
SELECT
  id,
  email,
  password_hash,
  role,
  CASE
    WHEN role = 'admin' THEN 'approved'
    ELSE 'approved'
  END,
  created_at,
  updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
