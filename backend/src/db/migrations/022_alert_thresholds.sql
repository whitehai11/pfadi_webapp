-- engineered by Maro Elias Goth
CREATE TABLE IF NOT EXISTS alert_thresholds (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt', 'lt')),
  threshold REAL NOT NULL,
  window_seconds INTEGER NOT NULL DEFAULT 300,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT,
  last_value REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alert_thresholds_metric ON alert_thresholds(metric);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_active ON alert_thresholds(is_active);
