function getService(req) {
  return req.messageService;
}

async function sendMessage(req, res, next) {
  try {
    const result = await getService(req).sendMessage({ ...req.body, tenant_id: req.tenantId });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function getInbox(req, res, next) {
  try {
    const result = await getService(req).inbox(req.params.agentId, { tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getThread(req, res, next) {
  try {
    const result = await getService(req).getThread(req.params.threadId, { tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function acknowledgeMessage(req, res, next) {
  try {
    const result = await getService(req).acknowledgeMessage(req.params.messageId);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function getDeliveryQueue(req, res, next) {
  try {
    const result = await getService(req).listDeliveryQueue(req.query.before, { tenant_id: req.tenantId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function processDeliveryQueue(req, res, next) {
  try {
    const result = await getService(req).processDeliveryQueue({
      now: req.body?.now,
      failMessageIds: req.body?.fail_message_ids || [],
      tenant_id: req.tenantId
    });
    res.json({ processed: result.length, messages: result });
  } catch (error) {
    next(error);
  }
}

module.exports = { sendMessage, getInbox, getThread, acknowledgeMessage, getDeliveryQueue, processDeliveryQueue };
