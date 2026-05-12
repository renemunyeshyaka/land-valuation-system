CREATE TABLE IF NOT EXISTS user_property_views (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  property_id BIGINT NOT NULL,
  last_viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_user_property_views_user_id ON user_property_views(user_id);
CREATE INDEX IF NOT EXISTS idx_user_property_views_property_id ON user_property_views(property_id);
CREATE INDEX IF NOT EXISTS idx_user_property_views_last_viewed_at ON user_property_views(last_viewed_at DESC);

CREATE TABLE IF NOT EXISTS user_saved_properties (
  user_id BIGINT NOT NULL,
  property_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, property_id)
);

ALTER TABLE user_saved_properties
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_user_saved_properties_user_id ON user_saved_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_user_saved_properties_property_id ON user_saved_properties(property_id);

CREATE INDEX IF NOT EXISTS idx_properties_owner_id_created_at ON properties(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_district_status_created_at ON properties(district, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(price);
CREATE INDEX IF NOT EXISTS idx_properties_land_size ON properties(land_size);
