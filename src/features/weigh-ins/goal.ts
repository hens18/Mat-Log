import { roundWeight } from './trend';

export type GoalStatus =
  | { state: 'above'; difference: number }
  | { state: 'below'; difference: number }
  | { state: 'at' };

/** How the current weight compares to the goal, within a 0.1 tolerance. */
export function goalStatus(current: number, goal: number): GoalStatus {
  const difference = roundWeight(current - goal);
  if (difference > 0) return { state: 'above', difference };
  if (difference < 0) return { state: 'below', difference: -difference };
  return { state: 'at' };
}
