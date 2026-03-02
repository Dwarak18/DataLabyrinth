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
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?SELECT FROM WHERE JOIN GROUP';
    const cols = Math.floor(canvas.width / 16);
    const drops: number[] = Array(cols).fill(0).map(() => Math.random() * -100);
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < drops.length; i++) {
        const bright = Math.random() > 0.95;
        ctx.fillStyle = bright ? '#ffffff' : (Math.random() > 0.5 ? '#00ff88' : '#00cc66');
        ctx.font = `${bright ? 'bold ' : ''}13px Courier New`;
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const id = setInterval(draw, 45);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ opacity: 0.18, zIndex: 0 }} />;
}

// ── Typing animation hook ──────────────────────────────
function useTyping(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    let i = 0;
    const id = setInterval(() => {
      setDisplayed(text.slice(0, ++i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return displayed;
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
  const [bootDone, setBootDone] = useState(false);
  const subtitle = useTyping('Your mission: extract intelligence from a compromised university database.', 30);

  useEffect(() => {
    const t = setTimeout(() => setBootDone(true), 800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const r = await fetch(`${API_URL}/api/level2/leaderboard?limit=50`);
        if (r.ok) { const data = await r.json(); setActiveTeams(Array.isArray(data) ? data.length : 0); }
      } catch { /* ignore */ }
    };
    fetchCount();
    const id = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 250); }, 4000);
    return () => clearInterval(id);
  }, []);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) { setError('▸ USERNAME REQUIRED'); return; }
    if (!teamCode.trim()) { setError('▸ ACCESS CODE REQUIRED'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/level2/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamName.trim(), code: teamCode.trim().toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(`▸ ${data.error || 'ACCESS DENIED'}`); setLoading(false); return; }
      const { team_id, team_name, ends_at } = data;
      localStorage.setItem('bs_team_name', team_name);
      router.push(`/level2/arena?team=${team_id}&ends=${encodeURIComponent(ends_at)}`);
    } catch {
      setError('▸ SYSTEM ERROR — BACKEND UNREACHABLE');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" style={{ background: '#050a05' }}>
      <MatrixRain />
      <div className="crt-lines" />

      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(0,255,100,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,100,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px', zIndex: 1
      }} />

      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-2"
        style={{ borderBottom: '1px solid rgba(0,255,100,0.15)', background: 'rgba(0,0,0,0.8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#00ff88', boxShadow: '0 0 8px #00ff88' }} />
          <span className="font-mono text-xs" style={{ color: '#00ff88' }}>BLACKSITE::SYSTEM32</span>
        </div>
        <span className="font-mono text-xs" style={{ color: '#4a7a5a' }}>BRAINSTORMX '26 — DSCET CHENNAI</span>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ff4444' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#ffaa00' }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#00ff88' }} />
        </div>
      </div>

      {/* Main panel */}
      <div className="relative z-10 w-full max-w-md px-4 py-8" style={{ marginTop: '48px' }}>

        {/* Title block */}
        <div className="text-center mb-8">
          <div className="inline-block mb-3 px-3 py-1 font-mono text-xs tracking-widest"
            style={{ border: '1px solid rgba(0,255,136,0.3)', color: '#00cc66', background: 'rgba(0,255,100,0.05)' }}>
            ◈ LEVEL 02 ◈
          </div>
          <h1
            className={`font-mono font-black tracking-widest uppercase ${glitch ? 'glitch-text' : ''}`}
            data-text="DATA WARFARE"
            style={{ fontSize: 'clamp(2.2rem, 8vw, 3.5rem)', color: '#00ff88', textShadow: '0 0 20px rgba(0,255,136,0.6), 0 0 40px rgba(0,255,136,0.3)', lineHeight: 1.1 }}
          >
            DATA WARFARE
          </h1>
          <p className="font-mono text-xs mt-4 leading-relaxed min-h-[2.5em]"
            style={{ color: '#7ab88a' }}>
            {subtitle}<span className="animate-pulse">▌</span>
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-sm overflow-hidden" style={{
          border: '1px solid rgba(0,255,100,0.25)',
          background: 'rgba(0,10,4,0.85)',
          boxShadow: '0 0 40px rgba(0,255,100,0.08), inset 0 0 40px rgba(0,0,0,0.5)'
        }}>
          {/* Card header bar */}
          <div className="px-4 py-2 flex items-center gap-2 font-mono text-xs"
            style={{ background: 'rgba(0,255,100,0.08)', borderBottom: '1px solid rgba(0,255,100,0.15)', color: '#00ff88' }}>
            <span>▸</span>
            <span>OPERATIVE AUTHENTICATION</span>
            <span className="ml-auto" style={{ color: '#4a7a5a' }}>v2.6.0</span>
          </div>

          <form onSubmit={handleDeploy} className="p-5 space-y-4">
            {/* Team Name */}
            <div>
              <label className="block font-mono text-xs tracking-widest mb-2 uppercase"
                style={{ color: '#00cc66' }}>
                ▸ TEAM NAME
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name..."
                className="w-full font-mono text-sm px-3 py-2.5 rounded-sm transition-all"
                style={{
                  background: 'rgba(0,255,100,0.04)',
                  border: '1px solid rgba(0,255,100,0.2)',
                  color: '#00ff88',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.border = '1px solid rgba(0,255,136,0.6)'; e.target.style.boxShadow = '0 0 12px rgba(0,255,100,0.15)'; }}
                onBlur={e => { e.target.style.border = '1px solid rgba(0,255,100,0.2)'; e.target.style.boxShadow = 'none'; }}
                autoComplete="username"
                spellCheck={false}
              />
            </div>

            {/* Access Code */}
            <div>
              <label className="block font-mono text-xs tracking-widest mb-2 uppercase"
                style={{ color: '#00cc66' }}>
                ▸ ACCESS CODE
              </label>
              <input
                type="password"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                placeholder="Enter access code..."
                className="w-full font-mono text-sm px-3 py-2.5 rounded-sm tracking-widest transition-all"
                style={{
                  background: 'rgba(0,255,100,0.04)',
                  border: '1px solid rgba(0,255,100,0.2)',
                  color: '#00ff88',
                  outline: 'none',
                }}
                onFocus={e => { e.target.style.border = '1px solid rgba(0,255,136,0.6)'; e.target.style.boxShadow = '0 0 12px rgba(0,255,100,0.15)'; }}
                onBlur={e => { e.target.style.border = '1px solid rgba(0,255,100,0.2)'; e.target.style.boxShadow = 'none'; }}
                autoComplete="current-password"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 rounded-sm font-mono text-xs tracking-wide"
                style={{ background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,80,80,0.4)', color: '#ff6b6b' }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 font-mono text-sm font-bold tracking-widest uppercase transition-all"
              style={{
                background: loading ? 'rgba(0,255,100,0.1)' : 'rgba(0,255,100,0.12)',
                border: '1px solid rgba(0,255,100,0.5)',
                color: loading ? '#4a7a5a' : '#00ff88',
                boxShadow: loading ? 'none' : '0 0 20px rgba(0,255,100,0.15)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!loading) { (e.target as HTMLElement).style.background = 'rgba(0,255,100,0.22)'; (e.target as HTMLElement).style.boxShadow = '0 0 30px rgba(0,255,100,0.3)'; } }}
              onMouseLeave={e => { if (!loading) { (e.target as HTMLElement).style.background = 'rgba(0,255,100,0.12)'; (e.target as HTMLElement).style.boxShadow = '0 0 20px rgba(0,255,100,0.15)'; } }}
            >
              {loading ? '⏳  AUTHENTICATING...' : '⚡  DEPLOY OPERATIVE'}
            </button>
          </form>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex items-center justify-between font-mono text-xs px-1">
          <div className="flex items-center gap-2" style={{ color: '#4a9a5a' }}>
            <span className="w-2 h-2 rounded-full animate-pulse inline-block" style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
            <span>{activeTeams} operative{activeTeams !== 1 ? 's' : ''} active</span>
          </div>
          <span style={{ color: '#2a5a3a' }}>SYS::ONLINE</span>
        </div>

        {/* Terminal footer */}
        <div className="mt-6 rounded-sm p-3 font-mono text-xs space-y-1"
          style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,255,100,0.1)' }}>
          <p style={{ color: '#00cc66' }}><span style={{ color: '#4a7a5a' }}>$</span> SYSTEM::DATABASE — <span style={{ color: '#ff8844' }}>COMPROMISED</span></p>
          <p style={{ color: '#00cc66' }}><span style={{ color: '#4a7a5a' }}>$</span> AWAITING OPERATIVE DEPLOYMENT...</p>
          <p className="animate-pulse" style={{ color: '#00ff88' }}><span style={{ color: '#4a7a5a' }}>$</span> █</p>
        </div>
      </div>
    </div>
  );
}
