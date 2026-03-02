'use client';
// components/level2/MissionBriefing.tsx
// Full-screen typewriter intro modal
import React, { useState, useEffect, useRef } from 'react';

const LINES = [
  '> OPERATIVE AUTHENTICATED.',
  '> MISSION: DATA WARFARE',
  '> DATABASE SYSTEM: COMPROMISED.',
  '> THREE TABLES DETECTED: STUDENTS / MARKS / ATTENDANCE',
  '> YOUR ORDERS: RETRIEVE. JOIN. VALIDATE. EXPOSE.',
  '> SECTION A IS NOW ACTIVE. PROCEED WITH CAUTION.',
  '> GOOD LUCK, OPERATIVE. THE SYSTEM IS WATCHING.',
];

interface MissionBriefingProps {
  onAccept: () => void;
}

export default function MissionBriefing({ onAccept }: MissionBriefingProps) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [showSkip, setShowSkip] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Show skip button after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 5000);
    return () => clearTimeout(t);
  }, []);

  // Typewriter logic
  useEffect(() => {
    if (currentLine >= LINES.length) {
      setShowAccept(true);
      return;
    }

    const line = LINES[currentLine];
    if (currentChar < line.length) {
      intervalRef.current = setTimeout(() => {
        setCurrentChar((c) => c + 1);
      }, 35);
    } else {
      // Line complete — move to next after pause
      intervalRef.current = setTimeout(() => {
        setVisibleLines((prev) => [...prev, line]);
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
      }, 400);
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [currentLine, currentChar]);

  const skipAll = () => {
    setVisibleLines(LINES);
    setCurrentLine(LINES.length);
    setCurrentChar(0);
    setShowAccept(true);
  };

  const currentDisplayLine =
    currentLine < LINES.length
      ? LINES[currentLine].slice(0, currentChar)
      : '';

  return (
    <div className="fixed inset-0 z-[100] bg-bs-bg flex flex-col items-center justify-center">
      {/* Scanline overlay */}
      <div className="scanline-overlay" />

      <div className="w-full max-w-2xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <p className="text-[10px] font-mono text-zinc-600 tracking-widest uppercase">
            BLACKSITE: SYSTEM32 — LEVEL 02
          </p>
          <h1
            className="text-3xl font-mono font-bold text-bs-green glitch-text tracking-widest uppercase"
            data-text="DATA WARFARE"
          >
            DATA WARFARE
          </h1>
          <p className="text-[10px] font-mono text-zinc-500 tracking-wider">
            MISSION BRIEFING — INITIALIZING...
          </p>
        </div>

        {/* Terminal output */}
        <div className="bg-bs-surface border border-bs-border rounded-sm p-6 min-h-[280px] space-y-2">
          {visibleLines.map((line, i) => (
            <p key={i} className="font-mono text-sm text-bs-green leading-relaxed">
              {line}
            </p>
          ))}
          {currentLine < LINES.length && (
            <p className="font-mono text-sm text-bs-green leading-relaxed">
              {currentDisplayLine}
              <span className="animate-pulse text-bs-cyan">█</span>
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          {showSkip && !showAccept && (
            <button
              onClick={skipAll}
              className="text-[10px] font-mono text-zinc-600 hover:text-zinc-400 tracking-wider"
            >
              [SKIP BRIEFING]
            </button>
          )}
          <div className="flex-1" />
          {showAccept && (
            <button
              onClick={onAccept}
              className="bs-btn bs-btn-green text-sm px-8 py-3 pulse-green"
            >
              ⚡ ACCEPT MISSION
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
