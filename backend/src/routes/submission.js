const express = require('express');
const { getRedis } = require('../redis');
const { query } = require('../db');
const { validateSubmission, generateDataset } = require('../services/challengeEngine');
const { calculateScore } = require('../services/scoringService');
const { verifyJWT } = require('../middleware/authMiddleware');

const router = express.Router();
const redis = getRedis();

// GET /challenge/:level — return dataset for the team's current level
router.get('/challenge/:level', verifyJWT, async (req, res) => {
  const level = Number(req.params.level);
  if (!level || isNaN(level)) {
    return res.status(400).json({ error: 'Invalid level' });
  }
  try {
    const { rows } = await query(
      'SELECT id, current_level FROM teams WHERE id = $1 LIMIT 1',
      [req.team.teamId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Team not found' });
    if (rows[0].current_level !== level) {
      return res.status(400).json({ error: 'Level mismatch' });
    }

    // Check if challenge already generated
    const existing = await query(
      'SELECT dataset_json FROM challenge_data WHERE team_id = $1 AND level = $2 LIMIT 1',
      [req.team.teamId, level]
    );

    let dataset;
    if (existing.rows.length) {
      dataset = existing.rows[0].dataset_json;
    } else {
      // Generate and persist
      const generated = generateDataset(req.team.teamId, level);
      await query(
        'INSERT INTO challenge_data (team_id, level, dataset_json, correct_hash) VALUES ($1, $2, $3, $4)',
        [req.team.teamId, level, JSON.stringify(generated.dataset_json), generated.correct_hash]
      );
      dataset = generated.dataset_json;
    }

    return res.json({ level, dataset });
  } catch (err) {
    console.error('challenge fetch error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

async function getAttempts(teamId, level) {
  const existing = await query(
    'SELECT id, attempts, is_correct FROM submissions WHERE team_id = $1 AND level = $2 ORDER BY submitted_at DESC LIMIT 1',
    [teamId, level]
  );
  return existing.rows[0];
}

router.post('/submit', verifyJWT, async (req, res) => {
  const { level, answer } = req.body || {};
  if (!level || typeof answer !== 'string') {
    return res.status(400).json({ error: 'level and answer required' });
  }
  try {
    const { rows } = await query(
      'SELECT id, current_level, score, name FROM teams WHERE id = $1 LIMIT 1',
      [req.team.teamId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = rows[0];
    if (team.current_level !== level || req.team.level !== level) {
      return res.status(400).json({ error: 'Level mismatch' });
    }

    const startTime = await redis.get('timer:global');
    const nowSeconds = Math.floor(Date.now() / 1000);
    const timeTaken = startTime ? nowSeconds - Number(startTime) : 0;

    const existing = await getAttempts(team.id, level);
    const nextAttempts = existing ? existing.attempts + 1 : 1;

    if (existing) {
      await query('UPDATE submissions SET attempts = $1 WHERE id = $2', [nextAttempts, existing.id]);
    } else {
      await query('INSERT INTO submissions (team_id, level, attempts) VALUES ($1, $2, $3)', [team.id, level, nextAttempts]);
    }

    const { is_correct } = await validateSubmission(team.id, level, answer);

    if (!is_correct) {
      return res.json({ correct: false, attempts_used: nextAttempts });
    }

    const scoreEarned = calculateScore(timeTaken, nextAttempts);
    const updatedTeam = await query(
      'UPDATE teams SET score = score + $1, current_level = current_level + 1 WHERE id = $2 RETURNING current_level',
      [scoreEarned, team.id]
    );

    if (existing) {
      await query(
        'UPDATE submissions SET is_correct = true, time_taken = $1, attempts = $2 WHERE id = $3',
        [timeTaken, nextAttempts, existing.id]
      );
    } else {
      await query(
        'INSERT INTO submissions (team_id, level, attempts, is_correct, time_taken) VALUES ($1, $2, $3, true, $4)',
        [team.id, level, nextAttempts, timeTaken]
      );
    }

    return res.json({
      correct: true,
      score_earned: scoreEarned,
      next_level: updatedTeam.rows[0].current_level,
    });
  } catch (err) {
    console.error('submit error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

router.get('/status/:teamId', async (req, res) => {
  const { teamId } = req.params;
  try {
    const { rows } = await query(
      'SELECT id, name, score, current_level FROM teams WHERE id = $1 LIMIT 1',
      [teamId]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }
    const subs = await query(
      'SELECT level, attempts, is_correct, submitted_at FROM submissions WHERE team_id = $1 ORDER BY submitted_at DESC',
      [teamId]
    );
    return res.json({ team: rows[0], submissions: subs.rows });
  } catch (err) {
    console.error('status error', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
