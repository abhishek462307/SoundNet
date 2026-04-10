const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
const { getRuntimeConfig } = require('../utils/runtimeConfig');
const { CapabilityService } = require('../services/capabilityService');
const { MpcServerService } = require('../services/mcpServerService');
const { SchedulerService } = require('../services/schedulerService');
const { McpCatalogService } = require('../services/mcpCatalogService');
const { DataRepairService } = require('../services/dataRepairService');
const { AnalyticsService } = require('../services/analyticsService');
const { AgentService } = require('../services/agentService');
const { MessageService } = require('../services/messageService');
const { AuditService } = require('../services/auditService');
const { UserService } = require('../services/userService');
const { hashToken } = require('../services/userService');
const { calculateNextRetryAt } = require('../services/messageService');
const { TenantPolicyService } = require('../services/tenantPolicyService');

function createMemoryStore() {
  const capabilities = []; const logs = []; const servers = []; const queries = []; const agents = []; const messages = []; const audits = []; const users = [];
  return {
    capabilityStore: { async create(x){capabilities.push(x);return x;}, async update(id,x){const i=capabilities.findIndex(v=>v.id===id);capabilities[i]=x;return x;}, async list(){return [...capabilities];}, async findById(id){return capabilities.find(v=>v.id===id)||null;}, async findByName(name){return capabilities.find(v=>v.name===name)||null;}, async deleteById(id){const b=capabilities.length; const i=capabilities.findIndex(v=>v.id===id); if(i>=0)capabilities.splice(i,1); return b-capabilities.length;}, async deleteBySourceServerId(sourceServerId){const b=capabilities.length; for(let i=capabilities.length-1;i>=0;i--) if(capabilities[i].source_server_id===sourceServerId) capabilities.splice(i,1); return b-capabilities.length;} },
    executionLogStore: { async create(x){logs.unshift(x);return x;}, async list(){return [...logs];} },
    mcpServerStore: { async create(x){servers.push(x);return x;}, async update(id,x){const i=servers.findIndex(v=>v.id===id);servers[i]=x;return x;}, async list(filters={}){return servers.filter((server)=>{ if(filters.publicOnly && !server.is_public) return false; if(filters.trustedOnly && !server.is_trusted) return false; if(filters.allowSyncOnly && !server.allow_sync) return false; if(filters.status && server.status !== filters.status) return false; return true; });}, async findById(id){return servers.find(v=>v.id===id)||null;}, async findByEndpoint(endpoint){return servers.find(v=>v.endpoint===endpoint)||null;}, async deleteById(id){const b=servers.length; const i=servers.findIndex(v=>v.id===id); if(i>=0)servers.splice(i,1); return b-servers.length;} },
    queryLogStore: { async create(x){queries.unshift(x);return x;}, async list(){return [...queries];} },
    agentStore: { async create(x){agents.push(x);return x;}, async update(id,x){const i=agents.findIndex(v=>v.id===id);agents[i]=x;return x;}, async list(){return [...agents];}, async findById(id){return agents.find(v=>v.id===id)||null;}, async findByName(name){return agents.find(v=>v.name===name)||null;} },
    messageStore: {
      async create(x){messages.unshift(x);return x;},
      async update(id,x){const i=messages.findIndex(v=>v.id===id);messages[i]=x;return x;},
      async findById(id){return messages.find(v=>v.id===id)||null;},
      async listForAgent(agentId){return messages.filter(v=>v.to_agent_id===agentId);},
      async listByThread(threadId){return messages.filter(v=>v.thread_id===threadId).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));},
      async listReadyForDelivery(beforeIso){return messages.filter((message)=>{ if (['delivered','acknowledged','failed'].includes(message.status)) return false; if (!message.scheduled_for) return true; return Date.parse(message.scheduled_for) <= Date.parse(beforeIso); }).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));}
    },
    auditLogStore: { async create(x){audits.unshift(x);return x;}, async list(){return [...audits];} },
    userStore: {
      async create(x){users.push(x);return x;},
      async update(id,x){const i=users.findIndex(v=>v.id===id);users[i]=x;return x;},
      async list(){return [...users];},
      async findById(id){return users.find(v=>v.id===id)||null;},
      async findByEmail(email){return users.find(v=>v.email===email)||null;},
      async findByToken(token){const hashed = hashToken(token); return users.find(v=>(v.api_token_hash||v.api_token)===hashed)||null;}
    }
  };
}

async function buildTestHarness() {
  const stores = createMemoryStore();
  const delivered = [];
  const tenantPolicyService = new TenantPolicyService();
  const capabilityService = new CapabilityService({ capabilityStore: stores.capabilityStore, executionLogStore: stores.executionLogStore, queryLogStore: stores.queryLogStore, baseUrl: 'http://127.0.0.1:0', tenantPolicyService });
  const mcpServerService = new MpcServerService({ mcpServerStore: stores.mcpServerStore, capabilityStore: stores.capabilityStore, baseUrl: 'http://127.0.0.1:0' });
  const schedulerService = new SchedulerService({ mcpServerService });
  const mcpCatalogService = new McpCatalogService({ mcpServerService, baseUrl: 'http://127.0.0.1:0' });
  const dataRepairService = new DataRepairService({ capabilityStore: stores.capabilityStore });
  const analyticsService = new AnalyticsService({ capabilityStore: stores.capabilityStore, executionLogStore: stores.executionLogStore, mcpServerStore: stores.mcpServerStore, queryLogStore: stores.queryLogStore });
  const agentService = new AgentService({ agentStore: stores.agentStore });
  const messageService = new MessageService({
    agentStore: stores.agentStore,
    messageStore: stores.messageStore,
    deliveryClient: {
      async deliver(payload) {
        delivered.push(payload);
        return { ok: true };
      }
    }
  });
  const auditService = new AuditService({ auditLogStore: stores.auditLogStore });
  const userService = new UserService({ userStore: stores.userStore });
  const readinessState = { ready: true };
  const app = createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, userService, tenantPolicyService, readinessState });
  const server = await new Promise((resolve, reject) => { const instance = app.listen(0, ()=>resolve(instance)); instance.on('error', reject); });
  return { app, server, stores, delivered, tenantPolicyService };
}

async function closeServer(server){ await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())); }

test('production runtime config can derive app base url and generate secrets', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRenderUrl = process.env.RENDER_EXTERNAL_URL;
  const previousApiKey = process.env.API_KEY;
  const previousAdminApiKey = process.env.ADMIN_API_KEY;

  try {
    process.env.NODE_ENV = 'production';
    process.env.RENDER_EXTERNAL_URL = 'https://sound-net.onrender.com';
    delete process.env.API_KEY;
    delete process.env.ADMIN_API_KEY;

    const runtimeConfig = await getRuntimeConfig({
      nodeEnv: 'production',
      appBaseUrl: '',
      apiKey: '',
      adminApiKey: ''
    });

    assert.equal(runtimeConfig.appBaseUrl, 'https://sound-net.onrender.com');
    assert.equal(typeof runtimeConfig.apiKey, 'string');
    assert.equal(typeof runtimeConfig.adminApiKey, 'string');
    assert.equal(runtimeConfig.apiKey.startsWith('sn_api_'), true);
    assert.equal(runtimeConfig.adminApiKey.startsWith('sn_admin_'), true);
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
    if (previousRenderUrl === undefined) delete process.env.RENDER_EXTERNAL_URL; else process.env.RENDER_EXTERNAL_URL = previousRenderUrl;
    if (previousApiKey === undefined) delete process.env.API_KEY; else process.env.API_KEY = previousApiKey;
    if (previousAdminApiKey === undefined) delete process.env.ADMIN_API_KEY; else process.env.ADMIN_API_KEY = previousAdminApiKey;
  }
});

test('errors include request id for traceability', async () => {
  const app = createApp({
    readinessState: { ready: true },
    runtimeConfig: { apiKey: '', adminApiKey: '' }
  });

  const response = await request(app)
    .get('/users')
    .set('x-request-id', 'req-test-123');

  assert.equal(response.status, 401);
  assert.equal(response.body.request_id, 'req-test-123');
  assert.equal(response.headers['x-request-id'], 'req-test-123');
});

test('admin-protected MCP route returns 403 with wrong admin key', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server } = await buildTestHarness();
  try {
    const response = await request(app)
      .post('/mcp/servers/sync')
      .set('x-admin-key', 'wrong-key');
    assert.equal(response.status, 403);
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('ready endpoint reflects readiness state', async () => {
  const { app, server } = await buildTestHarness();
  try {
    const response = await request(app).get('/ready');
    assert.equal(response.status, 200);
  } finally { await closeServer(server); }
});

test('user token resolves current user and enforces admin list access', async () => {
  const { app, server } = await buildTestHarness();
  try {
    const registerAdmin = await request(app)
      .post('/users/register')
      .send({ name: 'Admin User', email: 'admin@soundnet.dev', role: 'admin' });

    assert.equal(registerAdmin.status, 201);
    assert.equal(registerAdmin.body.role, 'admin');
    assert.ok(registerAdmin.body.api_token);

    const meResponse = await request(app)
      .get('/users/me')
      .set('x-user-token', registerAdmin.body.api_token);

    assert.equal(meResponse.status, 200);
    assert.equal(meResponse.body.email, 'admin@soundnet.dev');

    const listResponse = await request(app)
      .get('/users')
      .set('x-user-token', registerAdmin.body.api_token);

    assert.equal(listResponse.status, 200);
    assert.equal(Array.isArray(listResponse.body), true);
    assert.equal(listResponse.body.length, 1);

    const registerUser = await request(app)
      .post('/users/register')
      .send({ name: 'Basic User', email: 'user@soundnet.dev', role: 'user' });

    assert.equal(registerUser.status, 201);

    const forbiddenList = await request(app)
      .get('/users')
      .set('x-user-token', registerUser.body.api_token);

    assert.equal(forbiddenList.status, 403);
  } finally {
    await closeServer(server);
  }
});

test('admin user token can access admin-key protected analytics route', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server } = await buildTestHarness();
  try {
    const registerAdmin = await request(app)
      .post('/users/register')
      .send({ name: 'Ops Admin', email: 'ops@soundnet.dev', role: 'admin' });

    const response = await request(app)
      .get('/analytics/summary')
      .set('x-user-token', registerAdmin.body.api_token);

    assert.equal(response.status, 200);
    assert.equal(typeof response.body.total_capabilities, 'number');
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('admin can rotate and revoke user tokens', async () => {
  const { app, server } = await buildTestHarness();
  try {
    const admin = await request(app)
      .post('/users/register')
      .send({ name: 'Admin', email: 'admin2@soundnet.dev', role: 'admin' });

    const basic = await request(app)
      .post('/users/register')
      .send({ name: 'Basic', email: 'basic@soundnet.dev', role: 'user' });

    const rotate = await request(app)
      .post(`/users/${basic.body.id}/rotate-token`)
      .set('x-user-token', admin.body.api_token);

    assert.equal(rotate.status, 200);
    assert.ok(rotate.body.api_token);
    assert.notEqual(rotate.body.api_token, basic.body.api_token);

    const oldTokenMe = await request(app)
      .get('/users/me')
      .set('x-user-token', basic.body.api_token);

    assert.equal(oldTokenMe.status, 401);

    const revoke = await request(app)
      .post(`/users/${basic.body.id}/revoke-token`)
      .set('x-user-token', admin.body.api_token);

    assert.equal(revoke.status, 200);
    assert.ok(revoke.body.revoked_at);

    const revokedTokenMe = await request(app)
      .get('/users/me')
      .set('x-user-token', rotate.body.api_token);

    assert.equal(revokedTokenMe.status, 401);
  } finally {
    await closeServer(server);
  }
});

test('messages support threads and acknowledgements', async () => {
  const { app, server } = await buildTestHarness();
  try {
    const firstAgent = await request(app)
      .post('/agents/register')
      .send({ name: 'planner', description: 'planner', endpoint: 'http://planner.local' });

    const secondAgent = await request(app)
      .post('/agents/register')
      .send({ name: 'executor', description: 'executor', endpoint: 'http://executor.local' });

    const sent = await request(app)
      .post('/messages')
      .send({
        from_agent_id: firstAgent.body.id,
        to_agent_id: secondAgent.body.id,
        subject: 'Run job',
        body: 'Execute task one'
      });

    assert.equal(sent.status, 201);
    assert.equal(sent.body.status, 'pending');
    assert.ok(sent.body.thread_id);

    const ack = await request(app)
      .post(`/messages/${sent.body.id}/ack`);

    assert.equal(ack.status, 200);
    assert.equal(ack.body.status, 'acknowledged');

    const thread = await request(app)
      .get(`/messages/threads/${sent.body.thread_id}`);

    assert.equal(thread.status, 200);
    assert.equal(thread.body.length, 1);
    assert.equal(thread.body[0].status, 'acknowledged');
  } finally {
    await closeServer(server);
  }
});

test('admin can inspect and process delivery queue with retries', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server, delivered } = await buildTestHarness();
  try {
    const sender = await request(app)
      .post('/agents/register')
      .send({ name: 'sender', description: 'sender', endpoint: 'http://sender.local' });

    const receiver = await request(app)
      .post('/agents/register')
      .send({ name: 'receiver', description: 'receiver', endpoint: 'http://receiver.local' });

    const scheduled = await request(app)
      .post('/messages')
      .send({
        from_agent_id: sender.body.id,
        to_agent_id: receiver.body.id,
        body: 'Deliver later',
        scheduled_for: '2026-04-10T10:00:00.000Z',
        max_attempts: 2
      });

    assert.equal(scheduled.status, 201);
    assert.equal(scheduled.body.status, 'scheduled');

    const queueBefore = await request(app)
      .get('/messages/queue/delivery?before=2026-04-10T09:00:00.000Z')
      .set('x-admin-key', 'secret-admin');

    assert.equal(queueBefore.status, 200);
    assert.equal(queueBefore.body.length, 0);

    const queueReady = await request(app)
      .get('/messages/queue/delivery?before=2026-04-10T10:00:00.000Z')
      .set('x-admin-key', 'secret-admin');

    assert.equal(queueReady.status, 200);
    assert.equal(queueReady.body.length, 1);

    const firstProcess = await request(app)
      .post('/messages/queue/process')
      .set('x-admin-key', 'secret-admin')
      .send({ now: '2026-04-10T10:00:00.000Z', fail_message_ids: [scheduled.body.id] });

    assert.equal(firstProcess.status, 200);
    assert.equal(firstProcess.body.processed, 1);
    assert.equal(firstProcess.body.messages[0].status, 'scheduled');
    assert.equal(firstProcess.body.messages[0].attempts, 1);

    const secondProcess = await request(app)
      .post('/messages/queue/process')
      .set('x-admin-key', 'secret-admin')
      .send({ now: '2026-04-10T10:01:00.000Z', fail_message_ids: [scheduled.body.id] });

    assert.equal(secondProcess.status, 200);
    assert.equal(secondProcess.body.messages[0].status, 'failed');
    assert.equal(secondProcess.body.messages[0].attempts, 2);
    assert.equal(delivered.length, 0);
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('queue processing delivers webhook-capable messages', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server, delivered } = await buildTestHarness();
  try {
    const sender = await request(app)
      .post('/agents/register')
      .send({ name: 'sender-live', description: 'sender', endpoint: 'http://sender-live.local' });

    const receiver = await request(app)
      .post('/agents/register')
      .send({ name: 'receiver-live', description: 'receiver', endpoint: 'http://receiver-live.local/hook', protocol: 'webhook' });

    const queued = await request(app)
      .post('/messages')
      .send({
        from_agent_id: sender.body.id,
        to_agent_id: receiver.body.id,
        body: 'Webhook message'
      });

    assert.equal(queued.status, 201);
    assert.equal(queued.body.delivery_mode, 'webhook');

    const processed = await request(app)
      .post('/messages/queue/process')
      .set('x-admin-key', 'secret-admin')
      .send({ now: '2026-04-10T11:00:00.000Z' });

    assert.equal(processed.status, 200);
    assert.equal(processed.body.messages[0].status, 'delivered');
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].target.endpoint, 'http://receiver-live.local/hook');
    assert.equal(delivered[0].message.body, 'Webhook message');
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('retry backoff uses exponential scheduling', async () => {
  const nextRetry = calculateNextRetryAt('2026-04-10T10:00:00.000Z', 1, 30000);
  assert.equal(nextRetry, '2026-04-10T10:00:30.000Z');

  const secondRetry = calculateNextRetryAt('2026-04-10T10:00:00.000Z', 2, 30000);
  assert.equal(secondRetry, '2026-04-10T10:01:00.000Z');

  const thirdRetry = calculateNextRetryAt('2026-04-10T10:00:00.000Z', 3, 30000);
  assert.equal(thirdRetry, '2026-04-10T10:02:00.000Z');
});

test('scheduler status reports delivery worker configuration', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const stores = createMemoryStore();
  const capabilityService = new CapabilityService({ capabilityStore: stores.capabilityStore, executionLogStore: stores.executionLogStore, queryLogStore: stores.queryLogStore, baseUrl: 'http://127.0.0.1:0' });
  const mcpServerService = new MpcServerService({ mcpServerStore: stores.mcpServerStore, capabilityStore: stores.capabilityStore, baseUrl: 'http://127.0.0.1:0' });
  const messageService = new MessageService({ agentStore: stores.agentStore, messageStore: stores.messageStore, retryBaseDelayMs: 15000, deliveryClient: { async deliver() { return { ok: true }; } } });
  const schedulerService = new SchedulerService({ mcpServerService, messageService, deliveryIntervalMs: 2000 });
  const mcpCatalogService = new McpCatalogService({ mcpServerService, baseUrl: 'http://127.0.0.1:0' });
  const dataRepairService = new DataRepairService({ capabilityStore: stores.capabilityStore });
  const analyticsService = new AnalyticsService({ capabilityStore: stores.capabilityStore, executionLogStore: stores.executionLogStore, mcpServerStore: stores.mcpServerStore, queryLogStore: stores.queryLogStore });
  const agentService = new AgentService({ agentStore: stores.agentStore });
  const auditService = new AuditService({ auditLogStore: stores.auditLogStore });
  const userService = new UserService({ userStore: stores.userStore });
  const readinessState = { ready: true };
  const app = createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, userService, readinessState });
  const server = await new Promise((resolve, reject) => { const instance = app.listen(0, ()=>resolve(instance)); instance.on('error', reject); });

  try {
    const response = await request(app)
      .get('/system/scheduler')
      .set('x-admin-key', 'secret-admin');

    assert.equal(response.status, 200);
    assert.equal(response.body.delivery_interval_ms, 2000);
    assert.equal(response.body.delivery_running, false);
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('analytics supports time windows, pagination, and trends', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server, stores } = await buildTestHarness();
  try {
    await stores.capabilityStore.create({ id: 'cap-1', name: 'search_docs', description: 'Search docs', endpoint: 'http://tool.local/search', method: 'POST', input_schema: {}, output_schema: {}, auth_type: 'none', tags: ['docs'], rating: 5, source_type: 'http', status: 'active', provider: 'internal', category: 'search' });
    await stores.capabilityStore.create({ id: 'cap-2', name: 'summarize_text', description: 'Summarize text', endpoint: 'http://tool.local/summarize', method: 'POST', input_schema: {}, output_schema: {}, auth_type: 'none', tags: ['text'], rating: 4, source_type: 'http', status: 'active', provider: 'internal', category: 'nlp' });

    await stores.executionLogStore.create({ id: 'log-1', capability_id: 'cap-1', success: true, latency_ms: 120, created_at: '2026-04-09T10:00:00.000Z' });
    await stores.executionLogStore.create({ id: 'log-2', capability_id: 'cap-1', success: false, latency_ms: 300, created_at: '2026-04-10T10:00:00.000Z' });
    await stores.executionLogStore.create({ id: 'log-3', capability_id: 'cap-2', success: true, latency_ms: 80, created_at: '2026-04-10T11:00:00.000Z' });
    await stores.queryLogStore.create({ id: 'query-1', query: 'search docs', filters: {}, result_count: 1, created_at: '2026-04-09T09:00:00.000Z' });
    await stores.queryLogStore.create({ id: 'query-2', query: 'summarize text', filters: {}, result_count: 1, created_at: '2026-04-10T09:00:00.000Z' });

    const summary = await request(app)
      .get('/analytics/summary?from=2026-04-10T00:00:00.000Z&to=2026-04-10T23:59:59.000Z')
      .set('x-admin-key', 'secret-admin');

    assert.equal(summary.status, 200);
    assert.equal(summary.body.total_executions, 2);
    assert.equal(summary.body.total_queries, 1);

    const pagedCapabilities = await request(app)
      .get('/analytics/capabilities?limit=1&offset=1')
      .set('x-admin-key', 'secret-admin');

    assert.equal(pagedCapabilities.status, 200);
    assert.equal(Array.isArray(pagedCapabilities.body.items), true);
    assert.equal(pagedCapabilities.body.items.length, 1);
    assert.equal(pagedCapabilities.body.pagination.total >= 2, true);

    const trends = await request(app)
      .get('/analytics/trends/executions?from=2026-04-09T00:00:00.000Z&to=2026-04-10T23:59:59.000Z')
      .set('x-admin-key', 'secret-admin');

    assert.equal(trends.status, 200);
    assert.equal(trends.body.length, 2);
    assert.equal(trends.body[0].bucket, '2026-04-09');
    assert.equal(trends.body[1].bucket, '2026-04-10');
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('tenant header scopes users, agents, and messages', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server } = await buildTestHarness();
  try {
    const alphaAdmin = await request(app)
      .post('/users/register')
      .set('x-tenant-id', 'alpha')
      .send({ name: 'Alpha Admin', email: 'alpha-admin@soundnet.dev', role: 'admin' });

    const betaAdmin = await request(app)
      .post('/users/register')
      .set('x-tenant-id', 'beta')
      .send({ name: 'Beta Admin', email: 'beta-admin@soundnet.dev', role: 'admin' });

    const alphaUsers = await request(app)
      .get('/users')
      .set('x-user-token', alphaAdmin.body.api_token)
      .set('x-tenant-id', 'alpha');

    assert.equal(alphaUsers.status, 200);
    assert.equal(alphaUsers.body.length, 1);
    assert.equal(alphaUsers.body[0].tenant_id, 'alpha');

    await request(app)
      .post('/agents/register')
      .set('x-tenant-id', 'alpha')
      .send({ name: 'alpha-agent', description: 'alpha', endpoint: 'http://alpha.local' });

    await request(app)
      .post('/agents/register')
      .set('x-tenant-id', 'beta')
      .send({ name: 'beta-agent', description: 'beta', endpoint: 'http://beta.local' });

    const alphaAgents = await request(app)
      .get('/agents')
      .set('x-tenant-id', 'alpha');

    assert.equal(alphaAgents.status, 200);
    assert.equal(alphaAgents.body.length, 1);
    assert.equal(alphaAgents.body[0].name, 'alpha-agent');

    const alphaReceiver = await request(app)
      .post('/agents/register')
      .set('x-tenant-id', 'alpha')
      .send({ name: 'alpha-receiver', description: 'alpha receiver', endpoint: 'http://alpha-receiver.local' });

    const alphaMessage = await request(app)
      .post('/messages')
      .set('x-tenant-id', 'alpha')
      .send({ from_agent_id: alphaAgents.body[0].id, to_agent_id: alphaReceiver.body.id, body: 'hello alpha' });

    assert.equal(alphaMessage.status, 201);
    assert.equal(alphaMessage.body.tenant_id, 'alpha');

    const betaQueue = await request(app)
      .get('/messages/queue/delivery')
      .set('x-admin-key', 'secret-admin')
      .set('x-tenant-id', 'beta');

    assert.equal(betaQueue.status, 200);
    assert.equal(betaQueue.body.length, 0);

    assert.equal(betaAdmin.body.tenant_id, 'beta');
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('tenant header scopes capabilities, mcp servers, and analytics', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server, stores } = await buildTestHarness();
  try {
    await stores.capabilityStore.create({
      id: 'alpha-cap',
      name: 'alpha_tool',
      description: 'Alpha tool',
      endpoint: 'http://alpha-tool.local',
      method: 'POST',
      input_schema: { type: 'object' },
      output_schema: { type: 'object' },
      auth_type: 'none',
      tags: ['alpha'],
      provider: 'alpha',
      category: 'ops',
      source_type: 'http',
      status: 'active',
      tenant_id: 'alpha'
    });

    const betaCapabilities = await request(app)
      .get('/capabilities')
      .set('x-tenant-id', 'beta');

    assert.equal(betaCapabilities.status, 200);
    assert.equal(betaCapabilities.body.some((item) => item.name === 'alpha_tool'), false);

    const alphaCapabilities = await request(app)
      .get('/capabilities')
      .set('x-tenant-id', 'alpha');

    assert.equal(alphaCapabilities.status, 200);
    assert.equal(alphaCapabilities.body.some((item) => item.name === 'alpha_tool'), true);

    await stores.mcpServerStore.create({ id: 'srv-alpha', name: 'alpha-mcp', description: 'alpha', endpoint: 'http://alpha-mcp.local', transport: 'http', auth_type: 'none', trust_score: 0.5, tags: [], status: 'healthy', is_public: true, is_trusted: true, allow_sync: true, tenant_id: 'alpha' });
    await stores.mcpServerStore.create({ id: 'srv-beta', name: 'beta-mcp', description: 'beta', endpoint: 'http://beta-mcp.local', transport: 'http', auth_type: 'none', trust_score: 0.5, tags: [], status: 'healthy', is_public: true, is_trusted: true, allow_sync: true, tenant_id: 'beta' });

    const alphaServers = await request(app)
      .get('/mcp/servers')
      .set('x-tenant-id', 'alpha');

    assert.equal(alphaServers.status, 200);
    assert.equal(alphaServers.body.length, 1);
    assert.equal(alphaServers.body[0].name, 'alpha-mcp');

    await stores.executionLogStore.create({ id: 'alpha-log', capability_id: 'alpha-cap', success: true, latency_ms: 100, tenant_id: 'alpha', created_at: '2026-04-10T12:00:00.000Z' });
    await stores.executionLogStore.create({ id: 'beta-log', capability_id: 'other-cap', success: true, latency_ms: 50, tenant_id: 'beta', created_at: '2026-04-10T12:00:00.000Z' });
    await stores.queryLogStore.create({ id: 'alpha-query', query: 'alpha', filters: {}, result_count: 1, tenant_id: 'alpha', created_at: '2026-04-10T12:00:00.000Z' });

    const alphaSummary = await request(app)
      .get('/analytics/summary')
      .set('x-admin-key', 'secret-admin')
      .set('x-tenant-id', 'alpha');

    assert.equal(alphaSummary.status, 200);
    assert.equal(alphaSummary.body.total_executions, 1);
    assert.equal(alphaSummary.body.total_queries, 1);
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('paid capabilities default to bounded_auto and respect budget policy', async () => {
  const { app, server, stores } = await buildTestHarness();
  try {
    await stores.capabilityStore.create({
      id: 'paid-cap',
      name: 'book_flight',
      description: 'Book a flight',
      endpoint: 'http://tool.local/book-flight',
      method: 'POST',
      input_schema: {},
      output_schema: {},
      auth_type: 'api_key',
      tags: ['travel', 'paid'],
      source_type: 'http',
      status: 'active',
      provider: 'travelco',
      category: 'travel',
      tenant_id: 'default',
      cost_class: 'paid',
      estimated_cost_usd: 25,
      risk_level: 'medium',
      execution_mode_default: 'bounded_auto'
    });

    const preview = await request(app)
      .post('/execute/preview')
      .send({ capability_id: 'paid-cap', payload: {}, budget_limit_usd: 100 });

    assert.equal(preview.status, 200);
    assert.equal(preview.body.policy.execution_mode, 'bounded_auto');
    assert.equal(preview.body.policy.estimated_cost_usd, 25);

    const blocked = await request(app)
      .post('/execute')
      .send({ capability_id: 'paid-cap', payload: {}, budget_limit_usd: 10 });

    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.policy.execution_mode, 'bounded_auto');
  } finally {
    await closeServer(server);
  }
});

test('high-risk capabilities cannot run in full_auto', async () => {
  const { app, server, stores } = await buildTestHarness();
  try {
    await stores.capabilityStore.create({
      id: 'danger-cap',
      name: 'delete_production_data',
      description: 'Delete production data',
      endpoint: 'http://tool.local/delete',
      method: 'POST',
      input_schema: {},
      output_schema: {},
      auth_type: 'none',
      tags: ['danger'],
      source_type: 'http',
      status: 'active',
      provider: 'internal',
      category: 'ops',
      tenant_id: 'default',
      cost_class: 'free',
      estimated_cost_usd: 0,
      risk_level: 'high',
      execution_mode_default: 'manual'
    });

    const blocked = await request(app)
      .post('/execute/preview')
      .send({ capability_id: 'danger-cap', payload: {}, execution_mode: 'full_auto' });

    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.policy.reasons.includes('high_risk_capability'), true);
  } finally {
    await closeServer(server);
  }
});

test('tenant policy can lower max execution mode and enforce rolling budget', async () => {
  process.env.ADMIN_API_KEY = 'secret-admin';
  const { app, server, stores, tenantPolicyService } = await buildTestHarness();
  try {
    tenantPolicyService.setPolicy('default', {
      max_execution_mode: 'bounded_auto',
      rolling_budget_limit_usd: 30,
      blocked_risk_levels: ['high']
    });

    await stores.capabilityStore.create({
      id: 'metered-cap',
      name: 'premium_search',
      description: 'Premium search',
      endpoint: 'http://tool.local/search',
      method: 'POST',
      input_schema: {},
      output_schema: {},
      auth_type: 'api_key',
      tags: ['search'],
      source_type: 'http',
      status: 'active',
      provider: 'premium',
      category: 'search',
      tenant_id: 'default',
      cost_class: 'paid',
      estimated_cost_usd: 20,
      risk_level: 'medium',
      execution_mode_default: 'bounded_auto'
    });

    await stores.executionLogStore.create({ id: 'spent-1', capability_id: 'old-cap', success: true, estimated_cost_usd: 15, tenant_id: 'default', created_at: '2026-04-10T10:00:00.000Z' });

    const preview = await request(app)
      .post('/execute/preview')
      .send({ capability_id: 'metered-cap', payload: {}, execution_mode: 'full_auto' });

    assert.equal(preview.status, 403);
    assert.equal(preview.body.policy.reasons.includes('rolling_budget_exceeded'), true);
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});

test('safest selection prefers lower-risk lower-cost tools', async () => {
  const { app, server, stores, tenantPolicyService } = await buildTestHarness();
  try {
    tenantPolicyService.setPolicy('default', { safest_selection_default: true });

    await stores.capabilityStore.create({ id: 'safe-cap', name: 'safe_search', description: 'safe search', endpoint: 'http://safe.local', method: 'POST', input_schema: {}, output_schema: {}, auth_type: 'none', tags: ['search'], source_type: 'http', status: 'active', provider: 'safe', category: 'search', tenant_id: 'default', cost_class: 'free', estimated_cost_usd: 0, risk_level: 'low', execution_mode_default: 'full_auto', rating: 3 });
    await stores.capabilityStore.create({ id: 'risky-cap', name: 'risky_search', description: 'safe search', endpoint: 'http://risky.local', method: 'POST', input_schema: {}, output_schema: {}, auth_type: 'api_key', tags: ['search'], source_type: 'http', status: 'active', provider: 'risky', category: 'search', tenant_id: 'default', cost_class: 'paid', estimated_cost_usd: 10, risk_level: 'high', execution_mode_default: 'bounded_auto', rating: 5 });

    const discover = await request(app)
      .post('/discover')
      .send({ query: 'safe search', filters: {} });

    assert.equal(discover.status, 200);
    assert.equal(discover.body[0].id, 'safe-cap');
    assert.equal(discover.body[0].safety_score >= discover.body[1].safety_score, true);
  } finally {
    await closeServer(server);
  }
});
