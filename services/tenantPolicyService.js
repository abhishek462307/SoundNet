class TenantPolicyService {
  constructor({ tenantPolicyStore } = {}) {
    this.policies = new Map();
    this.tenantPolicyStore = tenantPolicyStore || null;
  }

  async getPolicy(tenantId = 'default') {
    if (this.policies.has(tenantId)) {
      return this.policies.get(tenantId);
    }

    const stored = this.tenantPolicyStore ? await this.tenantPolicyStore.findByTenantId(tenantId) : null;
    if (stored) {
      this.policies.set(tenantId, stored);
      return stored;
    }

    return {
      tenant_id: tenantId,
      max_execution_mode: 'full_auto',
      rolling_budget_limit_usd: 100,
      safest_selection_default: true,
      blocked_risk_levels: [],
      updated_at: null
    };
  }

  async setPolicy(tenantId = 'default', input = {}) {
    const current = await this.getPolicy(tenantId);
    const next = {
      ...current,
      ...input,
      tenant_id: tenantId,
      updated_at: new Date().toISOString()
    };
    this.policies.set(tenantId, next);
    if (this.tenantPolicyStore) {
      await this.tenantPolicyStore.upsert(next);
    }
    return next;
  }
}

module.exports = { TenantPolicyService };
