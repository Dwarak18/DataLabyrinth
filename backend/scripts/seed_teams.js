#!/usr/bin/env node
/**
 * Seeds 100 test teams into the database.
 * Usage: DATABASE_URL=<connection_string> node scripts/seed_teams.js
 */
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/datalabyrinth',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding 100 test teams...');
    for (let i = 1; i <= 100; i++) {
      const name = `Team-${i}`;
      const accessCode = `TEAM-${i}`;
      await client.query(
        `INSERT INTO teams (name, access_code)
         VALUES ($1, $2)
         ON CONFLICT (access_code) DO NOTHING`,
        [name, accessCode]
      );
    }
    const { rows } = await client.query('SELECT COUNT(*) FROM teams');
    console.log(`Done. Total teams in DB: ${rows[0].count}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
