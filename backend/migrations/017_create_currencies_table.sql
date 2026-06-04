-- 017_create_currencies_table.sql
-- Adds multi-currency support for subscriptions and payments

-- 1. Create currencies table
CREATE TABLE IF NOT EXISTS currencies (
    id BIGSERIAL PRIMARY KEY,
    iso_code VARCHAR(3) NOT NULL UNIQUE,               -- e.g., USD, EUR, RWF
    symbol VARCHAR(10) NOT NULL,                        -- e.g., $, €, Frw
    name VARCHAR(100) NOT NULL,                         -- e.g., US Dollar, Euro, Rwandan Franc
    exchange_rate_to_rwf DECIMAL(20, 6) NOT NULL,       -- 1 unit of this currency = X RWF
    is_base BOOLEAN DEFAULT FALSE,                      -- RWF is the base currency
    is_active BOOLEAN DEFAULT TRUE,
    region VARCHAR(50),                                 -- e.g., RW, EU, US, CA
    last_synced_at TIMESTAMP,                           -- when the rate was last updated from API
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add preferred_currency to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_currency VARCHAR(3) DEFAULT 'RWF';

-- 3. Seed default currencies
INSERT INTO currencies (iso_code, symbol, name, exchange_rate_to_rwf, is_base, is_active, region) VALUES
    ('RWF', 'Frw', 'Rwandan Franc', 1.000000, TRUE, TRUE, 'RW'),
    ('USD', '$', 'US Dollar', 1310.000000, FALSE, TRUE, 'US'),
    ('EUR', '€', 'Euro', 1425.000000, FALSE, TRUE, 'EU'),
    ('CAD', 'C$', 'Canadian Dollar', 965.000000, FALSE, TRUE, 'CA'),
    ('GBP', '£', 'British Pound', 1660.000000, FALSE, TRUE, 'GB'),
    ('KES', 'KSh', 'Kenyan Shilling', 10.150000, FALSE, TRUE, 'KE'),
    ('UGX', 'USh', 'Ugandan Shilling', 0.350000, FALSE, TRUE, 'UG'),
    ('TZS', 'TSh', 'Tanzanian Shilling', 0.520000, FALSE, TRUE, 'TZ'),
    ('CDF', 'FC', 'Congolese Franc', 0.470000, FALSE, TRUE, 'CD')
ON CONFLICT (iso_code) DO NOTHING;

-- 4. Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_currencies_region ON currencies(region);
CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_currencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_currencies_updated_at ON currencies;
CREATE TRIGGER update_currencies_updated_at
    BEFORE UPDATE ON currencies
    FOR EACH ROW
    EXECUTE FUNCTION update_currencies_updated_at();

COMMENT ON TABLE currencies IS 'Supported currencies for multi-currency subscriptions and payments';
COMMENT ON COLUMN currencies.exchange_rate_to_rwf IS 'Exchange rate: 1 unit of this currency equals X RWF';
COMMENT ON COLUMN currencies.is_base IS 'RWF is the single base currency';
COMMENT ON COLUMN users.preferred_currency IS 'User preferred currency ISO code for displaying prices';
