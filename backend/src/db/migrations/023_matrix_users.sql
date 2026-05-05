CREATE TABLE IF NOT EXISTS matrix_users (
  user_id TEXT NOT NULL PRIMARY KEY,
  matrix_user_id TEXT NOT NULL UNIQUE,
  matrix_password TEXT NOT NULL,
  created_at TEXT NOT NULL
);
