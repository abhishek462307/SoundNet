const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const { findAvailablePort } = require('../utils/port');

test('findAvailablePort returns the next port when the preferred port is occupied', async () => {
  const blocker = net.createServer();

  await new Promise((resolve, reject) => {
    blocker.listen(0, '0.0.0.0', () => resolve());
    blocker.on('error', reject);
  });

  const occupiedPort = blocker.address().port;

  try {
    const freePort = await findAvailablePort(occupiedPort, 5);
    assert.equal(typeof freePort, 'number');
    assert.equal(freePort >= occupiedPort, true);
    assert.notEqual(freePort, occupiedPort);
  } finally {
    await new Promise((resolve, reject) => blocker.close((error) => error ? reject(error) : resolve()));
  }
});
