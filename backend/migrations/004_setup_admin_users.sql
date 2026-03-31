-- 004_setup_admin_users.sql
-- Ensure admin users are properly set up
-- This migration updates users to have admin access

-- Method 1: If there's a user with email matching admin pattern, set them as admin
UPDATE users 
SET user_type = 'admin' 
WHERE LOWER(email) LIKE '%admin%' 
  AND user_type != 'admin'
  AND email IS NOT NULL;

-- Method 2: Set the first user (by creation date) as admin if no admin exists
UPDATE users 
SET user_type = 'admin' 
WHERE id = (
  SELECT id FROM users 
  WHERE user_type != 'admin' 
  ORDER BY created_at ASC 
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM users WHERE user_type = 'admin');

-- Ensure at least one admin exists by email (for testing/development)
-- This will only apply if the ID referenced in seed_data exists

-- Ensure munyeshyaka@hotmail.com is admin
UPDATE users 
SET user_type = 'admin', 
  subscription_tier = 'ultimate',
  subscription_expiry = NULL,
  kyc_status = 'verified', 
  is_verified = true,
  email_verified = true,
  is_active = true
WHERE email = 'munyeshyaka@hotmail.com';

-- Log admin update
DO $$
BEGIN
  RAISE NOTICE 'Admin user setup migration completed. Check admin users exist: %', 
    (SELECT COUNT(*) FROM users WHERE user_type = 'admin');
END $$;
