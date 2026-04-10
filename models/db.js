const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const dataDir = path.join(__dirname, '..', 'data');
const capabilitiesFile = path.join(dataDir, 'capabilities.json');
const logsFile = path.join(dataDir, 'execution-logs.json');
const mcpServersFile = path.join(dataDir, 'mcp-servers.json');
const queryLogsFile = path.join(dataDir, 'query-logs.json');
const agentsFile = path.join(dataDir, 'agents.json');
const messagesFile = path.join(dataDir, 'messages.json');
const auditLogsFile = path.join(dataDir, 'audit-logs.json');

let dbAdapterPromise;

async function createDbAdapter() {
  if (!dbAdapterPromise) {
    dbAdapterPromise = process.env.DATABASE_URL ? createPostgresAdapter() : createFileAdapter();
  }
  return dbAdapterPromise;
}

async function createFileAdapter() {
  await fs.promises.mkdir(dataDir, { recursive: true });
  await Promise.all([
    ensureJsonFile(capabilitiesFile),
    ensureJsonFile(logsFile),
    ensureJsonFile(mcpServersFile),
    ensureJsonFile(queryLogsFile),
    ensureJsonFile(agentsFile),
    ensureJsonFile(messagesFile),
    ensureJsonFile(auditLogsFile)
  ]);

  return {
    async insertCapability(capability) { const items = await readJson(capabilitiesFile); items.push(capability); await writeJson(capabilitiesFile, items); return capability; },
    async updateCapability(id, updated) { const items = await readJson(capabilitiesFile); const next = items.map((item) => item.id === id ? updated : item); await writeJson(capabilitiesFile, next); return updated; },
    async listCapabilities() { return readJson(capabilitiesFile); },
    async findCapabilityById(id) { return (await readJson(capabilitiesFile)).find((item) => item.id === id) || null; },
    async findCapabilityByName(name) { return (await readJson(capabilitiesFile)).find((item) => item.name === name) || null; },
    async deleteCapabilityById(id) { const items = await readJson(capabilitiesFile); const next = items.filter((item) => item.id !== id); await writeJson(capabilitiesFile, next); return items.length - next.length; },
    async deleteCapabilitiesBySourceServerId(sourceServerId) { const items = await readJson(capabilitiesFile); const next = items.filter((item) => item.source_server_id !== sourceServerId); await writeJson(capabilitiesFile, next); return items.length - next.length; },
    async insertExecutionLog(log) { const items = await readJson(logsFile); items.unshift(log); await writeJson(logsFile, items.slice(0, 200)); return log; },
    async listExecutionLogs() { return readJson(logsFile); },
    async insertMcpServer(server) { const items = await readJson(mcpServersFile); items.push(server); await writeJson(mcpServersFile, items); return server; },
    async updateMcpServer(id, updated) { const items = await readJson(mcpServersFile); const next = items.map((item) => item.id === id ? updated : item); await writeJson(mcpServersFile, next); return updated; },
    async listMcpServers(filters = {}) { return applyServerFilters(await readJson(mcpServersFile), filters); },
    async findMcpServerById(id) { return (await readJson(mcpServersFile)).find((item) => item.id === id) || null; },
    async findMcpServerByEndpoint(endpoint) { return (await readJson(mcpServersFile)).find((item) => item.endpoint === endpoint) || null; },
    async deleteMcpServerById(id) { const items = await readJson(mcpServersFile); const next = items.filter((item) => item.id !== id); await writeJson(mcpServersFile, next); return items.length - next.length; },
    async insertQueryLog(log) { const items = await readJson(queryLogsFile); items.unshift(log); await writeJson(queryLogsFile, items.slice(0, 500)); return log; },
    async listQueryLogs() { return readJson(queryLogsFile); },
    async insertAgent(agent) { const items = await readJson(agentsFile); items.push(agent); await writeJson(agentsFile, items); return agent; },
    async updateAgent(id, updated) { const items = await readJson(agentsFile); const next = items.map((item) => item.id === id ? updated : item); await writeJson(agentsFile, next); return updated; },
    async listAgents() { return readJson(agentsFile); },
    async findAgentById(id) { return (await readJson(agentsFile)).find((item) => item.id === id) || null; },
    async findAgentByName(name) { return (await readJson(agentsFile)).find((item) => item.name === name) || null; },
    async insertMessage(message) { const items = await readJson(messagesFile); items.unshift(message); await writeJson(messagesFile, items.slice(0, 500)); return message; },
    async listMessagesForAgent(agentId) { return (await readJson(messagesFile)).filter((item) => item.to_agent_id === agentId); },
    async insertAuditLog(entry) { const items = await readJson(auditLogsFile); items.unshift(entry); await writeJson(auditLogsFile, items.slice(0, 500)); return entry; },
    async listAuditLogs() { return readJson(auditLogsFile); }
  };
}

async function createPostgresAdapter() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`CREATE TABLE IF NOT EXISTS capabilities (
    id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT NOT NULL, endpoint TEXT NOT NULL, method TEXT NOT NULL,
    input_schema JSONB NOT NULL, output_schema JSONB NOT NULL, auth_type TEXT NOT NULL, tags JSONB NOT NULL,
    rating DOUBLE PRECISION NOT NULL DEFAULT 0, source_type TEXT NOT NULL DEFAULT 'http', source_server_id TEXT, source_tool_name TEXT,
    status TEXT DEFAULT 'active', last_seen_at TIMESTAMPTZ, provider TEXT, category TEXT );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS execution_logs (
    id TEXT PRIMARY KEY, capability_id TEXT NOT NULL, capability_name TEXT NOT NULL, success BOOLEAN NOT NULL,
    latency_ms INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL, error TEXT );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS mcp_servers (
    id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT NOT NULL, endpoint TEXT UNIQUE NOT NULL, transport TEXT NOT NULL,
    auth_type TEXT NOT NULL, trust_score DOUBLE PRECISION NOT NULL DEFAULT 0, tags JSONB NOT NULL, status TEXT NOT NULL,
    is_public BOOLEAN NOT NULL DEFAULT true, is_trusted BOOLEAN NOT NULL DEFAULT false, allow_sync BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ, last_health_check_at TIMESTAMPTZ, last_health_latency_ms INTEGER, last_error TEXT,
    protocol_version TEXT, server_info JSONB );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS query_logs (
    id TEXT PRIMARY KEY, query TEXT NOT NULL, filters JSONB NOT NULL, result_count INTEGER NOT NULL, created_at TIMESTAMPTZ NOT NULL );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT NOT NULL, endpoint TEXT NOT NULL, protocol TEXT NOT NULL,
    trust_score DOUBLE PRECISION NOT NULL DEFAULT 0, tags JSONB NOT NULL, capabilities JSONB NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, from_agent_id TEXT NOT NULL, to_agent_id TEXT NOT NULL, subject TEXT, body TEXT NOT NULL, status TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY, action TEXT NOT NULL, details JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL );`);

  return {
    async insertCapability(cap) { await pool.query(`INSERT INTO capabilities (id,name,description,endpoint,method,input_schema,output_schema,auth_type,tags,rating,source_type,source_server_id,source_tool_name,status,last_seen_at,provider,category) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, [cap.id, cap.name, cap.description, cap.endpoint, cap.method, cap.input_schema, cap.output_schema, cap.auth_type, JSON.stringify(cap.tags), cap.rating, cap.source_type, cap.source_server_id, cap.source_tool_name, cap.status || 'active', cap.last_seen_at || null, cap.provider || null, cap.category || null]); return cap; },
    async updateCapability(id, cap) { await pool.query(`UPDATE capabilities SET name=$2,description=$3,endpoint=$4,method=$5,input_schema=$6,output_schema=$7,auth_type=$8,tags=$9,rating=$10,source_type=$11,source_server_id=$12,source_tool_name=$13,status=$14,last_seen_at=$15,provider=$16,category=$17 WHERE id=$1`, [id, cap.name, cap.description, cap.endpoint, cap.method, cap.input_schema, cap.output_schema, cap.auth_type, JSON.stringify(cap.tags), cap.rating, cap.source_type, cap.source_server_id, cap.source_tool_name, cap.status || 'active', cap.last_seen_at || null, cap.provider || null, cap.category || null]); return cap; },
    async listCapabilities() { const r = await pool.query('SELECT * FROM capabilities ORDER BY name ASC'); return r.rows.map(normalizeCapabilityRow); },
    async findCapabilityById(id) { const r = await pool.query('SELECT * FROM capabilities WHERE id=$1 LIMIT 1',[id]); return r.rows[0] ? normalizeCapabilityRow(r.rows[0]) : null; },
    async findCapabilityByName(name) { const r = await pool.query('SELECT * FROM capabilities WHERE name=$1 LIMIT 1',[name]); return r.rows[0] ? normalizeCapabilityRow(r.rows[0]) : null; },
    async deleteCapabilityById(id) { const r = await pool.query('DELETE FROM capabilities WHERE id=$1',[id]); return r.rowCount || 0; },
    async deleteCapabilitiesBySourceServerId(sourceServerId) { const r = await pool.query('DELETE FROM capabilities WHERE source_server_id=$1',[sourceServerId]); return r.rowCount || 0; },
    async insertExecutionLog(log) { await pool.query(`INSERT INTO execution_logs (id,capability_id,capability_name,success,latency_ms,created_at,error) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [log.id, log.capability_id, log.capability_name, log.success, log.latency_ms, log.created_at, log.error || null]); return log; },
    async listExecutionLogs() { const r = await pool.query('SELECT * FROM execution_logs ORDER BY created_at DESC LIMIT 200'); return r.rows; },
    async insertMcpServer(server) { await pool.query(`INSERT INTO mcp_servers (id,name,description,endpoint,transport,auth_type,trust_score,tags,status,is_public,is_trusted,allow_sync,last_sync_at,last_health_check_at,last_health_latency_ms,last_error,protocol_version,server_info) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`, [server.id, server.name, server.description, server.endpoint, server.transport, server.auth_type, server.trust_score, JSON.stringify(server.tags), server.status, server.is_public, server.is_trusted, server.allow_sync, server.last_sync_at, server.last_health_check_at, server.last_health_latency_ms, server.last_error, server.protocol_version, server.server_info ? JSON.stringify(server.server_info) : null]); return server; },
    async updateMcpServer(id, server) { await pool.query(`UPDATE mcp_servers SET name=$2,description=$3,endpoint=$4,transport=$5,auth_type=$6,trust_score=$7,tags=$8,status=$9,is_public=$10,is_trusted=$11,allow_sync=$12,last_sync_at=$13,last_health_check_at=$14,last_health_latency_ms=$15,last_error=$16,protocol_version=$17,server_info=$18 WHERE id=$1`, [id, server.name, server.description, server.endpoint, server.transport, server.auth_type, server.trust_score, JSON.stringify(server.tags), server.status, server.is_public, server.is_trusted, server.allow_sync, server.last_sync_at, server.last_health_check_at, server.last_health_latency_ms, server.last_error, server.protocol_version, server.server_info ? JSON.stringify(server.server_info) : null]); return server; },
    async listMcpServers(filters={}) { const r = await pool.query('SELECT * FROM mcp_servers ORDER BY name ASC'); return applyServerFilters(r.rows.map(normalizeMcpServerRow), filters); },
    async findMcpServerById(id) { const r = await pool.query('SELECT * FROM mcp_servers WHERE id=$1 LIMIT 1',[id]); return r.rows[0] ? normalizeMcpServerRow(r.rows[0]) : null; },
    async findMcpServerByEndpoint(endpoint) { const r = await pool.query('SELECT * FROM mcp_servers WHERE endpoint=$1 LIMIT 1',[endpoint]); return r.rows[0] ? normalizeMcpServerRow(r.rows[0]) : null; },
    async deleteMcpServerById(id) { const r = await pool.query('DELETE FROM mcp_servers WHERE id=$1',[id]); return r.rowCount || 0; },
    async insertQueryLog(log) { await pool.query('INSERT INTO query_logs (id,query,filters,result_count,created_at) VALUES ($1,$2,$3,$4,$5)', [log.id, log.query, JSON.stringify(log.filters), log.result_count, log.created_at]); return log; },
    async listQueryLogs() { const r = await pool.query('SELECT * FROM query_logs ORDER BY created_at DESC LIMIT 500'); return r.rows.map((row)=>({...row, filters: typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters})); },
    async insertAgent(agent) { await pool.query('INSERT INTO agents (id,name,description,endpoint,protocol,trust_score,tags,capabilities,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [agent.id, agent.name, agent.description, agent.endpoint, agent.protocol, agent.trust_score, JSON.stringify(agent.tags), JSON.stringify(agent.capabilities), agent.status, agent.created_at]); return agent; },
    async updateAgent(id, agent) { await pool.query('UPDATE agents SET name=$2,description=$3,endpoint=$4,protocol=$5,trust_score=$6,tags=$7,capabilities=$8,status=$9,created_at=$10 WHERE id=$1', [id, agent.name, agent.description, agent.endpoint, agent.protocol, agent.trust_score, JSON.stringify(agent.tags), JSON.stringify(agent.capabilities), agent.status, agent.created_at]); return agent; },
    async listAgents() { const r = await pool.query('SELECT * FROM agents ORDER BY name ASC'); return r.rows.map(normalizeAgentRow); },
    async findAgentById(id) { const r = await pool.query('SELECT * FROM agents WHERE id=$1 LIMIT 1',[id]); return r.rows[0] ? normalizeAgentRow(r.rows[0]) : null; },
    async findAgentByName(name) { const r = await pool.query('SELECT * FROM agents WHERE name=$1 LIMIT 1',[name]); return r.rows[0] ? normalizeAgentRow(r.rows[0]) : null; },
    async insertMessage(message) { await pool.query('INSERT INTO messages (id,from_agent_id,to_agent_id,subject,body,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)', [message.id, message.from_agent_id, message.to_agent_id, message.subject, message.body, message.status, message.created_at]); return message; },
    async listMessagesForAgent(agentId) { const r = await pool.query('SELECT * FROM messages WHERE to_agent_id=$1 ORDER BY created_at DESC LIMIT 500',[agentId]); return r.rows; },
    async insertAuditLog(entry) { await pool.query('INSERT INTO audit_logs (id,action,details,created_at) VALUES ($1,$2,$3,$4)', [entry.id, entry.action, JSON.stringify(entry.details), entry.created_at]); return entry; },
    async listAuditLogs() { const r = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500'); return r.rows.map((row)=>({...row, details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details})); }
  };
}

function normalizeCapabilityRow(row) { return { ...row, tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags) }; }
function normalizeMcpServerRow(row) { return { ...row, tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags), server_info: row.server_info && typeof row.server_info === 'string' ? JSON.parse(row.server_info) : row.server_info }; }
function normalizeAgentRow(row) { return { ...row, tags: Array.isArray(row.tags) ? row.tags : JSON.parse(row.tags), capabilities: Array.isArray(row.capabilities) ? row.capabilities : JSON.parse(row.capabilities) }; }
function applyServerFilters(servers, filters) { return servers.filter((server) => { if (filters.publicOnly && !server.is_public) return false; if (filters.trustedOnly && !server.is_trusted) return false; if (filters.allowSyncOnly && !server.allow_sync) return false; if (filters.status && server.status !== filters.status) return false; return true; }); }
async function ensureJsonFile(file) { try { await fs.promises.access(file); } catch { await fs.promises.writeFile(file, '[]\n'); } }
async function readJson(file) { return JSON.parse(await fs.promises.readFile(file, 'utf8')); }
async function writeJson(file, value) { await fs.promises.writeFile(file, `${JSON.stringify(value, null, 2)}\n`); }

module.exports = { createDbAdapter };
