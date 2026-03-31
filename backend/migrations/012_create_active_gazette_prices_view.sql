-- Migration 012: Create latest active gazette prices view for easy retrieval

CREATE OR REPLACE VIEW active_gazette_sector_prices AS
SELECT DISTINCT ON (province, district, sector, area_classification)
    id,
    gazette_version,
    source_document,
    effective_from,
    effective_to,
    is_active,
    province,
    district,
    sector,
    area_classification,
    minimum_value_per_sqm,
    weighted_avg_value_per_sqm,
    maximum_value_per_sqm,
    confidence_score,
    raw_line,
    created_at,
    updated_at
FROM gazette_land_prices
WHERE is_active = TRUE
ORDER BY province, district, sector, area_classification, effective_from DESC, updated_at DESC;
