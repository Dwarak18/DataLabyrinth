const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL env var is required');
}

// Supabase requires SSL; keep rejects disabled for pooled connections.
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
};
