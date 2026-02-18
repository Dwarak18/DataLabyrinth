const Redis = require('ioredis');

let client;

function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(url, { lazyConnect: true, enableReadyCheck: false, maxRetriesPerRequest: 3 });
    client.on('error', (err) => console.error('Redis error:', err.message));
  }
  return client;
}

module.exports = { getRedis };
