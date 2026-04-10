const express = require('express');
const analyticsController = require('../controllers/analyticsController');

module.exports = function analyticsRoutes({ analyticsService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.analyticsService = analyticsService;
    next();
  });

  router.get('/summary', analyticsController.getSummary);
  router.get('/capabilities', analyticsController.getCapabilityStats);
  router.get('/servers', analyticsController.getServerStats);
  router.get('/top-tools', analyticsController.getTopTools);
  router.get('/top-queries', analyticsController.getTopQueries);

  return router;
};
