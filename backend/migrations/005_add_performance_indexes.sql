-- 005_add_performance_indexes.sql
-- Performance optimization indexes for fast queries
-- Added: March 5, 2026

-- Properties table indexes for location-based search
CREATE INDEX IF NOT EXISTS idx_properties_district_sector ON properties(district, sector);
CREATE INDEX IF NOT EXISTS idx_properties_location_coords ON properties(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(area_sqm);
CREATE INDEX IF NOT EXISTS idx_properties_market_price ON properties(market_price_rwf);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- Valuations table indexes for sorting by recent
CREATE INDEX IF NOT EXISTS idx_valuations_created_at ON valuations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_valuator_created ON valuations(valuator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuations_property_status ON valuations(property_id, status);

-- Users table additional indexes (email already has unique index)
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON users(kyc_status);

-- Transactions table indexes for financial queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Subscriptions table indexes for user subscription lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON subscriptions(end_date);

-- Notifications table indexes (if not already created)
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_by_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_properties_owner_status ON properties(owner_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_district_type ON properties(district, property_type) WHERE deleted_at IS NULL;

-- Add comments explaining index purposes
COMMENT ON INDEX idx_properties_district_sector IS 'Fast location-based property search by district and sector';
COMMENT ON INDEX idx_valuations_created_at IS 'Sort valuations by most recent first';
COMMENT ON INDEX idx_notifications_is_read IS 'Quick lookup of unread notifications per user';
COMMENT ON INDEX idx_properties_owner_status IS 'Filter properties by owner and status efficiently';
