function getConfig() {
  const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT || 3000),
    appBaseUrl: process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`,
    databaseUrl: process.env.DATABASE_URL || '',
    apiKey: process.env.API_KEY || '',
    adminApiKey: process.env.ADMIN_API_KEY || '',
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE || 120),
    mcpHealthIntervalMs: Number(process.env.MCP_HEALTH_INTERVAL_MS || 0),
    mcpSyncIntervalMs: Number(process.env.MCP_SYNC_INTERVAL_MS || 0)
  };

  validateConfig(config);
  return config;
}

function validateConfig(config) {
  if (!Number.isInteger(config.port) || config.port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  if (!Number.isInteger(config.rateLimitPerMinute) || config.rateLimitPerMinute <= 0) {
    throw new Error('RATE_LIMIT_PER_MINUTE must be a positive integer');
  }

  if (config.nodeEnv === 'production') {
    if (!config.apiKey) {
      throw new Error('API_KEY is required in production');
    }
    if (!config.adminApiKey) {
      throw new Error('ADMIN_API_KEY is required in production');
    }
  }
}

module.exports = { getConfig };
