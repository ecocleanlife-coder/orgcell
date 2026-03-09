-- Sharing Photos: uploaded to group albums in Live Sharing rooms
CREATE TABLE IF NOT EXISTS sharing_photos (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(20) NOT NULL,
    uploader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sharing_photos_room ON sharing_photos(room_code);
CREATE INDEX idx_sharing_photos_uploader ON sharing_photos(uploader_id);
