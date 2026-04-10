function getCapabilityService(req) {
  return req.capabilityService;
}

async function registerCapability(req, res, next) {
  try {
    const capability = await getCapabilityService(req).registerCapability({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json(capability);
  } catch (error) {
    next(error);
  }
}

async function discoverCapabilities(req, res, next) {
  try {
    const results = await getCapabilityService(req).discoverCapabilities(req.body?.query, req.body?.filters || {}, { tenant_id: req.tenantId });
    res.json(results);
  } catch (error) {
    next(error);
  }
}

async function executeCapability(req, res, next) {
  try {
    const result = await getCapabilityService(req).executeCapability(req.body, req.mcpServerService, { tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    if (error.details) {
      return res.status(error.status || 403).json({ error: error.message, policy: error.details });
    }
    next(error);
  }
}

async function previewExecution(req, res, next) {
  try {
    const result = await getCapabilityService(req).previewExecution(req.body, { tenant_id: req.tenantId, budget_limit_usd: req.body?.budget_limit_usd });
    res.json(result);
  } catch (error) {
    if (error.details) {
      return res.status(error.status || 403).json({ error: error.message, policy: error.details });
    }
    next(error);
  }
}

async function listCapabilities(req, res, next) {
  try {
    const capabilities = await getCapabilityService(req).listCapabilities({ tenant_id: req.tenantId });
    res.json(capabilities);
  } catch (error) {
    next(error);
  }
}

async function listExecutionLogs(req, res, next) {
  try {
    const logs = await getCapabilityService(req).listExecutionLogs({ tenant_id: req.tenantId });
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerCapability,
  discoverCapabilities,
  executeCapability,
  previewExecution,
  listCapabilities,
  listExecutionLogs
};
