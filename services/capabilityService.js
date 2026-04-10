const crypto = require('crypto');
const { validateCapabilityInput, validateExecuteInput } = require('../utils/validators');
const { computeCapabilityRank } = require('../utils/keywordScore');
const { requestJsonWithRetry } = require('../utils/httpClient');
const { dedupeCapabilities } = require('../utils/dedupe');

class CapabilityService {
  constructor({ capabilityStore, executionLogStore, queryLogStore, baseUrl }) {
    this.capabilityStore = capabilityStore;
    this.executionLogStore = executionLogStore;
    this.queryLogStore = queryLogStore;
    this.baseUrl = baseUrl;
  }

  async seedMockCapability() {
    const existing = await this.capabilityStore.findByName('mock_food_order');
    if (existing) {
      return existing;
    }

    return this.capabilityStore.create({
      id: crypto.randomUUID(),
      name: 'mock_food_order',
      description: 'Mock food ordering capability that returns a static order confirmation',
      endpoint: `${this.baseUrl}/mock/food-order`,
      method: 'POST',
      input_schema: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          quantity: { type: 'number' }
        }
      },
      output_schema: {
        type: 'object',
        properties: {
          capability: { type: 'string' },
          status: { type: 'string' },
          order: { type: 'object' },
          eta_minutes: { type: 'number' }
        }
      },
      auth_type: 'none',
      tags: ['food', 'order', 'delivery', 'mock'],
      rating: 4.5,
      source_type: 'http',
      source_server_id: null,
      source_tool_name: null,
      status: 'active',
      last_seen_at: new Date().toISOString(),
      provider: 'local',
      category: 'food'
    });
  }

  async registerCapability(input) {
    validateCapabilityInput(input);
    await this.verifyEndpoint(input.endpoint, input.method);

    const capability = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      endpoint: input.endpoint,
      method: input.method.toUpperCase(),
      input_schema: input.input_schema,
      output_schema: input.output_schema,
      auth_type: input.auth_type,
      tags: input.tags,
      rating: typeof input.rating === 'number' ? input.rating : 0,
      source_type: 'http',
      source_server_id: null,
      source_tool_name: null,
      status: 'active',
      last_seen_at: new Date().toISOString(),
      provider: input.provider || 'custom',
      category: input.category || 'general'
    };

    return this.capabilityStore.create(capability);
  }

  async verifyEndpoint(endpoint, method) {
    try {
      await requestJsonWithRetry({
        url: endpoint,
        method: method.toUpperCase(),
        data: {},
        headers: { 'x-agent-network-validation': 'true' },
        retries: 0,
        timeout: 5000
      });
    } catch (error) {
      const validationError = new Error(`Endpoint validation failed: ${error.message}`);
      validationError.status = 400;
      throw validationError;
    }
  }

  async discoverCapabilities(query, filters = {}) {
    if (!query || typeof query !== 'string') {
      const error = new Error('query is required');
      error.status = 400;
      throw error;
    }

    const capabilities = await this.capabilityStore.list();
    const logs = await this.executionLogStore.list();
    const statsByCapability = buildExecutionStats(logs);

    const ranked = capabilities
      .filter((capability) => capability.status !== 'stale')
      .filter((capability) => matchesFilters(capability, filters))
      .map((capability) => {
        const executionStats = statsByCapability.get(capability.id) || { successRate: null, totalRuns: 0, averageLatencyMs: null };
        const ranking = computeCapabilityRank(query, capability, executionStats);
        return {
          capability,
          executionStats,
          ...ranking
        };
      })
      .filter((entry) => entry.keywordScore > 0)
      .sort((left, right) => right.totalScore - left.totalScore);

    const results = dedupeCapabilities(ranked)
      .slice(0, 5)
      .map(({ capability, executionStats, keywordScore, totalScore }) => ({
        id: capability.id,
        name: capability.name,
        endpoint: capability.endpoint,
        rating: capability.rating,
        source_type: capability.source_type || 'http',
        source_server_id: capability.source_server_id,
        status: capability.status,
        provider: capability.provider || null,
        category: capability.category || null,
        score: totalScore,
        keyword_score: keywordScore,
        success_rate: executionStats.successRate,
        total_runs: executionStats.totalRuns,
        average_latency_ms: executionStats.averageLatencyMs
      }));

    if (this.queryLogStore) {
      await this.queryLogStore.create({
        id: crypto.randomUUID(),
        query,
        filters,
        result_count: results.length,
        created_at: new Date().toISOString()
      });
    }

    return results;
  }

  async executeCapability(input, mcpServerService) {
    validateExecuteInput(input);
    const capability = await this.capabilityStore.findById(input.capability_id);

    if (!capability) {
      const error = new Error('capability_id not found');
      error.status = 404;
      throw error;
    }

    if (capability.status === 'stale') {
      const error = new Error('capability is stale and cannot be executed');
      error.status = 409;
      throw error;
    }

    const startedAt = Date.now();
    try {
      const response = capability.source_type === 'mcp'
        ? await mcpServerService.executeToolCapability(capability, input.payload)
        : await requestJsonWithRetry({
            url: capability.endpoint,
            method: capability.method,
            data: input.payload,
            retries: 1,
            timeout: 5000
          });

      await this.executionLogStore.create({
        id: crypto.randomUUID(),
        capability_id: capability.id,
        capability_name: capability.name,
        success: true,
        latency_ms: Date.now() - startedAt,
        created_at: new Date().toISOString(),
        error: null
      });

      return {
        capability_id: capability.id,
        capability_name: capability.name,
        source_type: capability.source_type || 'http',
        response
      };
    } catch (error) {
      await this.executionLogStore.create({
        id: crypto.randomUUID(),
        capability_id: capability.id,
        capability_name: capability.name,
        success: false,
        latency_ms: Date.now() - startedAt,
        created_at: new Date().toISOString(),
        error: error.message
      });

      error.status = error.status || 502;
      throw error;
    }
  }

  async listCapabilities() {
    return this.capabilityStore.list();
  }

  async listExecutionLogs() {
    return this.executionLogStore.list();
  }
}

function buildExecutionStats(logs) {
  const statsByCapability = new Map();

  for (const log of logs) {
    if (!statsByCapability.has(log.capability_id)) {
      statsByCapability.set(log.capability_id, { successes: 0, totalRuns: 0, totalLatencyMs: 0 });
    }

    const stats = statsByCapability.get(log.capability_id);
    stats.totalRuns += 1;
    stats.totalLatencyMs += Number(log.latency_ms || 0);
    if (log.success) {
      stats.successes += 1;
    }
  }

  for (const [capabilityId, stats] of statsByCapability.entries()) {
    statsByCapability.set(capabilityId, {
      totalRuns: stats.totalRuns,
      successRate: stats.totalRuns > 0 ? stats.successes / stats.totalRuns : null,
      averageLatencyMs: stats.totalRuns > 0 ? stats.totalLatencyMs / stats.totalRuns : null
    });
  }

  return statsByCapability;
}

function matchesFilters(capability, filters) {
  if (filters.provider && capability.provider !== filters.provider) {
    return false;
  }
  if (filters.category && capability.category !== filters.category) {
    return false;
  }
  if (filters.source_type && capability.source_type !== filters.source_type) {
    return false;
  }
  if (filters.status && capability.status !== filters.status) {
    return false;
  }
  return true;
}

module.exports = { CapabilityService };
