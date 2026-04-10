const { createDbAdapter } = require('./db');

async function createUserStore() {
  const db = await createDbAdapter();
  return {
    create: (user) => db.insertUser(user),
    update: (id, user) => db.updateUser(id, user),
    list: () => db.listUsers(),
    findById: (id) => db.findUserById(id),
    findByEmail: (email) => db.findUserByEmail(email),
    findByToken: (token) => db.findUserByToken(token)
  };
}

module.exports = { createUserStore };
