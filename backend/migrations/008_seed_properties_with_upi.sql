-- Migration 008: Seed properties with UPI values for testing
-- Includes test property with UPI 3711 for automatic valuation testing

-- Insert sample properties with UPI values
-- Note: These are test properties. In production, UPIs would be assigned by the land authority

INSERT INTO properties (
    owner_id,
    title,
    description,
    property_type,
    district,
    sector,
    cell,
    village,
    land_size,
    zone_coefficient,
    price,
    upi,
    is_verified,
    status
)
SELECT
    (SELECT id FROM users ORDER BY id LIMIT 1),
    'Residential Plot in Kigali City Center',
    'Prime residential land in the heart of Kigali, near main business district. Flat terrain, utilities available.',
    'residential',
    'Kigali',
    'Nyarugenge',
    'Muhima',
    'Nyarugenge A',
    1500.00,
    1.5,
    112500000,
    '3711',
    true,
    'available'
WHERE FALSE AND NOT EXISTS (SELECT 1 FROM properties WHERE upi = '3711')
UNION ALL
SELECT
    (SELECT id FROM users ORDER BY id LIMIT 1),
    'Commercial Land - Gasabo District',
    'Strategic commercial plot near major road. Ideal for shopping center or office building.',
    'commercial',
    'Kigali',
    'Gasabo',
    'Kimironko',
    'Kimironko I',
    2500.00,
    2.0,
    300000000,
    '4512',
    true,
    'available'
WHERE FALSE AND NOT EXISTS (SELECT 1 FROM properties WHERE upi = '4512')
UNION ALL
SELECT
    (SELECT id FROM users ORDER BY id LIMIT 1),
    'Agricultural Land - Eastern Province',
    'Fertile agricultural land suitable for coffee, tea, or horticulture. Rolling hills with good drainage.',
    'agricultural',
    'Eastern Province',
    'Rwamagana',
    'Muhazi',
    'Muhazi B',
    10000.00,
    1.0,
    150000000,
    '7823',
    true,
    'available'
WHERE FALSE AND NOT EXISTS (SELECT 1 FROM properties WHERE upi = '7823')
UNION ALL
SELECT
    (SELECT id FROM users ORDER BY id LIMIT 1),
    'Mixed-Use Development Site - Rubavu',
    'Lakeside property with tourism potential. Can be developed for hotel, resort, or mixed residential-commercial.',
    'mixed',
    'Western Province',
    'Rubavu',
    'Gisenyi',
    'Rubavu Lake View',
    3500.00,
    1.6,
    297500000,
    '9001',
    true,
    'available'
WHERE FALSE AND NOT EXISTS (SELECT 1 FROM properties WHERE upi = '9001');
