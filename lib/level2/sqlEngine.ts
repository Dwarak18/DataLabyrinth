// lib/level2/sqlEngine.ts
// Runs entirely in the browser via sql.js (SQLite WASM).
// No backend SQL execution. SSR must be false for all callers.

export interface QueryResult {
  columns: string[];
  rows: (string | number | null)[][];
  error?: string;
}

let db: any = null;
let initPromise: Promise<void> | null = null;

/* ─── SEED DATA ─────────────────────────────────────── */

const STUDENTS = [
  { id: 1,  name: 'Arjun Venkat',      dept: 'CSE',   year: 3, cgpa: 8.7 },
  { id: 2,  name: 'Divya Lakshmi',     dept: 'ECE',   year: 2, cgpa: 9.1 },
  { id: 3,  name: 'Kiran Mohan',       dept: 'MECH',  year: 4, cgpa: 7.4 },
  { id: 4,  name: 'Priya Suresh',      dept: 'CIVIL', year: 1, cgpa: 8.2 },
  { id: 5,  name: 'Rahul Sharma',      dept: 'IT',    year: 2, cgpa: 9.4 },
  { id: 6,  name: 'Sneha Rajan',       dept: 'CSE',   year: 1, cgpa: 7.8 },
  { id: 7,  name: 'Vikram Nair',       dept: 'ECE',   year: 3, cgpa: 6.9 },
  { id: 8,  name: 'Ananya Krishnan',   dept: 'IT',    year: 4, cgpa: 9.2 },
  { id: 9,  name: 'Deepak Raj',        dept: 'MECH',  year: 2, cgpa: 7.1 },
  { id: 10, name: 'Meera Pillai',      dept: 'CIVIL', year: 3, cgpa: 8.5 },
  { id: 11, name: 'Arun Kumar',        dept: 'CSE',   year: 2, cgpa: 8.9 },
  { id: 12, name: 'Kavitha Murali',    dept: 'ECE',   year: 1, cgpa: 7.6 },
  { id: 13, name: 'Suresh Babu',       dept: 'MECH',  year: 3, cgpa: 6.5 },
  { id: 14, name: 'Lakshmi Priya',     dept: 'IT',    year: 2, cgpa: 9.0 },
  { id: 15, name: 'Naveen Chandran',   dept: 'CIVIL', year: 4, cgpa: 7.9 },
  { id: 16, name: 'Pooja Devi',        dept: 'CSE',   year: 3, cgpa: 8.3 },
  { id: 17, name: 'Manoj Kumar',       dept: 'ECE',   year: 2, cgpa: 7.5 },
  { id: 18, name: 'Shalini Raj',       dept: 'MECH',  year: 1, cgpa: 8.1 },
  { id: 19, name: 'Rajesh Babu',       dept: 'IT',    year: 3, cgpa: 6.8 },
  { id: 20, name: 'Nithya Suresh',     dept: 'CIVIL', year: 2, cgpa: 8.6 },
  { id: 21, name: 'Bharath Vijay',     dept: 'CSE',   year: 4, cgpa: 9.3 },
  { id: 22, name: 'Swetha Nair',       dept: 'ECE',   year: 3, cgpa: 7.7 },
  { id: 23, name: 'Ganesh Kumar',      dept: 'MECH',  year: 2, cgpa: 8.0 },
  { id: 24, name: 'Revathy Menon',     dept: 'IT',    year: 1, cgpa: 8.8 },
  { id: 25, name: 'Vijay Shankar',     dept: 'CIVIL', year: 3, cgpa: 7.2 },
  { id: 26, name: 'Anbu Selvan',       dept: 'CSE',   year: 2, cgpa: 6.4 },
  { id: 27, name: 'Pavithra Devi',     dept: 'ECE',   year: 4, cgpa: 9.5 },
  { id: 28, name: 'Surya Prakash',     dept: 'MECH',  year: 1, cgpa: 7.3 },
  { id: 29, name: 'Keerthi Vasan',     dept: 'IT',    year: 3, cgpa: 8.4 },
  { id: 30, name: 'Dharani Rajan',     dept: 'CIVIL', year: 2, cgpa: 6.7 },
];

// subjects available
const SUBJECTS = ['DBMS', 'OS', 'Networks', 'DSA', 'Math', 'Physics'];

// 120 marks rows (4 intentional NULLs)
const NULL_ENTRIES = new Set([15, 42, 78, 103]); // index positions that are NULL

const MARKS_RAW: { id: number; student_id: number; subject: string; marks: number | null }[] = [];
let mIdx = 0;
for (const s of STUDENTS) {
  for (let sub = 0; sub < 4; sub++) {
    const subject = SUBJECTS[sub];
    const isNull = NULL_ENTRIES.has(mIdx);
    const marks = isNull ? null : Math.floor(40 + ((s.id * 7 + sub * 13) % 61));
    MARKS_RAW.push({ id: mIdx + 1, student_id: s.id, subject, marks });
    mIdx++;
  }
}

// 90 attendance rows — 3 subjects × 30 students
const ATTENDANCE_RAW: { id: number; student_id: number; subject: string; attended: number; total: number }[] = [];
let aIdx = 0;
for (const s of STUDENTS) {
  for (let sub = 0; sub < 3; sub++) {
    const subject = SUBJECTS[sub];
    const total = 60;
    // Deterministic — some will be < 75%
    const attended = Math.min(total, Math.floor(30 + ((s.id * 11 + sub * 7) % 35)));
    ATTENDANCE_RAW.push({ id: aIdx + 1, student_id: s.id, subject, attended, total });
    aIdx++;
  }
}

/* ─── INIT ───────────────────────────────────────────── */

export async function initDB(): Promise<void> {
  if (db) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
    });

    db = new SQL.Database();

    // Create tables
    db.run(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        dept TEXT NOT NULL,
        year INTEGER NOT NULL,
        cgpa REAL NOT NULL
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        marks INTEGER,
        FOREIGN KEY (student_id) REFERENCES students(id)
      );
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY,
        student_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        attended INTEGER NOT NULL,
        total INTEGER NOT NULL,
        FOREIGN KEY (student_id) REFERENCES students(id)
      );
    `);

    // Seed students
    const stu = db.prepare(
      'INSERT INTO students (id, name, dept, year, cgpa) VALUES (?,?,?,?,?)'
    );
    for (const s of STUDENTS) {
      stu.run([s.id, s.name, s.dept, s.year, s.cgpa]);
    }
    stu.free();

    // Seed marks
    const mrk = db.prepare(
      'INSERT INTO marks (id, student_id, subject, marks) VALUES (?,?,?,?)'
    );
    for (const m of MARKS_RAW) {
      mrk.run([m.id, m.student_id, m.subject, m.marks]);
    }
    mrk.free();

    // Seed attendance
    const att = db.prepare(
      'INSERT INTO attendance (id, student_id, subject, attended, total) VALUES (?,?,?,?,?)'
    );
    for (const a of ATTENDANCE_RAW) {
      att.run([a.id, a.student_id, a.subject, a.attended, a.total]);
    }
    att.free();
  })();

  return initPromise;
}

/* ─── SELECT GATE ────────────────────────────────────── */

const BLOCKED_KEYWORDS = [
  'drop', 'delete', 'insert', 'update', 'create', 'alter',
  'attach', 'detach', 'replace', 'truncate', 'pragma', 'vacuum',
];

function isSafeQuery(sql: string): boolean {
  const trimmed = sql.trim().toLowerCase();
  // Must start with SELECT
  if (!trimmed.startsWith('select')) return false;
  // Double-check no destructive keyword anywhere (basic check)
  for (const kw of BLOCKED_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`);
    if (re.test(trimmed)) return false;
  }
  return true;
}

/* ─── RUN QUERY ──────────────────────────────────────── */

export function runQuery(sql: string): QueryResult {
  if (!db) {
    return { columns: [], rows: [], error: 'Database not initialized. Please wait...' };
  }

  const trimmed = sql.trim();
  if (!trimmed) {
    return { columns: [], rows: [], error: 'Empty query.' };
  }

  if (!isSafeQuery(trimmed)) {
    return {
      columns: [],
      rows: [],
      error: '⛔ Only SELECT queries are permitted. Destructive commands are blocked.',
    };
  }

  try {
    const results = db.exec(trimmed);
    if (!results || results.length === 0) {
      return { columns: [], rows: [] };
    }
    const { columns, values } = results[0];
    return { columns, rows: values };
  } catch (err: any) {
    return { columns: [], rows: [], error: `SQL Error: ${err.message}` };
  }
}

/* ─── GET SCHEMA INFO ────────────────────────────────── */

export const SCHEMA_INFO = `
students  (id, name, dept, year, cgpa)
marks     (id, student_id, subject, marks)   -- 4 NULL entries
attendance(id, student_id, subject, attended, total)

dept values: CSE | ECE | MECH | CIVIL | IT
subjects: DBMS | OS | Networks | DSA | Math | Physics
years: 1 | 2 | 3 | 4
attendance: (attended/total)*100 = percentage
`;
