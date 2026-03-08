-- Orgcell MVP Database Schema
-- PostgreSQL 16

-- Users (Google SSO)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    google_drive_token JSONB,          -- OAuth tokens for Google Drive BYOS
    encryption_key_hash VARCHAR(255),   -- hash of user's master encryption key
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Albums (auto-created per person or manual)
CREATE TABLE albums (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'person',  -- 'person', 'manual', 'event'
    cover_photo_id INTEGER,
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photos (metadata only - actual files in Google Drive via BYOS)
CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    thumbnail_url TEXT,                 -- TPE encrypted thumbnail path
    drive_file_id VARCHAR(255),         -- Google Drive file ID (BYOS)
    drive_thumbnail_id VARCHAR(255),    -- Google Drive thumbnail ID
    taken_at TIMESTAMP,                 -- EXIF date
    location JSONB,                     -- {lat, lng, address}
    dhash VARCHAR(64),                  -- perceptual hash for duplicate detection
    is_encrypted BOOLEAN DEFAULT true,
    metadata JSONB,                     -- EXIF data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Face Descriptors (128-dim vectors from face-api.js)
CREATE TABLE face_descriptors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL,
    label VARCHAR(255) NOT NULL,        -- person name: "아들", "딸", etc.
    descriptor FLOAT8[] NOT NULL,       -- 128-dimensional face descriptor
    photo_id INTEGER REFERENCES photos(id) ON DELETE SET NULL,  -- reference photo
    is_reference BOOLEAN DEFAULT false, -- is this the reference descriptor?
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Photo-Album mapping (many-to-many)
CREATE TABLE photo_albums (
    photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    album_id INTEGER NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (photo_id, album_id)
);

-- Photo-Face mapping (which faces found in which photo)
CREATE TABLE photo_faces (
    id SERIAL PRIMARY KEY,
    photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    face_descriptor_id INTEGER REFERENCES face_descriptors(id) ON DELETE SET NULL,
    label VARCHAR(255),                 -- matched person name
    confidence FLOAT,                   -- match confidence (0-1)
    box JSONB,                          -- {x, y, width, height} face bounding box
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Share Rooms (Friend Call)
CREATE TABLE share_rooms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,   -- short unique code for room URL
    creator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'closed'
    expires_at TIMESTAMP NOT NULL,       -- auto-expire (default 1 hour)
    max_participants INTEGER DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Room Participants
CREATE TABLE room_participants (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES share_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- Room Exchanges (photos exchanged via server relay)
CREATE TABLE room_exchanges (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES share_rooms(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id),
    receiver_id INTEGER NOT NULL REFERENCES users(id),
    photo_id INTEGER REFERENCES photos(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    watermarked BOOLEAN DEFAULT true,
    exchanged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Duplicate Groups (dHash-based)
CREATE TABLE duplicate_groups (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    representative_photo_id INTEGER REFERENCES photos(id),
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE duplicate_members (
    group_id INTEGER NOT NULL REFERENCES duplicate_groups(id) ON DELETE CASCADE,
    photo_id INTEGER NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
    similarity FLOAT,                    -- hamming distance similarity
    PRIMARY KEY (group_id, photo_id)
);

-- Indexes
CREATE INDEX idx_photos_user_id ON photos(user_id);
CREATE INDEX idx_photos_dhash ON photos(dhash);
CREATE INDEX idx_photos_taken_at ON photos(user_id, taken_at DESC);
CREATE INDEX idx_face_descriptors_user_id ON face_descriptors(user_id);
CREATE INDEX idx_face_descriptors_label ON face_descriptors(user_id, label);
CREATE INDEX idx_photo_albums_album ON photo_albums(album_id);
CREATE INDEX idx_photo_faces_photo ON photo_faces(photo_id);
CREATE INDEX idx_share_rooms_code ON share_rooms(code);
CREATE INDEX idx_share_rooms_status ON share_rooms(status, expires_at);
CREATE INDEX idx_room_exchanges_room ON room_exchanges(room_id);
