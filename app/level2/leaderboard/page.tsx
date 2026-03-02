'use client';
// app/level2/leaderboard/page.tsx — Projector view
export const dynamic = 'force-dynamic';
import React, { useEffect, useState, useRef } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface LeaderboardEntry {
  team_id: string;
  team_name: string;
  total_points: number;
  tasks_completed: number;
  section_a_pts: number;
  section_b_pts: number;
  section_c_pts: number;
  bonus_pts: number;
  last_submit_at: string;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const prevRef = useRef<LeaderboardEntry[]>([]);

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/api/level2/leaderboard?limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      prevRef.current = entries;
      setEntries(data);
      setLastUpdate(new Date());
    } catch { /* ignore network errors */ }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  const getRankChange = (teamId: string, currentRank: number): 'up'|'down'|'same' => {
    const prev = prevRef.current.findIndex((e) => e.team_id === teamId) + 1;
    if (!prev) return 'same';
    if (currentRank < prev) return 'up';
    if (currentRank > prev) return 'down';
    return 'same';
  };

  return (
    <div className="min-h-screen bg-bs-bg py-8 px-6 overflow-hidden">
      <div className="scanline-overlay" />
      <div className="max-w-5xl mx-auto relative z-10">

        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[11px] font-mono text-zinc-600 tracking-[0.4em] uppercase">
            BLACKSITE: SYSTEM32 — BRAINSTORMX '26
          </p>
          <h1 className="text-4xl font-mono font-black text-bs-green tracking-widest uppercase mt-2 glitch-text"
              data-text="DATA WARFARE">
            DATA WARFARE
          </h1>
          <p className="text-bs-cyan font-mono text-sm tracking-widest mt-1">
            LIVE LEADERBOARD
          </p>
          <p className="text-zinc-700 text-[10px] font-mono mt-2">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>

        {/* Leaderboard table */}
        <div className="bs-panel overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-bs-border bg-bs-bg">
                <th className="text-left px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase w-16">Rank</th>
                <th className="text-left px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Team</th>
                <th className="text-center px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Tasks</th>
                <th className="text-center px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Sec A</th>
                <th className="text-center px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Sec B</th>
                <th className="text-center px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Sec C</th>
                <th className="text-center px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Bonus</th>
                <th className="text-right px-4 py-3 text-[11px] font-mono text-zinc-500 tracking-widest uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => {
                const rank = i + 1;
                const change = getRankChange(entry.team_id, rank);
                const isTop3 = rank <= 3;
                const medalColor =
                  rank === 1 ? 'text-yellow-400' :
                  rank === 2 ? 'text-zinc-400' :
                  rank === 3 ? 'text-amber-700' :
                  'text-zinc-600';

                return (
                  <tr
                    key={entry.team_id}
                    className={`
                      border-b border-bs-border transition-colors
                      ${change === 'up' ? 'rank-up' : change === 'down' ? 'rank-down' : ''}
                      ${isTop3 ? 'bg-gradient-to-r from-transparent to-transparent' : ''}
                    `}
                    style={rank === 1 ? { background: 'rgba(255,170,0,0.03)' } : {}}
                  >
                    <td className={`px-4 py-4 font-mono font-bold text-lg ${medalColor}`}>
                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                    </td>
                    <td className="px-4 py-4">
                      <p className={`font-mono text-sm font-bold ${isTop3 ? 'text-white' : 'text-zinc-300'}`}>
                        {entry.team_name || entry.team_id}
                        {change === 'up' && <span className="ml-2 text-bs-green text-xs">▲</span>}
                        {change === 'down' && <span className="ml-2 text-bs-red text-xs">▼</span>}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-sm text-zinc-400">
                      {entry.tasks_completed}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-sm text-bs-cyan">
                      {entry.section_a_pts}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-sm text-bs-amber">
                      {entry.section_b_pts}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-sm text-bs-red">
                      {entry.section_c_pts}
                    </td>
                    <td className="px-4 py-4 text-center font-mono text-sm text-bs-purple">
                      {entry.bonus_pts}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`font-mono font-bold text-lg ${isTop3 ? 'text-bs-amber' : 'text-zinc-200'}`}>
                        {entry.total_points}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-700 font-mono text-sm">
                    Waiting for teams to join...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-1">
          <p className="text-[10px] font-mono text-zinc-700 tracking-widest">
            Department of CSE (Cyber Security) — DSCET, Chennai
          </p>
          <p className="text-[9px] font-mono text-zinc-800">
            BLACKSITE Platform v2.0 — All times and scores are final
          </p>
        </div>
      </div>
    </div>
  );
}
