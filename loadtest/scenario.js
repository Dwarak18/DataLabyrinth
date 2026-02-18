import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '2m', target: 300 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const API = __ENV.API_URL || 'http://localhost:3001/api';
const ACCESS_CODES = Array.from({ length: 100 }).map((_, i) => `TEAM-${i + 1}`);

export default function () {
  const code = ACCESS_CODES[Math.floor(Math.random() * ACCESS_CODES.length)];
  const loginRes = http.post(`${API}/auth/login`, JSON.stringify({ access_code: code }), {
    headers: { 'Content-Type': 'application/json' },
  });
  check(loginRes, { 'login status 200': (r) => r.status === 200 });

  let token;
  try {
    token = loginRes.json('token');
  } catch (e) {
    token = null;
  }

  if (token) {
    const submitRes = http.post(
      `${API}/submit`,
      JSON.stringify({ level: 1, answer: 'sample answer' }),
      { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } }
    );
    check(submitRes, { 'submit status': (r) => r.status === 200 });
  }

  const lb = http.get(`${API}/leaderboard`);
  check(lb, { 'leaderboard 200': (r) => r.status === 200 });
  sleep(1);
}
