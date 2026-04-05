-- Migration 010: Add land_parcel_id foreign key to properties table
-- Allows properties (user listings) to link to official land parcel data

ALTER TABLE properties
ADD COLUMN IF NOT EXISTS land_parcel_id UUID REFERENCES land_parcels(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_properties_land_parcel ON properties(land_parcel_id);

-- Migrate existing properties with UPIs to link to land_parcels
-- This migration assumes land_parcels are already loaded
UPDATE properties p
SET land_parcel_id = lp.id
FROM land_parcels lp
WHERE p.upi = lp.upi AND p.land_parcel_id IS NULL;
