function getService(req) {
  return req.agentService;
}

async function registerAgent(req, res, next) {
  try {
    const result = await getService(req).registerAgent({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listAgents(req, res, next) {
  try {
    const result = await getService(req).listAgents({ tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function discoverAgents(req, res, next) {
  try {
    const result = await getService(req).discoverAgents(req.body?.query, { tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { registerAgent, listAgents, discoverAgents };
