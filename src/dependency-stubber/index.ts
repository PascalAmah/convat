/**
 * dependency-stubber — TDD v1.0 §3.6
 *
 * Responsibility: turn each DependencyClassification into an actual stub
 * module, following the strategy table in TDD §3.6. Stubs are hand-rolled —
 * no runtime dependency (e.g. redux-mock-store) is introduced.
 *
 * Ticket: CONV-108
 * Status: not yet implemented
 */

import type {
  DependencyClassification,
  ProviderRequirement,
  StubManifest,
} from "../types/index.js";

export function generateStubs(
  classifications: DependencyClassification[],
  providerRequirements: ProviderRequirement[]
): StubManifest {
  throw new Error("dependency-stubber.generateStubs: not yet implemented (CONV-108)");
}
