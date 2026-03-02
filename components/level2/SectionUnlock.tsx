'use client';
// components/level2/SectionUnlock.tsx
// Full-screen cinematic unlock animation
import React, { useEffect, useState } from 'react';

interface SectionUnlockProps {
  section: 'B' | 'C' | 'BONUS';
  onDone: () => void;
}

const SECTION_CONFIG = {
  B: {
    title: 'SECTION B UNLOCKED',
    subtitle: 'ACADEMIC INTELLIGENCE REPORT',
    color: 'text-bs-amber',
    border: 'border-bs-amber',
    bg: 'bg-amber-950/30',
  },
  C: {
    title: 'SECTION C UNLOCKED',
    subtitle: 'ADVANCED EXTRACTION PROTOCOL',
    color: 'text-bs-red',
    border: 'border-bs-red',
    bg: 'bg-red-950/30',
  },
  BONUS: {
    title: '⚡ BONUS PROTOCOL ACTIVATED',
    subtitle: 'QUERY OPTIMIZATION SPRINT — 15 MINUTES',
    color: 'text-bs-purple',
    border: 'border-bs-purple',
    bg: 'bg-purple-950/30',
  },
};

export default function SectionUnlock({ section, onDone }: SectionUnlockProps) {
  const [phase, setPhase] = useState<'in' | 'show' | 'out'>('in');
  const cfg = SECTION_CONFIG[section];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('show'), 200);
    const t2 = setTimeout(() => setPhase('out'), 2800);
    const t3 = setTimeout(onDone, 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onDone]);

  return (
    <div
      className={`
        fixed inset-0 z-[200] bg-bs-bg flex flex-col items-center justify-center
        transition-opacity duration-300
        ${phase === 'in' ? 'opacity-0' : phase === 'show' ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={onDone}
    >
      {/* Scanline */}
      <div className="scanline-overlay" />

      {/* Sweep line */}
      <div
        className={`absolute inset-x-0 h-1 ${cfg.bg} sweep-line`}
        style={{ top: '50%' }}
      />

      <div className={`text-center space-y-4 px-8 ${cfg.color}`}>
        <div
          className={`
            inline-block border-2 ${cfg.border} px-8 py-6 ${cfg.bg} rounded-sm
            ${phase === 'show' ? 'fade-in' : ''}
          `}
        >
          <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3">
            NEW MISSION ORDERS RECEIVED
          </p>
          <h2 className={`text-2xl font-mono font-bold tracking-widest uppercase glitch-text ${cfg.color}`}
              data-text={cfg.title}>
            {cfg.title}
          </h2>
          <p className="text-sm font-mono tracking-wider mt-2 opacity-80">
            {cfg.subtitle}
          </p>
          <p className="text-[10px] font-mono text-zinc-600 mt-6">
            Click anywhere to continue
          </p>
        </div>
      </div>
    </div>
  );
}
