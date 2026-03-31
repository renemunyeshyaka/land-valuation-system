-- 003_add_mfa_fields.sql
-- Add Multi-Factor Authentication fields to users table

-- Add OTP and email verification fields
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verification_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_otp_sent_at TIMESTAMP;

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_code ON users(email_verification_code);
CREATE INDEX IF NOT EXISTS idx_users_otp_code ON users(otp_code);

-- Comment on new columns
COMMENT ON COLUMN users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN users.email_verification_code IS '6-digit code sent to email for account activation';
COMMENT ON COLUMN users.email_verification_expires_at IS 'Expiration timestamp for email verification code';
COMMENT ON COLUMN users.otp_code IS '6-digit one-time password for login MFA';
COMMENT ON COLUMN users.otp_expires_at IS 'Expiration timestamp for OTP (typically 5 minutes)';
COMMENT ON COLUMN users.otp_attempts IS 'Number of failed OTP verification attempts';
COMMENT ON COLUMN users.otp_locked_until IS 'Timestamp until which OTP verification is locked after too many failed attempts';
COMMENT ON COLUMN users.last_otp_sent_at IS 'Last time an OTP was sent to prevent spam';
