const axios = require('axios');

async function requestJsonWithRetry({ url, method, data, retries, timeout, headers = {} }) {
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      const response = await axios({
        url,
        method,
        data,
        timeout,
        headers,
        validateStatus(status) {
          return status >= 200 && status < 300;
        }
      });

      if (typeof response.data === 'undefined') {
        throw new Error('Endpoint did not return JSON');
      }

      return response.data;
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries) {
        break;
      }
    }
  }

  const message = lastError.response?.data?.error || lastError.message || 'Request failed';
  throw new Error(message);
}

module.exports = { requestJsonWithRetry };
