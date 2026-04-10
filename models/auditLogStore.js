const { createDbAdapter } = require('./db');

async function createAuditLogStore() {
  const db = await createDbAdapter();
  return {
    create: (entry) => db.insertAuditLog(entry),
    list: () => db.listAuditLogs()
  };
}

module.exports = { createAuditLogStore };
