-- Neon Database Migration Script: Tournament Dual-Registration Feature
-- Target Database: PostgreSQL / Neon

-- 1. Create Players Table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index emails for fast profile lookups/upserts
CREATE INDEX IF NOT EXISTS idx_players_email ON players (email);

-- 2. Create Event Check-ins Table
CREATE TABLE IF NOT EXISTS event_checkins (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    qr_hash UUID UNIQUE NOT NULL,
    pin VARCHAR(6) NOT NULL,
    checked_in BOOLEAN DEFAULT FALSE NOT NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_pin_length CHECK (LENGTH(pin) = 6)
);

-- Index check-ins by player ID and qr_hash
CREATE INDEX IF NOT EXISTS idx_event_checkins_player_id ON event_checkins (player_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_qr_hash ON event_checkins (qr_hash);

-- 3. Create Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id SERIAL PRIMARY KEY,
    challenger_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
    CONSTRAINT chk_match_status CHECK (status IN ('pending', 'accepted', 'declined', 'completed')),
    CONSTRAINT chk_self_match CHECK (challenger_id <> partner_id)
);

-- Index the match status and players for fast query filters
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_challenger ON matches (challenger_id);
CREATE INDEX IF NOT EXISTS idx_matches_partner ON matches (partner_id);
