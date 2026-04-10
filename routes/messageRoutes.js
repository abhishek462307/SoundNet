const express = require('express');
const messageController = require('../controllers/messageController');
const { requireAdminKey } = require('../middleware/auth');

module.exports = function messageRoutes({ messageService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.messageService = messageService;
    next();
  });

  router.post('/', messageController.sendMessage);
  router.get('/inbox/:agentId', messageController.getInbox);
  router.get('/threads/:threadId', messageController.getThread);
  router.post('/:messageId/ack', messageController.acknowledgeMessage);
  router.get('/queue/delivery', requireAdminKey, messageController.getDeliveryQueue);
  router.post('/queue/process', requireAdminKey, messageController.processDeliveryQueue);

  return router;
};
