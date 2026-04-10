class AnalyticsService {
  constructor({ capabilityStore, executionLogStore, mcpServerStore, queryLogStore }) {
    this.capabilityStore = capabilityStore;
    this.executionLogStore = executionLogStore;
    this.mcpServerStore = mcpServerStore;
    this.queryLogStore = queryLogStore;
  }

  async getSummary(options = {}) {
    const capabilities = filterByTenant(await this.capabilityStore.list(), options.tenant_id);
    const logs = filterByTenant(filterByDateRange(await this.executionLogStore.list(), options, 'created_at'), options.tenant_id);
    const queryLogs = filterByTenant(filterByDateRange(this.queryLogStore ? await this.queryLogStore.list() : [], options, 'created_at'), options.tenant_id);

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

  async getCapabilityStats(options = {}) {
    const capabilities = filterByTenant(await this.capabilityStore.list(), options.tenant_id);
    const logs = filterByTenant(filterByDateRange(await this.executionLogStore.list(), options, 'created_at'), options.tenant_id);
    const items = capabilities.map((capability) => buildCapabilityAnalytics(capability, logs));
    return paginate(items, options);
  }

  async getServerStats(options = {}) {
    const servers = filterByTenant(await this.mcpServerStore.list(), options.tenant_id);
    const capabilities = filterByTenant(await this.capabilityStore.list(), options.tenant_id);
    const logs = filterByTenant(filterByDateRange(await this.executionLogStore.list(), options, 'created_at'), options.tenant_id);

    const items = servers.map((server) => {
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

    return paginate(items, options);
  }

  async getTopTools(limit = 5, options = {}) {
    const capabilities = filterByTenant(await this.capabilityStore.list(), options.tenant_id);
    const logs = filterByTenant(filterByDateRange(await this.executionLogStore.list(), options, 'created_at'), options.tenant_id);

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

  async getTopQueries(limit = 10, options = {}) {
    const queryLogs = filterByTenant(filterByDateRange(this.queryLogStore ? await this.queryLogStore.list() : [], options, 'created_at'), options.tenant_id);
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

  async getExecutionTrends(options = {}) {
    const logs = filterByTenant(filterByDateRange(await this.executionLogStore.list(), options, 'created_at'), options.tenant_id);
    const buckets = new Map();

    for (const log of logs) {
      const bucket = toDayBucket(log.created_at);
      if (!buckets.has(bucket)) {
        buckets.set(bucket, {
          bucket,
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          total_latency_ms: 0
        });
      }

      const entry = buckets.get(bucket);
      entry.total_executions += 1;
      if (log.success) {
        entry.successful_executions += 1;
      } else {
        entry.failed_executions += 1;
      }
      entry.total_latency_ms += Number(log.latency_ms || 0);
    }

    return Array.from(buckets.values())
      .sort((left, right) => left.bucket.localeCompare(right.bucket))
      .map((entry) => ({
        bucket: entry.bucket,
        total_executions: entry.total_executions,
        successful_executions: entry.successful_executions,
        failed_executions: entry.failed_executions,
        average_latency_ms: entry.total_executions ? entry.total_latency_ms / entry.total_executions : null
      }));
  }

  async getPolicyAnalytics(options = {}) {
    const logs = filterByTenant(filterByDateRange(await this.executionLogStore.list(), options, 'created_at'), options.tenant_id);
    const spend24hBoundary = Date.now() - (24 * 60 * 60 * 1000);
    const spend7dBoundary = Date.now() - (7 * 24 * 60 * 60 * 1000);

    let spend24hUsd = 0;
    let spend7dUsd = 0;
    let boundedAutoExecutions = 0;
    let manualExecutions = 0;
    let fullAutoExecutions = 0;

    for (const log of logs) {
      const created = Date.parse(log.created_at || 0);
      const cost = Number(log.estimated_cost_usd || 0);
      if (created >= spend24hBoundary) {
        spend24hUsd += cost;
      }
      if (created >= spend7dBoundary) {
        spend7dUsd += cost;
      }

      if (log.execution_mode === 'bounded_auto') boundedAutoExecutions += 1;
      if (log.execution_mode === 'manual') manualExecutions += 1;
      if (log.execution_mode === 'full_auto') fullAutoExecutions += 1;
    }

    return {
      spend_24h_usd: spend24hUsd,
      spend_7d_usd: spend7dUsd,
      bounded_auto_executions: boundedAutoExecutions,
      manual_executions: manualExecutions,
      full_auto_executions: fullAutoExecutions
    };
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

function paginate(items, options = {}) {
  const limit = normalizeLimit(options.limit, 25);
  const offset = normalizeOffset(options.offset, 0);

  return {
    items: items.slice(offset, offset + limit),
    pagination: {
      total: items.length,
      limit,
      offset,
      has_more: offset + limit < items.length
    }
  };
}

function filterByDateRange(items, options = {}, field = 'created_at') {
  const from = parseOptionalDate(options.from, 'from');
  const to = parseOptionalDate(options.to, 'to');

  return items.filter((item) => {
    const value = item?.[field];
    if (!value) {
      return true;
    }

    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return false;
    }

    if (from && timestamp < from.getTime()) {
      return false;
    }

    if (to && timestamp > to.getTime()) {
      return false;
    }

    return true;
  });
}

function parseOptionalDate(value, fieldName) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid ISO date`);
    error.status = 400;
    throw error;
  }

  return date;
}

function normalizeLimit(value, fallback) {
  if (typeof value === 'undefined') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 100) {
    const error = new Error('limit must be an integer between 1 and 100');
    error.status = 400;
    throw error;
  }

  return parsed;
}

function normalizeOffset(value, fallback) {
  if (typeof value === 'undefined') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const error = new Error('offset must be a non-negative integer');
    error.status = 400;
    throw error;
  }

  return parsed;
}

function toDayBucket(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function filterByTenant(items, tenantId) {
  return items.filter((item) => (item.tenant_id || 'default') === (tenantId || 'default'));
}

module.exports = { AnalyticsService };
