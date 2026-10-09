/**
 * Unit tests for capability-engine — Test Plan v1.0 §4:
 *
 *   "`status` derivation matches the rule in TDD §3.3 exactly for each
 *    combination of resolved/unresolved imports, provider requirements, and
 *    style requirements; `FULL` is never returned when any approximation
 *    occurred"
 *
 * The fixture table below is an early, cheap CONV-113 (build-plan Phase 1.2
 * item 10): all 13 fixtures are asserted against their documented status, so
 * a rule change that moves a status fails here immediately instead of at
 * integration time. Fixture expectations themselves trace to errata — notably
 * D3 (complex props), D2 (runtime imports) and D4-A (style imports).
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assessCapability } from "../../src/capability-engine/index.js";
import { extractComponent } from "../../src/ast-extractor/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import { NoComponentFoundError } from "../../src/types/index.js";
import type {
  CapabilityReport,
  CapabilityStatus,
  ComponentManifest,
} from "../../src/types/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Full pipeline slice for one fixture: resolver → extractor → capability-engine. */
function reportFor(relativePath: string): CapabilityReport {
  const target = resolveTarget({
    target: join(repoRoot, "fixtures", relativePath),
  });
  return assessCapability(extractComponent(target));
}

/** A minimal manifest for isolated tests, so a rule can be tested without a file. */
function manifestWith(
  overrides: Partial<ComponentManifest>
): ComponentManifest {
  return {
    componentName: "Example",
    exportType: "default",
    props: [],
    imports: [],
    hookCalls: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Fixture status matrix (early CONV-113)
// ─────────────────────────────────────────────────────────────────────────

const FIXTURE_STATUSES: ReadonlyArray<[string, CapabilityStatus]> = [
  ["components/01-basic.tsx", "FULL"],
  ["components/02-typescript.tsx", "FULL"],
  // errata D3: complex/generic props → fallbackFields → PARTIAL
  ["components/03-nested-props.tsx", "PARTIAL"],
  // errata D2: react is externalized, ./support/* resolve, only useState used
  ["components/04-local-imports.tsx", "FULL"],
  ["components/05-missing-imports.tsx", "PARTIAL"],
  ["components/06-context.tsx", "PARTIAL"],
  ["components/07-redux.tsx", "PARTIAL"],
  // errata D4-A: the .scss resolves, so styling IS determined → no downgrade
  ["components/08-styling.tsx", "FULL"],
  // errata D4-A second branch: style import does not resolve → PARTIAL
  ["components/08b-styling-unresolved.tsx", "PARTIAL"],
  // env stubbing is RESOLVED severity — must not affect status (Test Plan §3)
  ["components/09-env-vars.tsx", "FULL"],
  ["components/10-ai-generated.tsx", "PARTIAL"],
  ["errors/throws-on-render.tsx", "PARTIAL"],
  ["errors/monorepo-alias-import.tsx", "PARTIAL"],
];

describe("capability-engine — fixture status matrix", () => {
  it.each(FIXTURE_STATUSES)("%s → %s", (relativePath, expectedStatus) => {
    expect(reportFor(relativePath).status).toBe(expectedStatus);
  });

  it("never reaches the engine when no component exists (NoComponentFoundError)", () => {
    const target = resolveTarget({
      target: join(repoRoot, "fixtures", "errors", "no-component-export.ts"),
    });

    expect(() => assessCapability(extractComponent(target))).toThrow(
      NoComponentFoundError
    );
  });

  it("only ever returns FULL or PARTIAL — FAILED never originates here", () => {
    const statuses = FIXTURE_STATUSES.map(
      ([relativePath]) => reportFor(relativePath).status
    );

    for (const status of statuses) {
      expect(["FULL", "PARTIAL"]).toContain(status);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────
// errata D2 — runtime imports are satisfied by externalization
// ─────────────────────────────────────────────────────────────────────────

describe("capability-engine — D2 runtime imports", () => {
  it("keeps runtime imports out of both resolved and unresolved", () => {
    const report = assessCapability(
      manifestWith({
        imports: [
          { path: "react", resolvesToFile: false, importedNames: ["useState"] },
          {
            path: "./Avatar",
            resolvesToFile: true,
            importedNames: ["Avatar"],
          },
          {
            path: "./Missing",
            resolvesToFile: false,
            importedNames: ["Missing"],
          },
        ],
      })
    );

    expect(report.resolvedImports.map((entry) => entry.path)).toEqual([
      "./Avatar",
    ]);
    expect(report.unresolvedImports.map((entry) => entry.path)).toEqual([
      "./Missing",
    ]);
    expect(report.status).toBe("PARTIAL");
  });

  it("stays FULL when the ONLY unresolved thing on disk is the runtime itself", () => {
    // 04's `react` import does not resolve — nothing is installed here — but
    // per D2 externalization satisfies it, so the fixture's two real imports
    // and no others are what gets judged.
    const report = reportFor("components/04-local-imports.tsx");

    expect(report.resolvedImports.map((entry) => entry.path)).toEqual([
      "./support/Avatar",
      "./support/Badge",
    ]);
    expect(report.unresolvedImports).toEqual([]);
    expect(report.status).toBe("FULL");
  });

  it("always reports exactly the three runtime requirements, externalized", () => {
    expect(reportFor("components/01-basic.tsx").runtimeRequirements).toEqual([
      { name: "react", mustBeExternalized: true },
      { name: "react-dom", mustBeExternalized: true },
      { name: "react/jsx-runtime", mustBeExternalized: true },
    ]);
  });

  it("partitions every non-runtime import exactly once", () => {
    const report = reportFor("components/10-ai-generated.tsx");
    const partitioned = [
      ...report.resolvedImports,
      ...report.unresolvedImports,
    ].map((entry) => entry.path);

    expect(partitioned.sort()).toEqual(
      [
        "./hooks/useDebounce",
        "./icons/SearchIcon",
        "./utils/formatResultCount",
      ].sort()
    );
    expect(report.resolvedImports).toHaveLength(0);
    expect(report.unresolvedImports).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// errata D3 — complex props contribute to PARTIAL
// ─────────────────────────────────────────────────────────────────────────

describe("capability-engine — D3 prop contract", () => {
  it("returns FULL when every prop is cleanly mockable", () => {
    expect(reportFor("components/01-basic.tsx").status).toBe("FULL");
  });

  it("returns PARTIAL as soon as any prop is complex (fallbackFields)", () => {
    const report = assessCapability(
      manifestWith({
        props: [
          {
            name: "title",
            tsType: "string",
            category: "primitive",
            required: true,
          },
          {
            name: "data",
            tsType: "Record<string, unknown>",
            category: "complex",
            required: true,
          },
        ],
      })
    );

    expect(report.status).toBe("PARTIAL");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// errata D4-A — a resolvable style import reports, but does not downgrade
// ─────────────────────────────────────────────────────────────────────────

describe("capability-engine — D4-A style requirements", () => {
  it("REPORTS a resolvable style import without downgrading status", () => {
    const report = assessCapability(
      manifestWith({
        imports: [
          {
            path: "./Panel.module.css",
            resolvesToFile: true,
            importedNames: [],
          },
        ],
      })
    );

    expect(report.styleRequirements).toEqual([
      { kind: "css-module", sourceFile: "./Panel.module.css" },
    ]);
    expect(report.status).toBe("FULL");
  });

  it("downgrades to PARTIAL when a style import does not resolve", () => {
    const report = assessCapability(
      manifestWith({
        imports: [
          {
            path: "./Panel.module.css",
            resolvesToFile: false,
            importedNames: [],
          },
        ],
      })
    );

    expect(report.styleRequirements).toHaveLength(1);
    expect(report.status).toBe("PARTIAL");
  });

  it("fixture 08 stays FULL with its styling still visible in the report", () => {
    const report = reportFor("components/08-styling.tsx");

    // The point of D4-A: the panel shows the style requirement AND the status
    // stays FULL, because a resolvable import means the approach was determined.
    expect(report.styleRequirements).toEqual([
      { kind: "css-module", sourceFile: "./styles/StyledPanel.module.scss" },
    ]);
    expect(report.unresolvedImports).toEqual([]);
    expect(report.status).toBe("FULL");
  });

  it("fixture 08b records the missing stylesheet and drops to PARTIAL", () => {
    const report = reportFor("components/08b-styling-unresolved.tsx");

    expect(report.styleRequirements).toEqual([
      {
        kind: "css-module",
        sourceFile: "./styles/MyMissingPanel.module.css",
      },
    ]);
    expect(report.status).toBe("PARTIAL");
  });

  it("distinguishes sass from css-module from plain css", () => {
    const report = assessCapability(
      manifestWith({
        imports: [
          { path: "./a.scss", resolvesToFile: true, importedNames: [] },
          { path: "./b.module.scss", resolvesToFile: true, importedNames: [] },
          { path: "./c.css", resolvesToFile: true, importedNames: [] },
        ],
      })
    );

    expect(report.styleRequirements.map((requirement) => requirement.kind)).toEqual([
      "sass",
      "css-module",
      "unknown",
    ]);
    expect(report.status).toBe("FULL");
  });

  it("treats non-style assets as ordinary imports, not style requirements", () => {
    const report = assessCapability(
      manifestWith({
        imports: [
          { path: "./logo.png", resolvesToFile: true, importedNames: [] },
        ],
      })
    );

    expect(report.styleRequirements).toEqual([]);
    expect(report.resolvedImports).toHaveLength(1);
    expect(report.status).toBe("FULL");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Provider requirements (EHS §3.3)
// ─────────────────────────────────────────────────────────────────────────

describe("capability-engine — provider requirements", () => {
  it("detects useContext with its context name as a context provider", () => {
    expect(reportFor("components/06-context.tsx").providerRequirements).toEqual([
      { hookOrPattern: "useContext(ThemeContext)", inferredKind: "context" },
    ]);
  });

  it("detects store hooks as redux-like", () => {
    expect(reportFor("components/07-redux.tsx").providerRequirements).toEqual([
      { hookOrPattern: "useSelector", inferredKind: "redux-like" },
    ]);
  });

  it("does NOT treat React built-ins as providers — the shell serves React", () => {
    expect(
      reportFor("components/04-local-imports.tsx").providerRequirements
    ).toEqual([]);
    expect(
      reportFor("components/09-env-vars.tsx").providerRequirements
    ).toEqual([]);
  });

  it("does NOT treat a custom hook as a provider — it is a dependency to stub", () => {
    // 10 uses useDebounce(): that arrives as an unresolved import which
    // dependency-stubber no-ops. There is no container to wrap around the
    // component for it, so it must not appear as a provider requirement.
    expect(
      reportFor("components/10-ai-generated.tsx").providerRequirements
    ).toEqual([]);
  });
});
