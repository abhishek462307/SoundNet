function getService(req) {
  return req.mcpCatalogService;
}

async function listCatalog(req, res, next) {
  try {
    res.json(getService(req).listCatalog());
  } catch (error) {
    next(error);
  }
}

async function seedCatalog(req, res, next) {
  try {
    const result = await getService(req).seedCatalog();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listCatalog, seedCatalog };
