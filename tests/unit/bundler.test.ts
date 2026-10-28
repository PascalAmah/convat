/**
 * Unit tests for bundler — Test Plan §4:
 *
 *   "In-project real imports resolve; zero-repo unresolved imports redirect to
 *    stubs without throwing; React/ReactDOM/JSX-runtime are confirmed
 *    externalized in every bundle output."
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { bundle } from "../../src/bundler/index.js";
import { assessCapability } from "../../src/capability-engine/index.js";
import { classifyDependencies } from "../../src/dependency-classifier/index.js";
import { generateStubs } from "../../src/dependency-stubber/index.js";
import { mockProps } from "../../src/prop-mocker/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import { BundleError } from "../../src/types/index.js";
import type { ComponentManifest, ResolvedTarget } from "../../src/types/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Full upstream slice: resolver → extractor → engine → mock/classify/stub. */
async function bundleFixture(relativePath: string): Promise<string> {
  const target = resolveTarget({
    target: join(repoRoot, "fixtures", relativePath),
  });
  const manifest = extractComponent(target);
  const report = assessCapability(manifest);
  const classifications = classifyDependencies(report.unresolvedImports, {
    code: target.code,
    hookCalls: manifest.hookCalls,
  });

  return bundle(
    target,
    manifest,
    mockProps(manifest.props),
    generateStubs(classifications, report.providerRequirements)
  );
}

describe("bundler — fixture bundles", () => {
  it("bundles an in-project component with real relative imports", async () => {
    const code = await bundleFixture("components/04-local-imports.tsx");

    expect(code).toContain("window.React");
    expect(code).toContain("createRoot");
  });

  it("redirects unresolved imports to stubs instead of throwing", async () => {
    const code = await bundleFixture("components/05-missing-imports.tsx");

    expect(code).toContain("ConvatStub");
  });

  it("bundles mixed unresolved kinds (hook, component, utility)", async () => {
    const code = await bundleFixture("components/10-ai-generated.tsx");

    expect(code).toContain("ConvatNoop");
    expect(code).toContain("ConvatStub");
  });

  it("bundles complex/generic props and style imports", async () => {
    await expect(
      bundleFixture("components/03-nested-props.tsx")
    ).resolves.toContain("window.React");

    await expect(
      bundleFixture("components/08-styling.tsx")
    ).resolves.toContain("window.React");
  });

  it("replaces process.env reads via define", async () => {
    const code = await bundleFixture("components/09-env-vars.tsx");
    // The inline sourcemap keeps the original source; only the executable part matters.
    const executable = code.split("//# sourceMappingURL=")[0];

    expect(executable).not.toMatch(/process\.env\s*[.[]/);
    expect(code).toContain("NEXT_PUBLIC_API_BASE");
  });
});

describe("bundler — React externalization", () => {
  it.each([
    "components/04-local-imports.tsx",
    "components/07-redux.tsx",
    "components/10-ai-generated.tsx",
  ])("never embeds a React copy for %s", async (relativePath) => {
    const code = await bundleFixture(relativePath);

    expect(code).not.toContain(
      "__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED"
    );
    expect(code).not.toContain("react.production");
    expect(code).toContain("window.React");
  });
});

describe("bundler — errors", () => {
  it("maps an esbuild failure to BundleError with location", async () => {
    const target: ResolvedTarget = {
      mode: "zero-repo",
      source: "stdin",
      filePath: null,
      code: "export default function Broken( {",
      projectRoot: null,
      tsconfigPath: null,
    };
    const manifest: ComponentManifest = {
      componentName: "Broken",
      exportType: "default",
      props: [],
      imports: [],
      hookCalls: [],
    };

    const failure = bundle(
      target,
      manifest,
      { values: {}, fallbackFields: [] },
      { stubs: [], providerStubs: [] }
    );

    await expect(failure).rejects.toBeInstanceOf(BundleError);
  });
});
