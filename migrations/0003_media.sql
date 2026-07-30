-- Migration 0003: media upload registry (R2-backed).
-- Run once: wrangler d1 execute sikh-university [--remote] --file=./migrations/0003_media.sql
CREATE TABLE IF NOT EXISTS media_objects (
  key TEXT PRIMARY KEY,                -- uploads/{userId}/{context}/{uuid}.{ext}
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL,                  -- photo | pdf | video | submission
  context TEXT,                        -- 'profile' | 'draft:<id>' | 'assignment:<id>'
  size INTEGER NOT NULL, content_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',  -- pending(mpu) | uploaded | approved | rejected | published
  rights TEXT,                         -- own | open-license | permission (required for course media)
  rights_note TEXT,                    -- source URL / license / permission reference
  upload_id TEXT,                      -- in-flight multipart
  created_at INTEGER NOT NULL, reviewed_by TEXT, reviewed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_media_owner ON media_objects(owner_id, created_at);
CREATE INDEX IF NOT EXISTS idx_media_status ON media_objects(status);
