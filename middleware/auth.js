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

function requireAdminKey(req, res, next) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) {
    return next();
  }
  const provided = req.header('x-admin-key');
  if (provided !== configuredKey) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return next();
}

module.exports = { requireApiKey, requireAdminKey };
