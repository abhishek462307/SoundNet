const crypto = require('crypto');

class UserService {
  constructor({ userStore }) {
    this.userStore = userStore;
  }

  async registerUser(input) {
    validateUserInput(input);
    const existing = await this.userStore.findByEmail(input.email);
    if (existing) {
      const error = new Error('email already exists');
      error.status = 409;
      throw error;
    }

    const apiToken = generateUserToken();
    const user = {
      id: crypto.randomUUID(),
      email: input.email,
      name: input.name,
      role: input.role || 'user',
      api_token_hash: hashToken(apiToken),
      token_last_four: apiToken.slice(-4),
      token_created_at: new Date().toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString()
    };

    const createdUser = await this.userStore.create(user);
    return toUserResponse(createdUser, apiToken);
  }

  async listUsers() {
    const users = await this.userStore.list();
    return users.map((user) => toUserResponse(user));
  }

  async getUserByToken(token) {
    if (!token) {
      return null;
    }

    const user = await this.userStore.findByToken(token);
    if (!user || user.revoked_at) {
      return null;
    }

    return toUserResponse(user);
  }

  async rotateToken(userId) {
    const user = await this.userStore.findById(userId);
    if (!user) {
      const error = new Error('user not found');
      error.status = 404;
      throw error;
    }

    const apiToken = generateUserToken();
    const updatedUser = {
      ...user,
      api_token_hash: hashToken(apiToken),
      token_last_four: apiToken.slice(-4),
      token_created_at: new Date().toISOString(),
      revoked_at: null
    };

    await this.userStore.update(userId, updatedUser);
    return toUserResponse(updatedUser, apiToken);
  }

  async revokeToken(userId) {
    const user = await this.userStore.findById(userId);
    if (!user) {
      const error = new Error('user not found');
      error.status = 404;
      throw error;
    }

    const updatedUser = {
      ...user,
      revoked_at: new Date().toISOString()
    };

    await this.userStore.update(userId, updatedUser);
    return toUserResponse(updatedUser);
  }
}

function generateUserToken() {
  return `snd_${crypto.randomBytes(24).toString('hex')}`;
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toUserResponse(user, plainToken) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    token_last_four: user.token_last_four || null,
    token_created_at: user.token_created_at || null,
    revoked_at: user.revoked_at || null,
    created_at: user.created_at,
    ...(plainToken ? { api_token: plainToken } : {})
  };
}

function validateUserInput(input) {
  if (!input?.email) {
    const error = new Error('email is required');
    error.status = 400;
    throw error;
  }
  if (!input?.name) {
    const error = new Error('name is required');
    error.status = 400;
    throw error;
  }
  if (input.role && !['user', 'admin'].includes(input.role)) {
    const error = new Error('role must be user or admin');
    error.status = 400;
    throw error;
  }
}

module.exports = { UserService, hashToken };
