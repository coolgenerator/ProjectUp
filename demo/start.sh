#!/usr/bin/env bash
# Starts the ProjectUp matching demo: local Postgres/Redis, Go backend, Vite frontend.
#   ./demo/start.sh          start everything (seeds demo data on first run)
#   ./demo/start.sh --reset  wipe and reseed demo data first
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/demo"

if [ ! -f "$DEMO/openrouter.env" ]; then
  echo "Missing demo/openrouter.env. Copy demo/openrouter.env.example and fill in your key." >&2
  exit 1
fi

source "$DEMO/demo.env"
source "$DEMO/openrouter.env"

docker compose -f "$DEMO/docker-compose.yml" up -d
until docker compose -f "$DEMO/docker-compose.yml" exec -T postgres pg_isready -U projectup >/dev/null 2>&1; do sleep 1; done

cd "$ROOT/backend"
if ! PGPASSWORD=projectup psql -h localhost -p 5433 -U projectup projectup_demo -tAc "select 1 from users limit 1" >/dev/null 2>&1; then
  echo "Creating tables..."
  go run migrate/migrate.go >/dev/null 2>&1 || true
fi
# Columns added for the demo (the migrate script can't alter existing tables)
PGPASSWORD=projectup psql -h localhost -p 5433 -U projectup projectup_demo -q -c \
  "ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hours_per_week bigint;
   ALTER TABLE project_application ADD COLUMN IF NOT EXISTS role varchar(100),
     ADD COLUMN IF NOT EXISTS hours_per_week bigint DEFAULT 0,
     ADD COLUMN IF NOT EXISTS first_step text,
     ADD COLUMN IF NOT EXISTS stage varchar(20) DEFAULT 'new',
     ADD COLUMN IF NOT EXISTS trial_task text,
     ADD COLUMN IF NOT EXISTS trial_due timestamptz,
     ADD COLUMN IF NOT EXISTS ai_summary jsonb,
     ADD COLUMN IF NOT EXISTS reminded_at timestamptz;
   ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type varchar(20) DEFAULT 'system';
   CREATE TABLE IF NOT EXISTS project_checkins (
     id bigserial PRIMARY KEY, project_id bigint NOT NULL, user_id bigint NOT NULL, week_start date NOT NULL,
     done text, next text, blockers text, created_at timestamptz, updated_at timestamptz);
   CREATE UNIQUE INDEX IF NOT EXISTS idx_checkin_week ON project_checkins (project_id, user_id, week_start);
   ALTER TABLE projects ADD COLUMN IF NOT EXISTS kickoff jsonb;
   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS timezone varchar(64), ADD COLUMN IF NOT EXISTS desired_roles jsonb;
   CREATE TABLE IF NOT EXISTS project_decisions (
     id bigserial PRIMARY KEY, project_id bigint NOT NULL, user_id bigint NOT NULL, text text NOT NULL, created_at timestamptz);
   CREATE INDEX IF NOT EXISTS idx_project_decisions_project_id ON project_decisions (project_id);
   CREATE TABLE IF NOT EXISTS idea_drafts (
     id bigserial PRIMARY KEY, user_id bigint NOT NULL, idea text NOT NULL,
     rounds jsonb DEFAULT '[]', current jsonb, brief jsonb, post_sid varchar(10),
     created_at timestamptz, updated_at timestamptz);
   CREATE INDEX IF NOT EXISTS idx_idea_drafts_user_id ON idea_drafts (user_id);
   ALTER TABLE group_chats ADD COLUMN IF NOT EXISTS project_id bigint;
   CREATE UNIQUE INDEX IF NOT EXISTS idx_group_chats_project_id ON group_chats (project_id);
   ALTER TABLE group_messages ADD COLUMN IF NOT EXISTS system boolean DEFAULT false;"
go run ./cmd/demoseed ${1:-} 2>&1 | grep -vE 'record not found|^[[:space:]]*$' || true

mkdir -p "$DEMO/logs"
# Pin the port: an inherited PORT (e.g. from a preview launcher) would move the backend off 8080
PORT=8080 go run . >"$DEMO/logs/backend.log" 2>&1 &
BACKEND_PID=$!
(cd "$ROOT/frontend" && npm run dev -- --port 5173 >"$DEMO/logs/frontend.log" 2>&1) &
FRONTEND_PID=$!
trap 'kill $BACKEND_PID $FRONTEND_PID 2>/dev/null' EXIT

until curl -s -o /dev/null http://localhost:8080/swagger/index.html; do sleep 1; done
# Warm the seeker's recommendation cache (both languages) so the first view during the demo is instant
(TOKEN=$(curl -s -X POST localhost:8080/api/login -H 'Content-Type: application/json' \
   -d '{"identifier":"seeker@demo.projectup.local","password":"demo1234"}' | sed -E 's/.*"token":"([^"]+)".*/\1/') &&
 for lang in zh en; do curl -s -o /dev/null "localhost:8080/api/match/recommended-posts?lang=$lang" -H "Authorization: Bearer $TOKEN"; done) &

echo "Backend:  http://localhost:8080  (log: demo/logs/backend.log)"
echo "Frontend: http://localhost:5173  (log: demo/logs/frontend.log)"
echo "Press Ctrl+C to stop."
wait
