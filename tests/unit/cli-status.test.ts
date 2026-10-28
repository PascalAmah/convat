/**
 * Unit tests for CLI status output (CLI Spec §4, Test Plan §6):
 * single-line form, exact verbose layout, confidence honesty, and the rule
 * that status is derived from the report rather than recomputed.
 */

import { describe, expect, it } from "vitest";

import {
  formatBundleErrorStatus,
  formatStatusLine,
  formatVerboseStatus,
} from "../../src/cli/status.js";
import type {
  CapabilityReport,
  MockedProps,
  StubManifest,
} from "../../src/types/index.js";

function report(overrides: Partial<CapabilityReport> = {}): CapabilityReport {
  return {
    status: "PARTIAL",
    resolvedImports: [],
    unresolvedImports: [],
    providerRequirements: [],
    styleRequirements: [],
    runtimeRequirements: [
      { name: "react", mustBeExternalized: true },
      { name: "react-dom", mustBeExternalized: true },
    ],
    ...overrides,
  };
}

function stubs(overrides: Partial<StubManifest> = {}): StubManifest {
  return { stubs: [], providerStubs: [], ...overrides };
}

function mocked(overrides: Partial<MockedProps> = {}): MockedProps {
  return { values: {}, fallbackFields: [], ...overrides };
}

describe("CLI status output", () => {
  it("prints the single-line FULL form without a parenthetical", () => {
    const line = formatStatusLine(
      report({ status: "FULL" }),
      stubs(),
      mocked({ values: { label: "x", disabled: false } })
    );

    expect(line).toBe("✓ Preview ready — FULL");
  });

  it("summarises counted approximations in the single-line PARTIAL form", () => {
    const line = formatStatusLine(
      report({
        unresolvedImports: [
          { path: "./nonexistent/Avatar", resolvesToFile: false, importedNames: ["Avatar"] },
          { path: "./nonexistent/Badge", resolvesToFile: false, importedNames: ["Badge"] },
        ],
        providerRequirements: [
          { hookOrPattern: "useContext(ThemeContext)", inferredKind: "context" },
        ],
      }),
      stubs({
        stubs: [
          {
            importPath: "./nonexistent/Avatar",
            kind: "ui-component",
            exportNames: ["Avatar"],
            mockStrategy: "render-children-passthrough",
            confidence: "high",
            reason: "capitalized JSX usage",
          },
          {
            importPath: "./nonexistent/Badge",
            kind: "ui-component",
            exportNames: ["Badge"],
            mockStrategy: "render-children-passthrough",
            confidence: "high",
            reason: "capitalized JSX usage",
          },
        ],
        providerStubs: [
          { providerName: "ThemeContext", wrapStrategy: "generic-context" },
        ],
      }),
      mocked({ values: { name: "x" } })
    );

    expect(line).toBe(
      "⚠ Preview ready — PARTIAL (2 dependencies stubbed, 1 provider mocked)"
    );
  });

  it("uses singular nouns for a count of one", () => {
    const line = formatStatusLine(
      report(),
      stubs({
        stubs: [
          {
            importPath: "useAuth",
            kind: "hook",
            exportNames: ["useAuth"],
            mockStrategy: "noop-function",
            confidence: "medium",
            reason: "name matches hook pattern",
          },
        ],
      }),
      mocked()
    );

    expect(line).toBe("⚠ Preview ready — PARTIAL (1 dependency stubbed)");
  });

  it("prints the exact verbose layout from CLI Spec §4", () => {
    const output = formatVerboseStatus(
      report({ resolvedImports: new Array(6).fill(null).map((_, i) => ({
        path: `dep${i}`,
        resolvesToFile: true,
        importedNames: [`dep${i}`],
      })) }),
      stubs({
        stubs: [
          {
            importPath: "useAuth",
            kind: "hook",
            exportNames: ["useAuth"],
            mockStrategy: "noop-function",
            confidence: "medium",
            reason: "name matches hook pattern",
          },
          {
            importPath: "Avatar",
            kind: "ui-component",
            exportNames: ["Avatar"],
            mockStrategy: "render-children-passthrough",
            confidence: "high",
            reason: "capitalized JSX usage",
          },
        ],
        providerStubs: [
          { providerName: "ThemeContext", wrapStrategy: "generic-context" },
        ],
      }),
      mocked({
        values: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`prop${i}`, i])
        ),
      }),
      "http://localhost:3000"
    );

    expect(output).toBe(
      [
        "Preview Status: PARTIAL",
        "",
        "Props",
        "✓ 10/10 generated",
        "",
        "Dependencies",
        "✓ 6 resolved",
        "⚠ 2 stubbed",
        "   ⚠ useAuth → hook stub (medium confidence — inferred from usage pattern)",
        "   ⚠ Avatar → ui-component stub (high confidence — inferred from usage pattern)",
        "",
        "Providers",
        "⚠ 1 mocked (ThemeContext)",
        "",
        "Styles",
        "✓ compatibility styles",
        "",
        "Preview running at http://localhost:3000",
      ].join("\n")
    );
  });

  it("lists fallback fields in both forms", () => {
    const mockedProps = mocked({
      values: { columns: [], rows: [], title: "x" },
      fallbackFields: ["columns", "rows"],
    });
    const line = formatStatusLine(report(), stubs(), mockedProps);
    const verbose = formatVerboseStatus(
      report(),
      stubs(),
      mockedProps,
      "http://localhost:3000"
    );

    expect(line).toContain("2 props need JSON input");
    expect(verbose).toContain("✓ 1/3 generated");
    expect(verbose).toContain("⚠ 2 need JSON input: columns, rows");
  });

  it("never prints a bare percentage or numeric confidence score", () => {
    const verbose = formatVerboseStatus(
      report(),
      stubs({
        stubs: [
          {
            importPath: "useAuth",
            kind: "hook",
            exportNames: ["useAuth"],
            mockStrategy: "noop-function",
            confidence: "medium",
            reason: "name matches hook pattern",
          },
        ],
      }),
      mocked(),
      "http://localhost:3000"
    );

    expect(verbose).not.toMatch(/%/);
    expect(verbose).toContain("inferred from usage pattern");
  });

  it("marks a bundle failure as preview-level FAILED", () => {
    expect(formatBundleErrorStatus()).toBe(
      "✗ Preview ready — FAILED (bundle error)"
    );
  });
});
