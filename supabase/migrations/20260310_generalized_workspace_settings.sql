-- =============================================
-- AutoPilot Content — Generalized Workspace Settings
-- This migration extends the existing workspace_settings table
-- with fields needed for full SaaS generalization.
-- =============================================

-- 1. Branding fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS brand_name TEXT DEFAULT 'AutoPilot';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS brand_tagline TEXT DEFAULT 'Content Intelligence';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS brand_logo_url TEXT;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS industry_vertical TEXT DEFAULT 'general';

-- 2. Content Discovery fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS scan_keywords TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS default_search_query TEXT;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS excluded_keywords TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS excluded_domains TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS priority_sources TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS trusted_domains TEXT[] DEFAULT '{}';

-- 3. WordPress Category fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS default_categories TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS category_blacklist TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS category_map JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS always_include_category TEXT;

-- 4. Chatbot fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS chatbot_system_prompt TEXT;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS chatbot_topics JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS chatbot_allowed_origins TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS chatbot_greeting JSONB DEFAULT '{"he": "שלום! אני העוזר שלך לחדשות. על מה תרצה לשמוע?", "en": "Hi! I''m your news assistant. What would you like to hear about?"}'::jsonb;

-- 5. Email fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS email_sender_name TEXT DEFAULT 'News';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS email_from_address TEXT;
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS dashboard_url TEXT;

-- 6. Image fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS fallback_images TEXT[] DEFAULT '{}';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS default_image_query TEXT DEFAULT 'technology business';

-- 7. Language fields
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS supported_languages TEXT[] DEFAULT ARRAY['en'];
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS primary_language TEXT DEFAULT 'en';
ALTER TABLE public.workspace_settings ADD COLUMN IF NOT EXISTS bilingual_mode BOOLEAN DEFAULT false;

-- 8. Populate the i-HLS Default workspace with its specific values
DO $$
DECLARE
    default_workspace_id UUID;
BEGIN
    SELECT id INTO default_workspace_id FROM public.workspaces WHERE name = 'i-HLS Default' LIMIT 1;

    IF default_workspace_id IS NOT NULL THEN
        UPDATE public.workspace_settings SET
            -- Branding
            brand_name = 'i-HLS',
            brand_tagline = 'Defense Intelligence',
            industry_vertical = 'defense-tech',

            -- Content Discovery
            scan_keywords = ARRAY[
                'UAVs (Unmanned Aerial Vehicles)', 'Small Tactical Drones', 'Loitering Munitions',
                'Swarm Technology', 'C-UAS (Counter Unmanned Aerial Systems)', 'Cyber Warfare',
                'Cyber Defense', 'Critical Infrastructure Protection', 'Iron Dome Tech',
                'Laser Weapons (Energy Weapons)', 'Radar Systems', 'Electronic Warfare (EW)',
                'Border Security', 'Artificial Intelligence (AI)', 'Machine Learning (ML)',
                'Autonomous Systems', 'Military Robotics', 'New Space', 'Nano-Satellites',
                'Quantum Computing', 'Dual-Use Technologies', 'Semiconductors & Chips'
            ],
            default_search_query = 'defense tech startup funding investment Israeli cyber security dual-use M&A acquisition Series A venture capital military technology',
            excluded_keywords = ARRAY[
                'ceasefire', 'peace talks', 'elections', 'parliament', 'obituary', 'funeral',
                'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain', 'nft',
                'fintech', 'adtech', 'edtech', 'medtech', 'foodtech', 'agritech',
                'gaming', 'esports', 'entertainment', 'fashion', 'beauty', 'lifestyle',
                'real estate', 'proptech', 'legaltech', 'hrtech', 'insurtech', 'regtech'
            ],
            excluded_domains = ARRAY[
                'navalnews.com', 'c4isrnet.com', 'defenseone.com', 'defensescoop.com',
                'militarytimes.com', 'armytimes.com', 'airforcetimes.com',
                'nationaldefensemagazine.org', 'thedefensepost.com', 'army-technology.com',
                'naval-technology.com', 'airforce-technology.com', 'jpost.com',
                'janes.com', 'defensenews.com', 'breakingdefense.com',
                'flightglobal.com', 'aviationweek.com', 'sifted.eu'
            ],
            priority_sources = ARRAY[
                'geektime.co.il', 'calcalistech.com', 'techcrunch.com', 'venturebeat.com',
                'crunchbase.com', 'globes.co.il', 'nocamels.com'
            ],
            trusted_domains = ARRAY[
                'geektime.co.il', 'calcalistech.com', 'techcrunch.com', 'venturebeat.com',
                'crunchbase.com', 'globes.co.il', 'nocamels.com'
            ],

            -- WordPress Categories
            default_categories = ARRAY['Companies', 'News', 'Startups News', 'Security', 'Defense', 'HLS'],
            category_blacklist = ARRAY['startups news', 'ai ihls', 'startups', 'investments', 'cyber', 'drones', 'ai', 'ar', 'news'],
            category_map = '{
                "drone": ["Unmanned Systems", "Drones"],
                "uav": ["Unmanned Systems", "Drones"],
                "cyber": ["Cyber Security"],
                "ai": ["AI"],
                "missile": ["Air & Missile Defense", "Weapons"],
                "space": ["Space"],
                "satellite": ["Space"],
                "naval": ["Naval"],
                "border": ["Border Security"],
                "robot": ["Robotics"]
            }'::jsonb,

            -- Chatbot
            chatbot_system_prompt = 'You are the i-HLS news assistant. Your ONLY job is to trigger a news search. ALLOWED TOPICS: cybersecurity, defense tech, startups/funding/M&A, drones/UAVs, AI in defense, space/satellites, border security, naval tech.',
            chatbot_topics = '[
                {"key": "cyber", "labelHe": "סייבר ואבטחת מידע", "labelEn": "Cybersecurity", "emoji": "🔒"},
                {"key": "defense", "labelHe": "טכנולוגיה ביטחונית", "labelEn": "Defense Tech", "emoji": "🛡️"},
                {"key": "startups", "labelHe": "סטארטאפים וגיוסי הון", "labelEn": "Startups & Funding", "emoji": "🚀"},
                {"key": "drones", "labelHe": "מל\"טים ורובוטיקה", "labelEn": "Drones & Robotics", "emoji": "🤖"},
                {"key": "ai", "labelHe": "בינה מלאכותית", "labelEn": "AI & ML", "emoji": "🧠"},
                {"key": "space", "labelHe": "חלל וטכנולוגיית לוויינים", "labelEn": "Space & Satellites", "emoji": "🛰️"},
                {"key": "border", "labelHe": "ביטחון גבולות", "labelEn": "Border Security", "emoji": "🏗️"}
            ]'::jsonb,
            chatbot_allowed_origins = ARRAY['https://i-hls.com', 'https://www.i-hls.com', 'http://localhost:5173', 'http://localhost:3000'],
            chatbot_greeting = '{"he": "שלום! אני עוזר החדשות של i-HLS. איך אפשר לעזור?", "en": "Hi! I''m the i-HLS news assistant. How can I help?"}'::jsonb,

            -- Email
            email_sender_name = 'Defense News',
            dashboard_url = 'https://ihlsstartuparticles.lovable.app',

            -- Images
            fallback_images = ARRAY[
                'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&h=600&fit=crop',
                'https://images.unsplash.com/photo-1580893246395-52aead8960dc?w=1200&h=600&fit=crop',
                'https://images.unsplash.com/photo-1569748130764-3fed0c102c59?w=1200&h=600&fit=crop',
                'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1200&h=600&fit=crop',
                'https://images.unsplash.com/photo-1553406830-ef2513450d76?w=1200&h=600&fit=crop'
            ],
            default_image_query = 'military defense technology',

            -- Languages
            supported_languages = ARRAY['he', 'en'],
            primary_language = 'he',
            bilingual_mode = true,

            -- Theme (military green)
            theme_colors = '{
                "primary": "#00d4ff",
                "primaryGlow": "rgba(0, 212, 255, 0.2)",
                "accent": "#00ff88",
                "accentGlow": "rgba(0, 255, 136, 0.2)",
                "background": "#0a0a14",
                "surface": "#0d0d1a",
                "foreground": "#c4c4d4",
                "cardBg": "#12121f"
            }'::jsonb
        WHERE workspace_id = default_workspace_id;
    END IF;
END $$;

-- 9. Create a function to lookup workspace by chatbot origin
CREATE OR REPLACE FUNCTION public.get_workspace_by_origin(origin_url TEXT)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
    SELECT workspace_id
    FROM public.workspace_settings
    WHERE origin_url = ANY(chatbot_allowed_origins)
    LIMIT 1;
$$;
