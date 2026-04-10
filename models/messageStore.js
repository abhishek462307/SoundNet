const { createDbAdapter } = require('./db');

async function createMessageStore() {
  const db = await createDbAdapter();
  return {
    create: (message) => db.insertMessage(message),
    update: (id, message) => db.updateMessage(id, message),
    findById: (id) => db.findMessageById(id),
    listForAgent: (agentId) => db.listMessagesForAgent(agentId),
    listByThread: (threadId) => db.listMessagesByThread(threadId),
    listReadyForDelivery: (beforeIso) => db.listMessagesReadyForDelivery(beforeIso)
  };
}

module.exports = { createMessageStore };
