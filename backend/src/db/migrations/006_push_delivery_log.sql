CREATE TABLE IF NOT EXISTS push_delivery_log (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES push_rules(id) ON DELETE CASCADE,
  event_id TEXT,
  user_id TEXT,
  sent_at TEXT NOT NULL
);
