"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Timer from '../../components/Timer';

export default function DashboardPage() {
  const router = useRouter();
  const [team, setTeam] = useState<{ name: string; current_level: number; score: number } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('datalabyrinth_team');
    if (!stored) { router.push('/login'); return; }
    setTeam(JSON.parse(stored));

    // Sync from server via status endpoint
    const token = localStorage.getItem('datalabyrinth_token');
    const teamData = JSON.parse(stored);
    if (token && teamData?.id) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/status/${teamData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.team) {
            localStorage.setItem('datalabyrinth_team', JSON.stringify(data.team));
            setTeam(data.team);
          }
        })
        .catch(() => {});
    }
  }, [router]);
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
