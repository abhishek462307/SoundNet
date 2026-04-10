const net = require('net');

async function findAvailablePort(startPort, maxAttempts = 20) {
  let port = Number(startPort);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const available = await isPortAvailable(port);
    if (available) {
      return port;
    }
    port += 1;
  }

  throw new Error(`No available port found starting from ${startPort}`);
}

function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

module.exports = { findAvailablePort };
