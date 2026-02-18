"use client";

import { useEffect, useState } from 'react';
import Timer from '../../components/Timer';

export default function DashboardPage() {
  const [team, setTeam] = useState<{ name: string; current_level: number; score: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('datalabyrinth_team');
    if (stored) setTeam(JSON.parse(stored));
  }, []);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <Timer />
      {team && (
        <div className="p-4 border rounded">
          <div>Name: {team.name}</div>
          <div>Score: {team.score}</div>
          <div>Current Chamber: {team.current_level}</div>
        </div>
      )}
      <a href={`/chamber/${team?.current_level || 1}`} className="text-blue-600 underline">
        Go to current chamber
      </a>
      <a href="/leaderboard" className="block text-blue-600 underline">
        View leaderboard
      </a>
    </main>
  );
}
