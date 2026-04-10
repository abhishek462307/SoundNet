const crypto = require('crypto');

class AuditService {
  constructor({ auditLogStore }) {
    this.auditLogStore = auditLogStore;
  }

  async log(action, details = {}) {
    return this.auditLogStore.create({
      id: crypto.randomUUID(),
      action,
      details,
      created_at: new Date().toISOString()
    });
  }

  async list() {
    return this.auditLogStore.list();
  }
}

module.exports = { AuditService };
