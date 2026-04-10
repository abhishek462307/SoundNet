const { createDbAdapter } = require('./db');

async function createMessageStore() {
  const db = await createDbAdapter();
  return {
    create: (message) => db.insertMessage(message),
    listForAgent: (agentId) => db.listMessagesForAgent(agentId)
  };
}

module.exports = { createMessageStore };
