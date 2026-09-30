/**
 * ast-extractor — TDD v1.0 §3.2
 *
 * Responsibility: find the exported component, extract its prop contract,
 * and enumerate every import statement (resolved or not) plus raw hook calls.
 *
 * Ticket: CONV-103 (component + prop parsing), CONV-104 (import enumeration + hookCalls)
 * Status: not yet implemented
 */

import type { ResolvedTarget, ComponentManifest } from "../types/index.js";

export function extractComponent(target: ResolvedTarget): ComponentManifest {
  throw new Error("ast-extractor.extractComponent: not yet implemented (CONV-103/CONV-104)");
}
