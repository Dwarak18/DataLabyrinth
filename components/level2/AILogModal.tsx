'use client';
// components/level2/AILogModal.tsx
import React, { useState } from 'react';

const AI_TOOLS = ['ChatGPT', 'GitHub Copilot', 'Gemini', 'Perplexity', 'Other'];

interface AILogEntry {
  toolUsed: string;
  promptUsed: string;
  modification: string;
  understanding: string;
}

interface AILogModalProps {
  taskId: string;
  teamId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (log: AILogEntry) => Promise<void>;
  previousLogs?: AILogEntry[];
}

export default function AILogModal({
  taskId,
  teamId,
  isOpen,
  onClose,
  onSubmit,
  previousLogs = [],
}: AILogModalProps) {
  const [noAI, setNoAI] = useState(false);
  const [toolUsed, setToolUsed] = useState('ChatGPT');
  const [promptUsed, setPromptUsed] = useState('');
  const [modification, setModification] = useState('');
  const [understanding, setUnderstanding] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPrev, setShowPrev] = useState(false);

  if (!isOpen) return null;

  const validate = (): boolean => {
    if (noAI) return true;
    const errs: Record<string, string> = {};
    if (promptUsed.trim().length < 20) errs.prompt = 'At least 20 characters required.';
    if (modification.trim().length < 20) errs.modification = 'At least 20 characters required.';
    if (understanding.trim().length < 20) errs.understanding = 'At least 20 characters required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      if (!noAI) {
        await onSubmit({ toolUsed, promptUsed, modification, understanding });
      } else {
        await onSubmit({
          toolUsed: 'NONE',
          promptUsed: 'No AI used',
          modification: 'No AI used',
          understanding: 'No AI used',
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bs-surface border border-bs-border rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-bs-border bg-bs-bg sticky top-0">
            <div>
              <p className="text-xs font-mono text-bs-purple tracking-widest uppercase">
                🤖 AI Usage Declaration
              </p>
              <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                Task: {taskId} — Team: {teamId}
              </p>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white text-xs font-mono">
              [×]
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* No AI checkbox */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={noAI}
                onChange={(e) => setNoAI(e.target.checked)}
                className="mt-0.5 accent-bs-green"
              />
              <div>
                <p className="text-xs font-mono text-zinc-300 group-hover:text-white transition-colors">
                  I did not use any AI tool for this task.
                </p>
                <p className="text-[10px] font-mono text-zinc-600 mt-0.5">
                  Check this if you solved the task independently.
                </p>
              </div>
            </label>

            {!noAI && (
              <div className="space-y-4">
                {/* Tool used */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Tool Used *
                  </label>
                  <select
                    value={toolUsed}
                    onChange={(e) => setToolUsed(e.target.value)}
                    className="w-full bg-bs-bg border border-bs-border text-xs font-mono text-zinc-300
                               p-2 rounded-sm focus:outline-none focus:border-bs-cyan"
                  >
                    {AI_TOOLS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Prompt used */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    Prompt / Query Used * (min 20 chars)
                  </label>
                  <textarea
                    value={promptUsed}
                    onChange={(e) => setPromptUsed(e.target.value)}
                    rows={3}
                    className="w-full bg-bs-bg border border-bs-border text-xs font-mono text-zinc-300
                               p-2 rounded-sm focus:outline-none focus:border-bs-cyan resize-none"
                    placeholder="Enter the prompt or question you asked the AI..."
                  />
                  {errors.prompt && (
                    <p className="text-[10px] text-bs-red mt-0.5">{errors.prompt}</p>
                  )}
                </div>

                {/* What was modified */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    What Did You Modify / Use From AI? * (min 20 chars)
                  </label>
                  <textarea
                    value={modification}
                    onChange={(e) => setModification(e.target.value)}
                    rows={3}
                    className="w-full bg-bs-bg border border-bs-border text-xs font-mono text-zinc-300
                               p-2 rounded-sm focus:outline-none focus:border-bs-cyan resize-none"
                    placeholder="Describe what part of the AI output you used in your solution..."
                  />
                  {errors.modification && (
                    <p className="text-[10px] text-bs-red mt-0.5">{errors.modification}</p>
                  )}
                </div>

                {/* Understanding */}
                <div>
                  <label className="block text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                    What Did You Understand From It? * (min 20 chars)
                  </label>
                  <textarea
                    value={understanding}
                    onChange={(e) => setUnderstanding(e.target.value)}
                    rows={3}
                    className="w-full bg-bs-bg border border-bs-border text-xs font-mono text-zinc-300
                               p-2 rounded-sm focus:outline-none focus:border-bs-cyan resize-none"
                    placeholder="Explain what concept or SQL technique you learned or applied..."
                  />
                  {errors.understanding && (
                    <p className="text-[10px] text-bs-red mt-0.5">{errors.understanding}</p>
                  )}
                </div>
              </div>
            )}

            {/* Previous logs */}
            {previousLogs.length > 0 && (
              <div>
                <button
                  onClick={() => setShowPrev((v) => !v)}
                  className="text-[10px] font-mono text-zinc-500 hover:text-bs-cyan"
                >
                  {showPrev ? '▲' : '▼'} {previousLogs.length} previous log(s) for this task
                </button>
                {showPrev && (
                  <div className="mt-2 space-y-2">
                    {previousLogs.map((log, i) => (
                      <div key={i} className="bs-panel p-2 text-[10px] font-mono text-zinc-500">
                        <p>Tool: {log.toolUsed}</p>
                        <p>Prompt: {log.promptUsed.slice(0, 80)}...</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-bs-border">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bs-btn bs-btn-cyan flex-1"
              >
                {isSubmitting ? '⏳ SAVING...' : '⚡ SUBMIT LOG'}
              </button>
              <button onClick={onClose} className="bs-btn bs-btn-red">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
