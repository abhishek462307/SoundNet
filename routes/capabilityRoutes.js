const express = require('express');
const capabilityController = require('../controllers/capabilityController');
const { CapabilityService } = require('../services/capabilityService');
const { MpcServerService } = require('../services/mcpServerService');
const { createCapabilityStore } = require('../models/capabilityStore');
const { createExecutionLogStore } = require('../models/executionLogStore');
const { createMcpServerStore } = require('../models/mcpServerStore');

module.exports = function capabilityRoutes(injected = {}) {
  const router = express.Router();

  router.use(async (req, _res, next) => {
    if (injected.capabilityService && injected.mcpServerService) {
      req.capabilityService = injected.capabilityService;
      req.mcpServerService = injected.mcpServerService;
      return next();
    }

    const capabilityStore = await createCapabilityStore();
    const executionLogStore = await createExecutionLogStore();
    const mcpServerStore = await createMcpServerStore();

    req.capabilityService = new CapabilityService({
      capabilityStore,
      executionLogStore,
      baseUrl: process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`
    });

    req.mcpServerService = new MpcServerService({
      mcpServerStore,
      capabilityStore,
      baseUrl: process.env.APP_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`
    });

    return next();
  });

  router.post('/register', capabilityController.registerCapability);
  router.post('/discover', capabilityController.discoverCapabilities);
  router.post('/execute', capabilityController.executeCapability);
  router.post('/execute/preview', capabilityController.previewExecution);
  router.get('/capabilities', capabilityController.listCapabilities);
  router.get('/logs', capabilityController.listExecutionLogs);

  return router;
};
