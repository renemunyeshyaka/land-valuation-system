-- Migration 009: Create land_parcels table for official government data
-- This table stores official government UPI data from lands.rw or other authoritative sources
-- Properties have optional references to land_parcels for linking user listings to official parcels

CREATE TABLE land_parcels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upi VARCHAR(50) NOT NULL UNIQUE,
    district VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    cell VARCHAR(100),
    village VARCHAR(100),
    land_size_sqm DECIMAL(15, 2) NOT NULL,
    area_sqm DECIMAL(15, 2),
    base_price_per_sqm DECIMAL(15, 2),
    zone_coefficient DECIMAL(5, 3) DEFAULT 1.0,
    property_type VARCHAR(50) CHECK (property_type IN ('residential', 'commercial', 'agricultural', 'mixed', 'unknown')),
    zoning_type VARCHAR(100),
    building_restrictions TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    source VARCHAR(100) DEFAULT 'lands.rw',
    synced_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX idx_land_parcels_upi ON land_parcels(upi);
CREATE INDEX idx_land_parcels_district ON land_parcels(district);
CREATE INDEX idx_land_parcels_sector ON land_parcels(sector);
CREATE INDEX idx_land_parcels_source ON land_parcels(source);
CREATE INDEX idx_land_parcels_synced_at ON land_parcels(synced_at);
