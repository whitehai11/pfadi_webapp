ALTER TABLE push_rules ADD COLUMN title TEXT;
ALTER TABLE push_rules ADD COLUMN message TEXT;
ALTER TABLE push_rules ADD COLUMN notification_type TEXT NOT NULL DEFAULT 'instant' CHECK (notification_type IN ('instant', 'recurring'));
ALTER TABLE push_rules ADD COLUMN target_type TEXT NOT NULL DEFAULT 'all' CHECK (target_type IN ('all', 'role', 'user'));
ALTER TABLE push_rules ADD COLUMN target_id TEXT;
ALTER TABLE push_rules ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE push_rules ADD COLUMN interval_value INTEGER;
ALTER TABLE push_rules ADD COLUMN interval_unit TEXT CHECK (interval_unit IN ('hours', 'days', 'weeks'));
ALTER TABLE push_rules ADD COLUMN start_date TEXT;
ALTER TABLE push_rules ADD COLUMN end_date TEXT;
ALTER TABLE push_rules ADD COLUMN last_sent_at TEXT;
ALTER TABLE push_rules ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

UPDATE push_rules
SET target_type = CASE
    WHEN target_user_id IS NOT NULL THEN 'user'
    WHEN target_role IS NOT NULL THEN 'role'
    ELSE 'all'
  END,
  target_id = COALESCE(target_user_id, target_role),
  title = COALESCE(title, title_template, rule_type),
  message = COALESCE(message, body_template),
  is_active = COALESCE(enabled, 1);
