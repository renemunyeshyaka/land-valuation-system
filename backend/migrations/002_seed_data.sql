-- 002_seed_data.sql
-- Optional seed data for Land Valuation System

-- Insert sample users (only if email doesn't exist)
INSERT INTO users (email, phone, password, password_hash, first_name, last_name, full_name, user_type, kyc_status, is_verified, is_active)
VALUES 
    ('admin@landvaluation.rw', '+250788123456', 'adminpass', '$2a$10$hashhere1', 'Admin', 'User', 'Admin User', 'admin', 'verified', true, true),
    ('buyer@example.com', '+250787654321', 'buyerpass', '$2a$10$hashhere2', 'Test', 'Buyer', 'Test Buyer', 'buyer', 'verified', true, true),
    ('seller@example.com', '+250788654321', 'sellerpass', '$2a$10$hashhere3', 'Test', 'Seller', 'Test Seller', 'seller', 'verified', true, true)
ON CONFLICT (email) DO NOTHING;

DO $$
DECLARE
    i INT := 1;
    img_urls TEXT[] := ARRAY[
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=600&q=80'
    ];
    prop_types TEXT[] := ARRAY['residential','commercial','agricultural','mixed'];
    districts TEXT[] := ARRAY['Gasabo','Kicukiro','Nyarugenge','Bugesera','Musanze','Rubavu','Huye','Rusizi'];
    owner_ids INT[];
BEGIN
    SELECT array_agg(id) INTO owner_ids FROM users WHERE email IN ('admin@landvaluation.rw', 'buyer@example.com', 'seller@example.com');
    IF owner_ids IS NULL OR array_length(owner_ids,1) < 1 THEN
        RAISE EXCEPTION 'No valid user IDs found for property ownership.';
    END IF;
    WHILE i <= 100 LOOP
        INSERT INTO properties (title, description, property_type, status, district, sector, cell, village, address,
            latitude, longitude, land_size, size_unit, zone_coefficient, gazette_reference, price, currency,
            features, images, upi, owner_id, created_at, updated_at) VALUES (
            'Sample Property #' || i,
            'This is a sample property seeded for testing. Property number ' || i || '.',
            prop_types[(i % array_length(prop_types,1)) + 1],
            'available',
            districts[(i % array_length(districts,1)) + 1],
            'Sector ' || ((i % 10) + 1),
            'Cell ' || ((i % 20) + 1),
            'Village ' || ((i % 30) + 1),
            'Address ' || i,
            1.95 + (random() * 0.1),
            30.05 + (random() * 0.1),
            500 + (i * 10),
            'sqm',
            1.0 + (random() * 2.0),
            'GZ-' || i,
            10000000 + (i * 100000),
            'RWF',
            ARRAY['fenced','water','electricity'],
            ARRAY[
                img_urls[((i-1) % array_length(img_urls,1)) + 1],
                img_urls[((i) % array_length(img_urls,1)) + 1],
                img_urls[((i+1) % array_length(img_urls,1)) + 1]
            ],
            '123456789' || i || '_' || (trunc(random()*1000000))::text, -- Unique UPI
            owner_ids[((i-1) % array_length(owner_ids,1)) + 1],
            NOW(),
            NOW()
        );
        i := i + 1;
    END LOOP;
END$$;
