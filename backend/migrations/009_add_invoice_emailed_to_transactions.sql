-- Add invoice_emailed column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS invoice_emailed BOOLEAN DEFAULT FALSE;
