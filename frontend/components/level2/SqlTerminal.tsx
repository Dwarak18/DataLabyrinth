'use client';
// components/level2/SqlTerminal.tsx
// Must be loaded with dynamic import ssr:false
import React, { useEffect, useRef, useCallback } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';
import { Prec } from '@codemirror/state';
import { Task } from '@/lib/level2/taskConfig';
import { SCHEMA_INFO } from '@/lib/level2/sqlEngine';

interface SqlTerminalProps {
  task: Task;
  value: string;
  onChange: (val: string) => void;
  onRun: () => void;
  onSubmit: () => void;
  onHint: () => void;
  onAILog: () => void;
  dbReady: boolean;
  isRunning: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  attemptCount: number;
  hintsUsed: number;
  aiLogged: boolean;
  sessionExpired: boolean;
  bonusExplanation?: string;
  onBonusExplanationChange?: (val: string) => void;
}

// Custom dark theme for CodeMirror
const blacksiteTheme = EditorView.theme({
  '&': {
    backgroundColor: '#080808',
    color: '#00ff88',
    height: '100%',
    minHeight: '180px',
  },
  '.cm-content': { color: '#00ff88', caretColor: '#00d4ff' },
  '.cm-cursor': { borderLeftColor: '#00d4ff' },
  '.cm-activeLine': { backgroundColor: 'rgba(0,212,255,0.04)' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(0,212,255,0.15)' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(0,212,255,0.2)' },
  '.cm-gutters': {
    backgroundColor: '#0a0a0a',
    color: '#444',
    border: 'none',
    borderRight: '1px solid #1a1a1a',
  },
  '.cm-activeLineGutter': { backgroundColor: '#0d0d0d', color: '#00d4ff' },
  '.cm-keyword': { color: '#00d4ff', fontWeight: 'bold' },
  '.cm-string': { color: '#ffaa00' },
  '.cm-number': { color: '#9d4edd' },
  '.cm-comment': { color: '#555', fontStyle: 'italic' },
  '.cm-operator': { color: '#fff' },
  '.cm-punctuation': { color: '#aaa' },
  '.cm-lineNumbers': { minWidth: '30px' },
});

export default function SqlTerminal({
  task,
  value,
  onChange,
  onRun,
  onSubmit,
  onHint,
  onAILog,
  dbReady,
  isRunning,
  isSubmitting,
  canSubmit,
  attemptCount,
  hintsUsed,
  aiLogged,
  sessionExpired,
  bonusExplanation,
  onBonusExplanationChange,
}: SqlTerminalProps) {
  const [schemaOpen, setSchemaOpen] = React.useState(false);

  // Ctrl+Enter keyboard shortcut handler
  const handleCtrlEnter = useCallback(() => {
    if (!isRunning && !sessionExpired) {
      onRun();
      return true;
    }
    return false;
  }, [isRunning, sessionExpired, onRun]);

  const ctrlEnterKeymap = Prec.highest(
    keymap.of([
      {
        key: 'Ctrl-Enter',
        run: () => { handleCtrlEnter(); return true; },
      },
    ])
  );

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Task info bar */}
      <div className="bs-panel p-3 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-bs-cyan text-xs font-mono tracking-widest uppercase">
            [{task.id}] {task.title}
          </span>
          <span
            className={`section-badge text-[10px] ${
              task.section === 'A' ? 'text-bs-cyan  border-bs-cyan' :
              task.section === 'B' ? 'text-bs-amber border-bs-amber' :
              task.section === 'C' ? 'text-bs-red   border-bs-red' :
                                     'text-bs-purple border-bs-purple'
            }`}
          >
            SEC {task.section}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-300">
          <span>ATTEMPT {attemptCount} / ∞</span>
          {aiLogged && (
            <span className="text-bs-purple">🤖 AI LOGGED</span>
          )}
        </div>
      </div>

      {/* Mission flavour + description */}
      <div className="bs-panel p-3 space-y-2">
        <p className="text-[11px] font-mono text-bs-green tracking-wider">
          {task.missionFlavour}
        </p>
        <div className="border-l-2 border-bs-border pl-3">
          <p className="font-sans text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
            {task.description}
          </p>
        </div>
      </div>

      {/* CodeMirror SQL editor */}
      <div className="flex-1 border border-bs-border rounded-sm overflow-hidden min-h-[180px]">
        <div className="flex items-center justify-between px-3 py-1.5 bg-bs-surface border-b border-bs-border">
          <span className="text-[10px] font-mono text-zinc-400 tracking-widest">
            SQL EDITOR — Ctrl+Enter to run
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            SELECT only
          </span>
        </div>
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={[sql(), blacksiteTheme, ctrlEnterKeymap]}
          theme={oneDark}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            autocompletion: true,
            tabSize: 2,
          }}
          style={{ minHeight: '180px' }}
          editable={!sessionExpired}
          placeholder="-- Write your SELECT query here..."
        />
      </div>

      {/* Bonus explanation textarea */}
      {task.section === 'BONUS' && task.id === 'BONUS2' && (
        <div className="bs-panel p-3 space-y-2">
          <label className="text-[11px] font-mono text-bs-amber tracking-wider">
            ▶ WRITTEN EXPLANATION (required for BONUS2)
          </label>
          <textarea
            value={bonusExplanation || ''}
            onChange={(e) => onBonusExplanationChange?.(e.target.value)}
            disabled={sessionExpired}
            rows={5}
            className="w-full bg-bs-bg border border-bs-border text-xs font-mono text-zinc-300
                       p-2 rounded-sm resize-y focus:outline-none focus:border-bs-cyan
                       placeholder:text-zinc-700"
            placeholder="Explain your query step by step..."
          />
        </div>
      )}

      {/* DB loading banner */}
      {!dbReady && (
        <div className="flex items-center gap-2 text-bs-cyan text-xs font-mono px-3 py-2 border border-bs-border rounded-sm bg-bs-surface animate-pulse">
          <span>⏳</span>
          <span>LOADING SQL ENGINE... please wait</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={onRun}
          disabled={!dbReady || isRunning || sessionExpired}
          className="bs-btn bs-btn-green flex items-center gap-1"
        >
          {isRunning ? '⏳ RUNNING...' : '▶ RUN'}
        </button>

        <button
          onClick={onSubmit}
          disabled={!dbReady || isSubmitting || sessionExpired || !canSubmit}
          className="bs-btn bs-btn-cyan flex items-center gap-1"
        >
          {isSubmitting ? '⏳ SUBMITTING...' : '⚡ SUBMIT'}
        </button>

        <button
          onClick={onAILog}
          disabled={sessionExpired}
          className="bs-btn flex items-center gap-1 text-bs-purple border-bs-purple hover:bg-purple-950"
        >
          🤖 LOG AI USAGE
        </button>
      </div>

      {/* Session expired banner */}
      {sessionExpired && (
        <div className="flex items-center justify-center py-2 text-xs font-mono text-bs-red border border-bs-red bg-red-950 rounded-sm">
          🔒 MISSION LOCKED — TIME EXPIRED. ALL SUBMISSIONS DISABLED.
        </div>
      )}

      {/* Schema reference */}
      <div className="bs-panel">
        <button
          onClick={() => setSchemaOpen((o) => !o)}
          className="w-full px-3 py-2 text-left text-[10px] font-mono text-zinc-500 
                     hover:text-bs-cyan transition-colors flex items-center justify-between"
        >
          <span>SCHEMA REFERENCE</span>
          <span>{schemaOpen ? '▲' : '▼'}</span>
        </button>
        {schemaOpen && (
          <div className="px-3 pb-3">
            <pre className="text-[10px] font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">
              {SCHEMA_INFO}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
