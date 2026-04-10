const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_PER_MINUTE || 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' }
});

module.exports = {
  helmetMiddleware: helmet(),
  apiLimiter
};
