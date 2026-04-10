function requireApiKey(req, res, next) {
  const configuredKey = process.env.API_KEY;
  if (!configuredKey) {
    return next();
  }
  const provided = req.header('x-api-key');
  if (provided !== configuredKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

async function resolveUser(req, _res, next) {
  try {
    const authHeader = req.header('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
    const token = bearerToken || req.header('x-user-token');

    if (!token || !req.userService) {
      return next();
    }

    const user = await req.userService.getUserByToken(token);
    if (user) {
      req.authenticatedUser = user;
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

function requireAdminKey(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (req.authenticatedUser?.role === 'admin') {
    return next();
  }
  if (!configuredKey) {
    return next();
  }
  const provided = req.header('x-admin-key');
  if (provided !== configuredKey) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.authenticatedUser?.role;
    if (!userRole) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (userRole !== role) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    return next();
  };
}

module.exports = { requireApiKey, resolveUser, requireAdminKey, requireRole };
