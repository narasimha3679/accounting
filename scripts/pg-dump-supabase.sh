#!/usr/bin/env bash
# Dump Supabase Postgres for restore into self-hosted Postgres (Coolify).
# Set SUPABASE_DB_URL to the pooler or direct connection string (keep secrets out of git).
set -euo pipefail
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL to your Supabase database URL}"
out="${1:-supabase-$(date +%Y%m%d).dump}"
echo "Writing $out"
pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f "$out"
echo "Done. Restore with: pg_restore --no-owner --dbname=\"\$DATABASE_URL\" $out"
