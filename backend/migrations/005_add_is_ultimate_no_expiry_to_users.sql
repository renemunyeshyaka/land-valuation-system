-- +goose Up
-- Add is_ultimate_no_expiry to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_ultimate_no_expiry BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE users DROP COLUMN IF EXISTS is_ultimate_no_expiry;
