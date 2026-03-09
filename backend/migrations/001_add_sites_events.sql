-- Migration: Add family_sites, site_folders, site_media, event_rooms tables
-- For orgcell지침3 features

-- 1. Family Sites ($10 family website)
CREATE TABLE IF NOT EXISTS family_sites (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subdomain VARCHAR(50) UNIQUE NOT NULL,
    theme VARCHAR(20) DEFAULT 'modern',
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, expired
    photo_limit INTEGER DEFAULT 2000,
    plan_years INTEGER DEFAULT 1,
    stripe_subscription_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Site Folders (family tree structure)
CREATE TABLE IF NOT EXISTS site_folders (
    id SERIAL PRIMARY KEY,
    site_id INTEGER NOT NULL REFERENCES family_sites(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    label VARCHAR(100),
    parent_id INTEGER REFERENCES site_folders(id),
    is_shared BOOLEAN DEFAULT false,
    password_hash VARCHAR(255),
    cover_photo_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Site Media (photos, videos, audio, artwork)
CREATE TABLE IF NOT EXISTS site_media (
    id SERIAL PRIMARY KEY,
    folder_id INTEGER NOT NULL REFERENCES site_folders(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    media_type VARCHAR(20) DEFAULT 'photo', -- photo, video, audio, artwork
    file_size BIGINT,
    drive_file_id VARCHAR(255),
    thumbnail_url TEXT,
    title VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Event Rooms (실시간 공유 이벤트)
CREATE TABLE IF NOT EXISTS event_rooms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    creator_id INTEGER NOT NULL REFERENCES users(id),
    subdomain VARCHAR(50) UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Event Participants
CREATE TABLE IF NOT EXISTS event_participants (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES event_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, user_id)
);

-- 6. Event Photos (live feed)
CREATE TABLE IF NOT EXISTS event_photos (
    id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES event_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    photo_id INTEGER REFERENCES photos(id),
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Event Reactions (hearts, emoji)
CREATE TABLE IF NOT EXISTS event_reactions (
    id SERIAL PRIMARY KEY,
    event_photo_id INTEGER NOT NULL REFERENCES event_photos(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reaction VARCHAR(20) DEFAULT 'heart',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_photo_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_family_sites_subdomain ON family_sites(subdomain);
CREATE INDEX IF NOT EXISTS idx_site_folders_site ON site_folders(site_id);
CREATE INDEX IF NOT EXISTS idx_site_media_folder ON site_media(folder_id);
CREATE INDEX IF NOT EXISTS idx_event_rooms_code ON event_rooms(code);
CREATE INDEX IF NOT EXISTS idx_event_photos_event ON event_photos(event_id);
