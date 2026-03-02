'use client';
// components/level2/LiveLeaderboard.tsx — polls backend every 10 s
import React, { useEffect, useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  total_points: number;
  tasks_completed: number;
  last_submit_at: string;
}

interface LiveLeaderboardProps {
  currentTeamId: string;
  maxEntries?: number;
}

export default function LiveLeaderboard({
  currentTeamId,
  maxEntries = 10,
}: LiveLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [rankChanges, setRankChanges] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevRanksRef = useRef<Record<string, number>>({});

  const loadLeaderboard = async () => {
    try {
      const res = await fetch(`${API_URL}/api/level2/leaderboard?limit=${maxEntries}`);
      if (!res.ok) return;
      const data: LeaderboardEntry[] = await res.json();

      const newRanks: Record<string, number> = {};
      data.forEach((e, i) => { newRanks[e.team_id] = i + 1; });

      const changes: Record<string, 'up' | 'down' | null> = {};
      data.forEach((e) => {
        const prev = prevRanksRef.current[e.team_id];
        const curr = newRanks[e.team_id];
        changes[e.team_id] = prev === undefined || prev === curr
          ? null : curr < prev ? 'up' : 'down';
      });

      prevRanksRef.current = newRanks;
      setRankChanges(changes);
      setEntries(data);
      setTimeout(() => setRankChanges({}), 1600);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    loadLeaderboard();
    // Poll every 10 seconds instead of Supabase Realtime
    const id = setInterval(loadLeaderboard, 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-mono text-bs-cyan tracking-widest uppercase border-b border-bs-border pb-1 mb-2">
        ▶ Live Leaderboard
      </p>
      {entries.length === 0 && (
        <p className="text-zinc-700 text-[10px] font-mono text-center py-2">
          No teams active yet.
        </p>
      )}
      {entries.map((e, i) => {
        const isCurrent = e.team_id === currentTeamId;
        const change = rankChanges[e.team_id];
        return (
          <div
            key={e.team_id}
            className={`
              flex items-center gap-2 px-2 py-1 rounded-sm text-[10px] font-mono
              transition-all duration-300
              ${isCurrent ? 'border border-bs-cyan bg-cyan-950/20' : 'border border-transparent'}
              ${change === 'up' ? 'rank-up' : change === 'down' ? 'rank-down' : ''}
            `}
          >
            <span className={`w-5 shrink-0 ${i < 3 ? 'text-bs-amber' : 'text-zinc-600'}`}>
              #{i + 1}
            </span>
            <span className={`flex-1 truncate ${isCurrent ? 'text-bs-cyan' : 'text-zinc-300'}`}>
              {isCurrent ? '▶ ' : ''}{e.team_name || e.team_id}
            </span>
            <span className="text-zinc-400 shrink-0">{e.tasks_completed}✓</span>
            <span className={`shrink-0 font-bold ${i === 0 ? 'text-bs-amber' : 'text-zinc-200'}`}>
              {e.total_points}
            </span>
            {change === 'up'   && <span className="text-bs-green shrink-0">▲</span>}
            {change === 'down' && <span className="text-bs-red shrink-0">▼</span>}
          </div>
        );
      })}
    </div>
  );
}

interface LeaderboardEntry {
  team_id: string;
  total_points: number;
  tasks_completed: number;
  last_submit_at: string;
}
