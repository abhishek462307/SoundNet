const { requestJsonWithRetry } = require('./httpClient');

function createMcpClient({ endpoint }) {
  let requestId = 1;

  async function send(method, params = {}) {
    const response = await requestJsonWithRetry({
      url: endpoint,
      method: 'POST',
      data: {
        jsonrpc: '2.0',
        id: requestId++,
        method,
        params
      },
      retries: 1,
      timeout: 5000
    });

    if (response.error) {
      throw new Error(response.error.message || 'MCP request failed');
    }

    return response.result;
  }

  return {
    async initialize() {
      return send('initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'agent-network-mvp', version: '1.1.0' }
      });
    },
    async listTools() {
      const result = await send('tools/list', {});
      return result.tools || [];
    },
    async callTool(name, args) {
      const result = await send('tools/call', {
        name,
        arguments: args || {}
      });

      const firstText = result.content?.find((item) => item.type === 'text')?.text;
      if (!firstText) {
        return result;
      }

      try {
        return JSON.parse(firstText);
      } catch (_error) {
        return { content: firstText };
      }
    }
  };
}

module.exports = { createMcpClient };
