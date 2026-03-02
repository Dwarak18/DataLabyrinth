'use client';
// components/level2/GameShell.tsx
// Top HUD bar with timer, score, team info
import React, { useState, useEffect } from 'react';

interface GameShellProps {
  teamId: string;
  teamName: string;
  totalScore: number;
  endsAt: string;            // ISO timestamp
  children: React.ReactNode;
  onExpire?: () => void;
}

export default function GameShell({
  teamId,
  teamName,
  totalScore,
  endsAt,
  children,
  onExpire,
}: GameShellProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const end = new Date(endsAt).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((end - now) / 1000));
      setRemaining(diff);
      if (diff === 0 && !expired) {
        setExpired(true);
        onExpire?.();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt, expired, onExpire]);

  const hrs = Math.floor(remaining / 3600);
  const mins = Math.floor((remaining % 3600) / 60);
  const secs = remaining % 60;
  const formatted = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  const timerClass =
    expired
      ? 'text-bs-red timer-danger'
      : remaining < 600
      ? 'text-bs-red timer-danger'
      : remaining < 1800
      ? 'text-bs-amber timer-warn'
      : 'text-bs-green';

  return (
    <div className="flex flex-col h-screen bg-bs-bg">
      {/* Top HUD bar */}
      <header className="flex items-center justify-between px-4 py-2 bg-bs-surface border-b border-bs-border shrink-0">
        {/* Left */}
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">
              BLACKSITE: SYSTEM32
            </p>
            <p className="text-xs font-mono text-bs-cyan tracking-widest uppercase leading-none">
              LEVEL 02 — DATA WARFARE
            </p>
          </div>
        </div>

        {/* Center — Team info */}
        <div className="flex flex-col items-center">
          <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">
            OPERATIVE
          </p>
          <p className="text-xs font-mono text-white tracking-widest">
            {teamName || teamId}
          </p>
        </div>

        {/* Right — Timer + Score */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">
              {expired ? 'MISSION LOCKED' : 'TIME REMAINING'}
            </p>
            <p className={`text-sm font-mono tracking-widest font-bold ${timerClass}`}>
              {expired ? '00:00:00' : formatted}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase">
              SCORE
            </p>
            <p className="text-sm font-mono text-bs-amber font-bold">
              {totalScore} <span className="text-[10px] text-zinc-600">pts</span>
            </p>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
