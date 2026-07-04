-- Migration: Add mtn_manual and mtn_momo as allowed payment methods
-- MTN manual payment: User sends money to our MTN number and submits proof for admin verification

-- Update the transactions table CHECK constraint to include mtn_manual
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check
    CHECK (payment_method IN ('card', 'mobile_money', 'bank_transfer', 'mtn_manual', 'mtn_momo'));

-- Update the transactions table payment_provider CHECK constraint if it exists
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_provider_check1;
-- Add index for faster queries on mtn_manual payments
CREATE INDEX IF NOT EXISTS idx_transactions_payment_provider_mtn_manual
    ON transactions(payment_provider)
    WHERE payment_provider = 'mtn_manual';
