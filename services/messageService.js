const crypto = require('crypto');
const axios = require('axios');

class MessageService {
  constructor({ agentStore, messageStore, deliveryClient, retryBaseDelayMs = 60000 }) {
    this.agentStore = agentStore;
    this.messageStore = messageStore;
    this.deliveryClient = deliveryClient || createDefaultDeliveryClient();
    this.retryBaseDelayMs = Number(retryBaseDelayMs || 60000);
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

    const threadId = input.thread_id || crypto.randomUUID();
    const maxAttempts = normalizePositiveInteger(input.max_attempts, 3);
    const scheduledFor = normalizeScheduledFor(input.scheduled_for);
    const deliveryMode = input.delivery_mode || inferDeliveryMode(toAgent);
    const message = {
      id: crypto.randomUUID(),
      thread_id: threadId,
      from_agent_id: input.from_agent_id,
      to_agent_id: input.to_agent_id,
      subject: input.subject || null,
      body: input.body,
      delivery_mode: deliveryMode,
      status: scheduledFor ? 'scheduled' : 'pending',
      attempts: 0,
      max_attempts: maxAttempts,
      scheduled_for: scheduledFor,
      last_attempt_at: null,
      delivered_at: null,
      acknowledged_at: null,
      last_error: null,
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

  async getThread(threadId) {
    if (!threadId) {
      const error = new Error('threadId is required');
      error.status = 400;
      throw error;
    }

    return this.messageStore.listByThread(threadId);
  }

  async acknowledgeMessage(messageId) {
    const message = await this.messageStore.findById(messageId);
    if (!message) {
      const error = new Error('message not found');
      error.status = 404;
      throw error;
    }

    const updatedMessage = {
      ...message,
      status: 'acknowledged',
      acknowledged_at: new Date().toISOString()
    };

    return this.messageStore.update(messageId, updatedMessage);
  }

  async listDeliveryQueue(beforeIso) {
    const effectiveBefore = beforeIso || new Date().toISOString();
    return this.messageStore.listReadyForDelivery(effectiveBefore);
  }

  async processDeliveryQueue(options = {}) {
    const now = options.now || new Date().toISOString();
    const readyMessages = await this.messageStore.listReadyForDelivery(now);
    const processed = [];

    for (const message of readyMessages) {
      const toAgent = await this.agentStore.findById(message.to_agent_id);
      const updatedMessage = {
        ...message,
        attempts: (message.attempts || 0) + 1,
        last_attempt_at: now
      };

      const shouldFail = options.failMessageIds?.includes(message.id);
      if (shouldFail) {
        if (updatedMessage.attempts >= (message.max_attempts || 3)) {
          updatedMessage.status = 'failed';
          updatedMessage.last_error = 'delivery failed after max attempts';
          updatedMessage.scheduled_for = null;
        } else {
          updatedMessage.status = 'scheduled';
          updatedMessage.last_error = 'delivery attempt failed';
          updatedMessage.scheduled_for = calculateNextRetryAt(now, updatedMessage.attempts, this.retryBaseDelayMs);
        }
      } else {
        try {
          await this.deliveryClient.deliver({
            target: toAgent,
            message: updatedMessage
          });
          updatedMessage.status = 'delivered';
          updatedMessage.delivered_at = now;
          updatedMessage.last_error = null;
          updatedMessage.scheduled_for = null;
        } catch (error) {
          if (updatedMessage.attempts >= (message.max_attempts || 3)) {
            updatedMessage.status = 'failed';
            updatedMessage.last_error = error.message || 'delivery failed after max attempts';
            updatedMessage.scheduled_for = null;
          } else {
            updatedMessage.status = 'scheduled';
            updatedMessage.last_error = error.message || 'delivery attempt failed';
            updatedMessage.scheduled_for = calculateNextRetryAt(now, updatedMessage.attempts, this.retryBaseDelayMs);
          }
        }
      }

      processed.push(await this.messageStore.update(message.id, updatedMessage));
    }

    return processed;
  }
}

function calculateNextRetryAt(nowIso, attempts, retryBaseDelayMs) {
  const multiplier = Math.max(1, 2 ** Math.max(0, attempts - 1));
  return new Date(Date.parse(nowIso) + (retryBaseDelayMs * multiplier)).toISOString();
}

function inferDeliveryMode(agent) {
  if (agent?.protocol === 'webhook') {
    return 'webhook';
  }

  return 'http';
}

function createDefaultDeliveryClient() {
  return {
    async deliver({ target, message }) {
      if (!target?.endpoint) {
        throw new Error('target endpoint is missing');
      }

      await axios.post(target.endpoint, {
        message_id: message.id,
        thread_id: message.thread_id,
        from_agent_id: message.from_agent_id,
        to_agent_id: message.to_agent_id,
        subject: message.subject,
        body: message.body,
        delivery_mode: message.delivery_mode,
        created_at: message.created_at
      }, {
        timeout: 5000,
        headers: {
          'content-type': 'application/json'
        }
      });
    }
  };
}

function normalizePositiveInteger(value, fallback) {
  if (typeof value === 'undefined') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error('max_attempts must be a positive integer');
    error.status = 400;
    throw error;
  }

  return parsed;
}

function normalizeScheduledFor(value) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const error = new Error('scheduled_for must be a valid ISO date');
    error.status = 400;
    throw error;
  }

  return date.toISOString();
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

module.exports = { MessageService, calculateNextRetryAt };
