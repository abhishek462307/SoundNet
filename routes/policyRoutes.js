const express = require('express');
const policyController = require('../controllers/policyController');
const { requireAdminKey } = require('../middleware/auth');

module.exports = function policyRoutes({ tenantPolicyService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.tenantPolicyService = tenantPolicyService;
    next();
  });

  router.get('/tenant', requireAdminKey, policyController.getTenantPolicy);
  router.post('/tenant', requireAdminKey, policyController.updateTenantPolicy);

  return router;
};
