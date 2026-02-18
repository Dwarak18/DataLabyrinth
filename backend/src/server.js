require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const submissionRoutes = require('./routes/submission');
const leaderboardRoutes = require('./routes/leaderboard');
const { adminRouter, timeRouter } = require('./routes/admin');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  return res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api', submissionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', timeRouter);
app.use('/api/admin', adminRouter);

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Backend listening on ${port}`);
});
