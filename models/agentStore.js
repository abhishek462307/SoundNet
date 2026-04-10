const { createDbAdapter } = require('./db');

async function createAgentStore() {
  const db = await createDbAdapter();
  return {
    create: (agent) => db.insertAgent(agent),
    update: (id, agent) => db.updateAgent(id, agent),
    list: () => db.listAgents(),
    findById: (id) => db.findAgentById(id),
    findByName: (name) => db.findAgentByName(name)
  };
}

module.exports = { createAgentStore };
