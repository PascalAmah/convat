/**
 * Pipeline orchestration for the CLI.
 *
 * Kept here (not in `src/index.ts`) so the public package API stays a set of
 * independent stages, per the TDD §2 module contract.
 */

import { extractComponent } from "../ast-extractor/index.js";
import { bundle } from "../bundler/index.js";
import { assessCapability } from "../capability-engine/index.js";
import { classifyDependencies } from "../dependency-classifier/index.js";
import { generateStubs } from "../dependency-stubber/index.js";
import { mockProps } from "../prop-mocker/index.js";
import { generateShell } from "../shell-generator/index.js";
import { generateSidebarScript } from "../sidebar/index.js";
import type {
  BundleError,
  CapabilityReport,
  ComponentManifest,
  DependencyClassification,
  MockedProps,
  ResolvedTarget,
  StubManifest,
} from "../types/index.js";
import { generateBundleErrorShell } from "./error-shell.js";

export interface PipelineOptions {
  /** `--props`: merged over auto-mocked values, never replacing them. */
  propOverrides?: Record<string, unknown>;
  /** Absolute path to the `--css` stylesheet, already validated by the CLI. */
  cssPath?: string;
  /** Mirrors the server's watcher; stdin previews never open the HMR socket. */
  watch?: boolean;
}

export interface PipelineResult {
  target: ResolvedTarget;
  manifest: ComponentManifest;
  report: CapabilityReport;
  mockedProps: MockedProps;
  classifications: DependencyClassification[];
  stubs: StubManifest;
  /** empty when bundling failed */
  bundleCode: string;
  /** non-null when esbuild could not produce a bundle; server still starts */
  bundleError: BundleError | null;
  shell: string;
}

export async function runPipeline(
  target: ResolvedTarget,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const manifest = extractComponent(target);
  const report = assessCapability(manifest);
  const mockedProps = applyPropOverrides(
    mockProps(manifest.props),
    options.propOverrides
  );
  const classifications = classifyDependencies(report.unresolvedImports, {
    code: target.code,
    hookCalls: manifest.hookCalls,
  });
  const stubs = generateStubs(classifications, report.providerRequirements);

  try {
    const bundleCode = await bundle(target, manifest, mockedProps, stubs);
    const sidebarScript = await generateSidebarScript();
    const shell = generateShell(bundleCode, mockedProps, report, stubs, {
      props: manifest.props,
      sidebarScript,
      cssPath: options.cssPath,
      hmr: options.watch === true && target.source === "file",
    });
    return {
      target,
      manifest,
      report,
      mockedProps,
      classifications,
      stubs,
      bundleCode,
      bundleError: null,
      shell,
    };
  } catch (error) {
    if (!isBundleError(error)) {
      throw error;
    }
    // EHS §2 principle 1 / §3.5: a bundle failure is shown in-browser and the
    // server still starts; it is never a nonzero process exit.
    return {
      target,
      manifest,
      report,
      mockedProps,
      classifications,
      stubs,
      bundleCode: "",
      bundleError: error,
      shell: generateBundleErrorShell(error, report, mockedProps, stubs),
    };
  }
}

function applyPropOverrides(
  mocked: MockedProps,
  overrides: Record<string, unknown> | undefined
): MockedProps {
  if (!overrides) {
    return mocked;
  }

  const values = { ...mocked.values, ...overrides };
  const overridden = new Set(Object.keys(overrides));
  return {
    values,
    fallbackFields: mocked.fallbackFields.filter((name) => !overridden.has(name)),
  };
}

function isBundleError(error: unknown): error is BundleError {
  return (
    error instanceof Error &&
    error.name === "BundleError" &&
    "code" in error &&
    (error as { code?: unknown }).code === "BUNDLE_ERROR"
  );
}
