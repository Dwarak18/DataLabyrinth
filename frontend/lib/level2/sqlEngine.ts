// lib/level2/sqlEngine.ts
// Runs SQL via the Railway backend (PostgreSQL) — no WASM required.

export interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
  error?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/* initDB is now a no-op — kept for drop-in compatibility */
export async function initDB(): Promise<void> {
  return;
}

/* runQuery — async, calls backend /api/level2/query */
export async function runQuery(sql: string): Promise<QueryResult> {
  const trimmed = sql.trim();
  if (!trimmed) return { columns: [], rows: [], error: 'Empty query.' };

  try {
    const res = await fetch(`${API_URL}/api/level2/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: trimmed }),
    });
    const data = await res.json();
    if (data.error) return { columns: [], rows: [], error: data.error };
    return { columns: data.columns || [], rows: data.rows || [] };
  } catch (err: any) {
    return { columns: [], rows: [], error: `Network error: ${err.message}` };
  }
}

export const SCHEMA_INFO = `
students  (id, name, dept, year, cgpa)
marks     (id, student_id, subject, marks)   -- 4 NULL entries
attendance(id, student_id, subject, attended, total)

dept values: CSE | ECE | MECH | CIVIL | IT
subjects: DBMS | OS | Networks | DSA | Math | Physics
years: 1 | 2 | 3 | 4
attendance: (attended/total)*100 = percentage
`;
