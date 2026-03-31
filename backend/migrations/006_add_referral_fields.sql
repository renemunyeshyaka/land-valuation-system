-- Migration: Add referral fields to users table
-- 2026-03-06: Referral Program Implementation

-- Add referral fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS referrer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_discount NUMERIC(5, 2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_users INTEGER DEFAULT 0;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_users_referrer_id ON users(referrer_user_id);

-- Optional: Populate default referral codes for existing users (using base64 encoding of user id)
-- Note: In production, use the application to generate proper referral codes
UPDATE users SET referral_code = ENCODE(id::text::bytea, 'base64') || '_' || SUBSTR(MD5(RANDOM()::text), 1, 8)
WHERE referral_code IS NULL AND deleted_at IS NULL;
