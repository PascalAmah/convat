/**
 * dependency-stubber (CONV-108)
 *
 * Builds a stub contract for each classified dependency. Stubs are hand-written,
 * so this adds no runtime dependencies.
 *
 * Context imports are represented as provider stubs instead of standalone
 * modules, per TDD §3.6. Every other kind maps to a mock strategy.
 */

import type {
  DependencyClassification,
  DependencyKind,
  MockStrategy,
  ProviderRequirement,
  ProviderStub,
  ProviderWrapStrategy,
  StubContract,
  StubManifest,
} from "../types/index.js";

const STRATEGY_BY_KIND: Readonly<Record<Exclude<DependencyKind, "context">, MockStrategy>> =
  {
    "ui-component": "render-children-passthrough",
    hook: "noop-function",
    utility: "noop-function",
    asset: "placeholder-asset",
    unknown: "generic-fallback",
  };

const WRAP_BY_PROVIDER: Readonly<Record<string, ProviderWrapStrategy>> = {
  context: "generic-context",
  "redux-like": "generic-store-like",
  unknown: "passthrough",
};

export function generateStubs(
  classifications: DependencyClassification[],
  providerRequirements: ProviderRequirement[]
): StubManifest {
  const stubs: StubContract[] = [];
  const providerStubs: ProviderStub[] = [];

  for (const classification of classifications) {
    if (classification.kind === "context") {
      addProvider(providerStubs, {
        providerName:
          classification.importedNames[0] ?? classification.importPath,
        wrapStrategy: "generic-context",
      });
      continue;
    }

    stubs.push({
      importPath: classification.importPath,
      kind: classification.kind,
      exportNames: classification.importedNames,
      mockStrategy: STRATEGY_BY_KIND[classification.kind],
      confidence: classification.confidence,
      reason: classification.evidence,
    });
  }

  for (const requirement of providerRequirements) {
    addProvider(providerStubs, {
      providerName: requirement.hookOrPattern,
      wrapStrategy: WRAP_BY_PROVIDER[requirement.inferredKind] ?? "passthrough",
    });
  }

  return { stubs, providerStubs };
}

function addProvider(providers: ProviderStub[], next: ProviderStub): void {
  if (providers.some((one) => one.providerName === next.providerName)) return;
  providers.push(next);
}
