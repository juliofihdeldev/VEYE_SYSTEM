#!/usr/bin/env bash
# Step 5 — Local smoke tests against deployed Edge functions.
#
# Role-gated Edge Functions (`telegram-monitor`, `dashboard-mutate`, etc.)
# accept a bearer token equal to SUPABASE_SERVICE_ROLE_KEY as admin, so scripts
# without an interactive session can still exercise them.
#
# Usage:
#   export SUPABASE_FUNCTIONS_BASE="https://<project-ref>.supabase.co/functions/v1"
#   export SUPABASE_ANON_KEY="<anon>"
#   export SUPABASE_SERVICE_ROLE_KEY="<service-role>"   # optional, for admin endpoints
#   ./scripts/smoke-edge.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -z "${SUPABASE_FUNCTIONS_BASE:-}" ] || [ -z "${SUPABASE_ANON_KEY:-}" ]; then
  echo "Set SUPABASE_FUNCTIONS_BASE and SUPABASE_ANON_KEY"
  exit 1
fi

BASE="${SUPABASE_FUNCTIONS_BASE%/}"
ANON="$SUPABASE_ANON_KEY"
SERVICE_ROLE="${SUPABASE_SERVICE_ROLE_KEY:-}"

echo "==> GET ${BASE}/health-check"
curl -sfS "${BASE}/health-check" \
  -H "Authorization: Bearer ${ANON}" \
  -w "\nHTTP %{http_code}\n"
echo

echo "==> POST ${BASE}/process-global-alert"
curl -sfS -X POST "${BASE}/process-global-alert" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Content-Type: application/json" \
  -d '{"summary":"Local smoke — non-incident text for filter.","title":"smoke","userId":"local-smoke","source":"script"}' \
  -w "\nHTTP %{http_code}\n" | head -c 4000
echo

echo "==> POST ${BASE}/get-user-moderation (anon caller)"
curl -sfS -X POST "${BASE}/get-user-moderation" \
  -H "Authorization: Bearer ${ANON}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"local-smoke-moderation"}' \
  -w "\nHTTP %{http_code}\n" | head -c 2000
echo

if [ -n "$SERVICE_ROLE" ]; then
  echo "==> POST ${BASE}/telegram-monitor (admin via service-role; may take up to ~2 min)"
  curl -sfS -X POST "${BASE}/telegram-monitor" \
    -H "Authorization: Bearer ${SERVICE_ROLE}" \
    -H "apikey: ${SERVICE_ROLE}" \
    -H "Content-Type: application/json" \
    -d '{}' \
    --max-time 120 \
    -w "\nHTTP %{http_code}\n" | head -c 4000
  echo
else
  echo "==> Skipping telegram-monitor smoke (set SUPABASE_SERVICE_ROLE_KEY to enable)."
fi
echo "Done."
