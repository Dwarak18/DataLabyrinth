const crypto = require('crypto');
const seedrandom = require('seedrandom');
const { query } = require('../db');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function generateDataset(teamId, level) {
  const rng = seedrandom(`${teamId}-${level}`);
  const regions = ['north', 'south', 'east', 'west'];
  const dataset = Array.from({ length: 24 }).map((_, idx) => {
    const region = regions[idx % regions.length];
    const sales = Math.floor(rng() * 900) + 100; // 100..999
    const margin = Math.floor(rng() * 40) + 10; // 10..49
    const month = (idx % 12) + 1;
    return { id: idx + 1, region, month, sales, margin };
  });

  const totals = regions.map((region) => {
    const rows = dataset.filter((r) => r.region === region);
    const sumSales = rows.reduce((acc, r) => acc + r.sales, 0);
    const avgMargin = rows.reduce((acc, r) => acc + r.margin, 0) / rows.length;
    return { region, total_sales: sumSales, avg_margin: Number(avgMargin.toFixed(2)) };
  });

  const expectedResult = totals.sort((a, b) => b.total_sales - a.total_sales);
  const correctHash = sha256(JSON.stringify(expectedResult));
  return { dataset_json: dataset, correct_hash: correctHash };
}

async function validateSubmission(teamId, level, userAnswer) {
  const { rows } = await query(
    'SELECT correct_hash FROM challenge_data WHERE team_id = $1 AND level = $2 LIMIT 1',
    [teamId, level]
  );
  if (!rows.length) {
    return { is_correct: false };
  }
  const normalized = (userAnswer || '').trim().toLowerCase();
  const submittedHash = sha256(normalized);
  return { is_correct: submittedHash === rows[0].correct_hash };
}

module.exports = {
  generateDataset,
  validateSubmission,
};
