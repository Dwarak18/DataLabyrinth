'use client';
// app/admin/level2/page.tsx — Admin control panel (Railway Postgres backend)
export const dynamic = 'force-dynamic';
import React, { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Team {
  id: string; name: string; code: string;
  is_active?: boolean; ends_at?: string; started_at?: string;
  total_points?: number; tasks_completed?: number;
}
interface Score {
  team_id: string; team_name: string;
  total_points: number; tasks_completed: number;
  section_a_pts: number; section_b_pts: number;
  section_c_pts: number; bonus_pts: number;
  last_submit_at: string;
}
interface Submission {
  id: string; team_id: string; team_name: string; task_id: string;
  sql_query: string; is_correct: boolean; points_earned: number;
  attempt_count: number; submitted_at: string;
}

interface Credential { username?: string; password?: string; name?: string; code?: string; }
interface CredentialData { admins: Credential[]; teams: Credential[]; }

export default function AdminPanel() {
  const [adminToken, setAdminToken]     = useState('');
  const [adminUser, setAdminUser]       = useState('');
  const [adminPass, setAdminPass]       = useState('');
  const [authed, setAuthed]             = useState(false);
  const [tab, setTab]                   = useState<'teams'|'scores'|'queries'|'controls'>('teams');
  const [credentials, setCredentials]   = useState<CredentialData | null>(null);

  const [teams, setTeams]               = useState<Team[]>([]);
  const [scores, setScores]             = useState<Score[]>([]);
  const [submissions, setSubmissions]   = useState<Submission[]>([]);

  const [newTeamName, setNewTeamName]   = useState('');
  const [newTeamCode, setNewTeamCode]   = useState('');
  const [deductTeam, setDeductTeam]     = useState('');
  const [deductPts, setDeductPts]       = useState('');
  const [deductReason, setDeductReason] = useState('');
  const [bonusReleased, setBonusReleased] = useState(false);
  const [bonusEndsAt, setBonusEndsAt]   = useState('');
  const [subFilter, setSubFilter]       = useState('');

  const [loading, setLoading]           = useState(false);
  const [msg, setMsg]                   = useState('');

  const hdr = { 'Content-Type': 'application/json', 'x-admin-token': adminToken };

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };

  const apiFetch = async (path: string, opts?: RequestInit) => {
    const r = await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { ...hdr, ...(opts?.headers || {}) },
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || r.statusText); }
    return r.json();
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        apiFetch('/api/admin/teams'),
        apiFetch('/api/admin/scores'),
      ]);
      setTeams(t); setScores(s);
      loadCredentials(adminToken);
      // Check bonus state
      const b = await fetch(`${API_URL}/api/level2/bonus/status`).then(r=>r.json()).catch(()=>({}));
      if (b?.released_at) { setBonusReleased(true); setBonusEndsAt(b.ends_at||''); }
    } catch (e: any) { flash(`⛔ ${e.message}`); }
    setLoading(false);
  };

  const loadSubmissions = async (teamId = '') => {
    try {
      const data = await apiFetch(`/api/admin/submissions${teamId ? `?team_id=${teamId}` : ''}`);
      setSubmissions(data);
    } catch (e: any) { flash(`⛔ ${e.message}`); }
  };

  const auth = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: adminUser, password: adminPass }),
      });
      const d = await res.json();
      if (!res.ok) { flash(`⛔ ${d.error || 'Invalid credentials'}`); return; }
      setAdminToken(d.token);
      setAuthed(true);
      loadAll();
    } catch { flash('⛔ Cannot reach backend.'); }
  };

  const loadCredentials = async (token: string) => {
    try {
      const r = await fetch(`${API_URL}/api/admin/credentials`, {
        headers: { 'x-admin-token': token },
      });
      if (r.ok) setCredentials(await r.json());
    } catch { /* ignore */ }
  };

  const createTeam = async () => {
    if (!newTeamName || !newTeamCode) { flash('Name and code required'); return; }
    try {
      await apiFetch('/api/admin/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newTeamName, code: newTeamCode.toUpperCase() }),
      });
      setNewTeamName(''); setNewTeamCode('');
      flash('✅ Team created');
      loadAll();
    } catch (e: any) { flash(`⛔ ${e.message}`); }
  };

  const deleteTeam = async (id: string, name: string) => {
    if (!confirm(`Delete team "${name}"? This removes all their data.`)) return;
    try {
      await apiFetch(`/api/admin/teams/${id}`, { method: 'DELETE' });
      flash(`✅ Team deleted`); loadAll();
    } catch (e: any) { flash(`⛔ ${e.message}`); }
  };

  const deactivateSession = async (teamId: string) => {
    try {
      await apiFetch(`/api/admin/sessions/${teamId}/deactivate`, { method: 'PATCH' });
      flash('✅ Session deactivated'); loadAll();
    } catch (e: any) { flash(`⛔ ${e.message}`); }
  };

  const releaseBonus = async () => {
    try {
      const data = await apiFetch('/api/level2/bonus/release', { method: 'POST' });
      setBonusReleased(true); setBonusEndsAt(data.ends_at);
      flash('⚡ Bonus round released (15 min window)');
    } catch (e: any) { flash(`⛔ ${e.message}`); }
  };

  const applyDeduction = async () => {
    if (!deductTeam || !deductPts) { flash('Team ID and points required'); return; }
    try {
      await apiFetch('/api/admin/deduct', {
        method: 'POST',
        body: JSON.stringify({ team_id: deductTeam, points: deductPts, reason: deductReason }),
      });
      flash(`✅ Deducted ${deductPts} pts from ${deductTeam}`);
      setDeductTeam(''); setDeductPts(''); setDeductReason('');
      loadAll();
    } catch (e: any) { flash(`⛔ ${e.message}`); }
  };

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!authed) {
    const iStyle: React.CSSProperties = {
      width:'100%', background:'#0a0a0a', border:'1px solid #333', color:'#ffffff',
      fontFamily:'Courier New', fontSize:13, padding:'10px 12px', outline:'none',
      boxSizing:'border-box', marginBottom:12, borderRadius:2,
    };
    return (
      <div style={{ minHeight:'100vh', backgroundColor:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ background:'#111', border:'1px solid #2a2a2a', borderRadius:6, padding:40, width:380 }}>
          <h1 style={{ color:'#ff3b3b', fontFamily:'Courier New', fontSize:14, letterSpacing:'0.2em', textTransform:'uppercase', textAlign:'center', marginBottom:6 }}>
            🛡 BLACKSITE ADMIN
          </h1>
          <p style={{ color:'#555', fontFamily:'Courier New', fontSize:10, textAlign:'center', marginBottom:28, letterSpacing:'0.15em' }}>
            DATA WARFARE — Level 2 Control
          </p>
          <label style={{ display:'block', color:'#888', fontFamily:'Courier New', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 }}>Username</label>
          <input
            type="text"
            value={adminUser}
            onChange={e => setAdminUser(e.target.value)}
            onKeyDown={e => e.key==='Enter' && auth()}
            placeholder="heisenberg"
            autoComplete="username"
            style={iStyle}
          />
          <label style={{ display:'block', color:'#888', fontFamily:'Courier New', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:6 }}>Password</label>
          <input
            type="password"
            value={adminPass}
            onChange={e => setAdminPass(e.target.value)}
            onKeyDown={e => e.key==='Enter' && auth()}
            placeholder="••••••••••"
            autoComplete="current-password"
            style={iStyle}
          />
          {msg && <p style={{ color:'#ff3b3b', fontFamily:'Courier New', fontSize:11, marginBottom:10 }}>{msg}</p>}
          <button onClick={auth}
            style={{ width:'100%', background:'#ff3b3b', border:'none', color:'#fff',
                     fontFamily:'Courier New', fontSize:12, fontWeight:'bold', letterSpacing:'0.15em',
                     padding:'10px', cursor:'pointer', textTransform:'uppercase', borderRadius:2, marginTop:4 }}>
            AUTHENTICATE
          </button>
          <div style={{ marginTop:20, paddingTop:16, borderTop:'1px solid #1a1a1a' }}>
            <p style={{ color:'#444', fontFamily:'Courier New', fontSize:9, letterSpacing:'0.1em', marginBottom:8 }}>DEFAULT CREDENTIALS</p>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Courier New', fontSize:11, marginBottom:4 }}>
              <span style={{ color:'#666' }}>Username</span><span style={{ color:'#00ff88' }}>heisenberg</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Courier New', fontSize:11 }}>
              <span style={{ color:'#666' }}>Password</span><span style={{ color:'#00ff88' }}>heisenberg</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Shared input style ──────────────────────────────────────────────────────
  const inp = {
    background:'#0a0a0a', border:'1px solid #333', color:'#e4e4e4',
    fontFamily:'Courier New', fontSize:12, padding:'6px 10px', outline:'none',
  } as React.CSSProperties;

  const tabBtn = (t: typeof tab, label: string) => (
    <button
      onClick={() => { setTab(t); if (t==='queries') loadSubmissions(subFilter); }}
      style={{
        background: tab===t ? '#00d4ff22' : 'transparent',
        border:'none', borderBottom: tab===t ? '2px solid #00d4ff' : '2px solid transparent',
        color: tab===t ? '#00d4ff' : '#555',
        fontFamily:'Courier New', fontSize:11, letterSpacing:'0.1em',
        padding:'8px 16px', cursor:'pointer', textTransform:'uppercase',
      }}>
      {label}
    </button>
  );

  return (
    <div style={{ minHeight:'100vh', backgroundColor:'#0a0a0a', color:'#e4e4e4', fontFamily:'Courier New', padding:24 }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, borderBottom:'1px solid #1a1a1a', paddingBottom:12 }}>
          <div>
            <p style={{ color:'#555', fontSize:10, letterSpacing:'0.3em', textTransform:'uppercase' }}>BLACKSITE: SYSTEM32</p>
            <h1 style={{ color:'#ff3b3b', fontSize:16, letterSpacing:'0.2em', textTransform:'uppercase', margin:0 }}>
              ADMIN — Level 2 Control
            </h1>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={loadAll} disabled={loading}
              style={{ ...inp, cursor:'pointer', color:'#00d4ff', borderColor:'#00d4ff', padding:'6px 14px' }}>
              {loading ? '...' : '⟳ REFRESH'}
            </button>
            <a href={`${API_URL}/api/admin/export.csv`} target="_blank"
               style={{ ...inp, textDecoration:'none', color:'#00ff88', borderColor:'#00ff88', padding:'6px 14px', display:'inline-block' }}>
              ↓ EXPORT CSV
            </a>
          </div>
        </div>

        {/* Flash message */}
        {msg && (
          <div style={{ borderLeft:'3px solid #ffaa00', background:'#ffaa0011', padding:'8px 12px', marginBottom:12, fontSize:12, color:'#ffaa00' }}>
            {msg}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ borderBottom:'1px solid #1a1a1a', marginBottom:20 }}>
          {tabBtn('teams',    `Teams (${teams.length})`)}
          {tabBtn('scores',   `Scores (${scores.length})`)}
          {tabBtn('queries',  'Submissions')}
          {tabBtn('controls', 'Controls')}
        </div>

        {/* ── TAB: TEAMS ─────────────────────────────────────────── */}
        {tab==='teams' && (
          <div>
            {/* Create team form */}
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, padding:16, marginBottom:16 }}>
              <p style={{ color:'#555', fontSize:10, letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:10 }}>
                Create New Team
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input
                  value={newTeamName}
                  onChange={e=>setNewTeamName(e.target.value)}
                  placeholder="Team Name (e.g. Alpha Squad)"
                  style={{ ...inp, flex:2, minWidth:160 }}
                />
                <input
                  value={newTeamCode}
                  onChange={e=>setNewTeamCode(e.target.value.toUpperCase())}
                  placeholder="Login Code (e.g. ALPHA-1)"
                  style={{ ...inp, flex:1, minWidth:120 }}
                />
                <button onClick={createTeam}
                  style={{ ...inp, cursor:'pointer', color:'#00ff88', borderColor:'#00ff88', padding:'6px 16px', whiteSpace:'nowrap' }}>
                  + ADD TEAM
                </button>
              </div>
            </div>

            {/* Teams table */}
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid #1a1a1a', background:'#0a0a0a' }}>
                    {['Team Name','Login Code','Session','Score','Tasks','Actions'].map(h => (
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:10, color:'#555', letterSpacing:'0.15em', textTransform:'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teams.map(t => (
                    <tr key={t.id} style={{ borderBottom:'1px solid #111' }}>
                      <td style={{ padding:'10px 12px', fontSize:12, color:'#e4e4e4' }}>{t.name}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:'#00ff8822', border:'1px solid #00ff8844', color:'#00ff88', fontFamily:'Courier New', fontSize:11, padding:'2px 8px', borderRadius:2, letterSpacing:'0.1em' }}>
                          {t.code}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:11 }}>
                        {t.is_active
                          ? <span style={{ color:'#00ff88' }}>ACTIVE — {t.ends_at ? new Date(t.ends_at).toLocaleTimeString() : ''}</span>
                          : t.started_at
                          ? <span style={{ color:'#555' }}>ENDED</span>
                          : <span style={{ color:'#444' }}>NOT STARTED</span>}
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:12, color:'#ffaa00', fontWeight:'bold' }}>
                        {t.total_points ?? 0}
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:12, color:'#888' }}>
                        {t.tasks_completed ?? 0}
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <div style={{ display:'flex', gap:8 }}>
                          {t.is_active && (
                            <button onClick={() => deactivateSession(t.id)}
                              style={{ fontSize:10, color:'#ff3b3b', cursor:'pointer', background:'none', border:'none', textDecoration:'underline', fontFamily:'Courier New' }}>
                              DEACTIVATE
                            </button>
                          )}
                          <button onClick={() => { setSubFilter(t.id); setTab('queries'); loadSubmissions(t.id); }}
                            style={{ fontSize:10, color:'#00d4ff', cursor:'pointer', background:'none', border:'none', textDecoration:'underline', fontFamily:'Courier New' }}>
                            QUERIES
                          </button>
                          <button onClick={() => deleteTeam(t.id, t.name)}
                            style={{ fontSize:10, color:'#555', cursor:'pointer', background:'none', border:'none', textDecoration:'underline', fontFamily:'Courier New' }}>
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {teams.length===0 && (
                    <tr><td colSpan={6} style={{ padding:24, textAlign:'center', color:'#333', fontSize:12 }}>
                      No teams yet. Create one above.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB: SCORES ────────────────────────────────────────── */}
        {tab==='scores' && (
          <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #1a1a1a', background:'#0a0a0a' }}>
                  {['#','Team','Total','Sec A','Sec B','Sec C','Bonus','Tasks','Last Submit'].map(h => (
                    <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, color:'#555', letterSpacing:'0.1em', textTransform:'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scores.map((s, i) => (
                  <tr key={s.team_id} style={{ borderBottom:'1px solid #111' }}>
                    <td style={{ padding:'9px 10px', fontSize:12, color: i===0?'#ffaa00':i===1?'#aaa':i===2?'#cd7f32':'#555' }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                    </td>
                    <td style={{ padding:'9px 10px', fontSize:12, color:'#e4e4e4' }}>{s.team_name}</td>
                    <td style={{ padding:'9px 10px', fontSize:13, color:'#ffaa00', fontWeight:'bold' }}>{s.total_points}</td>
                    <td style={{ padding:'9px 10px', fontSize:11, color:'#00ff88' }}>{s.section_a_pts}</td>
                    <td style={{ padding:'9px 10px', fontSize:11, color:'#00d4ff' }}>{s.section_b_pts}</td>
                    <td style={{ padding:'9px 10px', fontSize:11, color:'#9d4edd' }}>{s.section_c_pts}</td>
                    <td style={{ padding:'9px 10px', fontSize:11, color:'#ffaa00' }}>{s.bonus_pts}</td>
                    <td style={{ padding:'9px 10px', fontSize:11, color:'#888' }}>{s.tasks_completed}</td>
                    <td style={{ padding:'9px 10px', fontSize:10, color:'#444' }}>
                      {s.last_submit_at ? new Date(s.last_submit_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
                {scores.length===0 && (
                  <tr><td colSpan={9} style={{ padding:24, textAlign:'center', color:'#333', fontSize:12 }}>
                    No scores yet.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── TAB: QUERIES ───────────────────────────────────────── */}
        {tab==='queries' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input
                value={subFilter}
                onChange={e=>setSubFilter(e.target.value)}
                placeholder="Filter by team ID (leave blank for all)"
                style={{ ...inp, flex:1 }}
              />
              <button onClick={() => loadSubmissions(subFilter)}
                style={{ ...inp, cursor:'pointer', color:'#00d4ff', borderColor:'#00d4ff', padding:'6px 14px' }}>
                LOAD
              </button>
            </div>
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, overflow:'hidden', maxHeight:600, overflowY:'auto' }}>
              {submissions.map(sub => (
                <div key={sub.id} style={{ borderBottom:'1px solid #111', padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:13 }}>{sub.is_correct ? '✅' : '❌'}</span>
                    <span style={{ color:'#00d4ff', fontSize:12 }}>{sub.team_name}</span>
                    <span style={{ color:'#00ff88', fontSize:11, background:'#00ff8811', border:'1px solid #00ff8833', padding:'1px 6px', borderRadius:2 }}>{sub.task_id}</span>
                    {sub.points_earned > 0 && <span style={{ color:'#ffaa00', fontSize:11 }}>+{sub.points_earned} pts</span>}
                    <span style={{ color:'#444', fontSize:10 }}>attempt #{sub.attempt_count}</span>
                    <span style={{ color:'#333', fontSize:10, marginLeft:'auto' }}>
                      {new Date(sub.submitted_at).toLocaleString()}
                    </span>
                  </div>
                  <pre style={{ fontSize:11, color:'#666', background:'#0a0a0a', padding:'8px 10px', borderRadius:2, overflow:'auto', margin:0, maxHeight:80 }}>
                    {sub.sql_query}
                  </pre>
                </div>
              ))}
              {submissions.length===0 && (
                <p style={{ padding:24, textAlign:'center', color:'#333', fontSize:12 }}>Click LOAD to fetch submissions.</p>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: CONTROLS ──────────────────────────────────────── */}
        {tab==='controls' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px,1fr))', gap:16 }}>

            {/* Bonus round */}
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, padding:16 }}>
              <p style={{ color:'#555', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>
                Bonus Round
              </p>
              {bonusReleased
                ? <p style={{ color:'#ffaa00', fontSize:12 }}>⚡ Released — ends {bonusEndsAt ? new Date(bonusEndsAt).toLocaleTimeString() : '(unknown)'}</p>
                : <button onClick={releaseBonus}
                    style={{ ...inp, cursor:'pointer', color:'#ffaa00', borderColor:'#ffaa00', padding:'8px', width:'100%', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    ⚡ Release Bonus (15 min)
                  </button>
              }
            </div>

            {/* Manual deduction */}
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, padding:16 }}>
              <p style={{ color:'#555', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>
                Manual Deduction
              </p>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <select
                  value={deductTeam}
                  onChange={e=>setDeductTeam(e.target.value)}
                  style={{ ...inp, width:'100%' }}
                >
                  <option value="">Select team…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <input
                  value={deductPts}
                  onChange={e=>setDeductPts(e.target.value)}
                  placeholder="Points to deduct"
                  type="number"
                  style={{ ...inp, width:'100%' }}
                />
                <input
                  value={deductReason}
                  onChange={e=>setDeductReason(e.target.value)}
                  placeholder="Reason (shown in log)"
                  style={{ ...inp, width:'100%' }}
                />
                <button onClick={applyDeduction}
                  style={{ ...inp, cursor:'pointer', color:'#ff3b3b', borderColor:'#ff3b3b', padding:'7px', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                  Apply Deduction
                </button>
              </div>
            </div>

            {/* DB health */}
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, padding:16 }}>
              <p style={{ color:'#555', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', marginBottom:10 }}>
                Backend Health
              </p>
              <button onClick={async () => {
                try {
                  const d = await fetch(`${API_URL}/health`).then(r=>r.json());
                  flash(`DB: ${d.db} — ${d.ts}`);
                } catch { flash('⛔ Backend unreachable'); }
              }}
                style={{ ...inp, cursor:'pointer', color:'#00ff88', borderColor:'#00ff88', padding:'7px', width:'100%', textTransform:'uppercase' }}>
                PING /health
              </button>
            </div>

            {/* System Credentials */}
            <div style={{ background:'#111', border:'1px solid #1a1a1a', borderRadius:4, padding:16, gridColumn:'1 / -1' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <p style={{ color:'#555', fontSize:10, letterSpacing:'0.2em', textTransform:'uppercase', margin:0 }}>System Credentials</p>
                <button onClick={() => loadCredentials(adminToken)}
                  style={{ ...inp, cursor:'pointer', color:'#555', fontSize:9, padding:'3px 8px', letterSpacing:'0.1em' }}>REFRESH</button>
              </div>
              {credentials ? (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {/* Admin accounts */}
                  <div>
                    <p style={{ color:'#ff3b3b', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>
                      Admin Accounts
                    </p>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ color:'#444', fontSize:9, textAlign:'left', padding:'4px 8px', borderBottom:'1px solid #1a1a1a', letterSpacing:'0.1em' }}>USERNAME</th>
                          <th style={{ color:'#444', fontSize:9, textAlign:'left', padding:'4px 8px', borderBottom:'1px solid #1a1a1a', letterSpacing:'0.1em' }}>PASSWORD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {credentials.admins.map((a, i) => (
                          <tr key={i}>
                            <td style={{ color:'#00ff88', fontSize:11, padding:'4px 8px', fontFamily:'Courier New' }}>{a.username}</td>
                            <td style={{ color:'#00d4ff', fontSize:11, padding:'4px 8px', fontFamily:'Courier New' }}>{a.password}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Team credentials */}
                  <div>
                    <p style={{ color:'#ffaa00', fontSize:10, letterSpacing:'0.15em', textTransform:'uppercase', marginBottom:8 }}>
                      Team Login Codes
                    </p>
                    <div style={{ maxHeight:200, overflowY:'auto' }}>
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ color:'#444', fontSize:9, textAlign:'left', padding:'4px 8px', borderBottom:'1px solid #1a1a1a', letterSpacing:'0.1em' }}>TEAM</th>
                            <th style={{ color:'#444', fontSize:9, textAlign:'left', padding:'4px 8px', borderBottom:'1px solid #1a1a1a', letterSpacing:'0.1em' }}>CODE</th>
                          </tr>
                        </thead>
                        <tbody>
                          {credentials.teams.map((t, i) => (
                            <tr key={i}>
                              <td style={{ color:'#e4e4e4', fontSize:11, padding:'3px 8px', fontFamily:'Courier New' }}>{t.name}</td>
                              <td style={{ padding:'3px 8px' }}>
                                <span style={{ background:'#001a0a', color:'#00ff88', border:'1px solid #00ff8844',
                                  fontFamily:'Courier New', fontSize:10, padding:'1px 6px', borderRadius:2 }}>
                                  {t.code}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <p style={{ color:'#444', fontSize:11, fontFamily:'Courier New' }}>Loading credentials...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface TeamSession {
  team_id: string;
  started_at: string;
  ends_at: string;
  current_section: string;
  is_active: boolean;
}

interface TeamScore {
  team_id: string;
  total_points: number;
  tasks_completed: number;
}

interface Submission {
  id: string;
  team_id: string;
  task_id: string;
  sql_query: string;
  result_json: any;
  is_correct: boolean;
  points_earned: number;
  attempt_count: number;
  submitted_at: string;
}

