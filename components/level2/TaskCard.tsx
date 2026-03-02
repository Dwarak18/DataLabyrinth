// components/level2/TaskCard.tsx
import React from 'react';
import { Task } from '@/lib/level2/taskConfig';
import StatusBadge, { BadgeStatus } from './StatusBadge';

interface TaskCardProps {
  task: Task;
  status: BadgeStatus;
  attemptCount: number;
}

const sectionColors: Record<string, string> = {
  A:     'text-bs-cyan  border-bs-cyan',
  B:     'text-bs-amber border-bs-amber',
  C:     'text-bs-red   border-bs-red',
  BONUS: 'text-bs-purple border-bs-purple',
};

export default function TaskCard({ task, status, attemptCount }: TaskCardProps) {
  const secColor = sectionColors[task.section] || 'text-white border-white';

  return (
    <div className="bs-panel p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className={`section-badge ${secColor}`}>
            SECTION {task.section}
          </span>
          <span className="text-xs font-mono text-zinc-500">ID: {task.id}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-bs-amber font-mono">+{task.points} PTS</span>
          {task.hintCost > 0 && (
            <span className="text-[10px] text-zinc-500 font-mono">
              HINT COST: -{task.hintCost}
            </span>
          )}
          <StatusBadge status={status} attemptCount={attemptCount} />
        </div>
      </div>

      {/* Mission flavour */}
      <p className="text-[11px] font-mono text-bs-green opacity-80 tracking-wider">
        {task.missionFlavour}
      </p>

      {/* Task title */}
      <h2 className="text-bs-cyan font-mono text-sm tracking-widest uppercase">
        ▶ {task.title}
      </h2>

      {/* Description */}
      <div className="border-l-2 border-bs-border pl-3">
        <p className="font-sans text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
          {task.description}
        </p>
      </div>

      {/* Attempt counter */}
      {status !== 'LOCKED' && (
        <p className="text-[10px] font-mono text-zinc-600">
          ATTEMPT {attemptCount} / ∞
        </p>
      )}
    </div>
  );
}
