function getService(req) {
  return req.mcpServerService;
}

async function listServers(req, res, next) {
  try {
    const servers = await getService(req).listServers(req.query, { tenant_id: req.tenantId });
    res.json(servers);
  } catch (error) {
    next(error);
  }
}

async function registerServer(req, res, next) {
  try {
    const server = await getService(req).registerServer({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json(server);
  } catch (error) {
    next(error);
  }
}

async function syncServer(req, res, next) {
  try {
    const result = await getService(req).syncServer(req.params.serverId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function syncAllServers(req, res, next) {
  try {
    const result = await getService(req).syncAllServers({ tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function checkServerHealth(req, res, next) {
  try {
    const result = await getService(req).checkServerHealth(req.params.serverId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function checkAllServerHealth(req, res, next) {
  try {
    const result = await getService(req).checkAllServerHealth({ tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function updateServerTrust(req, res, next) {
  try {
    const result = await getService(req).updateServerTrust(req.params.serverId, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function disableServer(req, res, next) {
  try {
    const result = await getService(req).disableServer(req.params.serverId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function enableServer(req, res, next) {
  try {
    const result = await getService(req).enableServer(req.params.serverId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function deleteServer(req, res, next) {
  try {
    const result = await getService(req).deleteServer(req.params.serverId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listServers,
  registerServer,
  syncServer,
  syncAllServers,
  checkServerHealth,
  checkAllServerHealth,
  updateServerTrust,
  disableServer,
  enableServer,
  deleteServer
};
