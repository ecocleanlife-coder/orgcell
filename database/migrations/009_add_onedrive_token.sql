-- Add OneDrive token storage to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS onedrive_token JSONB DEFAULT NULL;

-- Rollback: ALTER TABLE users DROP COLUMN IF EXISTS onedrive_token;
