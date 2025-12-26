-- Auth.js v5 PostgreSQL Adapter Schema
-- https://authjs.dev/getting-started/adapters/postgresql

-- Note: We're keeping the existing 'users' table and extending it
-- The Auth.js adapter will use this table with some additional fields

-- Add Auth.js required fields to existing users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_verified TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS image TEXT;

-- Make email NOT NULL if it isn't already (Auth.js requirement)
-- This is safe since we're using OAuth which always provides email
DO $$
BEGIN
  ALTER TABLE users ALTER COLUMN email SET NOT NULL;
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Accounts table (stores OAuth provider info)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

-- Sessions table (stores active sessions)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens table (for email verification, passwordless login, etc.)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (identifier, token)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_session_token ON sessions(session_token);

-- Add updated_at trigger for accounts
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at trigger for sessions
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE accounts IS 'OAuth provider accounts linked to users (Auth.js)';
COMMENT ON TABLE sessions IS 'Active user sessions (Auth.js)';
COMMENT ON TABLE verification_tokens IS 'Verification tokens for email verification and passwordless login (Auth.js)';
COMMENT ON COLUMN users.email_verified IS 'Timestamp when email was verified via OAuth';
COMMENT ON COLUMN users.image IS 'Profile picture URL from OAuth provider';
