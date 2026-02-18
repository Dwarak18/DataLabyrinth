"use client";

import { useEffect, useMemo, useState } from 'react';
import { fetchLeaderboard } from '../lib/api';

type Entry = {
  name: string;
  score: number;
  current_level: number;
};

export default function Leaderboard() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchLeaderboard();
        if (mounted) {
          setRows(data);
          setLastUpdate(Date.now());
        }
      } catch (err) {
        console.error('leaderboard fetch failed', err);
      }
    };
    load();
    const interval = setInterval(load, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const displayRows = useMemo(
    () =>
      rows.map((row, idx) => ({
        ...row,
        rank: idx + 1,
      })),
    [rows]
  );

  return (
    <div>
      <div className="text-sm text-gray-500">Last updated: {lastUpdate ? `${Math.floor((Date.now() - lastUpdate) / 1000)}s ago` : '—'}</div>
      <div className="mt-2 space-y-2">
        {displayRows.map((row) => (
          <div
            key={row.name}
            className="transition-transform duration-500 ease-out bg-slate-900 text-white p-3 rounded shadow"
            style={{ transform: `translateY(0px)` }}
          >
            <div className="flex justify-between">
              <span>#{row.rank} — {row.name}</span>
              <span>Score: {row.score}</span>
            </div>
            <div className="text-xs">Chamber: {row.current_level}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
