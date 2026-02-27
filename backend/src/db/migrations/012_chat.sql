CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  has_attachment INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS chat_attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL UNIQUE REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created_at
  ON chat_messages(room_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id
  ON chat_messages(user_id);
