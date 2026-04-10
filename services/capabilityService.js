const crypto = require('crypto');
const { validateCapabilityInput, validateExecuteInput } = require('../utils/validators');
const { computeCapabilityRank } = require('../utils/keywordScore');
const { requestJsonWithRetry } = require('../utils/httpClient');
const { dedupeCapabilities } = require('../utils/dedupe');
const { PolicyService, deriveDefaultExecutionMode } = require('./policyService');

class CapabilityService {
  constructor({ capabilityStore, executionLogStore, queryLogStore, baseUrl, policyService, tenantPolicyService }) {
    this.capabilityStore = capabilityStore;
    this.executionLogStore = executionLogStore;
    this.queryLogStore = queryLogStore;
    this.baseUrl = baseUrl;
    this.policyService = policyService || new PolicyService({ tenantPolicyService });
    this.tenantPolicyService = tenantPolicyService || null;
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
      category: 'food',
      tenant_id: 'default',
      cost_class: 'paid',
      estimated_cost_usd: 10,
      risk_level: 'medium',
      execution_mode_default: 'bounded_auto'
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
      category: input.category || 'general',
      tenant_id: input.tenant_id || 'default',
      cost_class: input.cost_class || 'free',
      estimated_cost_usd: typeof input.estimated_cost_usd === 'number' ? input.estimated_cost_usd : 0,
      risk_level: input.risk_level || 'low',
      execution_mode_default: input.execution_mode_default || deriveDefaultExecutionMode(input)
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

  async discoverCapabilities(query, filters = {}, options = {}) {
    if (!query || typeof query !== 'string') {
      const error = new Error('query is required');
      error.status = 400;
      throw error;
    }

    const capabilities = filterByTenant(await this.capabilityStore.list(), options.tenant_id);
    const logs = filterByTenant(await this.executionLogStore.list(), options.tenant_id);
    const statsByCapability = buildExecutionStats(logs);

    const ranked = capabilities
      .filter((capability) => capability.status !== 'stale')
      .filter((capability) => matchesFilters(capability, filters))
      .map((capability) => {
        const executionStats = statsByCapability.get(capability.id) || { successRate: null, totalRuns: 0, averageLatencyMs: null };
        const ranking = computeCapabilityRank(query, capability, executionStats);
        const safetyScore = computeSafetyScore(capability, executionStats);
        return {
          capability,
          executionStats,
          safetyScore,
          ...ranking
        };
      })
      .filter((entry) => entry.keywordScore > 0)
      .sort((left, right) => {
          if (options.safest === true || options.safest === 'true' || (awaitMaybePolicy(this.tenantPolicyService, options.tenant_id)).safest_selection_default) {
            if (right.safetyScore !== left.safetyScore) {
              return right.safetyScore - left.safetyScore;
            }
            return right.totalScore - left.totalScore;
        }
        return right.totalScore - left.totalScore;
      });

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
        cost_class: capability.cost_class || 'free',
        estimated_cost_usd: Number(capability.estimated_cost_usd || 0),
        risk_level: capability.risk_level || 'low',
        execution_mode_default: capability.execution_mode_default || deriveDefaultExecutionMode(capability),
        safety_score: computeSafetyScore(capability, executionStats),
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
        filters: { ...filters, tenant_id: options.tenant_id || 'default' },
        result_count: results.length,
        tenant_id: options.tenant_id || 'default',
        created_at: new Date().toISOString()
      });
    }

    return results;
  }

  async executeCapability(input, mcpServerService, options = {}) {
    validateExecuteInput(input);
    const capability = await this.capabilityStore.findById(input.capability_id);

    if (!capability) {
      const error = new Error('capability_id not found');
      error.status = 404;
      throw error;
    }

    if ((capability.tenant_id || 'default') !== (options.tenant_id || 'default')) {
      const error = new Error('capability_id not found');
      error.status = 404;
      throw error;
    }

    if (capability.status === 'stale') {
      const error = new Error('capability is stale and cannot be executed');
      error.status = 409;
      throw error;
    }

    const policyDecision = await this.policyService.evaluateCapabilityExecution(capability, input, {
      ...options,
      rolling_spent_usd: await this.calculateRollingSpendUsd(options.tenant_id)
    });

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
        error: null,
        tenant_id: capability.tenant_id || 'default',
        execution_mode: policyDecision.execution_mode,
        estimated_cost_usd: policyDecision.estimated_cost_usd
      });

      return {
        capability_id: capability.id,
        capability_name: capability.name,
        source_type: capability.source_type || 'http',
        policy: policyDecision,
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
        error: error.message,
        tenant_id: capability.tenant_id || 'default',
        execution_mode: input.execution_mode || capability.execution_mode_default || deriveDefaultExecutionMode(capability),
        estimated_cost_usd: Number(capability.estimated_cost_usd || 0)
      });

      error.status = error.status || 502;
      throw error;
    }
  }

  async listCapabilities(options = {}) {
    return filterByTenant(await this.capabilityStore.list(), options.tenant_id);
  }

  async listExecutionLogs(options = {}) {
    return filterByTenant(await this.executionLogStore.list(), options.tenant_id);
  }

  async previewExecution(input, options = {}) {
    if (!input?.capability_id) {
      const error = new Error('capability_id is required');
      error.status = 400;
      throw error;
    }

    const capability = await this.capabilityStore.findById(input.capability_id);
    if (!capability || (capability.tenant_id || 'default') !== (options.tenant_id || 'default')) {
      const error = new Error('capability_id not found');
      error.status = 404;
      throw error;
    }

    return {
      capability_id: capability.id,
      capability_name: capability.name,
      policy: await this.policyService.evaluateCapabilityExecution(capability, input, {
        ...options,
        rolling_spent_usd: await this.calculateRollingSpendUsd(options.tenant_id)
      })
    };
  }

  async calculateRollingSpendUsd(tenantId = 'default') {
    const logs = filterByTenant(await this.executionLogStore.list(), tenantId);
    return logs.reduce((sum, log) => sum + Number(log.estimated_cost_usd || 0), 0);
  }

  async calculateRollingSpendWindows(tenantId = 'default') {
    const logs = filterByTenant(await this.executionLogStore.list(), tenantId);
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    let spend24h = 0;
    let spend7d = 0;

    for (const log of logs) {
      const created = Date.parse(log.created_at || 0);
      const cost = Number(log.estimated_cost_usd || 0);
      if (created >= weekAgo) {
        spend7d += cost;
      }
      if (created >= dayAgo) {
        spend24h += cost;
      }
    }

    return { spend_24h_usd: spend24h, spend_7d_usd: spend7d };
  }
}

function awaitMaybePolicy(tenantPolicyService, tenantId) {
  return tenantPolicyService ? { safest_selection_default: true, ...(tenantPolicyService.policies?.get?.(tenantId || 'default') || {}) } : { safest_selection_default: false };
}

function computeSafetyScore(capability, executionStats) {
  const costPenalty = capability.cost_class === 'free' ? 2 : capability.cost_class === 'metered' ? 1 : 0;
  const riskBonus = capability.risk_level === 'low' ? 2 : capability.risk_level === 'medium' ? 1 : 0;
  const successBonus = typeof executionStats.successRate === 'number' ? executionStats.successRate : 0;
  return costPenalty + riskBonus + successBonus;
}

function filterByTenant(items, tenantId) {
  return items.filter((item) => (item.tenant_id || 'default') === (tenantId || 'default'));
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
