#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
API_KEY_HEADER=()
ADMIN_KEY_HEADER=()

if [ -n "${API_KEY:-}" ]; then
  API_KEY_HEADER=(-H "x-api-key: ${API_KEY}")
fi
if [ -n "${ADMIN_API_KEY:-}" ]; then
  ADMIN_KEY_HEADER=(-H "x-admin-key: ${ADMIN_API_KEY}")
fi

echo "List servers"
curl -s "$BASE_URL/mcp/servers" "${API_KEY_HEADER[@]}"
echo

echo "Run server analytics"
curl -s "$BASE_URL/analytics/servers" "${API_KEY_HEADER[@]}" "${ADMIN_KEY_HEADER[@]}"
echo

echo "Run top query analytics"
curl -s "$BASE_URL/analytics/top-queries?limit=5" "${API_KEY_HEADER[@]}" "${ADMIN_KEY_HEADER[@]}"
echo
