function getService(req) {
  return req.messageService;
}

async function sendMessage(req, res, next) {
  try {
    const result = await getService(req).sendMessage(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getInbox(req, res, next) {
  try {
    const result = await getService(req).inbox(req.params.agentId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, getInbox };
