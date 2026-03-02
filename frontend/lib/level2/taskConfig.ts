// lib/level2/taskConfig.ts
// Full task definitions for DATA WARFARE — Level 2

export type TaskSection = 'A' | 'B' | 'C' | 'BONUS';
export type MatchType = 'full' | 'partial' | 'none';

export interface Task {
  id: string;
  title: string;
  section: TaskSection;
  points: number;
  hintCost: number;
  hintsAllowed: boolean;
  unlockAfter: string | null;
  description: string;
  missionFlavour: string;
  expectedShape: string[];           // Expected column names (lowercase)
  validateFn: (rows: any[][]) => MatchType;
  hints: string[];                   // max 2 hints
}

/* ─── SECTION A — BASIC RECON (60 pts total) ─────────── */

const TASKS: Task[] = [
  // ── A1: Enumerate all operatives ───────────────────────
  {
    id: 'A1',
    title: 'Enumerate All Operatives',
    section: 'A',
    points: 8,
    hintCost: 2,
    hintsAllowed: true,
    unlockAfter: null,
    missionFlavour: '> SCANNING REGISTRY... PERSONNEL DATABASE LOCATED.',
    description:
      'List ALL student records. Retrieve every operative in the registry. ' +
      'Return all columns: id, name, dept, year, cgpa. Order by id ascending.',
    expectedShape: ['id', 'name', 'dept', 'year', 'cgpa'],
    validateFn: (rows) => {
      if (rows.length === 30) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use SELECT * FROM students to retrieve all records.',
      'Add ORDER BY id to sort results by student ID.',
    ],
  },

  // ── A1a: CSE operatives only ────────────────────────────
  {
    id: 'A1a',
    title: 'Isolate CSE Operatives',
    section: 'A',
    points: 6,
    hintCost: 2,
    hintsAllowed: true,
    unlockAfter: 'A1',
    missionFlavour: '> FILTER APPLIED: DEPARTMENT = CSE.',
    description:
      'Extract only CSE department students. Return name and cgpa columns only. ' +
      'Order by cgpa descending.',
    expectedShape: ['name', 'cgpa'],
    validateFn: (rows) => {
      // Expect 5 CSE students (ids: 1,6,11,16,21,26 = 6 students)
      if (rows.length === 6) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      "Use WHERE dept = 'CSE' to filter by department.",
      'SELECT name, cgpa FROM students WHERE dept = \'CSE\' ORDER BY cgpa DESC',
    ],
  },

  // ── A1b: High-value assets (CGPA > 8.5) ────────────────
  {
    id: 'A1b',
    title: 'Identify High-Value Assets',
    section: 'A',
    points: 6,
    hintCost: 2,
    hintsAllowed: true,
    unlockAfter: 'A1a',
    missionFlavour: '> THREAT LEVEL: CRITICAL. FILTERING TOP PERFORMERS.',
    description:
      'Identify students with CGPA strictly greater than 8.5. ' +
      'Return id, name, dept, cgpa. Order by cgpa descending.',
    expectedShape: ['id', 'name', 'dept', 'cgpa'],
    validateFn: (rows) => {
      // CGPA > 8.5: ids 2(9.1),5(9.4),8(9.2),10(8.5 NO),11(8.9),14(9.0),21(9.3),24(8.8),27(9.5),29(8.4 NO) ...
      // Let's count: 2,5,8,11,14,21,24,27 = need to calc from seed data
      // From STUDENTS: cgpa > 8.5: 2(9.1),5(9.4),8(9.2),11(8.9),14(9.0),21(9.3),24(8.8),27(9.5) = 8 students
      if (rows.length === 8) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use WHERE cgpa > 8.5 to filter high performers.',
      'SELECT id, name, dept, cgpa FROM students WHERE cgpa > 8.5 ORDER BY cgpa DESC',
    ],
  },

  // ── A2: Count operatives per dept ──────────────────────
  {
    id: 'A2',
    title: 'Department Census',
    section: 'A',
    points: 8,
    hintCost: 2,
    hintsAllowed: true,
    unlockAfter: null,  // Available from start alongside A1
    missionFlavour: '> RUNNING DEPARTMENT CENSUS...',
    description:
      'Count how many students are in each department. ' +
      'Return dept and count (alias as student_count). Order by student_count descending.',
    expectedShape: ['dept', 'student_count'],
    validateFn: (rows) => {
      // 5 depts × 6 students each = 5 rows all count=6
      if (rows.length === 5 && rows.every((r) => r[1] === 6)) return 'full';
      if (rows.length === 5) return 'partial';
      return 'none';
    },
    hints: [
      'Use GROUP BY dept and COUNT(*) to aggregate.',
      "SELECT dept, COUNT(*) AS student_count FROM students GROUP BY dept ORDER BY student_count DESC",
    ],
  },

  // ── A2a: Average CGPA per dept ─────────────────────────
  {
    id: 'A2a',
    title: 'Average Performance Index',
    section: 'A',
    points: 6,
    hintCost: 2,
    hintsAllowed: true,
    unlockAfter: 'A2',
    missionFlavour: '> COMPUTING AVERAGE PERFORMANCE VECTORS PER UNIT.',
    description:
      'Calculate the average CGPA per department. ' +
      'Return dept and avg_cgpa (rounded to 2 decimal places). ' +
      'Order by avg_cgpa descending.',
    expectedShape: ['dept', 'avg_cgpa'],
    validateFn: (rows) => {
      if (rows.length === 5 && rows[0].length === 2) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use AVG(cgpa) and ROUND(..., 2) to get rounded averages.',
      "SELECT dept, ROUND(AVG(cgpa), 2) AS avg_cgpa FROM students GROUP BY dept ORDER BY avg_cgpa DESC",
    ],
  },

  // ── A3: Marks anomaly — NULL detection ─────────────────
  {
    id: 'A3',
    title: 'Detect Data Anomalies',
    section: 'A',
    points: 10,
    hintCost: 2,
    hintsAllowed: true,
    unlockAfter: null, // Available from start
    missionFlavour: '> WARNING: NULL ENTRIES DETECTED IN MARKS DATABASE. LOCATE THEM.',
    description:
      'Identify all students whose marks record contains a NULL value. ' +
      'Join students and marks tables. Return student name, subject, and marks. ' +
      'Only show rows where marks IS NULL.',
    expectedShape: ['name', 'subject', 'marks'],
    validateFn: (rows) => {
      // Exactly 4 NULL entries
      if (rows.length === 4 && rows.every((r) => r[2] === null)) return 'full';
      if (rows.length === 4) return 'partial';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use JOIN between students and marks, then filter with WHERE marks IS NULL.',
      "SELECT s.name, m.subject, m.marks FROM students s JOIN marks m ON s.id = m.student_id WHERE m.marks IS NULL",
    ],
  },

  /* ─── SECTION B — ACADEMIC INTELLIGENCE (60 pts total) ─ */

  // ── B1: Top 5 scorers in DBMS ──────────────────────────
  {
    id: 'B1',
    title: 'DBMS Leaderboard Extraction',
    section: 'B',
    points: 10,
    hintCost: 4,
    hintsAllowed: true,
    unlockAfter: null, // Unlocks when section B opens
    missionFlavour: '> ACCESS GRANTED: SECTION B — ACADEMIC INTELLIGENCE REPORT.',
    description:
      'Retrieve the top 5 students by marks in the subject DBMS. ' +
      'Return name, marks. Show highest marks first. Exclude NULL marks.',
    expectedShape: ['name', 'marks'],
    validateFn: (rows) => {
      if (rows.length === 5) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Join students and marks, filter WHERE subject = \'DBMS\' AND marks IS NOT NULL.',
      "SELECT s.name, m.marks FROM students s JOIN marks m ON s.id = m.student_id WHERE m.subject = 'DBMS' AND m.marks IS NOT NULL ORDER BY m.marks DESC LIMIT 5",
    ],
  },

  // ── B1a: Average marks per subject ─────────────────────
  {
    id: 'B1a',
    title: 'Subject Performance Matrix',
    section: 'B',
    points: 8,
    hintCost: 4,
    hintsAllowed: true,
    unlockAfter: 'B1',
    missionFlavour: '> COMPUTING CROSS-SUBJECT PERFORMANCE MATRIX.',
    description:
      'Calculate average marks per subject across all students. ' +
      'Return subject and avg_marks (rounded to 1 decimal). ' +
      'Exclude NULL marks. Order by avg_marks descending.',
    expectedShape: ['subject', 'avg_marks'],
    validateFn: (rows) => {
      if (rows.length === 4) return 'full'; // 4 subjects seeded in marks
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use GROUP BY subject with AVG(marks) and WHERE marks IS NOT NULL.',
      "SELECT subject, ROUND(AVG(marks), 1) AS avg_marks FROM marks WHERE marks IS NOT NULL GROUP BY subject ORDER BY avg_marks DESC",
    ],
  },

  // ── B2: Students below attendance threshold ─────────────
  {
    id: 'B2',
    title: 'Attendance Defaulters List',
    section: 'B',
    points: 12,
    hintCost: 4,
    hintsAllowed: true,
    unlockAfter: null, // Available when B opens
    missionFlavour: '> SCANNING ATTENDANCE RECORDS... DEFAULTERS FLAGGED.',
    description:
      'Identify students whose attendance percentage is below 75% in ANY subject. ' +
      'Calculate percentage as (attended * 100.0 / total). ' +
      'Return student name, subject, attended, total, and percentage (rounded to 1 decimal). ' +
      'Order by percentage ascending.',
    expectedShape: ['name', 'subject', 'attended', 'total', 'percentage'],
    validateFn: (rows) => {
      const allBelow = rows.every((r) => {
        const pct = parseFloat(String(r[4]));
        return pct < 75;
      });
      if (rows.length > 0 && allBelow) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use (attended * 100.0 / total) to calculate percentage.',
      "SELECT s.name, a.subject, a.attended, a.total, ROUND(a.attended*100.0/a.total,1) AS percentage FROM students s JOIN attendance a ON s.id=a.student_id WHERE (a.attended*100.0/a.total) < 75 ORDER BY percentage ASC",
    ],
  },

  // ── B2a: Dept-wise defaulter count ─────────────────────
  {
    id: 'B2a',
    title: 'Defaulter Count by Department',
    section: 'B',
    points: 8,
    hintCost: 4,
    hintsAllowed: true,
    unlockAfter: 'B2',
    missionFlavour: '> DEPARTMENT-LEVEL EXPOSURE ANALYSIS IN PROGRESS.',
    description:
      'Count the number of attendance defaulters (< 75%) per department. ' +
      'Return dept and defaulter_count. ' +
      'Only show departments that HAVE defaulters. Order by defaulter_count descending.',
    expectedShape: ['dept', 'defaulter_count'],
    validateFn: (rows) => {
      if (rows.length > 0 && rows.every((r) => Number(r[1]) > 0)) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Join students, attendance; filter below 75%; GROUP BY dept.',
      "SELECT s.dept, COUNT(DISTINCT s.id) AS defaulter_count FROM students s JOIN attendance a ON s.id=a.student_id WHERE (a.attended*100.0/a.total)<75 GROUP BY s.dept ORDER BY defaulter_count DESC",
    ],
  },

  // ── B3: Combined risk report — low CGPA + low attendance ─
  {
    id: 'B3',
    title: 'Dual-Risk Operative Report',
    section: 'B',
    points: 12,
    hintCost: 4,
    hintsAllowed: true,
    unlockAfter: null, // Available when B opens
    missionFlavour: '> CRITICAL: CROSS-REFERENCING ACADEMIC + ATTENDANCE RISK INDICATORS.',
    description:
      'Find students who BOTH have a CGPA below 7.5 AND have at least one subject ' +
      'with attendance below 75%. Return name, dept, cgpa. Order by cgpa ascending. ' +
      'Each student should appear only once.',
    expectedShape: ['name', 'dept', 'cgpa'],
    validateFn: (rows) => {
      const unique = new Set(rows.map((r) => r[0]));
      if (unique.size === rows.length && rows.length > 0) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [
      'Use a subquery or HAVING/WHERE combination. Filter CGPA < 7.5 AND EXISTS attendance < 75%.',
      "SELECT DISTINCT s.name, s.dept, s.cgpa FROM students s JOIN attendance a ON s.id=a.student_id WHERE s.cgpa<7.5 AND (a.attended*100.0/a.total)<75 ORDER BY s.cgpa ASC",
    ],
  },

  /* ─── SECTION C — ADVANCED EXTRACTION (50 pts total) ─── */

  // ── C1: Rank students by total marks ───────────────────
  {
    id: 'C1',
    title: 'Total Marks Ranking',
    section: 'C',
    points: 12,
    hintCost: 0,
    hintsAllowed: false,
    unlockAfter: null, // Unlocks when section C opens
    missionFlavour: '> SECTION C: ADVANCED EXTRACTION PROTOCOL. NO RESOURCES AVAILABLE.',
    description:
      'Calculate the total marks for each student (sum of all their non-NULL marks). ' +
      'Return student name, dept, and total_marks. ' +
      'Order by total_marks descending. Only include students who have at least one marks entry.',
    expectedShape: ['name', 'dept', 'total_marks'],
    validateFn: (rows) => {
      const sorted = [...rows].sort((a, b) => Number(b[2]) - Number(a[2]));
      const isSorted = rows.every(
        (r, i) => Number(r[2]) === Number(sorted[i][2])
      );
      if (rows.length > 0 && isSorted) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [],
  },

  // ── C1a: Cross-join marks + attendance summary ─────────
  {
    id: 'C1a',
    title: 'Comprehensive Student Report',
    section: 'C',
    points: 12,
    hintCost: 0,
    hintsAllowed: false,
    unlockAfter: 'C1',
    missionFlavour: '> COMPILING FULL DOSSIER: MARKS + ATTENDANCE COMBINED.',
    description:
      'For each student, show: name, dept, average marks (avg_marks, rounded 1dp), ' +
      'and average attendance percentage (avg_attendance, rounded 1dp). ' +
      'Exclude students with no marks entries. Order by avg_marks descending.',
    expectedShape: ['name', 'dept', 'avg_marks', 'avg_attendance'],
    validateFn: (rows) => {
      if (rows.length > 0 && rows[0].length === 4) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [],
  },

  // ── C2: Percentile / RANK window function simulation ───
  {
    id: 'C2',
    title: 'Elite Operative Classification',
    section: 'C',
    points: 14,
    hintCost: 0,
    hintsAllowed: false,
    unlockAfter: null, // Available when C opens
    missionFlavour: '> CLASSIFYING OPERATIVES BY PERFORMANCE TIER.',
    description:
      'Classify each student into a performance tier based on their CGPA: ' +
      '"ELITE" if cgpa >= 9.0, "ADVANCED" if 8.0 <= cgpa < 9.0, ' +
      '"STANDARD" if 7.0 <= cgpa < 8.0, "REMEDIAL" if cgpa < 7.0. ' +
      'Return name, cgpa, and tier. Order by cgpa descending.',
    expectedShape: ['name', 'cgpa', 'tier'],
    validateFn: (rows) => {
      if (rows.length === 30) {
        const correctTiers = rows.every((r) => {
          const cgpa = Number(r[1]);
          const tier = r[2];
          if (cgpa >= 9.0) return tier === 'ELITE';
          if (cgpa >= 8.0) return tier === 'ADVANCED';
          if (cgpa >= 7.0) return tier === 'STANDARD';
          return tier === 'REMEDIAL';
        });
        return correctTiers ? 'full' : 'partial';
      }
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [],
  },

  // ── C2a: Dept-wise tier summary ────────────────────────
  {
    id: 'C2a',
    title: 'Department Tier Intelligence',
    section: 'C',
    points: 12,
    hintCost: 0,
    hintsAllowed: false,
    unlockAfter: 'C2',
    missionFlavour: '> GENERATING DEPARTMENT-LEVEL TIER INTEL REPORT.',
    description:
      'For each department, count how many students fall into each tier ' +
      '(ELITE / ADVANCED / STANDARD / REMEDIAL). ' +
      'Return dept, tier, and count. Order by dept, then tier.',
    expectedShape: ['dept', 'tier', 'count'],
    validateFn: (rows) => {
      if (rows.length > 0 && rows[0].length === 3) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [],
  },

  /* ─── BONUS ROUND ─────────────────────────────────────── */

  // ── BONUS1: Query Optimization ─────────────────────────
  {
    id: 'BONUS1',
    title: 'Query Optimization Sprint',
    section: 'BONUS',
    points: 8,
    hintCost: 0,
    hintsAllowed: false,
    unlockAfter: null, // Admin triggers
    missionFlavour: '> ⚡ BONUS PROTOCOL ACTIVATED — OPTIMIZE OR PERISH.',
    description:
      'The intelligence system detected a slow query. Rewrite the following ' +
      'query to produce the same result more efficiently (avoid SELECT *):\n\n' +
      'SLOW: SELECT * FROM students s, marks m WHERE s.id = m.student_id AND m.marks > 70;\n\n' +
      'Return name, dept, subject, marks. Order by marks DESC.',
    expectedShape: ['name', 'dept', 'subject', 'marks'],
    validateFn: (rows) => {
      if (rows.length > 0 && rows[0].length === 4) return 'full';
      return 'none';
    },
    hints: [],
  },

  // ── BONUS2: Written explanation (non-SQL) ──────────────
  {
    id: 'BONUS2',
    title: 'Strategic Intelligence Brief',
    section: 'BONUS',
    points: 7,
    hintCost: 0,
    hintsAllowed: false,
    unlockAfter: null, // Admin triggers
    missionFlavour: '> BONUS TASK 2: WRITTEN DEBRIEF REQUIRED.',
    description:
      'Write a SQL query that finds the department with the highest average attendance. ' +
      'Then explain (in the text area below): (1) What does your query do step by step? ' +
      '(2) Why did you choose this approach? (3) What SQL concepts did you apply?',
    expectedShape: ['dept', 'avg_attendance'],
    validateFn: (rows) => {
      if (rows.length === 1 && rows[0].length === 2) return 'full';
      if (rows.length > 0) return 'partial';
      return 'none';
    },
    hints: [],
  },
];

export default TASKS;

/* ─── HELPERS ────────────────────────────────────────── */

export function getTaskById(id: string): Task | undefined {
  return TASKS.find((t) => t.id === id);
}

export function getTasksBySection(section: TaskSection): Task[] {
  return TASKS.filter((t) => t.section === section);
}

export function getSectionPoints(section: TaskSection): number {
  return getTasksBySection(section).reduce((sum, t) => sum + t.points, 0);
}
