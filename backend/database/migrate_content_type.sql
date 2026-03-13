-- ============================================================
-- Fresh schema: news_articles, news_categories, news_tags
-- Drop old tables first, then create from scratch
-- ============================================================

-- Drop old tables (order matters for FK)
DROP TABLE IF EXISTS news_tags_map CASCADE;
DROP TABLE IF EXISTS news_tags CASCADE;
DROP TABLE IF EXISTS news_articles CASCADE;
DROP TABLE IF EXISTS news_categories CASCADE;

-- ============================================================
-- News Categories
-- ============================================================
CREATE TABLE news_categories (
  id SERIAL PRIMARY KEY,
  name_th VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) DEFAULT '',
  slug VARCHAR(120) NOT NULL UNIQUE,
  icon VARCHAR(50) DEFAULT 'mdi:folder',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- News Articles (articles + news unified)
-- ============================================================
CREATE TABLE news_articles (
  id SERIAL PRIMARY KEY,
  title VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover_image TEXT DEFAULT '',
  category_id INT REFERENCES news_categories(id) ON DELETE SET NULL,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,

  -- article = ความรู้/วิเคราะห์, news = รายงานเหตุการณ์
  content_type VARCHAR(10) DEFAULT 'article' CHECK (content_type IN ('article', 'news')),

  is_featured BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE,
  view_count INT DEFAULT 0,

  -- Workflow status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','published','archived')),
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,

  -- SEO
  seo_title VARCHAR(300) DEFAULT '',
  seo_description TEXT DEFAULT '',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_articles_slug ON news_articles (slug);
CREATE INDEX idx_news_articles_status ON news_articles (status);
CREATE INDEX idx_news_articles_content_type ON news_articles (content_type);
CREATE INDEX idx_news_articles_category ON news_articles (category_id);
CREATE INDEX idx_news_articles_author ON news_articles (author_id);
CREATE INDEX idx_news_articles_featured ON news_articles (is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_news_articles_published ON news_articles (published_at DESC) WHERE status = 'published';

-- ============================================================
-- News Tags
-- ============================================================
CREATE TABLE news_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- News Tags Map (M:N)
-- ============================================================
CREATE TABLE news_tags_map (
  article_id INT NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
  tag_id INT NOT NULL REFERENCES news_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_news_tags_map_tag ON news_tags_map (tag_id);

-- ============================================================
-- Trigger: auto-update updated_at on news_articles
-- ============================================================
DROP TRIGGER IF EXISTS trg_news_articles_updated_at ON news_articles;
CREATE TRIGGER trg_news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Seed default categories
-- ============================================================
INSERT INTO news_categories (name_th, name_en, slug, icon, sort_order) VALUES
  ('สุขภาพทั่วไป', 'General Health', 'health', 'mdi:heart-pulse', 1),
  ('โรคและการรักษา', 'Disease & Treatment', 'disease-treatment', 'mdi:hospital', 2),
  ('ศัลยกรรม', 'Surgery', 'surgery', 'mdi:needle', 3),
  ('ผิวพรรณ', 'Dermatology', 'dermatology', 'mdi:face-woman', 4),
  ('กิจกรรม', 'Events', 'events', 'mdi:calendar-star', 5),
  ('โปรโมชั่น', 'Promotions', 'promotions', 'mdi:tag-multiple', 6)
ON CONFLICT (slug) DO NOTHING;
