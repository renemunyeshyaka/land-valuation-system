-- 019_seed_demo_data.sql
-- Phase 7 — Seed data for demo, testing, and AI Customer Targeting
-- Creates realistic demo users, properties, leads, and campaigns
--
-- Usage: Run after all other migrations have been applied.
--   psql -d yourdb -f 019_seed_demo_data.sql
--
-- WARNING: This migration is idempotent (uses IF NOT EXISTS / ON CONFLICT).
-- Safe to re-run. Will NOT overwrite existing data with matching emails.

-- ============================================================
-- 1. Demo Users
-- ============================================================
-- Password for all demo users: Demo@123456 (bcrypt hash)
INSERT INTO users (email, phone, password, password_hash, first_name, last_name, user_type, is_verified, is_active, subscription_tier, subscription_status, is_ultimate_no_expiry, preferred_language, preferred_currency, email_verified)
SELECT * FROM (VALUES
    ('admin@landval.rw',         '+250788000001', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Admin',      'User',       'admin',       TRUE,  TRUE, 'ultimate', 'active', TRUE,  'en', 'RWF', TRUE),
    ('agent@landval.rw',         '+250788000002', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Alice',      'Mukamana',   'agent',       TRUE,  TRUE, 'professional', 'active', FALSE, 'en', 'RWF', TRUE),
    ('jean@example.com',         '+250788000003', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Jean',       'Habimana',   'individual',  TRUE,  TRUE, 'free',       'active', FALSE, 'rw', 'RWF', TRUE),
    ('patrick@example.com',      '+250788000004', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Patrick',    'Niyonzima',  'individual',  TRUE,  TRUE, 'basic',      'active', FALSE, 'en', 'RWF', TRUE),
    ('marie@example.com',        '+250788000005', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Marie',      'Uwimana',    'individual',  TRUE,  TRUE, 'free',       'active', FALSE, 'rw', 'RWF', TRUE),
    ('david@example.com',        '+250788000006', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'David',      'Kagame',     'corporate',   TRUE,  TRUE, 'professional', 'active', FALSE, 'en', 'RWF', TRUE),
    ('claudine@example.com',     '+250788000007', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Claudine',   'Ishimwe',    'agent',       TRUE,  TRUE, 'basic',      'active', FALSE, 'fr', 'RWF', TRUE),
    ('emmanuel@example.com',     '+250788000008', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Emmanuel',   'Bizimana',   'individual',  TRUE,  TRUE, 'free',       'active', FALSE, 'rw', 'RWF', TRUE),
    ('grace@example.com',        '+250788000009', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Grace',      'Uwase',      'individual',  TRUE,  TRUE, 'basic',      'active', FALSE, 'fr', 'RWF', TRUE),
    ('diaspora@landval.rw',      '+250788000010', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', '$2a$10$2Jvk9LnmcAx3OF1imwhHXObFtruV6nYjVQRDhK19W1UTIUiz2Yic2', 'Jean-Pierre','Mugabo',     'individual',  TRUE,  TRUE, 'professional', 'active', FALSE, 'en', 'USD', TRUE)
) AS v(email, phone, password, password_hash, first_name, last_name, user_type, is_verified, is_active, subscription_tier, subscription_status, is_ultimate_no_expiry, preferred_language, preferred_currency, email_verified)
WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = v.email);

-- ============================================================
-- 2. Demo Properties (Kigali area)
-- ============================================================
INSERT INTO properties (upi, province, title, description, property_type, status, district, sector, cell, village, land_size, size_unit, price, currency, owner_id, is_verified, is_diaspora, images)
SELECT * FROM (VALUES
    ('UPI-DEMO-001', 'Kigali',    'Prime Plot in Kacyiru - Gasabo',     'Beautiful residential plot in quiet neighborhood. Close to schools, shops, and main roads. Ideal for building your dream home.',               'residential', 'for_sale', 'Gasabo',    'Kacyiru',  'Biryogo',    'Agakomeye',    500,  'sqm', 65000000,  'RWF', (SELECT id FROM users WHERE email='jean@example.com'),       TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Plot+1']),
    ('UPI-DEMO-002', 'Kigali',    'Commercial Space - Kicukiro',        'Prime commercial plot located in bustling Kicukiro center. Perfect for retail, office, or mixed-use development. High foot traffic area.',          'commercial', 'for_sale', 'Kicukiro',  'Kicukiro', 'Kagina',     'Gahanga',      800,  'sqm', 120000000, 'RWF', (SELECT id FROM users WHERE email='patrick@example.com'),    TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Commercial']),
    ('UPI-DEMO-003', 'Kigali',    'Modern Apartment - Nyarugenge',      '2-bedroom apartment in downtown Kigali. Modern finishes, secure parking, generator backup. Walking distance to CBD and amenities.',                'apartment', 'for_sale', 'Nyarugenge','Nyarugenge','Amahoro',  'Kiyovu',       80,   'sqm', 85000000,  'RWF', (SELECT id FROM users WHERE email='marie@example.com'),      TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Apartment']),
    ('UPI-DEMO-004', 'Kigali',    'Development Land - Gasabo',          'Large plot ideal for residential development. Approved building plans available. Services (water, electricity) at site boundary.',                'residential', 'for_sale', 'Gasabo',    'Kimironko','Bibare',     'Rugando',      1200, 'sqm', 180000000, 'RWF', (SELECT id FROM users WHERE email='david@example.com'),      TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Development']),
    ('UPI-DEMO-005', 'Western',   'Lake View Property - Rubavu',        'Stunning lake Kivu view property. Prime location for tourism/hospitality development. Access to beach and water sports.',                          'commercial', 'for_sale', 'Rubavu',    'Rubavu',   'Gisenyi',    'Bugoyi',       2000, 'sqm', 250000000, 'RWF', (SELECT id FROM users WHERE email='emmanuel@example.com'),   TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Lake+View']),
    ('UPI-DEMO-006', 'Kigali',    'Diaspora Villa - Kacyiru',           'Luxury 4-bedroom villa with pool. Perfect for diaspora returnees. Modern architecture, smart home features, landscaped garden.',                   'house',     'for_sale', 'Gasabo',    'Kacyiru',  'Biryogo',    'Agakomeye',    600,  'sqm', 250000000, 'RWF', (SELECT id FROM users WHERE email='diaspora@landval.rw'),    TRUE,  TRUE,  ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Villa']),
    ('UPI-DEMO-007', 'Eastern',   'Agricultural Land - Bugesera',       '20-hectare farm land with irrigation access. Suitable for maize, beans, and vegetables. Existing cooperative arrangement available.',                'agricultural', 'for_sale', 'Bugesera',  'Mayange',  'Mbyo',       'Rutare',       20000,'sqm', 45000000,  'RWF', (SELECT id FROM users WHERE email='claudine@example.com'),   TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Agricultural']),
    ('UPI-DEMO-008', 'Kigali',    'Studio Apartment - Kicukiro',        'Affordable studio near Kicukiro market. Ideal for young professionals. All utilities included. Secure compound with parking.',                      'apartment', 'for_rent', 'Kicukiro',  'Kicukiro', 'Kagina',     'Gahanga',      35,   'sqm', 35000000,  'RWF', (SELECT id FROM users WHERE email='grace@example.com'),      TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Studio']),
    ('UPI-DEMO-009', 'Kigali',    'Office Space - Nyarugenge',          'Fully furnished office (80sqm) in CBD. Conference room access, high-speed internet, backup power. Ideal for startups and SMEs.',                    'commercial', 'for_rent', 'Nyarugenge','Nyarugenge','Amahoro',  'Kiyovu',       80,   'sqm', 95000000,  'RWF', (SELECT id FROM users WHERE email='agent@landval.rw'),       TRUE,  FALSE, ARRAY['https://placehold.co/600x400/0b5e42/ffffff?text=Office'])
) AS v(upi, province, title, description, property_type, status, district, sector, cell, village, land_size, size_unit, price, currency, owner_id, is_verified, is_diaspora, images)
WHERE NOT EXISTS (SELECT 1 FROM properties p WHERE p.title = v.title AND p.owner_id = v.owner_id);

-- ============================================================
-- 3. Demo Leads (for AI Customer Targeting)
-- ============================================================
INSERT INTO leads (first_name, last_name, email, phone, role, company, location, district, source, status, language_pref, ai_score, ai_segment)
SELECT * FROM (VALUES
    ('Jean',       'Habimana',   'jean.habimana@test.rw',     '+250788200001', 'owner',      NULL,                    'Kacyiru, Gasabo',       'Gasabo',    'demo', 'scored',   'rw', 0.75, 'high_value_owner'),
    ('Alice',      'Mukamana',   'alice.mukamana@test.rw',    '+250788200002', 'agent',      'Vibe House Real Estate','Kicukiro, Kigali',      'Kicukiro',  'demo', 'scored',   'en', 0.82, 'agent'),
    ('Patrick',    'Niyonzima',  'patrick.niyonzima@test.rw', '+250788200003', 'developer',  'Rwanda Properties Ltd', 'Nyarugenge, Kigali',    'Nyarugenge','demo', 'scored',   'en', 0.68, 'developer'),
    ('Marie',      'Uwimana',    'marie.uwimana@test.rw',      '+250788200004', 'owner',      NULL,                    'Musanze, Northern',     'Musanze',   'demo', 'scored',   'rw', 0.60, 'mid_value_owner'),
    ('David',      'Kagame',     'david.kagame@test.rw',       '+250788200005', 'institution','Equity Bank Rwanda',    'Kigali',                'Gasabo',    'demo', 'scored',   'en', 0.90, 'institution'),
    ('Claudine',   'Ishimwe',    'claudine.ishimwe@test.rw',   '+250788200006', 'agent',      'Century Real Estate',   'Kicukiro, Kigali',      'Kicukiro',  'demo', 'scored',   'fr', 0.71, 'agent'),
    ('Emmanuel',   'Bizimana',   'emmanuel.bizimana@test.rw',  '+250788200007', 'developer',  'Bizimana Construction', 'Rubavu, Western',       'Rubavu',    'demo', 'scored',   'rw', 0.55, 'developer'),
    ('Grace',      'Uwase',      'grace.uwase@test.rw',        '+250788200008', 'owner',      NULL,                    'Huye, Southern',        'Huye',      'demo', 'scored',   'fr', 0.45, 'mid_value_owner'),
    ('Fiston',     'Nkurunziza', 'fiston@test.rw',             '+250788200009', 'owner',      NULL,                    'Kimironko, Gasabo',     'Gasabo',    'demo', 'scored',   'rw', 0.65, 'high_value_owner'),
    ('Beatrice',   'Mutesi',     'beatrice.mutesi@test.rw',    '+250788200010', 'institution','Bank of Kigali',        'Kigali',                'Nyarugenge','demo', 'scored',   'en', 0.88, 'institution'),
    ('Olivier',    'Hakizimana', 'olivier@test.rw',             '+250788200012', 'developer',  'Haki Properties',       'Kicukiro',              'Kicukiro',  'demo', 'discovered','en', 0.00, NULL),
    ('Chantal',    'Mukashema',  'chantal@test.rw',             '+250788200013', 'owner',      NULL,                    'Kanombe, Kicukiro',     'Kicukiro',  'demo', 'discovered','rw', 0.00, NULL)
) AS v(first_name, last_name, email, phone, role, company, location, district, source, status, language_pref, ai_score, ai_segment)
WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.email = v.email);

-- ============================================================
-- 4. Demo Campaigns
-- ============================================================
INSERT INTO campaigns (name, description, campaign_type, channel, status, language, created_by)
SELECT * FROM (VALUES
    ('Welcome Series - Q3 2026',     'Welcome email series for new users. Introduce platform features and free valuation trial.',              'welcome',         'email',    'completed', 'all', (SELECT id FROM users WHERE email='admin@landval.rw')),
    ('Owner Outreach - Gasabo',      'Target property owners in Gasabo district. Promote premium listing and valuation services.',            'owner_outreach',  'email',    'draft',     'rw',  (SELECT id FROM users WHERE email='admin@landval.rw')),
    ('Agent Onboarding - Kigali',    'Onboard real estate agents in Kigali. Highlight partnership benefits and bulk valuation discounts.',    'agent_onboarding','email',    'draft',     'en',  (SELECT id FROM users WHERE email='admin@landval.rw')),
    ('Diaspora Investment Digest',   'Monthly digest for diaspora investors. Featured properties, market trends, and investment tips.',       'digest',          'email',    'running',   'en',  (SELECT id FROM users WHERE email='admin@landval.rw')),
    ('Seasonal Campaign - Q3 2026',  'Back-to-school season campaign. Target families looking for residential properties near schools.',       'seasonal',        'both',     'scheduled', 'all', (SELECT id FROM users WHERE email='admin@landval.rw'))
) AS v(name, description, campaign_type, channel, status, language, created_by)
WHERE NOT EXISTS (SELECT 1 FROM campaigns c WHERE c.name = v.name);
