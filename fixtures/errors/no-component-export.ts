/**
 * Fixture: no-component-export.ts
 * Exercises: NoComponentFoundError path (Error Handling Spec §3.6)
 * Expected: exit code 2, no server started, no fallback attempted.
 * Note: plain utility file, not even .tsx — nothing here is a React component.
 */

export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
