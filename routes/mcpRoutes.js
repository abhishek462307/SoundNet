const express = require('express');
const mcpController = require('../controllers/mcpController');
const { MpcServerService } = require('../services/mcpServerService');
const { createMcpServerStore } = require('../models/mcpServerStore');
const { createCapabilityStore } = require('../models/capabilityStore');
const { requireAdminKey } = require('../middleware/auth');

module.exports = function mcpRoutes(injected = {}) {
  const router = express.Router();

  router.use(async (req, _res, next) => {
    if (injected.mcpServerService) {
      req.mcpServerService = injected.mcpServerService;
      return next();
    }

    const mcpServerStore = await createMcpServerStore();
    const capabilityStore = await createCapabilityStore();
    req.mcpServerService = new MpcServerService({
      mcpServerStore,
      capabilityStore,
      baseUrl: process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`
    });

    return next();
  });

  router.get('/servers', mcpController.listServers);

  router.post('/servers', requireAdminKey, mcpController.registerServer);
  router.post('/servers/sync', requireAdminKey, mcpController.syncAllServers);
  router.post('/servers/health', requireAdminKey, mcpController.checkAllServerHealth);
  router.post('/servers/:serverId/sync', requireAdminKey, mcpController.syncServer);
  router.post('/servers/:serverId/health', requireAdminKey, mcpController.checkServerHealth);
  router.patch('/servers/:serverId/trust', requireAdminKey, mcpController.updateServerTrust);
  router.patch('/servers/:serverId/disable', requireAdminKey, mcpController.disableServer);
  router.patch('/servers/:serverId/enable', requireAdminKey, mcpController.enableServer);
  router.delete('/servers/:serverId', requireAdminKey, mcpController.deleteServer);

  return router;
};
