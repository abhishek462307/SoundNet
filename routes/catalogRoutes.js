const express = require('express');
const mcpCatalogController = require('../controllers/mcpCatalogController');

module.exports = function catalogRoutes({ mcpCatalogService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.mcpCatalogService = mcpCatalogService;
    next();
  });

  router.get('/mcp', mcpCatalogController.listCatalog);
  router.post('/mcp/seed', mcpCatalogController.seedCatalog);

  return router;
};
