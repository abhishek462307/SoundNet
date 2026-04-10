function getService(req) {
  return req.analyticsService;
}

async function getSummary(req, res, next) {
  try {
    const result = await getService(req).getSummary();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getCapabilityStats(req, res, next) {
  try {
    const result = await getService(req).getCapabilityStats();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getServerStats(req, res, next) {
  try {
    const result = await getService(req).getServerStats();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getTopTools(req, res, next) {
  try {
    const result = await getService(req).getTopTools(req.query.limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getTopQueries(req, res, next) {
  try {
    const result = await getService(req).getTopQueries(req.query.limit);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getSummary, getCapabilityStats, getServerStats, getTopTools, getTopQueries };
