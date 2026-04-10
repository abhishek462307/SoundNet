class AnalyticsService {
  constructor({ capabilityStore, executionLogStore, mcpServerStore, queryLogStore }) {
    this.capabilityStore = capabilityStore;
    this.executionLogStore = executionLogStore;
    this.mcpServerStore = mcpServerStore;
    this.queryLogStore = queryLogStore;
  }

  async getSummary() {
    const capabilities = await this.capabilityStore.list();
    const logs = await this.executionLogStore.list();
    const queryLogs = this.queryLogStore ? await this.queryLogStore.list() : [];

    const totalExecutions = logs.length;
    const successfulExecutions = logs.filter((log) => log.success).length;
    const failedExecutions = totalExecutions - successfulExecutions;
    const averageLatencyMs = totalExecutions
      ? logs.reduce((sum, log) => sum + Number(log.latency_ms || 0), 0) / totalExecutions
      : null;

    return {
      total_capabilities: capabilities.length,
      active_capabilities: capabilities.filter((capability) => capability.status !== 'stale').length,
      stale_capabilities: capabilities.filter((capability) => capability.status === 'stale').length,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      average_latency_ms: averageLatencyMs,
      total_queries: queryLogs.length
    };
  }

  async getCapabilityStats() {
    const capabilities = await this.capabilityStore.list();
    const logs = await this.executionLogStore.list();

    return capabilities.map((capability) => buildCapabilityAnalytics(capability, logs));
  }

  async getServerStats() {
    const servers = await this.mcpServerStore.list();
    const capabilities = await this.capabilityStore.list();
    const logs = await this.executionLogStore.list();

    return servers.map((server) => {
      const serverCapabilities = capabilities.filter((capability) => capability.source_server_id === server.id);
      const capabilityIds = new Set(serverCapabilities.map((capability) => capability.id));
      const serverLogs = logs.filter((log) => capabilityIds.has(log.capability_id));
      const totalRuns = serverLogs.length;
      const successfulRuns = serverLogs.filter((log) => log.success).length;
      const averageLatencyMs = totalRuns
        ? serverLogs.reduce((sum, log) => sum + Number(log.latency_ms || 0), 0) / totalRuns
        : null;

      return {
        server_id: server.id,
        name: server.name,
        status: server.status,
        trust_score: server.trust_score,
        capability_count: serverCapabilities.length,
        total_runs: totalRuns,
        success_rate: totalRuns ? successfulRuns / totalRuns : null,
        average_latency_ms: averageLatencyMs,
        last_sync_at: server.last_sync_at || null
      };
    });
  }

  async getTopTools(limit = 5) {
    const capabilities = await this.capabilityStore.list();
    const logs = await this.executionLogStore.list();

    return capabilities
      .map((capability) => buildCapabilityAnalytics(capability, logs))
      .sort((left, right) => {
        if ((right.total_runs || 0) !== (left.total_runs || 0)) {
          return (right.total_runs || 0) - (left.total_runs || 0);
        }
        return (right.success_rate || 0) - (left.success_rate || 0);
      })
      .slice(0, Number(limit || 5));
  }

  async getTopQueries(limit = 10) {
    const queryLogs = this.queryLogStore ? await this.queryLogStore.list() : [];
    const summary = new Map();

    for (const log of queryLogs) {
      const key = JSON.stringify({ query: log.query, filters: log.filters || {} });
      if (!summary.has(key)) {
        summary.set(key, {
          query: log.query,
          filters: log.filters || {},
          count: 0,
          total_results: 0
        });
      }

      const entry = summary.get(key);
      entry.count += 1;
      entry.total_results += Number(log.result_count || 0);
    }

    return Array.from(summary.values())
      .map((entry) => ({
        ...entry,
        average_result_count: entry.count ? entry.total_results / entry.count : 0
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, Number(limit || 10));
  }
}

function buildCapabilityAnalytics(capability, logs) {
  const relatedLogs = logs.filter((log) => log.capability_id === capability.id);
  const totalRuns = relatedLogs.length;
  const successfulRuns = relatedLogs.filter((log) => log.success).length;
  const averageLatencyMs = totalRuns
    ? relatedLogs.reduce((sum, log) => sum + Number(log.latency_ms || 0), 0) / totalRuns
    : null;

  return {
    capability_id: capability.id,
    name: capability.name,
    provider: capability.provider || null,
    category: capability.category || null,
    source_type: capability.source_type || 'http',
    status: capability.status,
    total_runs: totalRuns,
    success_rate: totalRuns ? successfulRuns / totalRuns : null,
    average_latency_ms: averageLatencyMs
  };
}

module.exports = { AnalyticsService };
