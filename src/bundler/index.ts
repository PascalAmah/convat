/**
 * bundler — TDD v1.0 §3.7
 *
 * Responsibility: produce a browser-runnable bundle via esbuild.
 *
 * Non-negotiable requirement: react, react-dom, and react/jsx-runtime are
 * always externalized — never bundled into component code (PRD v1.0 §1c).
 * A single unresolvable import must never crash the entire bundle; it is
 * redirected to its StubManifest entry instead.
 *
 * Ticket: CONV-109 (in-project resolution), CONV-110 (externalization + stubs)
 * Status: not yet implemented
 */

import type {
  ResolvedTarget,
  ComponentManifest,
  MockedProps,
  StubManifest,
} from "../types/index.js";

export function bundle(
  target: ResolvedTarget,
  manifest: ComponentManifest,
  mockedProps: MockedProps,
  stubs: StubManifest
): string {
  throw new Error("bundler.bundle: not yet implemented (CONV-109/CONV-110)");
}
