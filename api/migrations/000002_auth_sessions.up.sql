CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    family_id UUID NOT NULL,
    refresh_jti UUID NOT NULL UNIQUE,
    parent_jti UUID NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ NULL,
    replaced_by_jti UUID NULL,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    revoke_reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_family_id_idx ON auth_sessions(family_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);

CREATE TABLE IF NOT EXISTS auth_audit_events (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NULL,
    event_type TEXT NOT NULL,
    event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS auth_audit_events_user_id_idx ON auth_audit_events(user_id);
CREATE INDEX IF NOT EXISTS auth_audit_events_event_at_idx ON auth_audit_events(event_at);
