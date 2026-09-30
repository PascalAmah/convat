/**
 * Public entry point for `@convat/cli` — TDD v1.0 §2 pipeline surface.
 *
 * This is the only file at the root of `src/`: every other folder is one
 * pipeline stage, in execution order
 *
 *   resolver -> ast-extractor -> capability-engine -> prop-mocker
 *            -> dependency-classifier -> dependency-stubber -> bundler
 *            -> shell-generator -> server
 *
 * with `cli/` as the binary entry point (see `package.json` -> `bin`).
 *
 * Importing this module gives consumers the pipeline's data contracts
 * (`./types`) plus each stage's entry function. Stages that are not yet
 * implemented throw a clear `<module>.<fn>: not yet implemented (CONV-xxx)`
 * error rather than silently no-opping, so nothing downstream can build on an
 * unfinished module without noticing. Build order lives in `build-plan.md`.
 *
 * Note: this module deliberately exports no orchestration helper (no
 * `runPipeline`). Pipeline composition belongs to the CLI (`cli/index.ts`)
 * until the stage contracts stop changing — inventing an orchestrator now
 * would freeze signatures that Phase 1 still needs to amend.
 */

// ─────────────────────────────────────────────────────────────────────────
// Data contracts + error taxonomy (TDD §3, §4)
// ─────────────────────────────────────────────────────────────────────────
export * from "./types/index.js";

// ─────────────────────────────────────────────────────────────────────────
// Pipeline stages, in execution order (TDD §3.1 – §3.9)
// ─────────────────────────────────────────────────────────────────────────

// resolver — TDD §3.1 (CONV-102, implemented)
export {
  resolveTarget,
  TargetNotFoundError,
  AmbiguousTargetError,
} from "./resolver/index.js";
export type { ResolveOptions } from "./resolver/index.js";

// ast-extractor — TDD §3.2 (CONV-103/104)
export { extractComponent } from "./ast-extractor/index.js";

// capability-engine — TDD §3.3 (CONV-105)
export { assessCapability } from "./capability-engine/index.js";

// prop-mocker — TDD §3.4 (CONV-106)
export { mockProps } from "./prop-mocker/index.js";

// dependency-classifier — TDD §3.5 (CONV-107)
export { classifyDependencies } from "./dependency-classifier/index.js";

// dependency-stubber — TDD §3.6 (CONV-108)
export { generateStubs } from "./dependency-stubber/index.js";

// bundler — TDD §3.7 (CONV-109/110)
export { bundle } from "./bundler/index.js";

// shell-generator — TDD §3.8 (CONV-111)
export { generateShell } from "./shell-generator/index.js";

// server — TDD §3.9 (CONV-205/206/306)
export { startServer } from "./server/index.js";
export type { ServerOptions } from "./server/index.js";
