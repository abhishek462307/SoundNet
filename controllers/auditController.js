function getService(req) {
  return req.auditService;
}

async function listAuditLogs(req, res, next) {
  try {
    const result = await getService(req).list();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { listAuditLogs };
