const express = require('express');
const messageController = require('../controllers/messageController');

module.exports = function messageRoutes({ messageService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.messageService = messageService;
    next();
  });

  router.post('/', messageController.sendMessage);
  router.get('/inbox/:agentId', messageController.getInbox);

  return router;
};
