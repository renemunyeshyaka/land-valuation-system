-- Backfill: existing early-adopter accounts (the first 20k sign-ups, granted from
-- the promo launch on 2026-08-19) were given a "lifetime-free" account
-- (is_early_adopter = TRUE, subscription_expiry = NULL). Under the corrected
-- policy there are NO lifetime-free accounts: each early adopter in the 20k
-- package gets the same one-month (30-day) free membership as new sign-ups,
-- measured from their signup date. After 30 days the account expires and data is
-- retained for 60 days total (30 days after expiry).
--
-- Users who joined BEFORE the promo launch (2026-08-19) are intentionally left
-- untouched. Early adopters on a paid tier keep their paid subscription expiry.
--
-- Idempotent: only touches active free early-adopter accounts created on/after the
-- promo launch that still have no expiry set.

UPDATE users
SET subscription_expiry = created_at + INTERVAL '30 days'
WHERE is_early_adopter = TRUE
  AND subscription_tier = 'free'
  AND subscription_status = 'active'
  AND subscription_expiry IS NULL
  AND created_at >= '2026-08-19 00:00:00';
