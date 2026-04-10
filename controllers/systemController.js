function getScheduler(req) {
  return req.schedulerService;
}

function getRepairService(req) {
  return req.dataRepairService;
}

async function getSchedulerStatus(req, res, next) {
  try {
    res.json(getScheduler(req).getStatus());
  } catch (error) {
    next(error);
  }
}

async function backfillData(req, res, next) {
  try {
    const result = await getRepairService(req).backfillCapabilities();
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { getSchedulerStatus, backfillData };
