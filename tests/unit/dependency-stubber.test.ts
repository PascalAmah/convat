/**
 * Unit tests for dependency-stubber — Test Plan §4:
 *
 *   "Each kind produces the correct mockStrategy per TDD §3.6 table;
 *    StubContract.reason is populated and human-readable; no runtime
 *    dependency is introduced. Context is routed to providerStubs."
 */

import { describe, expect, it } from "vitest";

import { generateStubs } from "../../src/dependency-stubber/index.js";
import type {
  DependencyClassification,
  DependencyKind,
  ProviderRequirement,
} from "../../src/types/index.js";

function classification(
  overrides: Partial<DependencyClassification> & { kind: DependencyKind }
): DependencyClassification {
  return {
    importPath: "./dep",
    confidence: "medium",
    importedNames: ["Dep"],
    evidence: "because the heuristic matched",
    ...overrides,
  };
}

describe("dependency-stubber — strategy table", () => {
  it("maps ui-component to a children passthrough", () => {
    const { stubs } = generateStubs(
      [classification({ kind: "ui-component", importedNames: ["Avatar"] })],
      []
    );

    expect(stubs).toEqual([
      {
        importPath: "./dep",
        kind: "ui-component",
        exportNames: ["Avatar"],
        mockStrategy: "render-children-passthrough",
        confidence: "medium",
        reason: "because the heuristic matched",
      },
    ]);
  });

  it.each([
    ["hook", "noop-function"],
    ["utility", "noop-function"],
    ["asset", "placeholder-asset"],
    ["unknown", "generic-fallback"],
  ] as const)("maps %s to %s", (kind, mockStrategy) => {
    const { stubs } = generateStubs([classification({ kind })], []);

    expect(stubs).toHaveLength(1);
    expect(stubs[0]).toMatchObject({ kind, mockStrategy });
  });

  it("carries confidence, exportNames and reason through", () => {
    const { stubs } = generateStubs(
      [
        classification({
          kind: "hook",
          importPath: "./hooks/useAuth",
          importedNames: ["useAuth"],
          confidence: "high",
          evidence: "name matches /^use[A-Z]/ and is called like a function",
        }),
      ],
      []
    );

    expect(stubs[0]).toMatchObject({
      importPath: "./hooks/useAuth",
      exportNames: ["useAuth"],
      confidence: "high",
      reason: "name matches /^use[A-Z]/ and is called like a function",
    });
  });

  it("routes context to providerStubs instead of a standalone stub", () => {
    const { stubs, providerStubs } = generateStubs(
      [classification({ kind: "context", importedNames: ["ThemeContext"] })],
      []
    );

    expect(stubs).toEqual([]);
    expect(providerStubs).toEqual([
      { providerName: "ThemeContext", wrapStrategy: "generic-context" },
    ]);
  });
});

describe("dependency-stubber — providers", () => {
  it.each([
    [{ hookOrPattern: "useContext(ThemeContext)", inferredKind: "context" }, "generic-context"],
    [{ hookOrPattern: "useSelector", inferredKind: "redux-like" }, "generic-store-like"],
    [{ hookOrPattern: "useThing", inferredKind: "unknown" }, "passthrough"],
  ] as const)("maps %o to %s", (requirement, wrapStrategy) => {
    const { providerStubs } = generateStubs(
      [],
      [requirement as ProviderRequirement]
    );

    expect(providerStubs).toEqual([
      { providerName: requirement.hookOrPattern, wrapStrategy },
    ]);
  });

  it("does not duplicate a provider seen in both inputs", () => {
    const { providerStubs } = generateStubs(
      [classification({ kind: "context", importedNames: ["ThemeContext"] })],
      [{ hookOrPattern: "ThemeContext", inferredKind: "context" }]
    );

    expect(providerStubs).toEqual([
      { providerName: "ThemeContext", wrapStrategy: "generic-context" },
    ]);
  });
});
