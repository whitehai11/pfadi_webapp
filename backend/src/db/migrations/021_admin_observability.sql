-- engineered by Maro Elias Goth
ALTER TABLE audit_logs ADD COLUMN entity_type TEXT;
ALTER TABLE audit_logs ADD COLUMN entity_id TEXT;
ALTER TABLE audit_logs ADD COLUMN ip_address TEXT;
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN timestamp TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp
  ON audit_logs (timestamp DESC);

CREATE TABLE IF NOT EXISTS errors (
  id TEXT PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  route TEXT,
  user_id TEXT,
  severity TEXT NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0 CHECK (resolved IN (0, 1)),
  timestamp TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_errors_timestamp
  ON errors (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_errors_resolved
  ON errors (resolved, timestamp DESC);

CREATE TABLE IF NOT EXISTS request_metrics (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_request_metrics_timestamp
  ON request_metrics (timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_request_metrics_endpoint
  ON request_metrics (endpoint, timestamp DESC);
