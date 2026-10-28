/**
 * Shared type contracts for the Convat pipeline.
 *
 * Single source of truth for every shape passed between modules. Do not
 * redefine these locally.
 */

// ─────────────────────────────────────────────────────────────────────────
// resolver
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
// ast-extractor
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
  /** names of hooks called in the component body, e.g. ["useContext", "useSelector"] */
  hookCalls: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// capability-engine
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
// prop-mocker
// ─────────────────────────────────────────────────────────────────────────

export interface MockedProps {
  values: Record<string, unknown>;
  /** props that couldn't be typed cleanly; shown as raw JSON in the sidebar */
  fallbackFields: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// dependency-classifier
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
  /** names imported from this path, carried from RawImport (errata D5) */
  importedNames: string[];
  /** short, human-readable reason, e.g. "name starts with 'use' and is called like a function" */
  evidence: string;
}

// ─────────────────────────────────────────────────────────────────────────
// dependency-stubber
// ─────────────────────────────────────────────────────────────────────────

export type MockStrategy =
  | "render-children-passthrough"
  | "noop-function"
  | "empty-object"
  | "placeholder-asset"
  | "generic-fallback";

export interface StubContract {
  importPath: string;
  /** carried from DependencyClassification so the panel can name the kind (errata D13) */
  kind: DependencyKind;
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
// Error & status taxonomy
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

/** Union of all typed pipeline failures. */
export type PipelineError =
  | NoComponentFoundError
  | BundleError
  | RuntimeErrorReport
  | PortInUseError;
