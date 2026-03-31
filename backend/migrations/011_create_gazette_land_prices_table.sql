-- Migration 011: Create gazette_land_prices table for official gazette reference prices
-- Supports periodic updates (every 5-6 years) by storing versioned effective ranges.

CREATE TABLE IF NOT EXISTS gazette_land_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    gazette_version VARCHAR(40) NOT NULL,
    source_document TEXT NOT NULL,
    effective_from DATE NOT NULL,
    effective_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    area_classification VARCHAR(30) NOT NULL DEFAULT 'unknown',

    minimum_value_per_sqm DECIMAL(15,2) NOT NULL,
    weighted_avg_value_per_sqm DECIMAL(15,2) NOT NULL,
    maximum_value_per_sqm DECIMAL(15,2) NOT NULL,

    confidence_score DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    raw_line TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT gazette_prices_unique_scope UNIQUE (
        gazette_version,
        province,
        district,
        sector,
        area_classification
    )
);

CREATE INDEX IF NOT EXISTS idx_gazette_prices_lookup
    ON gazette_land_prices (province, district, sector, is_active);

CREATE INDEX IF NOT EXISTS idx_gazette_prices_version
    ON gazette_land_prices (gazette_version, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS idx_gazette_prices_active
    ON gazette_land_prices (is_active, effective_from);
