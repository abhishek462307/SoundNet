const express = require('express');
const auditController = require('../controllers/auditController');

module.exports = function auditRoutes({ auditService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.auditService = auditService;
    next();
  });

  router.get('/', auditController.listAuditLogs);

  return router;
};
