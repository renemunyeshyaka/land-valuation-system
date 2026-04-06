-- Add missing location hierarchy fields to properties (idempotent)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS province VARCHAR(100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cell VARCHAR(100);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS village VARCHAR(100);
