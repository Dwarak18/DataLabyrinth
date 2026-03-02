// lib/level2/sectionGate.ts
// Section unlock logic.
// Section B unlocks when A1 + A2 + A3 are all submitted (any score).
// Section C unlocks when B1 + B2 + B3 are all submitted (any score).
// BONUS unlocks only via admin trigger.

export type SectionStatus = 'locked' | 'unlocked';

export interface SectionState {
  A: SectionStatus;
  B: SectionStatus;
  C: SectionStatus;
  BONUS: SectionStatus;
}

const SECTION_B_REQUIRED = new Set(['A1', 'A2', 'A3']);
const SECTION_C_REQUIRED = new Set(['B1', 'B2', 'B3']);

/**
 * Compute which sections are unlocked based on the set of submitted task IDs.
 * @param submittedTaskIds  Set of task IDs with any score > 0 (or at least attempted)
 * @param bonusReleased     Whether admin has triggered the bonus round
 */
export function computeSectionState(
  submittedTaskIds: Set<string>,
  bonusReleased: boolean
): SectionState {
  const bUnlocked = Array.from(SECTION_B_REQUIRED).every((id) => submittedTaskIds.has(id));
  const cUnlocked = Array.from(SECTION_C_REQUIRED).every((id) => submittedTaskIds.has(id));

  return {
    A: 'unlocked',
    B: bUnlocked ? 'unlocked' : 'locked',
    C: cUnlocked ? 'unlocked' : 'locked',
    BONUS: bonusReleased ? 'unlocked' : 'locked',
  };
}

/**
 * Check if a specific task is playable given the current section state.
 */
export function isTaskPlayable(
  taskSection: 'A' | 'B' | 'C' | 'BONUS',
  sectionState: SectionState,
  unlockAfter: string | null,
  submittedTaskIds: Set<string>
): boolean {
  if (sectionState[taskSection] === 'locked') return false;
  if (unlockAfter && !submittedTaskIds.has(unlockAfter)) return false;
  return true;
}
