const express = require('express');
const crypto = require('crypto');
const capabilityRoutes = require('./routes/capabilityRoutes');
const mockRoutes = require('./routes/mockRoutes');
const mcpRoutes = require('./routes/mcpRoutes');
const mockMcpRoutes = require('./routes/mockMcpRoutes');
const systemRoutes = require('./routes/systemRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const agentRoutes = require('./routes/agentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const policyRoutes = require('./routes/policyRoutes');
const auditRoutes = require('./routes/auditRoutes');
const userRoutes = require('./routes/userRoutes');
const { requireApiKey, resolveUser, resolveTenant, requireAdminKey } = require('./middleware/auth');
const { helmetMiddleware, apiLimiter } = require('./middleware/requestProtection');

function createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, userService, tenantPolicyService, readinessState, runtimeConfig } = {}) {
  const app = express();
  app.use(helmetMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(apiLimiter);

  app.use((req, res, next) => {
    req.requestId = req.header('x-request-id') || crypto.randomUUID();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  app.use((req, _res, next) => {
    req.userService = userService;
    req.runtimeConfig = runtimeConfig;
    next();
  });
  app.use(resolveUser);
  app.use(resolveTenant);

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'sound-net' }));
  app.get('/ready', (_req, res) => {
    if (readinessState?.ready) {
      return res.json({ status: 'ready' });
    }
    return res.status(503).json({ status: 'not_ready' });
  });

  app.use(requireApiKey);
  app.use('/mock', mockRoutes);
  app.use('/mock-mcp', mockMcpRoutes);
  app.use('/mcp', mcpRoutes({ mcpServerService }));
  app.use('/catalog', catalogRoutes({ mcpCatalogService }));
  app.use('/analytics', requireAdminKey, analyticsRoutes({ analyticsService }));
  app.use('/agents', agentRoutes({ agentService }));
  app.use('/messages', messageRoutes({ messageService }));
  app.use('/policy', policyRoutes({ tenantPolicyService }));
  app.use('/audit', requireAdminKey, auditRoutes({ auditService }));
  app.use('/users', userRoutes({ userService }));
  app.use('/system', requireAdminKey, systemRoutes({ schedulerService, dataRepairService }));
  app.use('/', capabilityRoutes({ capabilityService, mcpServerService }));
  app.use((err, req, res, _next) => {
    const status = err.status || 500;
    if (status >= 500) {
      console.error(`[${req.requestId}]`, err);
    }

    res.status(status).json({
      error: err.message || 'Internal server error',
      request_id: req.requestId
    });
  });
  return app;
}

module.exports = { createApp };
