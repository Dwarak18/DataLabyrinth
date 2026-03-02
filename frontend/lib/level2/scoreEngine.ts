// lib/level2/scoreEngine.ts
import { getTaskById, MatchType } from './taskConfig';

export interface ScoreResult {
  pointsEarned: number;
  breakdownMsg: string;
}

/**
 * Calculate points for a task submission.
 * @param taskId       Task identifier
 * @param match        Validation result
 * @param hintsUsed    Number of hints used for this task (0 or 1 or 2)
 */
export function calculateScore(
  taskId: string,
  match: MatchType,
  hintsUsed: number
): ScoreResult {
  const task = getTaskById(taskId);
  if (!task) return { pointsEarned: 0, breakdownMsg: 'Unknown task.' };

  const deduction = hintsUsed * task.hintCost;

  let base = 0;
  let label = '';

  switch (match) {
    case 'full':
      base = task.points;
      label = 'Full match';
      break;
    case 'partial':
      base = Math.floor(task.points * 0.5);
      label = 'Partial match';
      break;
    case 'none':
      return { pointsEarned: 0, breakdownMsg: '0 pts — No match.' };
  }

  const pointsEarned = Math.max(0, base - deduction);
  const breakdownMsg = `${label}: ${base} pts - ${deduction} hint deduction = ${pointsEarned} pts`;

  return { pointsEarned, breakdownMsg };
}
