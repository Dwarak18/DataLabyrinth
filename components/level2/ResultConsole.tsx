// components/level2/ResultConsole.tsx
import React from 'react';
import { QueryResult } from '@/lib/level2/sqlEngine';

interface SubmitFeedback {
  type: 'success' | 'partial' | 'fail' | null;
  message: string;
  pointsEarned?: number;
}

interface ResultConsoleProps {
  result: QueryResult | null;
  feedback: SubmitFeedback;
  isRunning: boolean;
}

export default function ResultConsole({ result, feedback, isRunning }: ResultConsoleProps) {
  const feedbackClass =
    feedback.type === 'success'
      ? 'flash-green text-bs-green border-bs-green'
      : feedback.type === 'partial'
      ? 'amber-pulse text-bs-amber border-bs-amber'
      : feedback.type === 'fail'
      ? 'shake-red text-bs-red border-bs-red'
      : '';

  return (
    <div className="h-full flex flex-col bg-bs-bg border border-bs-border rounded-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-bs-border bg-bs-surface">
        <span className="text-[11px] font-mono text-bs-cyan tracking-widest uppercase">
          ◀ Intel Console
        </span>
        {result && !result.error && (
          <span className="text-[10px] font-mono text-zinc-500">
            {result.rows.length} row{result.rows.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Submit feedback banner */}
      {feedback.type && (
        <div
          className={`px-3 py-2 border-b text-xs font-mono tracking-wide ${feedbackClass} border-current`}
        >
          {feedback.message}
          {feedback.pointsEarned !== undefined && feedback.pointsEarned > 0 && (
            <span className="ml-2 font-bold">+{feedback.pointsEarned} PTS</span>
          )}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto p-2">
        {isRunning && (
          <div className="flex items-center gap-2 text-bs-cyan text-xs font-mono p-4">
            <span className="animate-pulse">▶▶▶</span>
            <span>EXECUTING QUERY...</span>
          </div>
        )}

        {!isRunning && !result && (
          <div className="text-zinc-700 text-xs font-mono p-4 text-center">
            <p className="text-2xl mb-2">⌨</p>
            <p>No query executed yet.</p>
            <p className="text-zinc-800 mt-1">Press ▶ RUN QUERY or Ctrl+Enter</p>
          </div>
        )}

        {!isRunning && result?.error && (
          <div className="p-3">
            <div className="text-bs-red text-xs font-mono bg-red-950 border border-bs-red rounded-sm p-3">
              <span className="text-bs-red font-bold">ERROR: </span>
              {result.error}
            </div>
          </div>
        )}

        {!isRunning && result && !result.error && result.rows.length === 0 && (
          <div className="text-zinc-500 text-xs font-mono p-4 text-center">
            Query executed. 0 rows returned.
          </div>
        )}

        {!isRunning && result && !result.error && result.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="terminal-table">
              <thead>
                <tr>
                  {result.columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rIdx) => (
                  <tr key={rIdx}>
                    {row.map((cell, cIdx) => (
                      <td key={cIdx}>
                        {cell === null ? (
                          <span className="null-val">[NULL]</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
