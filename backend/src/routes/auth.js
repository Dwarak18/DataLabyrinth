const express = require('express');
const jwt = require('jsonwebtoken');
const { getRedis } = require('../redis');
const { query } = require('../db');
const { generateDataset } = require('../services/challengeEngine');

const router = express.Router();
const redis = getRedis();

router.post('/login', async (req, res) => {
  const { access_code: accessCode } = req.body || {};
  if (!accessCode) {
    return res.status(400).json({ error: 'access_code required' });
  }
  try {
    const { rows } = await query(
      'SELECT id, name, current_level, score FROM teams WHERE access_code = $1 LIMIT 1',
      [accessCode]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    const team = rows[0];

    const existing = await query(
      'SELECT id FROM challenge_data WHERE team_id = $1 AND level = $2 LIMIT 1',
      [team.id, 1]
    );
    if (!existing.rows.length) {
      const { dataset_json, correct_hash } = generateDataset(team.id, 1);
      await query(
        'INSERT INTO challenge_data (team_id, level, dataset_json, correct_hash) VALUES ($1, $2, $3, $4)',
        [team.id, 1, dataset_json, correct_hash]
      );
    }

    await redis.set('timer:global', Math.floor(Date.now() / 1000), 'NX');

    const token = jwt.sign(
      { teamId: team.id, name: team.name, level: team.current_level },
      process.env.JWT_SECRET,
      { expiresIn: '6h' }
    );

    return res.json({
      token,
      team: {
        name: team.name,
        current_level: team.current_level,
        score: team.score,
      },
    });
  } catch (err) {
    console.error('login error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
