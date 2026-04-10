function getService(req) {
  return req.tenantPolicyService;
}

async function getTenantPolicy(req, res, next) {
  try {
    res.json(getService(req).getPolicy(req.tenantId));
  } catch (error) {
    next(error);
  }
}

async function updateTenantPolicy(req, res, next) {
  try {
    res.json(getService(req).setPolicy(req.tenantId, req.body || {}));
  } catch (error) {
    next(error);
  }
}

module.exports = { getTenantPolicy, updateTenantPolicy };
