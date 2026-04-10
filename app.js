const express = require('express');
const capabilityRoutes = require('./routes/capabilityRoutes');
const mockRoutes = require('./routes/mockRoutes');
const mcpRoutes = require('./routes/mcpRoutes');
const mockMcpRoutes = require('./routes/mockMcpRoutes');
const systemRoutes = require('./routes/systemRoutes');
const catalogRoutes = require('./routes/catalogRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const agentRoutes = require('./routes/agentRoutes');
const messageRoutes = require('./routes/messageRoutes');
const auditRoutes = require('./routes/auditRoutes');
const { requireApiKey, requireAdminKey } = require('./middleware/auth');
const { helmetMiddleware, apiLimiter } = require('./middleware/requestProtection');

function createApp({ capabilityService, mcpServerService, schedulerService, mcpCatalogService, dataRepairService, analyticsService, agentService, messageService, auditService, readinessState } = {}) {
  const app = express();
  app.use(helmetMiddleware);
  app.use(express.json({ limit: '1mb' }));
  app.use(apiLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'agent-network-mvp' }));
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
  app.use('/audit', requireAdminKey, auditRoutes({ auditService }));
  app.use('/system', requireAdminKey, systemRoutes({ schedulerService, dataRepairService }));
  app.use('/', capabilityRoutes({ capabilityService, mcpServerService }));
  app.use((err, _req, res, _next) => res.status(err.status || 500).json({ error: err.message || 'Internal server error' }));
  return app;
}

module.exports = { createApp };
