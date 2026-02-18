"use client";

import { useEffect, useState } from 'react';
import { adminControl, adminEliminate, adminExport, adminFetchTeams } from '../../lib/api';

type TeamRow = {
  id: string;
  name: string;
  score: number;
  current_level: number;
  submissions: number;
};

export default function AdminPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    const load = async () => {
      try {
        const data = await adminFetchTeams(adminSecret);
        if (active) setTeams(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load teams');
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [unlocked, adminSecret]);

  if (!unlocked) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-3">
        <h1 className="text-2xl font-bold">Admin Access</h1>
        <input
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          placeholder="Admin secret"
          className="w-full border px-3 py-2 rounded"
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          onClick={() => setUnlocked(true)}
        >
          Unlock
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  const runAction = async (path: string) => {
    try {
      await adminControl(path, adminSecret);
    } catch (err: any) {
      setError(err?.message || 'Action failed');
    }
  };

  const downloadCsv = async () => {
    try {
      const blob = await adminExport(adminSecret);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'teams.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'Download failed');
    }
  };

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">Admin Control</h1>
      <div className="flex gap-2 flex-wrap">
        <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={() => runAction('start')}>
          Start Game
        </button>
        <button className="bg-yellow-500 text-white px-4 py-2 rounded" onClick={() => runAction('pause')}>
          Pause
        </button>
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => runAction('resume')}>
          Resume
        </button>
        <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={() => runAction('end')}>
          End Game
        </button>
        <button className="bg-slate-700 text-white px-4 py-2 rounded" onClick={downloadCsv}>
          Download CSV
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="border rounded">
        <div className="grid grid-cols-5 gap-2 bg-slate-100 px-3 py-2 font-semibold">
          <span>Name</span><span>Score</span><span>Level</span><span>Submissions</span><span>Actions</span>
        </div>
        {teams.map((team) => (
          <div key={team.id} className="grid grid-cols-5 gap-2 px-3 py-2 border-t items-center">
            <span>{team.name}</span>
            <span>{team.score}</span>
            <span>{team.current_level}</span>
            <span>{team.submissions}</span>
            <button
              className="text-red-600 underline"
              onClick={() => adminEliminate(team.id, adminSecret).catch((err) => setError(err?.message || 'Eliminate failed'))}
            >
              Eliminate
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}
