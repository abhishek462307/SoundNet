class PolicyService {
  constructor({ tenantPolicyService } = {}) {
    this.tenantPolicyService = tenantPolicyService || null;
  }

  async evaluateCapabilityExecution(capability, input = {}, context = {}) {
    const tenantPolicy = this.tenantPolicyService ? await this.tenantPolicyService.getPolicy(context.tenant_id || 'default') : null;
    const executionMode = normalizeExecutionMode(input.execution_mode || capability.execution_mode_default || deriveDefaultExecutionMode(capability), tenantPolicy);
    const budgetLimit = Number(input.budget_limit_usd ?? context.budget_limit_usd ?? Infinity);
    const estimatedCostUsd = Number(capability.estimated_cost_usd || 0);
    const reasons = [];

    if (tenantPolicy && Array.isArray(tenantPolicy.blocked_risk_levels) && tenantPolicy.blocked_risk_levels.includes(capability.risk_level || 'low')) {
      const error = new Error('Execution blocked by tenant risk policy');
      error.status = 403;
      error.details = {
        execution_mode: executionMode,
        estimated_cost_usd: estimatedCostUsd,
        budget_limit_usd: budgetLimit,
        reasons: ['tenant_policy_blocked_risk_level']
      };
      throw error;
    }

    const rollingBudgetLimit = Number(tenantPolicy?.rolling_budget_limit_usd ?? Infinity);
    const rollingSpentUsd = Number(context.rolling_spent_usd || 0);

    if ((capability.cost_class || 'free') !== 'free') {
      reasons.push('money_involved_defaults_to_bounded_auto');
    }

    if ((capability.risk_level || 'low') === 'high') {
      reasons.push('high_risk_capability');
    }

    if (estimatedCostUsd > budgetLimit) {
      const error = new Error('Execution blocked: estimated cost exceeds budget limit');
      error.status = 403;
      error.details = {
        execution_mode: executionMode,
        estimated_cost_usd: estimatedCostUsd,
        budget_limit_usd: budgetLimit,
        reasons: [...reasons, 'budget_limit_exceeded']
      };
      throw error;
    }

    if (rollingSpentUsd + estimatedCostUsd > rollingBudgetLimit) {
      const error = new Error('Execution blocked: rolling tenant budget exceeded');
      error.status = 403;
      error.details = {
        execution_mode: executionMode,
        estimated_cost_usd: estimatedCostUsd,
        budget_limit_usd: budgetLimit,
        rolling_spent_usd: rollingSpentUsd,
        rolling_budget_limit_usd: rollingBudgetLimit,
        reasons: [...reasons, 'rolling_budget_exceeded']
      };
      throw error;
    }

    if ((capability.risk_level || 'low') === 'high' && executionMode === 'full_auto') {
      const error = new Error('Execution blocked: high-risk capability cannot run in full_auto');
      error.status = 403;
      error.details = {
        execution_mode: executionMode,
        estimated_cost_usd: estimatedCostUsd,
        budget_limit_usd: budgetLimit,
        reasons: [...reasons, 'manual_or_bounded_required_for_high_risk']
      };
      throw error;
    }

    return {
      execution_mode: executionMode,
      estimated_cost_usd: estimatedCostUsd,
      budget_limit_usd: Number.isFinite(budgetLimit) ? budgetLimit : null,
      rolling_spent_usd: rollingSpentUsd,
      rolling_budget_limit_usd: Number.isFinite(rollingBudgetLimit) ? rollingBudgetLimit : null,
      allowed: true,
      reasons
    };
  }
}

function normalizeExecutionMode(mode, tenantPolicy) {
  const allowedOrder = ['manual', 'bounded_auto', 'full_auto'];
  const requestedIndex = allowedOrder.indexOf(mode);
  const maxMode = tenantPolicy?.max_execution_mode || 'full_auto';
  const maxIndex = allowedOrder.indexOf(maxMode);
  if (requestedIndex > maxIndex) {
    return maxMode;
  }
  return mode;
}

function deriveDefaultExecutionMode(capability) {
  if ((capability.cost_class || 'free') !== 'free') {
    return 'bounded_auto';
  }

  if ((capability.risk_level || 'low') === 'high') {
    return 'manual';
  }

  return 'full_auto';
}

module.exports = { PolicyService, deriveDefaultExecutionMode };
