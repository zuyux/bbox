-- Create the apps table for storing published Bitcoin apps
CREATE TABLE IF NOT EXISTS apps (
  id BIGSERIAL PRIMARY KEY,
  -- Basic app information
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  tags TEXT[] DEFAULT '{}',
  
  -- App metadata
  version VARCHAR(50) DEFAULT '1.0.0',
  website_url TEXT,
  github_url TEXT,
  documentation_url TEXT,
  
  -- Media and assets
  icon_cid TEXT, -- IPFS hash for app icon
  icon_url TEXT, -- Alternative URL for icon
  screenshots_cids TEXT[] DEFAULT '{}', -- Array of IPFS hashes for screenshots
  banner_cid TEXT, -- IPFS hash for banner image
  
  -- App store information
  downloads BIGINT DEFAULT 0,
  rating DECIMAL(2,1) DEFAULT 0.0,
  verified BOOLEAN DEFAULT FALSE,
  featured BOOLEAN DEFAULT FALSE,
  
  -- Publisher information
  publisher_address VARCHAR(255) NOT NULL, -- Bitcoin/Stacks address of publisher
  publisher_name VARCHAR(255),
  publisher_email VARCHAR(255),
  
  -- Platform and compatibility
  platforms TEXT[] DEFAULT '{}', -- ['web', 'desktop', 'mobile', 'browser-extension']
  supported_networks TEXT[] DEFAULT '{}', -- ['bitcoin', 'lightning', 'stacks', 'liquid']
  license VARCHAR(100) DEFAULT 'MIT',
  
  -- App size and technical details
  app_size_mb DECIMAL(8,2),
  min_requirements TEXT,
  supported_languages TEXT[] DEFAULT '{}',
  
  -- Privacy and security
  privacy_policy_url TEXT,
  terms_of_service_url TEXT,
  data_collection_summary TEXT,
  open_source BOOLEAN DEFAULT TRUE,
  
  -- Monetization
  pricing_model VARCHAR(50) DEFAULT 'free', -- 'free', 'paid', 'freemium', 'donation'
  price_usd DECIMAL(10,2) DEFAULT 0.00,
  accepts_lightning BOOLEAN DEFAULT FALSE,
  lightning_address TEXT,
  
  -- Status and moderation
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'suspended'
  moderation_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_rating CHECK (rating >= 0.0 AND rating <= 5.0),
  CONSTRAINT valid_price CHECK (price_usd >= 0.0),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  CONSTRAINT valid_pricing_model CHECK (pricing_model IN ('free', 'paid', 'freemium', 'donation'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_apps_category ON apps(category);
CREATE INDEX IF NOT EXISTS idx_apps_publisher_address ON apps(publisher_address);
CREATE INDEX IF NOT EXISTS idx_apps_status ON apps(status);
CREATE INDEX IF NOT EXISTS idx_apps_verified ON apps(verified);
CREATE INDEX IF NOT EXISTS idx_apps_featured ON apps(featured);
CREATE INDEX IF NOT EXISTS idx_apps_created_at ON apps(created_at);
CREATE INDEX IF NOT EXISTS idx_apps_rating ON apps(rating DESC);
CREATE INDEX IF NOT EXISTS idx_apps_downloads ON apps(downloads DESC);

-- Full text search index for app names and descriptions
CREATE INDEX IF NOT EXISTS idx_apps_search ON apps USING gin(to_tsvector('english', name || ' ' || description));

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_apps_updated_at BEFORE UPDATE ON apps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create table for app reviews and ratings
CREATE TABLE IF NOT EXISTS app_reviews (
  id BIGSERIAL PRIMARY KEY,
  app_id BIGINT REFERENCES apps(id) ON DELETE CASCADE,
  reviewer_address VARCHAR(255) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate reviews from same address for same app
  UNIQUE(app_id, reviewer_address)
);

-- Create indexes for reviews
CREATE INDEX IF NOT EXISTS idx_app_reviews_app_id ON app_reviews(app_id);
CREATE INDEX IF NOT EXISTS idx_app_reviews_rating ON app_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_app_reviews_created_at ON app_reviews(created_at DESC);

-- Create trigger for reviews updated_at
CREATE TRIGGER update_app_reviews_updated_at BEFORE UPDATE ON app_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create table for app downloads tracking
CREATE TABLE IF NOT EXISTS app_downloads (
  id BIGSERIAL PRIMARY KEY,
  app_id BIGINT REFERENCES apps(id) ON DELETE CASCADE,
  downloader_address VARCHAR(255),
  download_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  ip_address INET,
  
  -- Track unique downloads per address per app
  UNIQUE(app_id, downloader_address)
);

-- Create indexes for downloads
CREATE INDEX IF NOT EXISTS idx_app_downloads_app_id ON app_downloads(app_id);
CREATE INDEX IF NOT EXISTS idx_app_downloads_date ON app_downloads(download_date DESC);

-- Row Level Security (RLS) policies
ALTER TABLE apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_downloads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read approved apps
CREATE POLICY "Anyone can view approved apps" ON apps
  FOR SELECT USING (status = 'approved');

-- Policy: Publishers can view their own apps regardless of status
CREATE POLICY "Publishers can view their own apps" ON apps
  FOR SELECT USING (auth.jwt() ->> 'address' = publisher_address);

-- Policy: Publishers can insert their own apps
CREATE POLICY "Publishers can create apps" ON apps
  FOR INSERT WITH CHECK (auth.jwt() ->> 'address' = publisher_address);

-- Policy: Publishers can update their own apps
CREATE POLICY "Publishers can update their own apps" ON apps
  FOR UPDATE USING (auth.jwt() ->> 'address' = publisher_address);

-- Policy: Anyone can read reviews for approved apps
CREATE POLICY "Anyone can view reviews for approved apps" ON app_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM apps 
      WHERE apps.id = app_reviews.app_id 
      AND apps.status = 'approved'
    )
  );

-- Policy: Users can create reviews for approved apps
CREATE POLICY "Users can create reviews" ON app_reviews
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'address' = reviewer_address
    AND EXISTS (
      SELECT 1 FROM apps 
      WHERE apps.id = app_reviews.app_id 
      AND apps.status = 'approved'
    )
  );

-- Policy: Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON app_reviews
  FOR UPDATE USING (auth.jwt() ->> 'address' = reviewer_address);

-- Policy: Track downloads for approved apps
CREATE POLICY "Track downloads for approved apps" ON app_downloads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM apps 
      WHERE apps.id = app_downloads.app_id 
      AND apps.status = 'approved'
    )
  );