-- Migration: Create properties table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    cell VARCHAR(100) NOT NULL,
    village VARCHAR(100) NOT NULL,
    plot_size_sqm NUMERIC,
    price NUMERIC,
    status VARCHAR(50) DEFAULT 'for_sale',
    images TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);