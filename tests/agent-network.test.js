const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../app');
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
  const capabilityService = new CapabilityService({ capabilityStore: stores.capabilityStore, executionLogStore: stores.executionLogStore, queryLogStore: stores.queryLogStore, baseUrl: 'http://127.0.0.1:0' });
  const mcpServerService = new MpcServerService({ mcpServerStore: stores.mcpServerStore, capabilityStore: stores.capabilityStore, baseUrl: 'http://127.0.0.1:0' });
  const schedulerService = new SchedulerService({ mcpServerService });
  const mcpCatalogService = new McpCatalogService({ mcpServerService, baseUrl: 'http://127.0.0.1:0' });
  const dataRepairService = new DataRepairService({ capabilityStore: stores.capabilityStore });
  const analyticsService = new AnalyticsService({ capabilityStore: stores.capabilityStore, executionLogStore: stores.executionLogStore, mcpServerStore: stores.mcpServerStore, queryLogStore: stores.queryLogStore });
  const agentService = new AgentService({ agentStore: stores.agentStore });
  const messageService = new MessageService({ agentStore: stores.agentStore, messageStore: stores.messageStore });
  const auditService = new AuditService({ auditLogStore: stores.auditLogStore });
  const userService = new UserService({ userStore: stores.userStore });
  const readinessState = { ready: true };
  const app = createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, userService, readinessState });
  const server = await new Promise((resolve, reject) => { const instance = app.listen(0, ()=>resolve(instance)); instance.on('error', reject); });
  return { app, server, stores };
}

async function closeServer(server){ await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve())); }

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
  const { app, server } = await buildTestHarness();
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
  } finally {
    delete process.env.ADMIN_API_KEY;
    await closeServer(server);
  }
});
