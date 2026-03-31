-- Migration 007: Add UPI (Unique Parcel Identifier) field to properties table
-- This allows users to quickly look up properties by their UPI number for automatic valuation

-- Add UPI column to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS upi VARCHAR(50) UNIQUE;

-- Create index for fast UPI lookups
CREATE INDEX IF NOT EXISTS idx_properties_upi ON properties(upi) WHERE upi IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN properties.upi IS 'Unique Parcel Identifier (UPI) for quick property lookup and valuation';
