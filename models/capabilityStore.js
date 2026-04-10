const { createDbAdapter } = require('./db');

async function createCapabilityStore() {
  const db = await createDbAdapter();
  return {
    create: (capability) => db.insertCapability(capability),
    update: (id, capability) => db.updateCapability(id, capability),
    list: () => db.listCapabilities(),
    findById: (id) => db.findCapabilityById(id),
    findByName: (name) => db.findCapabilityByName(name),
    deleteById: (id) => db.deleteCapabilityById(id),
    deleteBySourceServerId: (sourceServerId) => db.deleteCapabilitiesBySourceServerId(sourceServerId)
  };
}

module.exports = { createCapabilityStore };
