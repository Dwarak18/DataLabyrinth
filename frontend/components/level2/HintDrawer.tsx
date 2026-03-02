'use client';
// components/level2/HintDrawer.tsx
import React, { useState } from 'react';
import { Task } from '@/lib/level2/taskConfig';

interface HintDrawerProps {
  task: Task;
  hintsUsed: number;
  onConfirm: (hintIndex: number) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function HintDrawer({ task, hintsUsed, onConfirm, onClose, isOpen }: HintDrawerProps) {
  const [revealed, setRevealed] = useState<number[]>([]);

  if (!isOpen) return null;

  const isNoHintsSection = task.section === 'C' || task.section === 'BONUS';

  const handleReveal = (idx: number) => {
    if (revealed.includes(idx)) return;
    setRevealed((prev) => [...prev, idx]);
    onConfirm(idx);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-sm bg-bs-surface border-l border-bs-border z-50 slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-bs-border">
          <span className="text-xs font-mono text-bs-amber tracking-widest uppercase">
            💡 Resource Vault — {task.id}
          </span>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xs font-mono"
          >
            [CLOSE]
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isNoHintsSection ? (
            <div className="border border-bs-red bg-red-950 rounded-sm p-4 text-center">
              <p className="text-bs-red text-xs font-mono tracking-wide">
                ⛔ NO RESOURCES AVAILABLE FOR THIS SECTION.
              </p>
              <p className="text-zinc-500 text-[10px] font-mono mt-2">
                Section {task.section} requires independent work. No hints provided.
              </p>
            </div>
          ) : (
            <>
              {/* Cost warning */}
              <div className="border border-bs-amber bg-amber-950/30 rounded-sm p-3">
                <p className="text-bs-amber text-xs font-mono tracking-wide">
                  ⚠️ BURNING A RESOURCE COSTS {task.hintCost} POINTS PER HINT.
                </p>
                <p className="text-zinc-400 text-[10px] font-mono mt-1">
                  Deduction happens immediately upon reveal.
                </p>
              </div>

              {/* Hints */}
              {task.hints.map((hint, idx) => {
                const isRevealed = revealed.includes(idx) || hintsUsed > idx;
                const hintLabel = `RESOURCE ${idx + 1}`;

                return (
                  <div key={idx} className="border border-bs-border rounded-sm overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-bs-bg border-b border-bs-border">
                      <span className="text-[10px] font-mono text-zinc-400 tracking-wider">
                        {hintLabel}
                      </span>
                      {isRevealed ? (
                        <span className="text-[10px] font-mono text-bs-amber">
                          −{task.hintCost} pts
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-zinc-600">
                          COST: {task.hintCost} pts
                        </span>
                      )}
                    </div>

                    <div className="p-3">
                      {isRevealed ? (
                        <p className="text-xs font-mono text-zinc-300 leading-relaxed">
                          {hint}
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {/* Blurred hint */}
                          <p className="text-xs font-mono text-zinc-300 leading-relaxed blur-sm select-none">
                            {hint}
                          </p>
                          <button
                            onClick={() => handleReveal(idx)}
                            className="bs-btn bs-btn-amber w-full text-center"
                          >
                            ⚡ CONFIRM — BURN {task.hintCost} POINTS
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {task.hints.length === 0 && (
                <p className="text-zinc-600 text-xs font-mono text-center py-4">
                  No hints available for this task.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
