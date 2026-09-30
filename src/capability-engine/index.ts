/**
 * capability-engine — TDD v1.0 §3.3
 *
 * Responsibility: the single authoritative pass that determines what the
 * component needs and what Convat can actually provide. Produces the
 * FULL / PARTIAL / FAILED status (PRD v1.0 §1b).
 *
 * Ticket: CONV-105
 * Status: not yet implemented
 */

import type { ComponentManifest, CapabilityReport } from "../types/index.js";

export function assessCapability(manifest: ComponentManifest): CapabilityReport {
  throw new Error("capability-engine.assessCapability: not yet implemented (CONV-105)");
}
