const express = require('express');
const systemController = require('../controllers/systemController');

module.exports = function systemRoutes({ schedulerService, dataRepairService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.schedulerService = schedulerService;
    req.dataRepairService = dataRepairService;
    next();
  });

  router.get('/scheduler', systemController.getSchedulerStatus);
  router.post('/repair/backfill', systemController.backfillData);

  return router;
};
