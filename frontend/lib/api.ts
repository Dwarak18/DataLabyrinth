const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || 'Request failed');
  }
  return res.json();
}

export async function login(accessCode: string) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ access_code: accessCode }),
  });
}

export async function submitAnswer(token: string, level: number, answer: string) {
  return apiFetch('/submit', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ level, answer }),
  });
}

export async function fetchLeaderboard() {
  return apiFetch('/leaderboard');
}

export async function fetchTime() {
  return apiFetch('/time');
}

export async function adminFetchTeams(adminSecret: string) {
  return apiFetch('/admin/teams', { headers: { 'x-admin-secret': adminSecret } });
}

export async function adminControl(path: string, adminSecret: string, method: 'POST' | 'GET' = 'POST') {
  return apiFetch(`/admin/${path}`, { method, headers: { 'x-admin-secret': adminSecret } });
}

export async function adminEliminate(teamId: string, adminSecret: string) {
  return apiFetch(`/admin/eliminate/${teamId}`, {
    method: 'POST',
    headers: { 'x-admin-secret': adminSecret },
  });
}

export async function adminExport(adminSecret: string) {
  const res = await fetch(`${API_BASE}/admin/export`, {
    headers: { 'x-admin-secret': adminSecret },
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  return blob;
}
