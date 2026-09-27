CREATE TABLE IF NOT EXISTS chatbot_logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  user_id TEXT NOT NULL,
  project TEXT,
  remote_ip TEXT,
  course_id TEXT,
  course TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);