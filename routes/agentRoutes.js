const express = require('express');
const agentController = require('../controllers/agentController');

module.exports = function agentRoutes({ agentService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.agentService = agentService;
    next();
  });

  router.get('/', agentController.listAgents);
  router.post('/register', agentController.registerAgent);
  router.post('/discover', agentController.discoverAgents);

  return router;
};
