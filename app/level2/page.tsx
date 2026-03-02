'use client';
// app/level2/page.tsx — Lobby / Mission Briefing screen
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ── Matrix Rain Canvas ─────────────────────────────────

function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?/\\`~SELECT FROM WHERE JOIN GROUP BY ORDER LIMIT';
    const cols = Math.floor(canvas.width / 14);
    const drops: number[] = Array(cols).fill(0).map(() => Math.random() * -100);

    const draw = () => {
      ctx.fillStyle = 'rgba(10,10,10,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff88';
      ctx.font = '13px Courier New';

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const id = setInterval(draw, 50);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ opacity: 0.08, zIndex: 0 }}
    />
  );
}

// ── Lobby Page ─────────────────────────────────────────

export default function LobbyPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTeams, setActiveTeams] = useState<number>(0);
  const [glitch, setGlitch] = useState(false);

  // Fetch active team count via backend API
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const r = await fetch(`${API_URL}/api/level2/leaderboard?limit=50`);
        if (r.ok) {
          const data = await r.json();
          setActiveTeams(Array.isArray(data) ? data.length : 0);
        }
      } catch { /* ignore */ }
    };
    fetchCount();

    // Periodic glitch effect
    const id = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 300);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) { setError('USERNAME REQUIRED.'); return; }
    if (!teamCode.trim()) { setError('PASSWORD REQUIRED.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/level2/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim(), code: teamCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(`⛔ ${data.error || 'ACCESS DENIED.'}`);
        setLoading(false);
        return;
      }
      const { team_id, team_name, ends_at } = data;
      // Store team name for the arena HUD
      localStorage.setItem('bs_team_name', team_name);
      router.push(`/level2/arena?team=${team_id}&ends=${encodeURIComponent(ends_at)}`);
    } catch (err) {
      console.error(err);
      setError('⚠️ SYSTEM ERROR. Check backend connection.');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-bs-bg">
      {/* Matrix rain background */}
      <MatrixRain />

      {/* CRT scanlines */}
      <div className="crt-lines" />
      <div className="scanline-overlay" />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 py-12 w-full max-w-lg">
        {/* System header */}
        <div className="mb-2">
          <p className="text-[10px] font-mono text-zinc-600 tracking-[0.3em] uppercase">
            BLACKSITE: SYSTEM32
          </p>
          <p className="text-[9px] font-mono text-zinc-700 tracking-widest">
            BRAINSTORMX '26 — DSCET CHENNAI
          </p>
        </div>

        {/* Main title */}
        <div className="my-8 space-y-2">
          <h1
            className={`text-5xl font-mono font-black text-bs-green tracking-widest uppercase
              ${glitch ? 'glitch-text' : ''}`}
            data-text="DATA WARFARE"
          >
            DATA WARFARE
          </h1>
          <p className="text-bs-cyan text-sm font-mono tracking-widest uppercase">
            LEVEL 02
          </p>
          <p className="text-zinc-400 font-sans text-sm mt-4 leading-relaxed">
            Your mission: extract intelligence from a compromised university database.
          </p>
        </div>

        {/* Login form */}
        <form onSubmit={handleDeploy} className="w-full">
          <div className="bs-panel p-4 text-left space-y-4" style={{ border:'1px solid #1a2a1a' }}>
            {/* Username */}
            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase mb-2"
                style={{ color:'#4a6a4a' }}>
                Username
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="TEAM NAME"
                className="w-full bg-bs-bg border border-bs-border text-bs-green font-mono text-sm
                           px-3 py-2 rounded-sm placeholder:text-zinc-700
                           focus:outline-none focus:border-bs-cyan"
                autoComplete="username"
                spellCheck={false}
              />
            </div>
            {/* Password */}
            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase mb-2"
                style={{ color:'#4a6a4a' }}>
                Password
              </label>
              <input
                type="password"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="ACCESS CODE"
                className="w-full bg-bs-bg border border-bs-border text-bs-green font-mono text-sm
                           px-3 py-2 rounded-sm tracking-widest placeholder:text-zinc-700
                           focus:outline-none focus:border-bs-cyan"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-bs-red text-[10px] font-mono tracking-wider">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bs-btn bs-btn-green w-full py-3 text-sm tracking-widest pulse-green mt-4"
          >
            {loading ? '⏳ AUTHENTICATING...' : '⚡ DEPLOY OPERATIVE'}
          </button>
        </form>

        {/* Active teams counter */}
        <div className="mt-8 flex items-center gap-2 text-[11px] font-mono text-zinc-600">
          <span className="w-2 h-2 rounded-full bg-bs-green animate-pulse" />
          <span>{activeTeams} team{activeTeams !== 1 ? 's' : ''} active</span>
        </div>

        {/* Decorative terminal lines */}
        <div className="mt-12 text-[9px] font-mono text-zinc-800 space-y-0.5 text-left w-full">
          <p>{'>'} SYSTEM::DATABASE — COMPROMISED</p>
          <p>{'>'} AWAITING OPERATIVE DEPLOYMENT...</p>
          <p className="animate-pulse">{'>'} █</p>
        </div>
      </div>
    </div>
  );
}
