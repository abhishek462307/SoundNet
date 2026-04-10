const crypto = require('crypto');
const { validateMcpServerInput, validateTrustUpdateInput } = require('../utils/validators');
const { createMcpClient } = require('../utils/mcpClient');

class MpcServerService {
  constructor({ mcpServerStore, capabilityStore, baseUrl }) {
    this.mcpServerStore = mcpServerStore;
    this.capabilityStore = capabilityStore;
    this.baseUrl = baseUrl;
  }

  async seedMockMcpServer() {
    const endpoint = `${this.baseUrl}/mock-mcp`;
    const existing = await this.mcpServerStore.findByEndpoint(endpoint);
    if (existing) {
      return existing;
    }

    const server = await this.registerServer({
      name: 'mock_public_mcp',
      description: 'Local mock MCP server that simulates a trusted public server',
      endpoint,
      transport: 'http',
      auth_type: 'none',
      trust_score: 0.8,
      tags: ['mock', 'public', 'mcp'],
      is_public: true,
      is_trusted: true,
      allow_sync: true
    });

    await this.syncServer(server.id);
    return server;
  }

  async registerServer(input) {
    validateMcpServerInput(input);
    const client = createMcpClient({ endpoint: input.endpoint });
    const startedAt = Date.now();
    const handshake = await client.initialize();

    return this.mcpServerStore.create({
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      endpoint: input.endpoint,
      transport: input.transport,
      auth_type: input.auth_type,
      trust_score: typeof input.trust_score === 'number' ? input.trust_score : 0,
      tags: input.tags,
      status: 'healthy',
      is_public: input.is_public !== false,
      is_trusted: Boolean(input.is_trusted),
      allow_sync: input.allow_sync !== false,
      last_sync_at: null,
      last_health_check_at: new Date().toISOString(),
      last_health_latency_ms: Date.now() - startedAt,
      last_error: null,
      protocol_version: handshake.protocolVersion || null,
      server_info: handshake.serverInfo || null,
      tenant_id: input.tenant_id || 'default'
    });
  }

  async listServers(filters = {}, options = {}) {
    return filterByTenant(await this.mcpServerStore.list(filters), options.tenant_id);
  }

  async syncServer(serverId) {
    const server = await this.getServerOrThrow(serverId);
    this.ensureSyncAllowed(server);

    const client = createMcpClient({ endpoint: server.endpoint });
    const startedAt = Date.now();

    try {
      const tools = await client.listTools();
      const activeToolNames = new Set();
      const imported = [];
      const capabilities = await this.capabilityStore.list();

      for (const tool of tools) {
        activeToolNames.add(tool.name);
        const name = `${server.name}__${tool.name}`;
        const existing = await this.capabilityStore.findByName(name);
        const capability = {
          id: existing?.id || crypto.randomUUID(),
          name,
          description: tool.description || `Imported MCP tool ${tool.name}`,
          endpoint: server.endpoint,
          method: 'POST',
          input_schema: tool.inputSchema || { type: 'object' },
          output_schema: { type: 'object' },
          auth_type: server.auth_type,
          tags: Array.from(new Set([...(server.tags || []), 'mcp', tool.name])),
          rating: Number((server.trust_score || 0) * 5),
          source_type: 'mcp',
          source_server_id: server.id,
          source_tool_name: tool.name,
          status: 'active',
          last_seen_at: new Date().toISOString(),
          provider: server.name,
          category: inferCategoryFromTool(tool)
        };

        if (existing) {
          await this.capabilityStore.update(existing.id, capability);
        } else {
          await this.capabilityStore.create(capability);
        }

        imported.push({
          id: capability.id,
          name: capability.name,
          source_tool_name: tool.name
        });
      }

      let stale_count = 0;
      for (const capability of capabilities) {
        if (
          capability.source_type === 'mcp' &&
          capability.source_server_id === server.id &&
          capability.source_tool_name &&
          !activeToolNames.has(capability.source_tool_name)
        ) {
          await this.capabilityStore.update(capability.id, {
            ...capability,
            status: 'stale'
          });
          stale_count += 1;
        }
      }

      await this.mcpServerStore.update(server.id, {
        ...server,
        status: 'healthy',
        last_sync_at: new Date().toISOString(),
        last_health_check_at: new Date().toISOString(),
        last_health_latency_ms: Date.now() - startedAt,
        last_error: null,
        is_trusted: true,
        allow_sync: true
      });

      return {
        server_id: server.id,
        imported_count: imported.length,
        stale_count,
        imported
      };
    } catch (error) {
      await this.markServerUnhealthy(server, error, startedAt);
      throw error;
    }
  }

  async syncAllServers(options = {}) {
    const servers = filterByTenant(await this.mcpServerStore.list({ trustedOnly: true, allowSyncOnly: true }), options.tenant_id);
    const results = [];

    for (const server of servers) {
      try {
        const result = await this.syncServer(server.id, options);
        results.push({ server_id: server.id, ok: true, imported_count: result.imported_count, stale_count: result.stale_count });
      } catch (error) {
        results.push({ server_id: server.id, ok: false, error: error.message });
      }
    }

    return {
      total: results.length,
      succeeded: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      results
    };
  }

  async checkServerHealth(serverId) {
    const server = await this.getServerOrThrow(serverId);
    const client = createMcpClient({ endpoint: server.endpoint });
    const startedAt = Date.now();

    try {
      const handshake = await client.initialize();
      const updatedServer = {
        ...server,
        status: 'healthy',
        last_health_check_at: new Date().toISOString(),
        last_health_latency_ms: Date.now() - startedAt,
        last_error: null,
        protocol_version: handshake.protocolVersion || server.protocol_version,
        server_info: handshake.serverInfo || server.server_info
      };
      await this.mcpServerStore.update(server.id, updatedServer);
      return updatedServer;
    } catch (error) {
      await this.markServerUnhealthy(server, error, startedAt);
      return this.getServerOrThrow(serverId);
    }
  }

  async checkAllServerHealth(options = {}) {
    const servers = filterByTenant(await this.mcpServerStore.list({ publicOnly: true }), options.tenant_id);
    const results = [];

    for (const server of servers) {
      const result = await this.checkServerHealth(server.id, options);
      results.push({
        server_id: result.id,
        name: result.name,
        status: result.status,
        last_health_latency_ms: result.last_health_latency_ms,
        last_error: result.last_error
      });
    }

    return {
      total: results.length,
      healthy: results.filter((item) => item.status === 'healthy').length,
      unhealthy: results.filter((item) => item.status !== 'healthy').length,
      results
    };
  }

  async updateServerTrust(serverId, input) {
    validateTrustUpdateInput(input);
    const server = await this.getServerOrThrow(serverId);
    const updatedServer = {
      ...server,
      trust_score: typeof input.trust_score === 'number' ? input.trust_score : server.trust_score,
      is_trusted: typeof input.is_trusted === 'boolean' ? input.is_trusted : server.is_trusted,
      allow_sync: typeof input.allow_sync === 'boolean' ? input.allow_sync : server.allow_sync
    };

    await this.mcpServerStore.update(server.id, updatedServer);
    return updatedServer;
  }

  async disableServer(serverId) {
    const server = await this.getServerOrThrow(serverId);
    const updatedServer = {
      ...server,
      status: 'disabled',
      is_trusted: false,
      allow_sync: false,
      last_error: null
    };
    await this.mcpServerStore.update(server.id, updatedServer);
    const removed_capabilities = await this.capabilityStore.deleteBySourceServerId(server.id);
    return {
      server: updatedServer,
      removed_capabilities
    };
  }

  async enableServer(serverId) {
    const server = await this.getServerOrThrow(serverId);
    const updatedServer = {
      ...server,
      status: 'healthy',
      is_trusted: true,
      allow_sync: true,
      last_error: null
    };
    await this.mcpServerStore.update(server.id, updatedServer);
    const syncResult = await this.syncServer(server.id);
    return {
      server: await this.getServerOrThrow(server.id),
      sync: syncResult
    };
  }

  async deleteServer(serverId) {
    await this.getServerOrThrow(serverId);
    const removed_capabilities = await this.capabilityStore.deleteBySourceServerId(serverId);
    await this.mcpServerStore.deleteById(serverId);
    return {
      deleted: true,
      server_id: serverId,
      removed_capabilities
    };
  }

  async executeToolCapability(capability, payload) {
    const server = await this.mcpServerStore.findById(capability.source_server_id);
    if (!server) {
      const error = new Error('MCP source server not found');
      error.status = 404;
      throw error;
    }

    const client = createMcpClient({ endpoint: server.endpoint });
    return client.callTool(capability.source_tool_name, payload);
  }

  async getServerOrThrow(serverId) {
    const server = await this.mcpServerStore.findById(serverId);
    if (!server) {
      const error = new Error('serverId not found');
      error.status = 404;
      throw error;
    }
    return server;
  }

  ensureSyncAllowed(server) {
    if (!server.is_trusted) {
      const error = new Error('server is not trusted for sync');
      error.status = 403;
      throw error;
    }

    if (!server.allow_sync) {
      const error = new Error('server sync is disabled');
      error.status = 403;
      throw error;
    }
  }

  async markServerUnhealthy(server, error, startedAt) {
    await this.mcpServerStore.update(server.id, {
      ...server,
      status: 'unhealthy',
      last_health_check_at: new Date().toISOString(),
      last_health_latency_ms: Date.now() - startedAt,
      last_error: error.message
    });
  }
}

function filterByTenant(items, tenantId) {
  return items.filter((item) => (item.tenant_id || 'default') === (tenantId || 'default'));
}

function inferCategoryFromTool(tool) {
  const text = `${tool.name || ''} ${tool.description || ''}`.toLowerCase();
  if (text.includes('food')) {
    return 'food';
  }
  if (text.includes('weather')) {
    return 'weather';
  }
  return 'general';
}

module.exports = { MpcServerService };
