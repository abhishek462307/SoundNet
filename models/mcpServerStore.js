const { createDbAdapter } = require('./db');

async function createMcpServerStore() {
  const db = await createDbAdapter();
  return {
    create: (server) => db.insertMcpServer(server),
    update: (id, server) => db.updateMcpServer(id, server),
    list: (filters) => db.listMcpServers(filters),
    findById: (id) => db.findMcpServerById(id),
    findByEndpoint: (endpoint) => db.findMcpServerByEndpoint(endpoint),
    deleteById: (id) => db.deleteMcpServerById(id)
  };
}

module.exports = { createMcpServerStore };
