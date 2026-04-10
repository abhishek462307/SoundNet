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

function createMemoryStore() {
  const capabilities = []; const logs = []; const servers = []; const queries = []; const agents = []; const messages = []; const audits = [];
  return {
    capabilityStore: { async create(x){capabilities.push(x);return x;}, async update(id,x){const i=capabilities.findIndex(v=>v.id===id);capabilities[i]=x;return x;}, async list(){return [...capabilities];}, async findById(id){return capabilities.find(v=>v.id===id)||null;}, async findByName(name){return capabilities.find(v=>v.name===name)||null;}, async deleteById(id){const b=capabilities.length; const i=capabilities.findIndex(v=>v.id===id); if(i>=0)capabilities.splice(i,1); return b-capabilities.length;}, async deleteBySourceServerId(sourceServerId){const b=capabilities.length; for(let i=capabilities.length-1;i>=0;i--) if(capabilities[i].source_server_id===sourceServerId) capabilities.splice(i,1); return b-capabilities.length;} },
    executionLogStore: { async create(x){logs.unshift(x);return x;}, async list(){return [...logs];} },
    mcpServerStore: { async create(x){servers.push(x);return x;}, async update(id,x){const i=servers.findIndex(v=>v.id===id);servers[i]=x;return x;}, async list(filters={}){return servers.filter((server)=>{ if(filters.publicOnly && !server.is_public) return false; if(filters.trustedOnly && !server.is_trusted) return false; if(filters.allowSyncOnly && !server.allow_sync) return false; if(filters.status && server.status !== filters.status) return false; return true; });}, async findById(id){return servers.find(v=>v.id===id)||null;}, async findByEndpoint(endpoint){return servers.find(v=>v.endpoint===endpoint)||null;}, async deleteById(id){const b=servers.length; const i=servers.findIndex(v=>v.id===id); if(i>=0)servers.splice(i,1); return b-servers.length;} },
    queryLogStore: { async create(x){queries.unshift(x);return x;}, async list(){return [...queries];} },
    agentStore: { async create(x){agents.push(x);return x;}, async update(id,x){const i=agents.findIndex(v=>v.id===id);agents[i]=x;return x;}, async list(){return [...agents];}, async findById(id){return agents.find(v=>v.id===id)||null;}, async findByName(name){return agents.find(v=>v.name===name)||null;} },
    messageStore: { async create(x){messages.unshift(x);return x;}, async listForAgent(agentId){return messages.filter(v=>v.to_agent_id===agentId);} },
    auditLogStore: { async create(x){audits.unshift(x);return x;}, async list(){return [...audits];} }
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
  const readinessState = { ready: true };
  const app = createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, readinessState });
  const server = await new Promise((resolve, reject) => { const instance = app.listen(0, ()=>resolve(instance)); instance.on('error', reject); });
  return { app, server };
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
