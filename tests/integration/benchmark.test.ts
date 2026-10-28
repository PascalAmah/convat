/**
 * CONV-113B benchmark harness.
 *
 * Per-stage warm timings over the fixture suite in zero-repo mode, reported as
 * p50/p95 per fixture category. PRD §3's <500ms/<2s numbers are benchmark
 * targets, not guarantees; this harness logs the measured values and only
 * fails on a pathological regression.
 */

import { afterAll, describe, expect, it } from "vitest";

import { resolveTarget } from "../../src/resolver/index.js";
import { extractComponent } from "../../src/ast-extractor/index.js";
import { assessCapability } from "../../src/capability-engine/index.js";
import { classifyDependencies } from "../../src/dependency-classifier/index.js";
import { generateStubs } from "../../src/dependency-stubber/index.js";
import { mockProps } from "../../src/prop-mocker/index.js";
import { bundle } from "../../src/bundler/index.js";
import { generateShell } from "../../src/shell-generator/index.js";
import { generateSidebarScript } from "../../src/sidebar/index.js";
import {
  cleanupTemporaryDirectories,
  copyIntoZeroRepo,
  EXPECTED,
  runStages,
} from "./harness.js";
import type { StageTimings } from "./harness.js";

const WARM_RUNS = 3;

/** Generous CI guard; the product target is tracked in docs/benchmark-log.md. */
const TOTAL_P95_BUDGET_MS = 5000;

afterAll(() => {
  cleanupTemporaryDirectories();
});

describe("CONV-113B benchmark", () => {
  it("measures p50/p95 per stage and category", async () => {
    const samples: Record<string, StageTimings[]> = {
      component: [],
      error: [],
    };
    const rows: Array<{
      fixture: string;
      category: string;
      totals: number[];
    }> = [];

    for (const expected of EXPECTED) {
      const filePath = copyIntoZeroRepo(expected.fixture);
      const totals: number[] = [];

      await runStages(filePath);
      for (let run = 0; run < WARM_RUNS; run += 1) {
        const result = await runStages(filePath);

        expect(result.report.status).toBe(expected.status);
        samples[expected.category]!.push(result.timings);
        totals.push(result.timings.total);
      }

      rows.push({
        fixture: expected.fixture,
        category: expected.category,
        totals,
      });
    }

    printPerFixture(rows);

    const all: StageTimings[] = [];
    for (const category of ["component", "error"] as const) {
      const categorySamples = samples[category]!;
      all.push(...categorySamples);
      console.log(
        `${category} (n=${categorySamples.length})  ` +
          stageLine(categorySamples)
      );
    }

    console.log(`all fixtures (n=${all.length})  ${stageLine(all)}`);
    console.log(
      "PRD §3 target: <500ms bundle+render, <2s end-to-end including cold Node start " +
        "(benchmark targets; cold start is out of scope for this harness)."
    );

    const p95 = percentile(
      all.map((timings) => timings.total),
      95
    );
    expect(p95).toBeLessThan(TOTAL_P95_BUDGET_MS);
  });

  it("measures the stdin (pasted component) path", async () => {
    const source = `
      import { useState } from "react";
      export default function Paste() {
        const [count, setCount] = useState(0);
        return <button onClick={() => setCount(count + 1)}>{count}</button>;
      }
    `;

    const sidebarScript = await generateSidebarScript();
    const totals: number[] = [];
    for (let run = 0; run < WARM_RUNS + 1; run += 1) {
      const started = performance.now();
      const target = resolveTarget({ target: "-", readStdin: () => source });
      const manifest = extractComponent(target);
      const report = assessCapability(manifest);
      const mockedProps = mockProps(manifest.props);
      const classifications = classifyDependencies(report.unresolvedImports, {
        code: target.code,
        hookCalls: manifest.hookCalls,
      });
      const stubs = generateStubs(classifications, report.providerRequirements);
      const bundleCode = await bundle(target, manifest, mockedProps, stubs);
      generateShell(bundleCode, mockedProps, report, stubs, {
        props: manifest.props,
        sidebarScript,
      });
      const elapsed = performance.now() - started;

      expect(report.status).toBe("FULL");
      if (run > 0) totals.push(elapsed);
    }

    console.log(
      `stdin zero-repo total  p50=${percentile(totals, 50).toFixed(1)}ms  ` +
        `p95=${percentile(totals, 95).toFixed(1)}ms  (n=${totals.length})`
    );
  });
});

function stageLine(timings: StageTimings[]): string {
  const stages: Array<keyof StageTimings> = [
    "ast",
    "capability",
    "classifyStub",
    "bundle",
    "shell",
    "total",
  ];

  return stages
    .map((stage) => {
      const values = timings.map((entry) => entry[stage]);
      return `${stage} p50=${percentile(values, 50).toFixed(1)} p95=${percentile(
        values,
        95
      ).toFixed(1)}`;
    })
    .join("  ");
}

function printPerFixture(
  rows: Array<{ fixture: string; category: string; totals: number[] }>
): void {
  console.log(
    "fixture                                    category   p50 ms   p95 ms"
  );
  for (const row of rows) {
    console.log(
      `${row.fixture.padEnd(42)} ${row.category.padEnd(10)} ` +
        `${percentile(row.totals, 50).toFixed(1).padStart(7)} ` +
        `${percentile(row.totals, 95).toFixed(1).padStart(8)}`
    );
  }
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((fraction / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)]!;
}
