const { createDbAdapter } = require('./db');

async function createQueryLogStore() {
  const db = await createDbAdapter();
  return {
    create: (queryLog) => db.insertQueryLog(queryLog),
    list: () => db.listQueryLogs()
  };
}

module.exports = { createQueryLogStore };
