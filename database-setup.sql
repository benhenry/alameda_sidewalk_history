-- PostgreSQL schema for Alameda Sidewalk Map
-- Run this after creating your Cloud SQL PostgreSQL instance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Sidewalk segments table
CREATE TABLE IF NOT EXISTS sidewalk_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    street VARCHAR(255) NOT NULL,
    block VARCHAR(100) NOT NULL,
    contractor VARCHAR(255) NOT NULL,
    year INTEGER NOT NULL,
    coordinates JSONB NOT NULL, -- Array of [lat, lng] coordinates
    special_marks JSONB DEFAULT '[]', -- Array of special marks
    notes TEXT,
    status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Contractors table
CREATE TABLE IF NOT EXISTS contractors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    total_segments INTEGER DEFAULT 0,
    first_year INTEGER,
    last_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sidewalk_segment_id UUID NOT NULL REFERENCES sidewalk_segments(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    mimetype VARCHAR(100),
    size INTEGER,
    storage_url VARCHAR(500), -- Cloud Storage URL
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_segments_street ON sidewalk_segments(street);
CREATE INDEX IF NOT EXISTS idx_segments_contractor ON sidewalk_segments(contractor);
CREATE INDEX IF NOT EXISTS idx_segments_year ON sidewalk_segments(year);
CREATE INDEX IF NOT EXISTS idx_segments_status ON sidewalk_segments(status);
CREATE INDEX IF NOT EXISTS idx_segments_created_at ON sidewalk_segments(created_at);
CREATE INDEX IF NOT EXISTS idx_photos_segment_id ON photos(sidewalk_segment_id);
CREATE INDEX IF NOT EXISTS idx_password_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_tokens_token ON password_reset_tokens(token);

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_sidewalk_segments_updated_at 
    BEFORE UPDATE ON sidewalk_segments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at 
    BEFORE UPDATE ON contractors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - CHANGE THIS!)
INSERT INTO users (email, username, password_hash, role) 
VALUES (
    'admin@example.com', 
    'admin', 
    '$2a$10$rQ8Km7Z8Jv1Jz5.xj5zJ4eK1xJ8Jv1Jz5.xj5zJ4eK1xJ8Jv1Jz5.', -- admin123
    'admin'
) ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE users IS 'Application users with authentication';
COMMENT ON TABLE sidewalk_segments IS 'Sidewalk segments with contractor information';
COMMENT ON TABLE contractors IS 'Contractor information aggregated from segments';
COMMENT ON TABLE photos IS 'Photos associated with sidewalk segments';
COMMENT ON TABLE password_reset_tokens IS 'Tokens for password reset functionality';