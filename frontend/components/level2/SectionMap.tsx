'use client';
// components/level2/SectionMap.tsx
import React from 'react';
import TASKS, { Task, TaskSection } from '@/lib/level2/taskConfig';
import { SectionState } from '@/lib/level2/sectionGate';
import StatusBadge, { BadgeStatus } from './StatusBadge';

export type TaskStatusMap = Record<string, BadgeStatus>;

interface SectionMapProps {
  sectionState: SectionState;
  taskStatuses: TaskStatusMap;
  activeTaskId: string;
  submittedTaskIds: Set<string>;
  onSelectTask: (taskId: string) => void;
}

const SECTION_ORDER: { key: TaskSection; label: string; color: string; locked_msg: string }[] = [
  { key: 'A',     label: 'SECTION A — BASIC RECON',          color: 'text-bs-cyan',   locked_msg: '' },
  { key: 'B',     label: 'SECTION B — ACADEMIC INTELLIGENCE', color: 'text-bs-amber',  locked_msg: 'Complete A1 + A2 + A3 to unlock' },
  { key: 'C',     label: 'SECTION C — ADVANCED EXTRACTION',  color: 'text-bs-red',    locked_msg: 'Complete B1 + B2 + B3 to unlock' },
  { key: 'BONUS', label: '⚡ BONUS PROTOCOL',                 color: 'text-bs-purple', locked_msg: 'Admin triggered — stay ready' },
];

const SECTION_PTS: Record<TaskSection, number> = {
  A: 44, B: 50, C: 38, BONUS: 15,
};

export default function SectionMap({
  sectionState,
  taskStatuses,
  activeTaskId,
  submittedTaskIds,
  onSelectTask,
}: SectionMapProps) {
  return (
    <div className="h-full overflow-y-auto space-y-3 pr-1">
      <div className="text-[10px] font-mono text-bs-green tracking-widest uppercase px-1 pb-1 border-b border-bs-border opacity-70">
        Mission Map
      </div>

      {SECTION_ORDER.map(({ key, label, color, locked_msg }) => {
        const isLocked = sectionState[key] === 'locked';
        const sectionTasks = TASKS.filter((t) => t.section === key);

        return (
          <div key={key} className="space-y-1">
            {/* Section header */}
            <div
              className={`
                flex items-center justify-between px-2 py-1.5
                border rounded-sm text-[10px] font-mono tracking-wider uppercase
                ${isLocked
                  ? 'border-zinc-600 text-zinc-400 bg-zinc-900/30'
                  : `border-current ${color} bg-transparent`
                }
              `}
            >
              <span>{isLocked ? '🔒 ' : '▣ '}{label}</span>
              <span className="opacity-70">{SECTION_PTS[key]}pts</span>
            </div>

            {isLocked ? (
              <p className="text-[9px] font-mono text-zinc-400 px-2 py-1">
                {locked_msg}
              </p>
            ) : (
              <div className="space-y-0.5 pl-2">
                {sectionTasks.map((task) => {
                  const status = taskStatuses[task.id] || 'LOCKED';
                  const isActive = task.id === activeTaskId;
                  const isPlayable =
                    status !== 'LOCKED' ||
                    (!task.unlockAfter || submittedTaskIds.has(task.unlockAfter));

                  return (
                    <button
                      key={task.id}
                      onClick={() => isPlayable && onSelectTask(task.id)}
                      disabled={!isPlayable}
                      title={
                        !isPlayable && task.unlockAfter
                          ? `Complete ${task.unlockAfter} to unlock`
                          : task.title
                      }
                      className={`
                        task-node w-full text-left
                        ${status === 'ACTIVE'         ? 'active' : ''}
                        ${status === 'INTEL_ACQUIRED' ? 'done'   : ''}
                        ${status === 'FAILED'         ? 'failed' : ''}
                        ${status === 'PARTIAL'        ? 'failed' : ''}
                        ${status === 'LOCKED'         ? 'locked' : ''}
                        ${isActive ? 'ring-1 ring-offset-1 ring-offset-bs-bg ring-current' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] shrink-0">
                            {status === 'INTEL_ACQUIRED' ? '✅' :
                             status === 'FAILED'         ? '❌' :
                             status === 'PARTIAL'        ? '⚠️' :
                             status === 'ACTIVE'         ? '🔓' :
                                                           '🔒'}
                          </span>
                          <span className="truncate text-[10px]">
                            {status === 'LOCKED' ? '████████' : task.id + ' — ' + task.title}
                          </span>
                        </div>
                        <span className="text-[9px] shrink-0 opacity-60">
                          {task.points}p
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
