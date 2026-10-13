// Active study level (N5..N1), stored in localStorage.
// The study level (what you're learning now) and the target level
// (your goal, in Profile) are tracked separately.
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'] as const;
export type Level = (typeof LEVELS)[number];

const KEY = 'kasaneru-level';

export async function currentLevel(): Promise<Level> {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored && (LEVELS as readonly string[]).includes(stored)) {
      return stored as Level;
    }
  } catch {
    /* abaikan */
  }
  return 'N5';
}

export function setLevel(level: Level): void {
  try {
    localStorage.setItem(KEY, level);
  } catch {
    /* abaikan */
  }
}
