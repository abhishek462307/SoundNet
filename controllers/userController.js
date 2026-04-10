function getService(req) {
  return req.userService;
}

async function registerUser(req, res, next) {
  try {
    const result = await getService(req).registerUser({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function listUsers(req, res, next) {
  try {
    const result = await getService(req).listUsers();
    res.json(result.filter((user) => user.tenant_id === req.tenantId));
  } catch (error) {
    next(error);
  }
}

async function getCurrentUser(req, res, next) {
  try {
    if (!req.authenticatedUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    return res.json(req.authenticatedUser);
  } catch (error) {
    return next(error);
  }
}

async function rotateToken(req, res, next) {
  try {
    const result = await getService(req).rotateToken(req.params.userId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

async function revokeToken(req, res, next) {
  try {
    const result = await getService(req).revokeToken(req.params.userId);
    return res.json(result);
  } catch (error) {
    return next(error);
  }
}

module.exports = { registerUser, listUsers, getCurrentUser, rotateToken, revokeToken };
