'use client';
// app/level2/debrief/page.tsx
export const dynamic = 'force-dynamic';
import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

interface ScoreRow {
  total_points: number;
  tasks_completed: number;
  section_a_pts: number;
  section_b_pts: number;
  section_c_pts: number;
  bonus_pts: number;
  ai_penalty: number;
}

interface SubmissionRow {
  task_id: string;
  sql_query: string;
  is_correct: boolean;
  points_earned: number;
  hint_used: boolean;
  attempt_count: number;
}

interface AILogRow {
  task_id: string;
  tool_used: string;
  prompt_used: string;
}

function DebriefContent() {
  const searchParams = useSearchParams();
  const teamId = searchParams.get('team') || 'UNKNOWN';
  const [score, setScore] = useState<ScoreRow | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [aiLogs, setAILogs] = useState<AILogRow[]>([]);
  const [rank, setRank] = useState<number>(0);
  const [totalTeams, setTotalTeams] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/level2/debrief/${encodeURIComponent(teamId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (d.score) setScore(d.score);
        if (d.submissions) setSubmissions(d.submissions);
        if (d.ai_logs) setAILogs(d.ai_logs);
        setRank(d.rank || 0);
        setTotalTeams(d.total_teams || 0);
      } catch (e) {
        console.error('Debrief load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId, API_URL]);

  const handleExport = async () => {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    // SQL queries
    const queriesText = submissions
      .map((s) => `-- Task: ${s.task_id} | Points: ${s.points_earned} | Correct: ${s.is_correct}\n${s.sql_query}\n`)
      .join('\n---\n\n');
    zip.file('sql_queries.sql', queriesText);

    // AI logs  
    const aiText = JSON.stringify(aiLogs, null, 2);
    zip.file('ai_logs.json', aiText);

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${teamId}_debrief.zip`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bs-bg">
        <p className="text-bs-cyan font-mono text-sm animate-pulse">LOADING DEBRIEF...</p>
      </div>
    );
  }

  const s = score || { total_points: 0, tasks_completed: 0, section_a_pts: 0, section_b_pts: 0, section_c_pts: 0, bonus_pts: 0, ai_penalty: 0 };
  const noAIDeclared = aiLogs.filter((l) => l.tool_used === 'NONE').length;
  const aiUsed = aiLogs.filter((l) => l.tool_used !== 'NONE').length;
  const hasBonus = submissions.some((s) => s.task_id.startsWith('BONUS'));

  return (
    <div className="min-h-screen bg-bs-bg py-12 px-6">
      <div className="scanline-overlay" />
      <div className="max-w-2xl mx-auto space-y-8 relative z-10">

        {/* Header */}
        <div className="text-center space-y-2">
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
            BLACKSITE: SYSTEM32 — LEVEL 02
          </p>
          <h1 className="text-2xl font-mono text-bs-green tracking-widest uppercase glitch-text"
              data-text="MISSION COMPLETE">
            MISSION COMPLETE
          </h1>
          <p className="text-bs-cyan font-mono text-sm tracking-widest">
            OPERATIVE: {teamId}
          </p>
        </div>

        {/* Score breakdown */}
        <div className="bs-panel p-6 space-y-4">
          <h2 className="text-[11px] font-mono text-zinc-500 tracking-widest uppercase border-b border-bs-border pb-2">
            Intelligence Score Report
          </h2>

          <table className="w-full text-sm font-mono">
            <tbody>
              {[
                { label: 'Section A — Basic Recon',         pts: s.section_a_pts,  max: 44 },
                { label: 'Section B — Academic Intel',      pts: s.section_b_pts,  max: 50 },
                { label: 'Section C — Advanced Extraction', pts: s.section_c_pts,  max: 38 },
                { label: '⚡ Bonus Protocol',               pts: s.bonus_pts,      max: 15 },
              ].map((row) => (
                <tr key={row.label} className="border-b border-bs-border">
                  <td className="py-2 text-zinc-400">{row.label}</td>
                  <td className="py-2 text-right">
                    <span className="text-bs-cyan">{row.pts}</span>
                    <span className="text-zinc-700"> / {row.max}</span>
                  </td>
                </tr>
              ))}
              {s.ai_penalty > 0 && (
                <tr className="border-b border-bs-border">
                  <td className="py-2 text-bs-red">AI Penalty</td>
                  <td className="py-2 text-right text-bs-red">−{s.ai_penalty}</td>
                </tr>
              )}
              <tr>
                <td className="py-3 text-bs-amber font-bold tracking-widest uppercase">TOTAL</td>
                <td className="py-3 text-right text-bs-amber font-bold text-lg">{s.total_points} pts</td>
              </tr>
            </tbody>
          </table>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="bs-panel p-3 text-center">
              <p className="text-bs-cyan text-xl font-mono font-bold">{s.tasks_completed}</p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Tasks Completed</p>
            </div>
            <div className="bs-panel p-3 text-center">
              <p className="text-bs-amber text-xl font-mono font-bold">
                #{rank} <span className="text-sm text-zinc-600">of {totalTeams}</span>
              </p>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Leaderboard Rank</p>
            </div>
          </div>
        </div>

        {/* AI log summary */}
        <div className="bs-panel p-4 space-y-3">
          <h2 className="text-[11px] font-mono text-zinc-500 tracking-widest uppercase">
            AI Declaration Summary
          </h2>
          <div className="flex gap-6 text-sm font-mono">
            <div>
              <p className="text-bs-purple">{aiUsed}</p>
              <p className="text-[10px] text-zinc-600">AI Used</p>
            </div>
            <div>
              <p className="text-bs-green">{noAIDeclared}</p>
              <p className="text-[10px] text-zinc-600">No AI Declared</p>
            </div>
            <div>
              <p className="text-bs-cyan">{aiLogs.length}</p>
              <p className="text-[10px] text-zinc-600">Total Logs</p>
            </div>
          </div>
        </div>

        {/* Submission list */}
        <div className="bs-panel p-4 space-y-3">
          <h2 className="text-[11px] font-mono text-zinc-500 tracking-widest uppercase">
            Submission History
          </h2>
          <div className="space-y-2">
            {submissions.length === 0 && (
              <p className="text-zinc-700 text-xs font-mono text-center py-4">No submissions.</p>
            )}
            {submissions.map((sub, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-mono border-b border-bs-border py-1.5">
                <div className="flex items-center gap-2">
                  <span className={sub.is_correct ? 'text-bs-green' : 'text-bs-red'}>
                    {sub.is_correct ? '✅' : '❌'}
                  </span>
                  <span className="text-zinc-400">{sub.task_id}</span>
                  {sub.hint_used && <span className="text-[9px] text-bs-amber">HINT</span>}
                </div>
                <span className="text-bs-cyan">{sub.points_earned} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus badge */}
        {hasBonus && (
          <div className="bs-panel border-bs-purple p-4 text-center">
            <p className="text-bs-purple font-mono text-sm tracking-widest uppercase">
              ⚡ AWAITING JUDGE EVALUATION
            </p>
            <p className="text-zinc-500 text-[10px] font-mono mt-1">
              Bonus tasks submitted — pending manual review.
            </p>
          </div>
        )}

        {/* Export */}
        <button
          onClick={handleExport}
          className="bs-btn bs-btn-cyan w-full py-3 text-sm tracking-widest"
        >
          📥 EXPORT QUERIES + AI LOGS (.ZIP)
        </button>
      </div>
    </div>
  );
}

export default function DebriefPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bs-bg flex items-center justify-center text-bs-green font-mono">LOADING DEBRIEF...</div>}>
      <DebriefContent />
    </Suspense>
  );
}
