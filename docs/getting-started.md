# Getting Started with Sound Net

This guide shows how to run Sound Net locally and use the main features.

## 1. Install and start

```bash
npm install
npm run dev
```

Server:

```bash
http://127.0.0.1:3000
```

## 2. Check health

```bash
curl -s http://127.0.0.1:3000/health
```

## 3. Discover a capability

```bash
curl -s -X POST http://127.0.0.1:3000/discover \
  -H 'Content-Type: application/json' \
  -d '{"query":"order food public"}'
```

## 4. Execute a capability

Use a capability ID from `/discover` or `/capabilities`.

```bash
curl -s -X POST http://127.0.0.1:3000/execute \
  -H 'Content-Type: application/json' \
  -d '{
    "capability_id":"<capability-id>",
    "payload":{"item":"pizza","quantity":1}
  }'
```

## 5. Register and discover an agent

```bash
curl -s -X POST http://127.0.0.1:3000/agents/register \
  -H 'Content-Type: application/json' \
  -d '{
    "name":"planner_agent",
    "description":"Planning and orchestration agent",
    "endpoint":"http://agent.local/planner",
    "protocol":"http",
    "trust_score":0.9,
    "tags":["planner"],
    "capabilities":["planning"]
  }'
```

```bash
curl -s -X POST http://127.0.0.1:3000/agents/discover \
  -H 'Content-Type: application/json' \
  -d '{"query":"planning agent"}'
```

## 6. Send a message

```bash
curl -s -X POST http://127.0.0.1:3000/messages \
  -H 'Content-Type: application/json' \
  -d '{
    "from_agent_id":"<from-agent-id>",
    "to_agent_id":"<to-agent-id>",
    "subject":"Plan",
    "body":"Execute step 1"
  }'
```
