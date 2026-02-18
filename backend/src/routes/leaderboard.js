const express = require('express');
const { getRedis } = require('../redis');
const { query } = require('../db');

const router = express.Router();
const redis = getRedis();

router.get('/', async (req, res) => {
  try {
    const cached = await redis.get('leaderboard:cache');
    if (cached) {
      res.set('Cache-Control', 'public, max-age=8');
      return res.json(JSON.parse(cached));
    }
    const { rows } = await query(
      'SELECT name, score, current_level FROM teams ORDER BY score DESC, current_level DESC LIMIT 50'
    );
    await redis.set('leaderboard:cache', JSON.stringify(rows), 'EX', 8);
    res.set('Cache-Control', 'public, max-age=8');
    return res.json(rows);
  } catch (err) {
    console.error('leaderboard error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
