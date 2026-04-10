#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${BASE_URL:-http://127.0.0.1:3000}
API_KEY_HEADER=()

if [ -n "${API_KEY:-}" ]; then
  API_KEY_HEADER=(-H "x-api-key: ${API_KEY}")
fi

A1=$(curl -s -X POST "$BASE_URL/agents/register" \
  -H 'Content-Type: application/json' \
  "${API_KEY_HEADER[@]}" \
  -d '{"name":"planner_example","description":"Planning agent","endpoint":"http://agent.local/planner","protocol":"http","trust_score":0.9,"tags":["planner"],"capabilities":["planning"]}')

A2=$(curl -s -X POST "$BASE_URL/agents/register" \
  -H 'Content-Type: application/json' \
  "${API_KEY_HEADER[@]}" \
  -d '{"name":"executor_example","description":"Execution agent","endpoint":"http://agent.local/executor","protocol":"http","trust_score":0.8,"tags":["executor"],"capabilities":["execution"]}')

FROM_ID=$(printf '%s' "$A1" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")
TO_ID=$(printf '%s' "$A2" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).id))")

curl -s -X POST "$BASE_URL/messages" \
  -H 'Content-Type: application/json' \
  "${API_KEY_HEADER[@]}" \
  -d '{"from_agent_id":"'"$FROM_ID"'","to_agent_id":"'"$TO_ID"'","subject":"Plan","body":"Execute step 1"}'

echo
curl -s "$BASE_URL/messages/inbox/$TO_ID" "${API_KEY_HEADER[@]}"
echo
