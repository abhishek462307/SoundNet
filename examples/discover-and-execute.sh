#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
API_KEY_HEADER=()

if [ -n "${API_KEY:-}" ]; then
  API_KEY_HEADER=(-H "x-api-key: ${API_KEY}")
fi

echo "Discovering capability..."
DISCOVER_RESPONSE=$(curl -s -X POST "$BASE_URL/discover" \
  -H 'Content-Type: application/json' \
  "${API_KEY_HEADER[@]}" \
  -d '{"query":"order food public"}')

echo "$DISCOVER_RESPONSE"
CAPABILITY_ID=$(printf '%s' "$DISCOVER_RESPONSE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)[0].id))")

echo "Executing capability..."
curl -s -X POST "$BASE_URL/execute" \
  -H 'Content-Type: application/json' \
  "${API_KEY_HEADER[@]}" \
  -d '{"capability_id":"'"$CAPABILITY_ID"'","payload":{"item":"pizza","quantity":1}}'

echo
