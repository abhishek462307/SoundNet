const { createDbAdapter } = require('./db');

async function createTenantPolicyStore() {
  const db = await createDbAdapter();
  return {
    findByTenantId: (tenantId) => db.findTenantPolicyByTenantId(tenantId),
    upsert: (policy) => db.upsertTenantPolicy(policy),
    list: () => db.listTenantPolicies()
  };
}

module.exports = { createTenantPolicyStore };
