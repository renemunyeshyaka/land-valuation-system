-- 018_create_ai_customer_targeting_tables.sql
-- Phase 7 — AI Customer Targeting: leads, campaigns, campaign_activities, lead_scores
-- Chat Assistant: LandVal Assistant

-- ============================================================
-- 1. Leads table — stores discovered prospects from all sources
-- ============================================================
CREATE TABLE IF NOT EXISTS leads (
    id              SERIAL PRIMARY KEY,
    source          VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_url      TEXT,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    email           VARCHAR(255),
    phone           VARCHAR(50),
    company         VARCHAR(255),
    role            VARCHAR(50),               -- 'owner', 'agent', 'developer', 'institution', 'other'
    location        VARCHAR(255),
    district        VARCHAR(100),
    sector          VARCHAR(100),
    cell            VARCHAR(100),
    upi             VARCHAR(50),
    language_pref   VARCHAR(10) DEFAULT 'en',   -- 'en', 'fr', 'rw'

    -- AI Enrichment
    ai_score        DECIMAL(5,2) DEFAULT 0,
    ai_segment      VARCHAR(50),
    ai_insights     JSONB,                      -- Full DeepSeek enrichment payload
    ai_last_scored  TIMESTAMPTZ,

    -- Status
    status          VARCHAR(20) DEFAULT 'discovered',
    -- 'discovered', 'enriched', 'scored', 'queued', 'contacted', 'engaged',
    -- 'converted', 'unresponsive', 'warm_pool', 'blacklisted'

    -- Activity
    total_emails    INT DEFAULT 0,
    total_whats_apps INT DEFAULT 0,
    last_contacted  TIMESTAMPTZ,
    converted_at    TIMESTAMPTZ,
    converted_user_id INT REFERENCES users(id),

    -- Metadata
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_leads_email UNIQUE (email),
    CONSTRAINT uq_leads_phone UNIQUE (phone)
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(ai_score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(ai_segment);
CREATE INDEX IF NOT EXISTS idx_leads_district ON leads(district);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- ============================================================
-- 2. Campaigns table — outreach campaign configuration
-- ============================================================
CREATE TABLE IF NOT EXISTS campaigns (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    campaign_type   VARCHAR(50) NOT NULL,       -- 'welcome', 'owner_outreach', 'agent_onboarding', 'reactivation', 'digest', 'seasonal'
    channel         VARCHAR(20) NOT NULL,        -- 'email', 'whatsapp', 'both'
    segment_filter  JSONB,                       -- AI segment criteria
    target_count    INT DEFAULT 0,

    -- Content (AI-generated or manually written)
    subject_template TEXT,
    body_template    TEXT,
    language         VARCHAR(10),                -- 'en', 'fr', 'rw', 'all'

    -- Schedule
    status          VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'running', 'paused', 'completed'
    scheduled_at    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,

    -- Performance
    sent_count      INT DEFAULT 0,
    opened_count    INT DEFAULT 0,
    clicked_count   INT DEFAULT 0,
    converted_count INT DEFAULT 0,

    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaigns_scheduled ON campaigns(scheduled_at);

-- ============================================================
-- 3. Campaign activities table — per-lead engagement log
-- ============================================================
CREATE TABLE IF NOT EXISTS campaign_activities (
    id              SERIAL PRIMARY KEY,
    campaign_id     INT REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id         INT REFERENCES leads(id) ON DELETE CASCADE,
    channel         VARCHAR(20) NOT NULL,        -- 'email', 'whatsapp'
    status          VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'

    subject         TEXT,
    body_preview    TEXT,                        -- First 100 chars
    tracking_id     VARCHAR(100),                -- Unique tracking ID for open/click tracking

    sent_at         TIMESTAMPTZ,
    opened_at       TIMESTAMPTZ,
    clicked_at      TIMESTAMPTZ,

    error_message   TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_camp_act_campaign ON campaign_activities(campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_act_lead ON campaign_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_camp_act_tracking ON campaign_activities(tracking_id);
CREATE INDEX IF NOT EXISTS idx_camp_act_status ON campaign_activities(status);

-- ============================================================
-- 4. Lead scores table — historical scoring snapshots
-- ============================================================
CREATE TABLE IF NOT EXISTS lead_scores (
    id              SERIAL PRIMARY KEY,
    lead_id         INT REFERENCES leads(id) ON DELETE CASCADE,
    score           DECIMAL(5,2) NOT NULL,
    score_breakdown JSONB,                       -- Individual factor scores
    scored_by       VARCHAR(20) DEFAULT 'deepseek',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_created ON lead_scores(created_at);

-- ============================================================
-- 5. Updated_at triggers
-- ============================================================
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION update_leads_updated_at();

CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_campaigns_updated_at();

-- ============================================================
-- 6. Unsubscribe fields (added 2026-06-24)
-- ============================================================
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_unsubscribe_token ON leads(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_leads_unsubscribed ON leads(unsubscribed_at);
