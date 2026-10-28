/**
 * Shared zero-repo pipeline harness for the integration and benchmark tests.
 *
 * Fixtures are copied into a temporary directory with no package.json above
 * them, so resolution runs in the mode the product targets (PRD §2b).
 */

import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { bundle } from "../../src/bundler/index.js";
import { assessCapability } from "../../src/capability-engine/index.js";
import { classifyDependencies } from "../../src/dependency-classifier/index.js";
import { generateStubs } from "../../src/dependency-stubber/index.js";
import { mockProps } from "../../src/prop-mocker/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import { generateShell } from "../../src/shell-generator/index.js";
import { generateSidebarScript } from "../../src/sidebar/index.js";
import type {
  CapabilityReport,
  CapabilityStatus,
  ComponentManifest,
  DependencyClassification,
  MockedProps,
  ResolvedTarget,
  StubManifest,
} from "../../src/types/index.js";

export const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
export const fixtures = join(repoRoot, "fixtures");

export interface StageTimings {
  ast: number;
  capability: number;
  classifyStub: number;
  bundle: number;
  shell: number;
  total: number;
}

export interface PipelineRun {
  target: ResolvedTarget;
  manifest: ComponentManifest;
  report: CapabilityReport;
  mockedProps: MockedProps;
  classifications: DependencyClassification[];
  stubs: StubManifest;
  bundleCode: string;
  shell: string;
  timings: StageTimings;
}

export interface ExpectedFixture {
  fixture: string;
  category: "component" | "error";
  status: CapabilityStatus;
  fallbackFields?: string[];
  stubKinds?: string[];
}

export const EXPECTED: ExpectedFixture[] = [
  { fixture: "components/01-basic.tsx", category: "component", status: "FULL" },
  {
    fixture: "components/02-typescript.tsx",
    category: "component",
    status: "FULL",
  },
  {
    fixture: "components/03-nested-props.tsx",
    category: "component",
    status: "PARTIAL",
    fallbackFields: ["columns", "rows"],
  },
  {
    fixture: "components/04-local-imports.tsx",
    category: "component",
    status: "FULL",
  },
  {
    fixture: "components/05-missing-imports.tsx",
    category: "component",
    status: "PARTIAL",
    stubKinds: ["ui-component", "ui-component"],
  },
  {
    fixture: "components/06-context.tsx",
    category: "component",
    status: "PARTIAL",
  },
  {
    fixture: "components/07-redux.tsx",
    category: "component",
    status: "PARTIAL",
    stubKinds: ["hook"],
  },
  {
    fixture: "components/08-styling.tsx",
    category: "component",
    status: "FULL",
  },
  {
    fixture: "components/08b-styling-unresolved.tsx",
    category: "component",
    status: "PARTIAL",
    stubKinds: ["asset"],
  },
  {
    fixture: "components/09-env-vars.tsx",
    category: "component",
    status: "FULL",
  },
  {
    fixture: "components/10-ai-generated.tsx",
    category: "component",
    status: "PARTIAL",
    stubKinds: ["hook", "ui-component", "utility"],
  },
  {
    fixture: "errors/monorepo-alias-import.tsx",
    category: "error",
    status: "PARTIAL",
    stubKinds: ["unknown"],
  },
  {
    fixture: "errors/throws-on-render.tsx",
    category: "error",
    status: "PARTIAL",
  },
];

const temporaryDirectories: string[] = [];

export function copyIntoZeroRepo(relativePath: string): string {
  const directory = mkdtempSync(join(tmpdir(), "convat-zero-repo-"));
  temporaryDirectories.push(directory);
  const fileName = relativePath.split("/").pop()!;
  cpSync(join(fixtures, relativePath), join(directory, fileName));

  // Relative support modules and style files belong to these fixtures; the
  // missing-import fixtures deliberately do not get them.
  if (relativePath === "components/04-local-imports.tsx") {
    cpSync(join(fixtures, "components", "support"), join(directory, "support"), {
      recursive: true,
    });
  }
  if (relativePath === "components/08-styling.tsx") {
    cpSync(join(fixtures, "components", "styles"), join(directory, "styles"), {
      recursive: true,
    });
  }

  return join(directory, fileName);
}

export async function runStages(filePath: string): Promise<PipelineRun> {
  const started = performance.now();

  const target = resolveTarget({ target: filePath });
  const afterResolve = performance.now();

  const manifest = extractComponent(target);
  const afterAst = performance.now();

  const report = assessCapability(manifest);
  const afterCapability = performance.now();

  const mockedProps = mockProps(manifest.props);
  const classifications = classifyDependencies(report.unresolvedImports, {
    code: target.code,
    hookCalls: manifest.hookCalls,
  });
  const stubs = generateStubs(classifications, report.providerRequirements);
  const afterClassifyStub = performance.now();

  const bundleCode = await bundle(target, manifest, mockedProps, stubs);
  const afterBundle = performance.now();

  const sidebarScript = await generateSidebarScript();
  const shell = generateShell(bundleCode, mockedProps, report, stubs, {
    props: manifest.props,
    sidebarScript,
  });
  const afterShell = performance.now();

  return {
    target,
    manifest,
    report,
    mockedProps,
    classifications,
    stubs,
    bundleCode,
    shell,
    timings: {
      ast: afterAst - afterResolve,
      capability: afterCapability - afterAst,
      classifyStub: afterClassifyStub - afterCapability,
      bundle: afterBundle - afterClassifyStub,
      shell: afterShell - afterBundle,
      total: afterShell - started,
    },
  };
}

export async function runFixture(relativePath: string): Promise<PipelineRun> {
  return runStages(copyIntoZeroRepo(relativePath));
}

export function cleanupTemporaryDirectories(): void {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.length = 0;
}
