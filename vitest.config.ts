import { defineConfig } from "vitest/config";

/**
 * Vitest covers two levels (Test Plan v1.0 §2):
 *   - unit:        tests/unit/<module>.test.ts — one file per pipeline module
 *   - integration: tests/integration/** — fixture-driven, full pipeline (CONV-113)
 *
 * `include` is explicit so discovery never depends on defaults, and so helper
 * files can live under tests/ without being picked up as suites.
 */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    /**
     * Integration tests bundle real fixtures through esbuild and (from CONV-113
     * onward) evaluate the output. That is legitimately slower than a unit test,
     * so the default 5s would produce flaky timeouts that mask real hangs.
     */
    testTimeout: 30_000,
  },
});
