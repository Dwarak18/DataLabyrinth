// components/level2/StatusBadge.tsx
import React from 'react';

export type BadgeStatus = 'LOCKED' | 'ACTIVE' | 'INTEL_ACQUIRED' | 'FAILED' | 'PARTIAL';

interface StatusBadgeProps {
  status: BadgeStatus;
  attemptCount?: number;
  className?: string;
}

const CONFIG: Record<
  BadgeStatus,
  { label: string; color: string; icon: string; pulse?: boolean }
> = {
  LOCKED:         { label: 'LOCKED',         color: 'text-zinc-600 border-zinc-700 bg-zinc-900',          icon: '🔒' },
  ACTIVE:         { label: 'ACTIVE',         color: 'text-bs-cyan  border-bs-cyan  bg-transparent',       icon: '🔓', pulse: true },
  INTEL_ACQUIRED: { label: 'INTEL ACQUIRED', color: 'text-bs-green border-bs-green bg-green-950',         icon: '✅' },
  FAILED:         { label: 'FAILED',         color: 'text-bs-red   border-bs-red   bg-red-950',           icon: '❌' },
  PARTIAL:        { label: 'PARTIAL HIT',    color: 'text-bs-amber border-bs-amber bg-amber-950',         icon: '⚠️' },
};

export default function StatusBadge({ status, attemptCount, className = '' }: StatusBadgeProps) {
  const cfg = CONFIG[status];
  return (
    <span
      className={`
        inline-flex items-center gap-1 text-[10px] font-mono tracking-widest uppercase
        px-2 py-0.5 border rounded-sm
        ${cfg.color}
        ${cfg.pulse ? 'pulse-cyan' : ''}
        ${className}
      `}
    >
      {cfg.icon} {cfg.label}
      {status === 'FAILED' && attemptCount !== undefined && (
        <span className="opacity-70">×{attemptCount}</span>
      )}
    </span>
  );
}
