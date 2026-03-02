'use client';
// app/level2/arena/page.tsx
// Main game screen — 3-panel layout
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamicImport from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';

import GameShell from '@/components/level2/GameShell';
import TaskCard from '@/components/level2/TaskCard';
import ResultConsole from '@/components/level2/ResultConsole';
import SectionMap, { TaskStatusMap } from '@/components/level2/SectionMap';
import HintDrawer from '@/components/level2/HintDrawer';
import AILogModal from '@/components/level2/AILogModal';
import LiveLeaderboard from '@/components/level2/LiveLeaderboard';
import BonusCountdown from '@/components/level2/BonusCountdown';
import MissionBriefing from '@/components/level2/MissionBriefing';
import SectionUnlock from '@/components/level2/SectionUnlock';
import PowerCardHUD from '@/components/level2/PowerCardHUD';

import { runQuery, initDB, QueryResult } from '@/lib/level2/sqlEngine';
import TASKS, { getTaskById, TaskSection } from '@/lib/level2/taskConfig';
import { validate } from '@/lib/level2/taskValidator';
import { calculateScore } from '@/lib/level2/scoreEngine';
import { computeSectionState, isTaskPlayable } from '@/lib/level2/sectionGate';


// Load SqlTerminal without SSR (sql.js requirement)
const SqlTerminal = dynamicImport(
  () => import('@/components/level2/SqlTerminal'),
  { ssr: false, loading: () => (
    <div className="flex items-center justify-center h-full text-bs-cyan text-xs font-mono animate-pulse">
      LOADING SQL ENGINE...
    </div>
  )}
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface SubmitFeedback {
  type: 'success' | 'partial' | 'fail' | null;
  message: string;
  pointsEarned?: number;
}

interface SubmissionState {
  attempts: number;
  hintsUsed: number;
  aiLogged: boolean;
  status: 'idle' | 'correct' | 'partial' | 'failed';
}

type SubmissionsMap = Record<string, SubmissionState>;

function ArenaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId  = searchParams.get('team') || 'UNKNOWN';
  const endsAt  = searchParams.get('ends')  || new Date(Date.now() + 9000000).toISOString();
  const bonusAt = searchParams.get('bonus') || null;

  // ── State ──────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState('A1');
  const [queryMap, setQueryMap] = useState<Record<string, string>>({});
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [feedback, setFeedback] = useState<SubmitFeedback>({ type: null, message: '' });
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionsMap>({});
  const [totalScore, setTotalScore] = useState(0);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [bonusReleased, setBonusReleased] = useState(!!bonusAt);
  const [bonusEndsAt, setBonusEndsAt] = useState<string | null>(bonusAt);
  const [bonusExplanations, setBonusExplanations] = useState<Record<string, string>>({});

  // UI overlays
  const [showBriefing, setShowBriefing] = useState(true);
  const [unlockAnim, setUnlockAnim] = useState<'B' | 'C' | 'BONUS' | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [aiLogOpen, setAILogOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'map' | 'terminal' | 'console'>('terminal');

  // Check if briefing was already accepted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const key = `briefing_${teamId}`;
      if (localStorage.getItem(key) === 'done') setShowBriefing(false);
    }
  }, [teamId]);

  // Init sql.js
  useEffect(() => {
    initDB().then(() => setDbReady(true)).catch(console.error);
  }, []);

  // Load persisted state from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(`arena_state_${teamId}`);
    if (saved) {
      try {
        const { submissions: s, totalScore: ts, queries: q } = JSON.parse(saved);
        if (s) setSubmissions(s);
        if (ts) setTotalScore(ts);
        if (q) setQueryMap(q);
      } catch {}
    }
  }, [teamId]);

  // Persist state changes
  const persist = useCallback((
    newSubs: SubmissionsMap,
    newScore: number,
    newQueries: Record<string, string>
  ) => {
    localStorage.setItem(`arena_state_${teamId}`, JSON.stringify({
      submissions: newSubs, totalScore: newScore, queries: newQueries,
    }));
  }, [teamId]);

  // Poll bonus release status every 8 seconds
  useEffect(() => {
    const checkBonus = async () => {
      try {
        const r = await fetch(`${API_URL}/api/level2/bonus/status`);
        if (!r.ok) return;
        const d = await r.json();
        if (d.released_at && !bonusReleased) {
          setBonusReleased(true);
          setBonusEndsAt(d.ends_at || new Date(Date.now() + 15 * 60 * 1000).toISOString());
          setUnlockAnim('BONUS');
          document.body.classList.add('bonus-flash');
          setTimeout(() => document.body.classList.remove('bonus-flash'), 1100);
        }
      } catch { /* network error — ignore */ }
    };
    checkBonus();
    const id = setInterval(checkBonus, 8_000);
    return () => clearInterval(id);
  }, [bonusReleased]);

  // Derive section/task state
  const submittedTaskIds = new Set(
    Object.entries(submissions)
      .filter(([, s]) => s.status !== 'idle')
      .map(([id]) => id)
  );

  const sectionState = computeSectionState(submittedTaskIds, bonusReleased);

  const taskStatuses: TaskStatusMap = {};
  TASKS.forEach((task) => {
    const sub = submissions[task.id];
    const playable = isTaskPlayable(
      task.section as TaskSection,
      sectionState,
      task.unlockAfter,
      submittedTaskIds
    );

    if (!playable) {
      taskStatuses[task.id] = 'LOCKED';
    } else if (!sub || sub.status === 'idle') {
      taskStatuses[task.id] = 'ACTIVE';
    } else if (sub.status === 'correct') {
      taskStatuses[task.id] = 'INTEL_ACQUIRED';
    } else if (sub.status === 'partial') {
      taskStatuses[task.id] = 'PARTIAL';
    } else {
      taskStatuses[task.id] = 'FAILED';
    }
  });

  // Watch for section unlocks to show animation
  const prevSectionRef = useRef(sectionState);
  useEffect(() => {
    const prev = prevSectionRef.current;
    const curr = sectionState;
    if (prev.B === 'locked' && curr.B === 'unlocked') setUnlockAnim('B');
    else if (prev.C === 'locked' && curr.C === 'unlocked') setUnlockAnim('C');
    prevSectionRef.current = curr;
  }, [sectionState]);

  const activeTask = getTaskById(activeTaskId);
  const activeSub = submissions[activeTaskId];

  // ── Handlers ───────────────────────────────────────────

  const handleRun = useCallback(() => {
    if (!dbReady || isRunning) return;
    setIsRunning(true);
    setFeedback({ type: null, message: '' });
    // Slight delay for UX
    setTimeout(() => {
      const q = queryMap[activeTaskId] || '';
      const result = runQuery(q);
      setQueryResult(result);
      setIsRunning(false);
    }, 120);
  }, [dbReady, isRunning, activeTaskId, queryMap]);

  const handleSubmit = useCallback(async () => {
    if (!dbReady || isSubmitting || sessionExpired || !activeTask) return;
    if (!queryResult || queryResult.error) {
      setFeedback({ type: 'fail', message: '❌ Run the query first.' });
      return;
    }

    // Require AI log or checkbox
    const sub = submissions[activeTaskId];
    if (!sub?.aiLogged) {
      setAILogOpen(true);
      return;
    }

    setIsSubmitting(true);
    const hintsUsed = sub?.hintsUsed || 0;
    const validationResult = validate(activeTaskId, queryResult.rows);
    const { pointsEarned, breakdownMsg } = calculateScore(activeTaskId, validationResult.match, hintsUsed);

    const newStatus =
      validationResult.match === 'full'    ? 'correct' :
      validationResult.match === 'partial' ? 'partial' : 'failed';

    const newAttempts = (sub?.attempts || 0) + 1;

    const newSub: SubmissionState = {
      attempts: newAttempts,
      hintsUsed,
      aiLogged: sub?.aiLogged || false,
      status: newStatus,
    };

    const newSubs = { ...submissions, [activeTaskId]: newSub };
    const newScore = totalScore + pointsEarned;
    const newQueries = queryMap;

    setSubmissions(newSubs);
    setTotalScore(newScore);
    persist(newSubs, newScore, newQueries);

    // Feedback animation
    const feedbackType =
      validationResult.match === 'full'    ? 'success' :
      validationResult.match === 'partial' ? 'partial' : 'fail';

    setFeedback({ type: feedbackType, message: validationResult.message, pointsEarned });

    // POST to backend
    try {
      await fetch(`${API_URL}/api/level2/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          task_id: activeTaskId,
          sql_query: queryMap[activeTaskId] || '',
          result_json: queryResult,
          is_correct: validationResult.match === 'full',
          points_earned: pointsEarned,
          hint_used: hintsUsed > 0,
          attempt_count: newAttempts,
        }),
      });
    } catch (e) {
      console.warn('Backend submit failed:', e);
    }

    setIsSubmitting(false);
  }, [
    dbReady, isSubmitting, sessionExpired, activeTask,
    queryResult, submissions, activeTaskId,
    totalScore, queryMap, teamId, persist,
  ]);

  const handleHintConfirm = useCallback(async (hintIndex: number) => {
    if (!activeTask) return;
    const prevSub = submissions[activeTaskId] || { attempts: 0, hintsUsed: 0, aiLogged: false, status: 'idle' as const };
    const newSubs = {
      ...submissions,
      [activeTaskId]: { ...prevSub, hintsUsed: prevSub.hintsUsed + 1 },
    };
    setSubmissions(newSubs);
    persist(newSubs, totalScore, queryMap);
    // Log hint
    try {
      await fetch(`${API_URL}/api/level2/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, task_id: activeTaskId }),
      });
    } catch {}
  }, [activeTask, submissions, activeTaskId, totalScore, queryMap, teamId, persist]);

  const handleAILogSubmit = useCallback(async (log: any) => {
    const prevSub = submissions[activeTaskId] || { attempts: 0, hintsUsed: 0, aiLogged: false, status: 'idle' as const };
    const newSubs = {
      ...submissions,
      [activeTaskId]: { ...prevSub, aiLogged: true },
    };
    setSubmissions(newSubs);
    persist(newSubs, totalScore, queryMap);
    try {
      const r = await fetch(`${API_URL}/api/level2/ailog`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId, task_id: activeTaskId, ...log }),
      });
      if (!r.ok) console.error('ailog save failed:', await r.text());
    } catch (e) { console.error('ailog network error:', e); }
  }, [submissions, activeTaskId, totalScore, queryMap, teamId, persist]);

  const handleSelectTask = (taskId: string) => {
    setActiveTaskId(taskId);
    setQueryResult(null);
    setFeedback({ type: null, message: '' });
    setMobilePanel('terminal');
  };

  const handleAcceptBriefing = () => {
    setShowBriefing(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`briefing_${teamId}`, 'done');
    }
  };

  // ── Render ─────────────────────────────────────────────

  if (!activeTask) {
    return (
      <div className="flex items-center justify-center h-screen text-bs-red font-mono text-sm">
        ERROR: Task not found.
      </div>
    );
  }

  return (
    <>
      {/* Mission Briefing */}
      {showBriefing && <MissionBriefing onAccept={handleAcceptBriefing} />}

      {/* Section Unlock Animation */}
      {unlockAnim && (
        <SectionUnlock section={unlockAnim} onDone={() => setUnlockAnim(null)} />
      )}

      {/* Hint Drawer */}
      <HintDrawer
        task={activeTask}
        hintsUsed={activeSub?.hintsUsed || 0}
        onConfirm={handleHintConfirm}
        onClose={() => setHintOpen(false)}
        isOpen={hintOpen}
      />

      {/* AI Log Modal */}
      <AILogModal
        taskId={activeTaskId}
        teamId={teamId}
        isOpen={aiLogOpen}
        onClose={() => setAILogOpen(false)}
        onSubmit={handleAILogSubmit}
      />

      {/* Game Shell (HUD) */}
      <GameShell
        teamId={teamId}
        teamName={teamId}
        totalScore={totalScore}
        endsAt={endsAt}
        onExpire={() => setSessionExpired(true)}
      >
        {/* Mobile nav tabs */}
        <div className="flex md:hidden border-b border-bs-border bg-bs-surface">
          {(['map', 'terminal', 'console'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePanel(p)}
              className={`flex-1 py-2 text-[10px] font-mono tracking-widest uppercase
                ${mobilePanel === p ? 'text-bs-cyan border-b-2 border-bs-cyan' : 'text-zinc-600'}`}
            >
              {p === 'map' ? '📡 MAP' : p === 'terminal' ? '🖥 TERMINAL' : '📊 CONSOLE'}
            </button>
          ))}
        </div>

        {/* 3-panel layout */}
        <div className="hidden md:grid h-full arena-grid gap-0" style={{ gridTemplateColumns: '220px 1fr 280px' }}>
          {/* LEFT: SectionMap */}
          <aside className="overflow-y-auto p-3 border-r border-bs-border bg-bs-surface left-panel">
            <SectionMap
              sectionState={sectionState}
              taskStatuses={taskStatuses}
              activeTaskId={activeTaskId}
              submittedTaskIds={submittedTaskIds}
              onSelectTask={handleSelectTask}
            />
            <div className="mt-4 pt-4 border-t border-bs-border">
              <PowerCardHUD cards={[]} />
            </div>
          </aside>

          {/* CENTER: Terminal */}
          <main className="flex flex-col overflow-y-auto p-3 gap-3">
            {bonusReleased && (
              <BonusCountdown
                bonusReleased={bonusReleased}
                bonusEndsAt={bonusEndsAt}
              />
            )}
            <SqlTerminal
              task={activeTask}
              value={queryMap[activeTaskId] || ''}
              onChange={(v) => setQueryMap({ ...queryMap, [activeTaskId]: v })}
              onRun={handleRun}
              onSubmit={handleSubmit}
              onHint={() => setHintOpen(true)}
              onAILog={() => setAILogOpen(true)}
              dbReady={dbReady}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              canSubmit={dbReady && !!queryResult && !queryResult.error}
              attemptCount={activeSub?.attempts || 0}
              hintsUsed={activeSub?.hintsUsed || 0}
              aiLogged={activeSub?.aiLogged || false}
              sessionExpired={sessionExpired}
              bonusExplanation={bonusExplanations[activeTaskId] || ''}
              onBonusExplanationChange={(v) =>
                setBonusExplanations({ ...bonusExplanations, [activeTaskId]: v })
              }
            />
          </main>

          {/* RIGHT: Console + Leaderboard */}
          <aside className="flex flex-col overflow-y-auto border-l border-bs-border bg-bs-surface right-panel">
            {/* Result console */}
            <div className="flex-1 overflow-y-auto p-3">
              <ResultConsole
                result={queryResult}
                feedback={feedback}
                isRunning={isRunning}
              />
            </div>
            {/* Leaderboard */}
            <div className="border-t border-bs-border p-3">
              <LiveLeaderboard currentTeamId={teamId} maxEntries={5} />
            </div>
          </aside>
        </div>

        {/* Mobile single-panel view */}
        <div className="md:hidden h-full overflow-y-auto p-3">
          {mobilePanel === 'map' && (
            <SectionMap
              sectionState={sectionState}
              taskStatuses={taskStatuses}
              activeTaskId={activeTaskId}
              submittedTaskIds={submittedTaskIds}
              onSelectTask={handleSelectTask}
            />
          )}
          {mobilePanel === 'terminal' && (
            <SqlTerminal
              task={activeTask}
              value={queryMap[activeTaskId] || ''}
              onChange={(v) => setQueryMap({ ...queryMap, [activeTaskId]: v })}
              onRun={handleRun}
              onSubmit={handleSubmit}
              onHint={() => setHintOpen(true)}
              onAILog={() => setAILogOpen(true)}
              isRunning={isRunning || !dbReady}
              isSubmitting={isSubmitting}
              canSubmit={dbReady && !!queryResult && !queryResult.error}
              attemptCount={activeSub?.attempts || 0}
              hintsUsed={activeSub?.hintsUsed || 0}
              aiLogged={activeSub?.aiLogged || false}
              sessionExpired={sessionExpired}
            />
          )}
          {mobilePanel === 'console' && (
            <div className="space-y-4">
              <ResultConsole result={queryResult} feedback={feedback} isRunning={isRunning} />
              <LiveLeaderboard currentTeamId={teamId} maxEntries={5} />
            </div>
          )}
        </div>
      </GameShell>
    </>
  );
}

export default function ArenaPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-bs-bg flex items-center justify-center text-bs-green font-mono">INITIALIZING...</div>}>
      <ArenaContent />
    </React.Suspense>
  );
}
