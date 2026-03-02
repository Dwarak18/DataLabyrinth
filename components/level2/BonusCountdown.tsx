'use client';
// components/level2/BonusCountdown.tsx
import React, { useState, useEffect } from 'react';

interface BonusCountdownProps {
  bonusEndsAt: string | null;  // ISO timestamp — set when admin releases bonus
  bonusReleased: boolean;
  onBonusExpire?: () => void;
}

export default function BonusCountdown({
  bonusEndsAt,
  bonusReleased,
  onBonusExpire,
}: BonusCountdownProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const [showFlash, setShowFlash] = useState(bonusReleased);

  useEffect(() => {
    if (bonusReleased) setShowFlash(true);
  }, [bonusReleased]);

  useEffect(() => {
    if (!bonusEndsAt) return;
    const end = new Date(bonusEndsAt).getTime();

    const tick = () => {
      const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0) onBonusExpire?.();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bonusEndsAt, onBonusExpire]);

  if (!bonusReleased) return null;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1.5 bg-purple-950 border border-bs-purple rounded-sm
        ${showFlash ? 'bonus-flash' : ''}
      `}
    >
      <span className="text-bs-purple text-[10px] font-mono tracking-widest uppercase">
        ⚡ BONUS PROTOCOL
      </span>
      {bonusEndsAt && remaining > 0 ? (
        <span className="text-bs-amber text-xs font-mono font-bold">{formatted}</span>
      ) : (
        <span className="text-bs-red text-[10px] font-mono">EXPIRED</span>
      )}
    </div>
  );
}
