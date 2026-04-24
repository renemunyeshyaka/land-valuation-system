-- Migration: Remove area_sqm from properties and use only land_size
ALTER TABLE properties
    DROP COLUMN IF EXISTS area_sqm;
-- If you have data in area_sqm that should be preserved, run this first:
-- UPDATE properties SET land_size = area_sqm WHERE land_size IS NULL AND area_sqm IS NOT NULL;
