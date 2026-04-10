const crypto = require('crypto');

class AgentService {
  constructor({ agentStore }) {
    this.agentStore = agentStore;
  }

  async registerAgent(input) {
    validateAgentInput(input);

    const existing = await this.agentStore.findByName(input.name);
    if (existing) {
      const error = new Error('agent name already exists');
      error.status = 409;
      throw error;
    }

    const agent = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description,
      endpoint: input.endpoint,
      protocol: input.protocol || 'http',
      trust_score: typeof input.trust_score === 'number' ? input.trust_score : 0,
      tags: input.tags || [],
      capabilities: input.capabilities || [],
      status: input.status || 'active',
      created_at: new Date().toISOString()
    };

    return this.agentStore.create(agent);
  }

  async listAgents() {
    return this.agentStore.list();
  }

  async discoverAgents(query) {
    if (!query || typeof query !== 'string') {
      const error = new Error('query is required');
      error.status = 400;
      throw error;
    }

    const queryTokens = tokenize(query);
    const agents = await this.agentStore.list();

    return agents
      .map((agent) => {
        const text = `${agent.name} ${agent.description} ${agent.tags.join(' ')} ${agent.capabilities.join(' ')}`.toLowerCase();
        const score = queryTokens.reduce((sum, token) => sum + (text.includes(token) ? 1 : 0), 0) + (agent.trust_score || 0);
        return { agent, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 10)
      .map(({ agent, score }) => ({
        id: agent.id,
        name: agent.name,
        endpoint: agent.endpoint,
        protocol: agent.protocol,
        trust_score: agent.trust_score,
        capabilities: agent.capabilities,
        score
      }));
  }
}

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function validateAgentInput(input) {
  const requiredFields = ['name', 'description', 'endpoint'];
  for (const field of requiredFields) {
    if (!input?.[field]) {
      const error = new Error(`${field} is required`);
      error.status = 400;
      throw error;
    }
  }

  if (typeof input.tags !== 'undefined' && !Array.isArray(input.tags)) {
    const error = new Error('tags must be an array');
    error.status = 400;
    throw error;
  }

  if (typeof input.capabilities !== 'undefined' && !Array.isArray(input.capabilities)) {
    const error = new Error('capabilities must be an array');
    error.status = 400;
    throw error;
  }
}

module.exports = { AgentService };
