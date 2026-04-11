#!/usr/bin/env bash
# Step 5 — Local smoke tests against deployed Edge functions.
# Usage:
#   export SUPABASE_FUNCTIONS_BASE="https://<project-ref>.supabase.co/functions/v1"
#   export SUPABASE_ANON_KEY="<anon>"
#   export PROCESS_ALERT_SECRET="<optional>"
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
HDR=( -H "Authorization: Bearer ${ANON}" )
if [ -n "${PROCESS_ALERT_SECRET:-}" ]; then
  HDR+=( -H "x-veye-secret: ${PROCESS_ALERT_SECRET}" )
fi

echo "==> GET ${BASE}/health-check"
curl -sfS "${BASE}/health-check" "${HDR[@]}" -w "\nHTTP %{http_code}\n"
echo

echo "==> POST ${BASE}/process-global-alert"
curl -sfS -X POST "${BASE}/process-global-alert" \
  "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d '{"summary":"Local smoke — non-incident text for filter.","title":"smoke","userId":"local-smoke","source":"script"}' \
  -w "\nHTTP %{http_code}\n" | head -c 4000
echo

echo "==> POST ${BASE}/get-user-moderation (requires x-veye-secret when PROCESS_ALERT_SECRET is set on project)"
curl -sfS -X POST "${BASE}/get-user-moderation" \
  "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d '{"userId":"local-smoke-moderation"}' \
  -w "\nHTTP %{http_code}\n" | head -c 2000
echo

echo "==> POST ${BASE}/telegram-monitor (may take up to ~2 min)"
curl -sfS -X POST "${BASE}/telegram-monitor" \
  "${HDR[@]}" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --max-time 120 \
  -w "\nHTTP %{http_code}\n" | head -c 4000
echo
echo "Done."
