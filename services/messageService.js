const crypto = require('crypto');

class MessageService {
  constructor({ agentStore, messageStore }) {
    this.agentStore = agentStore;
    this.messageStore = messageStore;
  }

  async sendMessage(input) {
    validateMessageInput(input);
    const fromAgent = await this.agentStore.findById(input.from_agent_id);
    const toAgent = await this.agentStore.findById(input.to_agent_id);

    if (!fromAgent || !toAgent) {
      const error = new Error('from_agent_id and to_agent_id must exist');
      error.status = 404;
      throw error;
    }

    const message = {
      id: crypto.randomUUID(),
      from_agent_id: input.from_agent_id,
      to_agent_id: input.to_agent_id,
      subject: input.subject || null,
      body: input.body,
      status: 'delivered',
      created_at: new Date().toISOString()
    };

    return this.messageStore.create(message);
  }

  async inbox(agentId) {
    const agent = await this.agentStore.findById(agentId);
    if (!agent) {
      const error = new Error('agentId not found');
      error.status = 404;
      throw error;
    }

    return this.messageStore.listForAgent(agentId);
  }
}

function validateMessageInput(input) {
  const requiredFields = ['from_agent_id', 'to_agent_id', 'body'];
  for (const field of requiredFields) {
    if (!input?.[field]) {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }
}

module.exports = { MessageService };
