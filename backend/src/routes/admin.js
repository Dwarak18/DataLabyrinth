const express = require('express');
const { getRedis } = require('../redis');
const { Parser } = require('json2csv');
const { query } = require('../db');
const { adminGuard } = require('../middleware/authMiddleware');

const adminRouter = express.Router();
const timeRouter = express.Router();
const redis = getRedis();
const GAME_DURATION_SECONDS = Number(process.env.GAME_DURATION_SECONDS || 3600);

timeRouter.get('/time', async (req, res) => {
  try {
    const [globalStart, paused, ended] = await Promise.all([
      redis.get('timer:global'),
      redis.get('timer:paused'),
      redis.get('game:ended'),
    ]);
    const payload = {
      global_start_time: globalStart ? Number(globalStart) : null,
      duration_seconds: GAME_DURATION_SECONDS,
      server_now: Math.floor(Date.now() / 1000),
      is_paused: Boolean(paused),
      is_ended: Boolean(ended),
    };
    return res.json(payload);
  } catch (err) {
    console.error('time error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.use(adminGuard);

adminRouter.get('/teams', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT t.id, t.name, t.score, t.current_level, COALESCE(COUNT(s.id), 0) AS submissions
       FROM teams t
       LEFT JOIN submissions s ON s.team_id = t.id
       GROUP BY t.id
       ORDER BY t.score DESC, t.current_level DESC`
    );
    return res.json(rows);
  } catch (err) {
    console.error('admin teams error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.get('/submissions', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT team_id, level, attempts, is_correct, time_taken, submitted_at FROM submissions ORDER BY submitted_at DESC'
    );
    return res.json(rows);
  } catch (err) {
    console.error('admin submissions error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.post('/start', async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    await redis.set('timer:global', now);
    await redis.del('game:ended');
    await redis.del('timer:paused');
    return res.json({ started_at: now });
  } catch (err) {
    console.error('admin start error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.post('/pause', async (req, res) => {
  try {
    await redis.set('timer:paused', 'true');
    return res.json({ paused: true });
  } catch (err) {
    console.error('pause error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.post('/resume', async (req, res) => {
  try {
    await redis.del('timer:paused');
    return res.json({ paused: false });
  } catch (err) {
    console.error('resume error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.post('/end', async (req, res) => {
  try {
    await redis.set('game:ended', 'true');
    return res.json({ ended: true });
  } catch (err) {
    console.error('end error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.post('/eliminate/:teamId', async (req, res) => {
  const { teamId } = req.params;
  try {
    await query('UPDATE teams SET current_level = -1 WHERE id = $1', [teamId]);
    return res.json({ eliminated: teamId });
  } catch (err) {
    console.error('eliminate error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

adminRouter.get('/export', async (req, res) => {
  try {
    const { rows } = await query('SELECT id, name, score, current_level, created_at FROM teams ORDER BY score DESC');
    const parser = new Parser({ fields: ['id', 'name', 'score', 'current_level', 'created_at'] });
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('teams.csv');
    return res.send(csv);
  } catch (err) {
    console.error('export error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = {
  adminRouter,
  timeRouter,
};
