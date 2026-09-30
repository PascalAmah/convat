/**
 * shell-generator — TDD v1.0 §3.8
 *
 * Responsibility: compose the final HTML shell. Owns the single controlled
 * React runtime (loaded exactly once, before any component bundle executes).
 * No unconditional external CDN dependency for styling by default
 * (PRD v1.0 §1d) — local compatibility styles instead, with --css as an
 * explicit opt-in for additional local stylesheets.
 *
 * Ticket: CONV-111
 * Status: not yet implemented
 */

import type { MockedProps, CapabilityReport } from "../types/index.js";

export function generateShell(
  bundleCode: string,
  mockedProps: MockedProps,
  capability: CapabilityReport,
  cssPath?: string
): string {
  throw new Error("shell-generator.generateShell: not yet implemented (CONV-111)");
}
