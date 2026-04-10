const express = require('express');

const router = express.Router();

router.get('/food-order', (_req, res) => {
  res.json({
    service: 'mock_food_order',
    accepts: ['pizza', 'burger', 'salad'],
    status: 'ready'
  });
});

router.post('/food-order', (req, res) => {
  const item = req.body?.item || 'pizza';
  const quantity = Number(req.body?.quantity || 1);

  res.json({
    capability: 'mock_food_order',
    status: 'confirmed',
    order: {
      item,
      quantity
    },
    eta_minutes: 20
  });
});

module.exports = router;
