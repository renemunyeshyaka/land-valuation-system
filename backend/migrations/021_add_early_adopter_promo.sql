-- Early Adopter promo: the first 20,000 new sign-ups get a free, never-expiring account.
-- Existing users keep is_early_adopter = FALSE (unchanged). The counter counts new sign-ups only.

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_early_adopter BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS promo_counters (
    id INT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    granted INT NOT NULL DEFAULT 0,
    grant_limit INT NOT NULL DEFAULT 20000,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO promo_counters (id, name) VALUES (1, 'early_adopter_free')
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_users_early_adopter ON users(is_early_adopter);
