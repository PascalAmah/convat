/**
 * dependency-classifier — TDD v1.0 §3.5
 *
 * Responsibility: classify each unresolved import by kind (ui-component /
 * hook / context / utility / asset / unknown) via deterministic heuristics
 * on usage shape (not semantic inference — see Error Handling Spec §6).
 *
 * Ticket: CONV-107
 * Status: not yet implemented
 */

import type { RawImport, DependencyClassification } from "../types/index.js";

export function classifyDependencies(
  unresolvedImports: RawImport[]
): DependencyClassification[] {
  throw new Error(
    "dependency-classifier.classifyDependencies: not yet implemented (CONV-107)"
  );
}
