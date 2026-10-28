/**
 * Public entry point for `@convat/cli`.
 *
 * Re-exports the shared types and each pipeline stage, in execution order:
 *   resolver -> ast-extractor -> capability-engine -> prop-mocker
 *            -> dependency-classifier -> dependency-stubber -> bundler
 *            -> shell-generator -> server
 *
 * Pipeline orchestration lives in `cli/`, not here.
 */

// ─────────────────────────────────────────────────────────────────────────
// Data contracts + error taxonomy
// ─────────────────────────────────────────────────────────────────────────
export * from "./types/index.js";

// ─────────────────────────────────────────────────────────────────────────
// Pipeline stages, in execution order
// ─────────────────────────────────────────────────────────────────────────

// resolver (CONV-102, implemented)
export {
  resolveTarget,
  TargetNotFoundError,
  TargetUnreadableError,
  AmbiguousTargetError,
} from "./resolver/index.js";
export type { ResolveOptions } from "./resolver/index.js";

// ast-extractor (CONV-103/104)
export { extractComponent } from "./ast-extractor/index.js";

// capability-engine (CONV-105)
export { assessCapability } from "./capability-engine/index.js";

// prop-mocker (CONV-106)
export { mockProps } from "./prop-mocker/index.js";

// dependency-classifier (CONV-107)
export { classifyDependencies } from "./dependency-classifier/index.js";

// dependency-stubber (CONV-108)
export { generateStubs } from "./dependency-stubber/index.js";

// bundler (CONV-109/110)
export { bundle } from "./bundler/index.js";

// shell-generator (CONV-111)
export { generateShell } from "./shell-generator/index.js";
export type { ShellOptions } from "./shell-generator/index.js";

// server (CONV-205/206/306)
export { startServer } from "./server/index.js";
export type { ServerOptions, ServerHandle } from "./server/index.js";
