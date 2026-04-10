function getCapabilityService(req) {
  return req.capabilityService;
}

async function registerCapability(req, res, next) {
  try {
    const capability = await getCapabilityService(req).registerCapability(req.body);
    res.status(201).json(capability);
  } catch (error) {
    next(error);
  }
}

async function discoverCapabilities(req, res, next) {
  try {
    const results = await getCapabilityService(req).discoverCapabilities(req.body?.query, req.body?.filters || {});
    res.json(results);
  } catch (error) {
    next(error);
  }
}

async function executeCapability(req, res, next) {
  try {
    const result = await getCapabilityService(req).executeCapability(req.body, req.mcpServerService);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function listCapabilities(req, res, next) {
  try {
    const capabilities = await getCapabilityService(req).listCapabilities();
    res.json(capabilities);
  } catch (error) {
    next(error);
  }
}

async function listExecutionLogs(req, res, next) {
  try {
    const logs = await getCapabilityService(req).listExecutionLogs();
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  registerCapability,
  discoverCapabilities,
  executeCapability,
  listCapabilities,
  listExecutionLogs
};
