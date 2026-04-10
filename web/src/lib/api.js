export async function apiRequest({ baseUrl, path, method = 'GET', apiKey, adminKey, userToken, tenantId, body }) {
  const headers = {
    'Content-Type': 'application/json',
  }

  if (apiKey) headers['x-api-key'] = apiKey
  if (adminKey) headers['x-admin-key'] = adminKey
  if (userToken) headers['x-user-token'] = userToken
  if (tenantId) headers['x-tenant-id'] = tenantId

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new Error(payload?.error || payload || `Request failed: ${response.status}`)
  }

  return payload
}

export async function loadDashboardData(config) {
  const [health, ready, summary, servers, topTools, policy] = await Promise.all([
    apiRequest({ ...config, path: '/health' }),
    apiRequest({ ...config, path: '/ready' }),
    apiRequest({ ...config, path: '/analytics/summary' }),
    apiRequest({ ...config, path: '/analytics/servers' }),
    apiRequest({ ...config, path: '/analytics/top-tools?limit=5' }),
    apiRequest({ ...config, path: '/analytics/policy' }),
  ])

  return { health, ready, summary, servers, topTools, policy }
}

export async function loadCapabilities(config) {
  return apiRequest({ ...config, path: '/capabilities' })
}

export async function registerCapability(config, body) {
  return apiRequest({ ...config, path: '/register', method: 'POST', body })
}

export async function loadExecutionLogs(config) {
  return apiRequest({ ...config, path: '/logs' })
}

export async function loadMcpServers(config) {
  return apiRequest({ ...config, path: '/mcp/servers' })
}

export async function loadTenantPolicy(config) {
  return apiRequest({ ...config, path: '/policy/tenant' })
}

export async function updateTenantPolicy(config, body) {
  return apiRequest({ ...config, path: '/policy/tenant', method: 'POST', body })
}

export async function runServerAction(config, serverId, action, body) {
  const actionMap = {
    sync: { method: 'POST', path: `/mcp/servers/${serverId}/sync` },
    health: { method: 'POST', path: `/mcp/servers/${serverId}/health` },
    trust: { method: 'PATCH', path: `/mcp/servers/${serverId}/trust` },
    disable: { method: 'PATCH', path: `/mcp/servers/${serverId}/disable` },
    enable: { method: 'PATCH', path: `/mcp/servers/${serverId}/enable` },
  }

  const selected = actionMap[action]
  if (!selected) {
    throw new Error(`Unknown MCP action: ${action}`)
  }

  return apiRequest({ ...config, ...selected, body })
}

export async function loadAgents(config) {
  return apiRequest({ ...config, path: '/agents' })
}

export async function registerAgent(config, body) {
  return apiRequest({ ...config, path: '/agents/register', method: 'POST', body })
}

export async function loadInbox(config, agentId) {
  return apiRequest({ ...config, path: `/messages/inbox/${agentId}` })
}

export async function loadThread(config, threadId) {
  return apiRequest({ ...config, path: `/messages/threads/${threadId}` })
}

export async function sendMessage(config, body) {
  return apiRequest({ ...config, path: '/messages', method: 'POST', body })
}

export async function acknowledgeMessage(config, messageId) {
  return apiRequest({ ...config, path: `/messages/${messageId}/ack`, method: 'POST' })
}

export async function loadDeliveryQueue(config) {
  return apiRequest({ ...config, path: '/messages/queue/delivery' })
}

export async function processDeliveryQueue(config, body = {}) {
  return apiRequest({ ...config, path: '/messages/queue/process', method: 'POST', body })
}

export async function registerUser(config, body) {
  return apiRequest({ ...config, path: '/users/register', method: 'POST', body })
}

export async function loadCurrentUser(config) {
  return apiRequest({ ...config, path: '/users/me' })
}

export async function loadUsers(config) {
  return apiRequest({ ...config, path: '/users' })
}

export async function rotateUserToken(config, userId) {
  return apiRequest({ ...config, path: `/users/${userId}/rotate-token`, method: 'POST' })
}

export async function revokeUserToken(config, userId) {
  return apiRequest({ ...config, path: `/users/${userId}/revoke-token`, method: 'POST' })
}

export async function loadAuditLogs(config) {
  return apiRequest({ ...config, path: '/audit' })
}

export async function loadSchedulerStatus(config) {
  return apiRequest({ ...config, path: '/system/scheduler' })
}

export async function runRepairBackfill(config) {
  return apiRequest({ ...config, path: '/system/repair/backfill', method: 'POST' })
}
