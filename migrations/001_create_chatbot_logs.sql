CREATE TABLE IF NOT EXISTS chatbot_logs (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  user_id TEXT NOT NULL,
  project TEXT,
  remote_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);