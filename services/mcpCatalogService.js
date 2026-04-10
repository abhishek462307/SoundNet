class McpCatalogService {
  constructor({ mcpServerService, baseUrl }) {
    this.mcpServerService = mcpServerService;
    this.baseUrl = baseUrl;
  }

  listCatalog() {
    return [
      {
        name: 'mock_public_mcp',
        description: 'Local mock MCP server for food ordering and weather lookup',
        endpoint: `${this.baseUrl}/mock-mcp`,
        transport: 'http',
        auth_type: 'none',
        trust_score: 0.9,
        tags: ['mock', 'public', 'mcp', 'trusted'],
        provider: 'orchids',
        category: 'general'
      }
    ];
  }

  async seedCatalog() {
    const catalog = this.listCatalog();
    const existingServers = await this.mcpServerService.listServers();
    const results = [];

    for (const item of catalog) {
      const existing = existingServers.find((server) => server.endpoint === item.endpoint || server.name === item.name);
      if (existing) {
        results.push({ name: item.name, created: false, skipped: true, reason: 'already_exists', server_id: existing.id });
        continue;
      }

      try {
        const server = await this.mcpServerService.registerServer({
          ...item,
          is_public: true,
          is_trusted: true,
          allow_sync: true
        });
        await this.mcpServerService.syncServer(server.id);
        results.push({ name: item.name, created: true, server_id: server.id });
      } catch (error) {
        results.push({ name: item.name, created: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = { McpCatalogService };
