function getService(req) {
  return req.analyticsService;
}

async function getSummary(req, res, next) {
  try {
    const result = await getService(req).getSummary({ ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getCapabilityStats(req, res, next) {
  try {
    const result = await getService(req).getCapabilityStats({ ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getServerStats(req, res, next) {
  try {
    const result = await getService(req).getServerStats({ ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getTopTools(req, res, next) {
  try {
    const result = await getService(req).getTopTools(req.query.limit, { ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getTopQueries(req, res, next) {
  try {
    const result = await getService(req).getTopQueries(req.query.limit, { ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getExecutionTrends(req, res, next) {
  try {
    const result = await getService(req).getExecutionTrends({ ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getPolicyAnalytics(req, res, next) {
  try {
    const result = await getService(req).getPolicyAnalytics({ ...req.query, tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getSummary, getCapabilityStats, getServerStats, getTopTools, getTopQueries, getExecutionTrends, getPolicyAnalytics };
