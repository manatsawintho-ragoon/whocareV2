-- ============================================================
-- Services table migration
-- ============================================================

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  
  -- Pricing
  original_price DECIMAL(10,2) DEFAULT 0,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Categorization / flags
  category VARCHAR(100) DEFAULT 'general',
  branch VARCHAR(200) DEFAULT '',
  is_recommended BOOLEAN DEFAULT FALSE,
  is_promotion BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  sort_order INT DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price range columns (added later)
ALTER TABLE services ADD COLUMN IF NOT EXISTS price_max DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE services ADD COLUMN IF NOT EXISTS original_price_max DECIMAL(10,2) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_services_category ON services (category);
CREATE INDEX IF NOT EXISTS idx_services_is_recommended ON services (is_recommended);
CREATE INDEX IF NOT EXISTS idx_services_is_promotion ON services (is_promotion);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services (is_active);
