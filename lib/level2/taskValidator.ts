// lib/level2/taskValidator.ts
import { getTaskById, MatchType } from './taskConfig';

export interface ValidationResult {
  match: MatchType;
  rowCount: number;
  message: string;
}

export function validate(
  taskId: string,
  rows: (string | number | null)[][]
): ValidationResult {
  const task = getTaskById(taskId);
  if (!task) {
    return { match: 'none', rowCount: 0, message: 'Unknown task ID.' };
  }

  const match = task.validateFn(rows);
  const rowCount = rows.length;

  const messages: Record<MatchType, string> = {
    full:    `✅ INTEL ACQUIRED — Exact match. ${rowCount} row(s) verified.`,
    partial: `⚠️ PARTIAL MATCH — Some data retrieved. ${rowCount} row(s) found.`,
    none:    `❌ ACCESS DENIED — Incorrect result. ${rowCount} row(s) returned.`,
  };

  return { match, rowCount, message: messages[match] };
}
