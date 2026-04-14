CREATE TABLE IF NOT EXISTS auth_rate_limits (
    ip_address TEXT PRIMARY KEY,
    failed_count INTEGER NOT NULL DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_rate_limits_locked_until_idx ON auth_rate_limits(locked_until);
