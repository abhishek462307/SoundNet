const { createDbAdapter } = require('./db');

async function createExecutionLogStore() {
  const db = await createDbAdapter();
  return {
    create: (logEntry) => db.insertExecutionLog(logEntry),
    list: () => db.listExecutionLogs()
  };
}

module.exports = { createExecutionLogStore };
