/**
 * Shared type contracts for the Convat pipeline.
 *
 * These types are the authoritative source for every data shape passed between
 * pipeline modules (TDD v1.0 §3). No module should redefine or duplicate these
 * shapes locally — import from here so the pipeline's contracts stay in one place.
 *
 * Pipeline order (TDD v1.0 §2):
 *   resolver -> ast-extractor -> capability-engine -> prop-mocker
 *            -> dependency-classifier -> dependency-stubber -> bundler
 *            -> shell-generator -> server
 */

// ─────────────────────────────────────────────────────────────────────────
// resolver (TDD §3.1)
// ─────────────────────────────────────────────────────────────────────────

export type ConvatMode = "in-project" | "zero-repo";
export type TargetSource = "file" | "stdin";

export interface ResolvedTarget {
  mode: ConvatMode;
  source: TargetSource;
  /** null when source is "stdin" */
  filePath: string | null;
  /** raw file/stdin contents */
  code: string;
  /** nearest package.json directory, or null if none found */
  projectRoot: string | null;
  tsconfigPath: string | null;
}

// ─────────────────────────────────────────────────────────────────────────
// ast-extractor (TDD §3.2)
// ─────────────────────────────────────────────────────────────────────────

export type PropCategory = "primitive" | "enum" | "array" | "complex";

export interface PropDescriptor {
  name: string;
  tsType: string;
  category: PropCategory;
  required: boolean;
  enumValues?: string[];
}

export interface RawImport {
  path: string;
  resolvesToFile: boolean;
  importedNames: string[];
}

export type ExportType = "default" | "named";

export interface ComponentManifest {
  componentName: string;
  exportType: ExportType;
  props: PropDescriptor[];
  imports: RawImport[];
  /** raw hook call names found in the component body, e.g. ["useContext", "useSelector"] */
  hookCalls: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// capability-engine (TDD §3.3)
// ─────────────────────────────────────────────────────────────────────────

export type CapabilityStatus = "FULL" | "PARTIAL" | "FAILED";

export type ProviderKind = "context" | "redux-like" | "unknown";

export interface ProviderRequirement {
  /** e.g. "useContext(ThemeContext)", "useSelector" */
  hookOrPattern: string;
  inferredKind: ProviderKind;
}

export type StyleRequirementKind =
  | "tailwind-utility-classes"
  | "css-module"
  | "sass"
  | "unknown";

export interface StyleRequirement {
  kind: StyleRequirementKind;
  sourceFile?: string;
}

export type RuntimeName = "react" | "react-dom" | "react/jsx-runtime";

export interface RuntimeRequirement {
  name: RuntimeName;
  mustBeExternalized: true;
}

export interface CapabilityReport {
  status: CapabilityStatus;
  resolvedImports: RawImport[];
  unresolvedImports: RawImport[];
  providerRequirements: ProviderRequirement[];
  styleRequirements: StyleRequirement[];
  runtimeRequirements: RuntimeRequirement[];
}

// ─────────────────────────────────────────────────────────────────────────
// prop-mocker (TDD §3.4)
// ─────────────────────────────────────────────────────────────────────────

export interface MockedProps {
  values: Record<string, unknown>;
  /** props that couldn't be typed cleanly -> raw JSON editor in the sidebar */
  fallbackFields: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// dependency-classifier (TDD §3.5)
// ─────────────────────────────────────────────────────────────────────────

export type DependencyKind =
  | "ui-component"
  | "hook"
  | "context"
  | "utility"
  | "asset"
  | "unknown";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface DependencyClassification {
  importPath: string;
  kind: DependencyKind;
  confidence: ConfidenceLevel;
  /** short human-readable reason, e.g. "imported name starts with 'use', called as a function" */
  evidence: string;
}

// ─────────────────────────────────────────────────────────────────────────
// dependency-stubber (TDD §3.6)
// ─────────────────────────────────────────────────────────────────────────

export type MockStrategy =
  | "render-children-passthrough"
  | "noop-function"
  | "empty-object"
  | "placeholder-asset"
  | "generic-fallback";

export interface StubContract {
  importPath: string;
  exportNames: string[];
  mockStrategy: MockStrategy;
  confidence: ConfidenceLevel;
  reason: string;
}

export type ProviderWrapStrategy =
  | "generic-context"
  | "generic-store-like"
  | "passthrough";

export interface ProviderStub {
  providerName: string;
  wrapStrategy: ProviderWrapStrategy;
}

export interface StubManifest {
  stubs: StubContract[];
  providerStubs: ProviderStub[];
}

// ─────────────────────────────────────────────────────────────────────────
// Error & status taxonomy (TDD §4)
// ─────────────────────────────────────────────────────────────────────────

export class NoComponentFoundError extends Error {
  readonly code = "NO_COMPONENT_FOUND" as const;
  constructor(public readonly filePath: string | null) {
    super(
      filePath
        ? `No exported React component found in ${filePath}.`
        : "No exported React component found in the provided input.",
    );
    this.name = "NoComponentFoundError";
  }
}

export class BundleError extends Error {
  readonly code = "BUNDLE_ERROR" as const;
  constructor(
    message: string,
    public readonly file?: string,
    public readonly line?: number,
  ) {
    super(message);
    this.name = "BundleError";
  }
}

export class RuntimeErrorReport extends Error {
  readonly code = "RUNTIME_ERROR" as const;
  constructor(
    message: string,
    public readonly stack2?: string,
  ) {
    super(message);
    this.name = "RuntimeErrorReport";
  }
}

export class PortInUseError extends Error {
  readonly code = "PORT_IN_USE" as const;
  constructor(public readonly port: number) {
    super(`Port ${port} is already in use.`);
    this.name = "PortInUseError";
  }
}

/** Convenience union for typed pipeline failures (TDD §4 table). */
export type PipelineError =
  | NoComponentFoundError
  | BundleError
  | RuntimeErrorReport
  | PortInUseError;
