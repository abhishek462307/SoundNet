const express = require('express');
const userController = require('../controllers/userController');
const { requireRole } = require('../middleware/auth');

module.exports = function userRoutes({ userService }) {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.userService = userService;
    next();
  });

  router.post('/register', userController.registerUser);
  router.get('/me', userController.getCurrentUser);
  router.get('/', requireRole('admin'), userController.listUsers);
  router.post('/:userId/rotate-token', requireRole('admin'), userController.rotateToken);
  router.post('/:userId/revoke-token', requireRole('admin'), userController.revokeToken);

  return router;
};
