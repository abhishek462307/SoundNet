class DataRepairService {
  constructor({ capabilityStore }) {
    this.capabilityStore = capabilityStore;
  }

  async backfillCapabilities() {
    const capabilities = await this.capabilityStore.list();
    let updated = 0;

    for (const capability of capabilities) {
      const next = {
        ...capability,
        status: capability.status || 'active',
        last_seen_at: capability.last_seen_at || new Date().toISOString(),
        provider: capability.provider || inferProvider(capability),
        category: capability.category || inferCategory(capability)
      };

      if (JSON.stringify(next) !== JSON.stringify(capability)) {
        await this.capabilityStore.update(capability.id, next);
        updated += 1;
      }
    }

    return {
      total: capabilities.length,
      updated
    };
  }
}

function inferProvider(capability) {
  if (capability.source_type === 'mcp') {
    return 'mcp-import';
  }
  if (capability.name?.includes('mock')) {
    return 'local';
  }
  return 'custom';
}

function inferCategory(capability) {
  const text = `${capability.name || ''} ${capability.description || ''} ${(capability.tags || []).join(' ')}`.toLowerCase();
  if (text.includes('food')) {
    return 'food';
  }
  if (text.includes('weather')) {
    return 'weather';
  }
  return 'general';
}

module.exports = { DataRepairService };
