'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/* ─── Types ─────────────────────────────────────────────────── */
interface Team {
  id: string; name: string; code: string;
  is_active?: boolean; ends_at?: string; started_at?: string;
  total_points?: number; tasks_completed?: number;
}
interface Score {
  team_id: string; team_name: string; total_points: number;
  tasks_completed: number; section_a_pts: number; section_b_pts: number;
  section_c_pts: number; bonus_pts: number; last_submit_at: string;
}
interface Submission {
  id: string; team_id: string; team_name: string; task_id: string;
  sql_query: string; is_correct: boolean; points_earned: number;
  attempt_count: number; submitted_at: string; hint_used?: boolean;
}
interface Credentials { admins: { username: string; password: string }[]; teams: { name: string; code: string; team_key?: string; password?: string }[]; }
interface HealthData { status: string; db: string; ts: string; }

/* ─── Colour palette ─────────────────────────────────────────── */
const C = {
  bg:    '#060808',
  panel: '#0b0f0e',
  border:'#1a2a22',
  green: '#00ff88',
  cyan:  '#00d4ff',
  red:   '#ff3b3b',
  amber: '#ffaa00',
  purple:'#9d4edd',
  dim:   '#3a5a4a',
  muted: '#2a3a30',
  text:  '#d4e8da',
  sub:   '#7a9a84',
};

/* ─── Mini components ─────────────────────────────────────────── */
const Badge = ({ v, col }: { v: React.ReactNode; col: string }) => (
  <span style={{
    background: col + '18', border: `1px solid ${col}44`, color: col,
    fontFamily: 'Courier New', fontSize: 10, padding: '2px 7px',
    borderRadius: 2, letterSpacing: '0.08em', whiteSpace: 'nowrap',
  }}>{v}</span>
);

const Metric = ({ label, value, col, sub }: { label: string; value: React.ReactNode; col: string; sub?: string }) => (
  <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4, padding: '14px 18px', flex: 1, minWidth: 120 }}>
    <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
    <p style={{ color: col, fontSize: 22, fontWeight: 'bold', fontFamily: 'Courier New', margin: 0, lineHeight: 1 }}>{value}</p>
    {sub && <p style={{ color: C.dim, fontSize: 9, margin: '4px 0 0' }}>{sub}</p>}
  </div>
);

/* ─── Login screen ───────────────────────────────────────────── */
function LoginScreen({ onAuth }: { onAuth: (tok: string) => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');

  const login = async () => {
    setErr('');
    try {
      const r = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || 'Invalid credentials'); return; }
      onAuth(d.token);
    } catch { setErr('Cannot reach backend — check NEXT_PUBLIC_API_URL'); }
  };

  const iStyle: React.CSSProperties = {
    width: '100%', background: '#050a07', border: `1px solid ${C.border}`,
    color: C.text, fontFamily: 'Courier New', fontSize: 13,
    padding: '9px 12px', outline: 'none', boxSizing: 'border-box', borderRadius: 2,
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Courier New' }}>
      <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 6, padding: 40, width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, borderRadius: '50%', border: `2px solid ${C.red}`, marginBottom: 12, color: C.red, fontSize: 20 }}>⚿</div>
          <p style={{ color: C.red, fontSize: 13, letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0 }}>BLACKSITE ADMIN</p>
          <p style={{ color: C.dim, fontSize: 9, letterSpacing: '0.15em', marginTop: 4 }}>DATA WARFARE — LEVEL 2</p>
        </div>
        <label style={{ display: 'block', color: C.sub, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Username</label>
        <input type="text" value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="Username" autoComplete="username" style={{ ...iStyle, marginBottom: 14 }} />
        <label style={{ display: 'block', color: C.sub, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 6 }}>Password</label>
        <input type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()}
          placeholder="••••••••" autoComplete="current-password" style={{ ...iStyle, marginBottom: 14 }} />
        {err && (
          <div style={{ background: '#ff3b3b18', border: `1px solid ${C.red}44`, color: C.red, fontSize: 11, padding: '7px 10px', borderRadius: 2, marginBottom: 12 }}>
            ⛔ {err}
          </div>
        )}
        <button onClick={login} style={{
          width: '100%', background: C.red + '22', border: `1px solid ${C.red}`,
          color: C.red, fontFamily: 'Courier New', fontSize: 12, fontWeight: 'bold',
          letterSpacing: '0.2em', padding: '10px', cursor: 'pointer',
          textTransform: 'uppercase', borderRadius: 2,
        }}>
          AUTHENTICATE →
        </button>
      </div>
    </div>
  );
}

/* ─── Main Admin Dashboard ───────────────────────────────────── */
export default function AdminPanel() {
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<'monitor' | 'teams' | 'submissions' | 'controls' | 'creds'>('monitor');

  const [teams, setTeams] = useState<Team[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [bonusReleased, setBonusReleased] = useState(false);
  const [bonusEndsAt, setBonusEndsAt] = useState('');
  const [msg, setMsg] = useState({ text: '', type: 'ok' as 'ok' | 'err' });
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Teams tab
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamCode, setNewTeamCode] = useState('');

  // Excel import
  const [importRows, setImportRows] = useState<{ team_id: string; team_name: string; password?: string }[]>([]);
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        // Normalise column names: trim & lowercase
        const rows = json.map((r) => {
          const norm: Record<string, string> = {};
          for (const k of Object.keys(r)) norm[k.trim().toLowerCase().replace(/\s+/g, '_')] = String(r[k]).trim();
          return {
            team_id:   norm['team_id']   || norm['id']       || '',
            team_name: norm['team_name'] || norm['name']     || '',
            password:  norm['password']  || norm['code']     || norm['access_code'] || '',
          };
        }).filter(r => r.team_name);
        setImportRows(rows);
        setImportStatus(`✅ Parsed ${rows.length} row(s) from "${file.name}". Review below and confirm.`);
      } catch {
        setImportStatus('⛔ Failed to parse file. Ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importRows.length) return;
    try {
      const d = await api('/api/admin/teams/import', {
        method: 'POST',
        body: JSON.stringify({ teams: importRows }),
      });
      setImportStatus(`✅ Import complete — ${d.inserted} added, ${d.updated ?? 0} updated, ${d.skipped} skipped.`);
      setImportRows([]);
      loadAll();
    } catch (e: any) {
      setImportStatus(`⛔ Import failed: ${e.message}`);
    }
  };

  // Submissions tab
  const [subFilter, setSubFilter] = useState('');
  const [expandedSub, setExpandedSub] = useState<string | null>(null);

  // Controls tab
  const [deductTeam, setDeductTeam] = useState('');
  const [deductPts, setDeductPts] = useState('');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Helpers ── */
  const hdr = () => ({ 'Content-Type': 'application/json', 'x-admin-token': token });

  const flash = (text: string, type: 'ok' | 'err' = 'ok') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: 'ok' }), 4000);
  };

  const api = useCallback(async (path: string, opts: RequestInit = {}) => {
    const r = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { ...hdr(), ...(opts.headers as object || {}) },
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || r.statusText); }
    return r.json();
  }, [token]);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [t, s] = await Promise.all([api('/api/admin/teams'), api('/api/admin/scores')]);
      setTeams(t);
      setScores(s);
      setLastRefresh(new Date());
      const b = await fetch(`${API_URL}/api/level2/bonus/status`).then(r => r.json()).catch(() => ({}));
      if (b?.released_at) { setBonusReleased(true); setBonusEndsAt(b.ends_at || ''); }
      const h = await fetch(`${API_URL}/health`).then(r => r.json()).catch(() => null);
      setHealth(h);
    } catch (e: any) { flash(e.message, 'err'); }
    if (!silent) setLoading(false);
  }, [api]);

  const loadSubs = useCallback(async (filter = '') => {
    try {
      const d = await api(`/api/admin/submissions${filter ? `?team_id=${filter}` : ''}`);
      setSubmissions(d);
    } catch (e: any) { flash(e.message, 'err'); }
  }, [api]);

  const loadCreds = useCallback(async () => {
    try { const d = await api('/api/admin/credentials'); setCreds(d); }
    catch (e: any) { flash(e.message, 'err'); }
  }, [api]);

  useEffect(() => {
    if (!authed) return;
    loadAll();
    loadCreds();
    if (autoRefresh) {
      intervalRef.current = setInterval(() => loadAll(true), 15000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [authed, autoRefresh]);

  useEffect(() => {
    if (authed && tab === 'submissions') loadSubs(subFilter);
  }, [tab, authed]);

  /* ── Not authed → login ── */
  if (!authed) return <LoginScreen onAuth={tok => { setToken(tok); setAuthed(true); }} />;

  /* ── Derived metrics ── */
  const activeTeams = teams.filter(t => t.is_active).length;
  const totalStarted = teams.filter(t => t.started_at).length;
  const topScore = scores[0]?.total_points ?? 0;
  const maxPts = Math.max(topScore, 1);

  /* ── Shared styles ── */
  const inp: React.CSSProperties = {
    background: '#050a07', border: `1px solid ${C.border}`, color: C.text,
    fontFamily: 'Courier New', fontSize: 12, padding: '7px 10px',
    outline: 'none', borderRadius: 2, boxSizing: 'border-box',
  };
  const card: React.CSSProperties = {
    background: C.panel, border: `1px solid ${C.border}`, borderRadius: 4,
  };
  const tabStyle = (t: string): React.CSSProperties => ({
    background: 'transparent', border: 'none',
    borderBottom: tab === t ? `2px solid ${C.green}` : '2px solid transparent',
    color: tab === t ? C.green : C.dim,
    fontFamily: 'Courier New', fontSize: 11, letterSpacing: '0.12em',
    padding: '10px 18px', cursor: 'pointer', textTransform: 'uppercase',
  });
  const actionBtn = (col: string): React.CSSProperties => ({
    background: col + '18', border: `1px solid ${col}66`, color: col,
    fontFamily: 'Courier New', fontSize: 10, padding: '4px 10px',
    cursor: 'pointer', borderRadius: 2,
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'Courier New', fontSize: 13 }}>

      {/* ── Top bar ── */}
      <div style={{
        background: C.panel, borderBottom: `1px solid ${C.border}`,
        padding: '10px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ color: C.red, fontSize: 16 }}>⚿</span>
          <span style={{ color: C.red, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase' }}>BLACKSITE ADMIN</span>
          <span style={{ color: C.muted, fontSize: 10 }}>DATA WARFARE — LEVEL 2</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: health?.db === 'connected' ? C.green : C.red, boxShadow: `0 0 6px ${health?.db === 'connected' ? C.green : C.red}` }} />
            <span style={{ color: health?.db === 'connected' ? C.green : C.red }}>{health?.db === 'connected' ? 'DB ONLINE' : 'DB ERROR'}</span>
          </div>
          {lastRefresh && <span style={{ color: C.dim, fontSize: 9 }}>↺ {lastRefresh.toLocaleTimeString()}</span>}
          <button onClick={() => setAutoRefresh(v => !v)} style={{ ...actionBtn(autoRefresh ? C.green : C.dim), fontSize: 9 }}>
            {autoRefresh ? '⟳ AUTO 15s' : '⟳ PAUSED'}
          </button>
          <button onClick={() => loadAll()} disabled={loading} style={actionBtn(C.cyan)}>
            {loading ? '…' : '↺ REFRESH'}
          </button>
          <button onClick={async () => {
            try {
              const r = await fetch(`${API_URL}/api/admin/export.csv`, { headers: hdr() });
              if (!r.ok) { flash('Export failed', 'err'); return; }
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a'); a.href = url; a.download = 'level2-scores.csv'; a.click();
              URL.revokeObjectURL(url);
            } catch { flash('Export failed', 'err'); }
          }} style={actionBtn(C.amber)}>
            ↓ CSV
          </button>
        </div>
      </div>

      {/* ── Flash message ── */}
      {msg.text && (
        <div style={{
          background: (msg.type === 'ok' ? C.green : C.red) + '14',
          borderBottom: `1px solid ${msg.type === 'ok' ? C.green : C.red}44`,
          color: msg.type === 'ok' ? C.green : C.red,
          padding: '8px 24px', fontSize: 12,
        }}>
          {msg.type === 'ok' ? '✅' : '⛔'} {msg.text}
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 24px' }}>

        {/* ── Metric strip ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <Metric label="Active Sessions" value={activeTeams} col={C.green} sub={`${totalStarted} started total`} />
          <Metric label="Teams Registered" value={teams.length} col={C.cyan} />
          <Metric label="Scores Tracked" value={scores.length} col={C.amber} />
          <Metric label="Top Score" value={topScore} col={C.amber} sub={scores[0]?.team_name} />
          <Metric label="Backend" value={health ? (health.db === 'connected' ? 'ONLINE' : 'ERROR') : '…'} col={health?.db === 'connected' ? C.green : C.red} />
          <Metric label="Bonus Round" value={bonusReleased ? 'ACTIVE' : 'LOCKED'} col={bonusReleased ? C.amber : C.dim} />
        </div>

        {/* ── Tab bar ── */}
        <div style={{ borderBottom: `1px solid ${C.border}`, marginBottom: 20, display: 'flex', gap: 0 }}>
          {(['monitor', 'teams', 'submissions', 'controls', 'creds'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={tabStyle(t)}>
              {t === 'monitor' ? `📊 Monitor`
                : t === 'teams' ? `👥 Teams (${teams.length})`
                : t === 'submissions' ? '📋 Submissions'
                : t === 'controls' ? '⚙️ Controls'
                : '🔑 Credentials'}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════ MONITOR TAB ══ */}
        {tab === 'monitor' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* Live Leaderboard */}
            <div style={{ ...card, gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.amber, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>⚡ Live Leaderboard</span>
                <span style={{ color: C.dim, fontSize: 9 }}>{scores.length} teams scored</span>
              </div>
              {scores.length === 0
                ? <p style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 12 }}>No scores yet.</p>
                : scores.map((s, i) => (
                  <div key={s.team_id} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.muted}22`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 28, color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : C.dim, fontSize: 13, fontWeight: 'bold', flexShrink: 0 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                    </span>
                    <span style={{ width: 160, color: C.text, fontSize: 12, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.team_name}</span>
                    <div style={{ flex: 1, height: 6, background: C.muted, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${(s.total_points / maxPts) * 100}%`, height: '100%', background: i === 0 ? '#ffd700' : C.green, borderRadius: 3, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ width: 50, color: C.amber, fontSize: 13, fontWeight: 'bold', textAlign: 'right', flexShrink: 0 }}>{s.total_points}</span>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <Badge v={`A:${s.section_a_pts}`} col={C.green} />
                      <Badge v={`B:${s.section_b_pts}`} col={C.cyan} />
                      <Badge v={`C:${s.section_c_pts}`} col={C.purple} />
                      {s.bonus_pts > 0 && <Badge v={`+${s.bonus_pts}`} col={C.amber} />}
                    </div>
                    <span style={{ color: C.dim, fontSize: 10, flexShrink: 0 }}>{s.tasks_completed}✓</span>
                  </div>
                ))
              }
            </div>

            {/* Active sessions */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.green, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>🟢 Active Sessions ({activeTeams})</span>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {teams.filter(t => t.is_active).length === 0
                  ? <p style={{ padding: 20, color: C.muted, fontSize: 11, textAlign: 'center' }}>No active sessions</p>
                  : teams.filter(t => t.is_active).map(t => {
                      const timeLeft = t.ends_at ? Math.max(0, Math.floor((new Date(t.ends_at).getTime() - Date.now()) / 60000)) : 0;
                      return (
                        <div key={t.id} style={{ padding: '10px 16px', borderBottom: `1px solid ${C.muted}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: 0, color: C.text, fontSize: 12 }}>{t.name}</p>
                            <p style={{ margin: '2px 0 0', color: C.dim, fontSize: 9 }}>{t.code}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: timeLeft < 15 ? C.red : C.amber, fontSize: 11 }}>{timeLeft}m left</span>
                            <span style={{ color: C.amber, fontSize: 12, fontWeight: 'bold' }}>{t.total_points ?? 0}pts</span>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>

            {/* Not started */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.dim, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>⏳ Not Started ({teams.filter(t => !t.started_at).length})</span>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                {teams.filter(t => !t.started_at).map(t => (
                  <div key={t.id} style={{ padding: '9px 16px', borderBottom: `1px solid ${C.muted}22`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: C.sub, fontSize: 12 }}>{t.name}</span>
                    <Badge v={t.code} col={C.green} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════ TEAMS TAB ══ */}
        {tab === 'teams' && (
          <div>
            {/* Create form */}
            <div style={{ ...card, padding: 16, marginBottom: 16 }}>
              <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 12px' }}>➕ Create New Team</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="Team Name (e.g. Alpha Squad)"
                  style={{ ...inp, flex: 2, minWidth: 160 }} />
                <input value={newTeamCode} onChange={e => setNewTeamCode(e.target.value.toUpperCase())} placeholder="Code / Password (e.g. ALPHA-1)"
                  style={{ ...inp, flex: 1, minWidth: 120 }} />
                <button onClick={async () => {
                  if (!newTeamName || !newTeamCode) { flash('Name and code required', 'err'); return; }
                  try { await api('/api/admin/teams', { method: 'POST', body: JSON.stringify({ name: newTeamName, code: newTeamCode }) }); setNewTeamName(''); setNewTeamCode(''); flash('Team created'); loadAll(); }
                  catch (e: any) { flash(e.message, 'err'); }
                }} style={{ ...actionBtn(C.green), padding: '7px 16px', fontSize: 11 }}>+ ADD</button>
              </div>
            </div>

            {/* Excel Import */}
            <div style={{ ...card, padding: 16, marginBottom: 16 }}>
              <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 10px' }}>
                📤 Import Teams from Excel
              </p>
              <p style={{ color: C.dim, fontSize: 10, margin: '0 0 12px' }}>
                Excel columns: <span style={{ color: C.cyan }}>team_id</span> (optional), <span style={{ color: C.cyan }}>team_name</span> <span style={{ color: C.red }}>*required</span>, <span style={{ color: C.cyan }}>password</span> (optional — auto-generated if blank)
                {' '}— first row = headers. Existing teams matched by name will be updated.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelFile}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{ ...actionBtn(C.cyan), padding: '7px 14px', fontSize: 11 }}
                >
                  📁 CHOOSE EXCEL FILE
                </button>
                {importRows.length > 0 && (
                  <button
                    onClick={handleImportConfirm}
                    style={{ ...actionBtn(C.green), padding: '7px 14px', fontSize: 11 }}
                  >
                    ✅ CONFIRM IMPORT ({importRows.length} teams)
                  </button>
                )}
                {importRows.length > 0 && (
                  <button
                    onClick={() => { setImportRows([]); setImportStatus(''); }}
                    style={{ ...actionBtn(C.red), padding: '7px 10px', fontSize: 11 }}
                  >
                    ✕ CLEAR
                  </button>
                )}
              </div>

              {importStatus && (
                <div style={{
                  margin: '10px 0 0',
                  padding: '7px 10px',
                  borderRadius: 2,
                  fontSize: 11,
                  background: importStatus.startsWith('⛔') ? C.red + '18' : C.green + '14',
                  border: `1px solid ${importStatus.startsWith('⛔') ? C.red : C.green}44`,
                  color: importStatus.startsWith('⛔') ? C.red : C.green,
                }}>
                  {importStatus}
                </div>
              )}

              {/* Preview table */}
              {importRows.length > 0 && (
                <div style={{ marginTop: 12, maxHeight: 220, overflowY: 'auto', border: `1px solid ${C.border}`, borderRadius: 2 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#050a07', position: 'sticky', top: 0 }}>
                        {['#', 'Team ID', 'Team Name', 'Password (opt.)'].map(h => (
                          <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.map((r, i) => (
                        <tr key={i} style={{ borderTop: `1px solid ${C.muted}30` }}>
                          <td style={{ padding: '6px 10px', color: C.muted, fontSize: 10 }}>{i + 1}</td>
                          <td style={{ padding: '6px 10px', color: C.cyan, fontSize: 11 }}>{r.team_id || '—'}</td>
                          <td style={{ padding: '6px 10px', color: C.text, fontSize: 11 }}>{r.team_name}</td>
                          <td style={{ padding: '6px 10px' }}>{r.password ? <Badge v={r.password} col={C.green} /> : <span style={{ color: C.muted, fontSize: 10 }}>(auto)</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Table */}
            <div style={{ ...card, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}`, background: '#050a07' }}>
                    {['Team', 'Code / Password', 'Team ID', 'Status', 'Session End', 'Score', 'Tasks', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${C.muted}30` }}>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: C.text }}>{t.name}</td>
                      <td style={{ padding: '10px 12px' }}><Badge v={t.code} col={C.green} /></td>
                      <td style={{ padding: '10px 12px', fontSize: 10, color: C.sub }}>{(t as any).team_key || '—'}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11 }}>
                        {t.is_active ? <span style={{ color: C.green }}>● ACTIVE</span>
                          : t.started_at ? <span style={{ color: C.dim }}>● ENDED</span>
                          : <span style={{ color: C.muted }}>○ WAITING</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 10, color: C.sub }}>
                        {t.ends_at ? new Date(t.ends_at).toLocaleTimeString() : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 13, color: C.amber, fontWeight: 'bold' }}>{t.total_points ?? 0}</td>
                      <td style={{ padding: '10px 12px', fontSize: 11, color: C.sub }}>{t.tasks_completed ?? 0}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {t.is_active && (
                            <button onClick={async () => {
                              if (!confirm(`Deactivate "${t.name}"?`)) return;
                              try { await api(`/api/admin/sessions/${t.id}/deactivate`, { method: 'PATCH' }); flash('Session deactivated'); loadAll(); }
                              catch (e: any) { flash(e.message, 'err'); }
                            }} style={actionBtn(C.red)}>KICK</button>
                          )}
                          <button onClick={() => { setSubFilter(t.id); setTab('submissions'); loadSubs(t.id); }}
                            style={actionBtn(C.cyan)}>QUERIES</button>
                          <button onClick={async () => {
                            if (!confirm(`Delete "${t.name}" and ALL their data?`)) return;
                            try { await api(`/api/admin/teams/${t.id}`, { method: 'DELETE' }); flash('Team deleted'); loadAll(); }
                            catch (e: any) { flash(e.message, 'err'); }
                          }} style={actionBtn('#555')}>DEL</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teams.length === 0 && (
                    <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 12 }}>
                      No teams. Create one above or import from Excel.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════ SUBMISSIONS TAB ══ */}
        {tab === 'submissions' && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <select value={subFilter} onChange={e => setSubFilter(e.target.value)} style={{ ...inp, flex: 1 }}>
                <option value="">All teams</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <button onClick={() => loadSubs(subFilter)} style={{ ...actionBtn(C.cyan), padding: '7px 16px' }}>LOAD</button>
              <button onClick={() => { setSubFilter(''); loadSubs(''); }} style={{ ...actionBtn(C.dim), padding: '7px 12px' }}>ALL</button>
            </div>

            {submissions.length > 0 && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                <Badge v={`${submissions.length} total`} col={C.cyan} />
                <Badge v={`${submissions.filter(s => s.is_correct).length} correct`} col={C.green} />
                <Badge v={`${submissions.filter(s => !s.is_correct).length} wrong`} col={C.red} />
                <Badge v={`${submissions.filter(s => s.hint_used).length} hints used`} col={C.amber} />
              </div>
            )}

            <div style={{ ...card, overflow: 'hidden', maxHeight: 600, overflowY: 'auto' }}>
              {submissions.length === 0
                ? <p style={{ padding: 24, textAlign: 'center', color: C.muted, fontSize: 12 }}>Select a filter and click LOAD.</p>
                : submissions.map(sub => (
                  <div key={sub.id} style={{ borderBottom: `1px solid ${C.muted}30`, overflow: 'hidden' }}>
                    <div onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                      style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <span style={{ fontSize: 14 }}>{sub.is_correct ? '✅' : '❌'}</span>
                      <span style={{ color: C.cyan, fontSize: 12, minWidth: 120 }}>{sub.team_name}</span>
                      <Badge v={sub.task_id} col={sub.task_id.startsWith('A') ? C.green : sub.task_id.startsWith('B') ? C.cyan : sub.task_id.startsWith('C') ? C.purple : C.amber} />
                      {sub.points_earned > 0 && <Badge v={`+${sub.points_earned}pts`} col={C.amber} />}
                      {sub.hint_used && <Badge v="HINT" col={C.amber} />}
                      <span style={{ color: C.muted, fontSize: 10 }}>×{sub.attempt_count}</span>
                      <span style={{ color: C.dim, fontSize: 10, marginLeft: 'auto' }}>{new Date(sub.submitted_at).toLocaleTimeString()}</span>
                      <span style={{ color: C.dim, fontSize: 10 }}>{expandedSub === sub.id ? '▲' : '▼'}</span>
                    </div>
                    {expandedSub === sub.id && (
                      <pre style={{ margin: 0, padding: '8px 16px 12px', fontSize: 11, color: '#a8c8b0', background: '#050a07', borderTop: `1px solid ${C.muted}30`, overflow: 'auto', maxHeight: 180 }}>
                        {sub.sql_query || '(no query logged)'}
                      </pre>
                    )}
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ══════════════════════════════════ CONTROLS TAB ══ */}
        {tab === 'controls' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>

            {/* Bonus round */}
            <div style={{ ...card, padding: 20 }}>
              <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 14px' }}>⚡ Bonus Round</p>
              {bonusReleased ? (
                <div style={{ background: C.amber + '14', border: `1px solid ${C.amber}44`, padding: '10px 14px', borderRadius: 2 }}>
                  <p style={{ color: C.amber, fontSize: 12, margin: 0 }}>⚡ BONUS ACTIVE</p>
                  <p style={{ color: C.dim, fontSize: 10, margin: '4px 0 0' }}>
                    Ends: {bonusEndsAt ? new Date(bonusEndsAt).toLocaleTimeString() : '—'}
                  </p>
                </div>
              ) : (
                <button onClick={async () => {
                  if (!confirm('Release the 15-minute bonus round?')) return;
                  try { const d = await api('/api/level2/bonus/release', { method: 'POST' }); setBonusReleased(true); setBonusEndsAt(d.ends_at); flash('⚡ Bonus round released (15 min)'); }
                  catch (e: any) { flash(e.message, 'err'); }
                }} style={{ ...actionBtn(C.amber), width: '100%', padding: '10px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  ⚡ Release Bonus Round (15 min)
                </button>
              )}
            </div>

            {/* Manual deduction */}
            <div style={{ ...card, padding: 20 }}>
              <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 14px' }}>➖ Manual Point Deduction</p>
              <select value={deductTeam} onChange={e => setDeductTeam(e.target.value)} style={{ ...inp, width: '100%', marginBottom: 8 }}>
                <option value="">Select team…</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.total_points ?? 0}pts)</option>)}
              </select>
              <input value={deductPts} onChange={e => setDeductPts(e.target.value)} placeholder="Points to deduct" type="number"
                style={{ ...inp, width: '100%', marginBottom: 8 }} />
              <button onClick={async () => {
                if (!deductTeam || !deductPts) { flash('Team and points required', 'err'); return; }
                try { await api('/api/admin/deduct', { method: 'POST', body: JSON.stringify({ team_id: deductTeam, points: deductPts }) }); flash(`Deducted ${deductPts} pts`); setDeductTeam(''); setDeductPts(''); loadAll(); }
                catch (e: any) { flash(e.message, 'err'); }
              }} style={{ ...actionBtn(C.red), width: '100%', padding: '8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Apply Deduction
              </button>
            </div>

            {/* Health */}
            <div style={{ ...card, padding: 20 }}>
              <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 14px' }}>🔍 Backend Health</p>
              {health && (
                <div style={{ background: (health.db === 'connected' ? C.green : C.red) + '14', border: `1px solid ${health.db === 'connected' ? C.green : C.red}44`, borderRadius: 2, padding: '10px 14px', marginBottom: 12 }}>
                  <p style={{ color: health.db === 'connected' ? C.green : C.red, fontSize: 12, margin: 0 }}>
                    {health.db === 'connected' ? '✅ DB Connected' : '❌ DB Error'}
                  </p>
                  <p style={{ color: C.dim, fontSize: 9, margin: '4px 0 0' }}>{health.ts ? new Date(health.ts).toLocaleString() : ''}</p>
                </div>
              )}
              <button onClick={async () => {
                try { const d = await fetch(`${API_URL}/health`).then(r => r.json()); setHealth(d); flash('Health: ' + d.db); }
                catch { flash('Backend unreachable', 'err'); }
              }} style={{ ...actionBtn(C.green), width: '100%', padding: '8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                PING /health
              </button>
              <button onClick={async () => {
                try {
                  const d = await api('/api/admin/reseed-teams', { method: 'POST' });
                  flash(`Reseeded teams: ${d.inserted} new, ${d.total} total`);
                  loadAll();
                } catch { flash('Reseed failed', 'err'); }
              }} style={{ ...actionBtn(C.cyan), width: '100%', padding: '8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 8 }}>
                ↺ RESEED TEAMS TO DB
              </button>
            </div>

            {/* Kill all */}
            <div style={{ ...card, padding: 20 }}>
              <p style={{ color: C.sub, fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '0 0 14px' }}>🛑 Emergency Controls</p>
              <button onClick={async () => {
                if (!confirm(`Deactivate ALL ${activeTeams} active sessions? Cannot be undone.`)) return;
                const active = teams.filter(t => t.is_active);
                for (const t of active) {
                  try { await api(`/api/admin/sessions/${t.id}/deactivate`, { method: 'PATCH' }); } catch { /* skip */ }
                }
                flash(`Deactivated ${active.length} sessions`);
                loadAll();
              }} style={{ ...actionBtn(C.red), width: '100%', padding: '8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                🛑 KILL ALL SESSIONS ({activeTeams})
              </button>
              <button onClick={async () => {
                try {
                  const r = await fetch(`${API_URL}/api/admin/export.csv`, { headers: hdr() });
                  if (!r.ok) { flash('Export failed', 'err'); return; }
                  const blob = await r.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'level2-scores.csv'; a.click();
                  URL.revokeObjectURL(url);
                } catch { flash('Export failed', 'err'); }
              }} style={{ ...actionBtn(C.green), width: '100%', padding: '8px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                ↓ Export Scores CSV
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════ CREDENTIALS TAB ══ */}
        {tab === 'creds' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>

            {/* Admins */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ color: C.red, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>🛡 Admin Accounts</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#050a07' }}>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em' }}>USERNAME</th>
                    <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em' }}>PASSWORD</th>
                  </tr>
                </thead>
                <tbody>
                  {creds?.admins.map((a, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.muted}30` }}>
                      <td style={{ padding: '9px 14px', color: C.green, fontSize: 12 }}>{a.username}</td>
                      <td style={{ padding: '9px 14px', color: C.cyan, fontSize: 12 }}>{a.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Team codes */}
            <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: C.amber, fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase' }}>🔑 Team Login IDs ({creds?.teams.length ?? 0})</span>
                <button onClick={loadCreds} style={{ ...actionBtn(C.dim), fontSize: 9 }}>REFRESH</button>
              </div>
              <p style={{ padding: '6px 14px 4px', color: C.dim, fontSize: 10 }}>
                Teams log in with their <span style={{ color: C.cyan }}>Team ID</span> (Excel team_key if set, otherwise team name).
              </p>
              <div style={{ maxHeight: 480, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#050a07', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em' }}>TEAM NAME</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em' }}>LOGIN ID (team_key)</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em' }}>FALLBACK (name)</th>
                      <th style={{ padding: '8px 14px', textAlign: 'left', fontSize: 9, color: C.dim, letterSpacing: '0.12em' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {creds?.teams.map((t, i) => {
                      const team = teams.find(x => x.name === t.name);
                      return (
                        <tr key={i} style={{ borderTop: `1px solid ${C.muted}30` }}>
                          <td style={{ padding: '8px 14px', color: C.text, fontSize: 12 }}>{t.name}</td>
                          <td style={{ padding: '8px 14px' }}>
                            {t.team_key
                              ? <Badge v={t.team_key} col={C.cyan} />
                              : <span style={{ color: C.muted, fontSize: 10 }}>— (not set)</span>}
                          </td>
                          <td style={{ padding: '8px 14px' }}><Badge v={t.name} col={C.dim} /></td>
                          <td style={{ padding: '8px 14px', fontSize: 10 }}>
                            {team?.is_active ? <span style={{ color: C.green }}>● ACTIVE</span>
                              : team?.started_at ? <span style={{ color: C.dim }}>● ENDED</span>
                              : <span style={{ color: C.muted }}>○ WAITING</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
