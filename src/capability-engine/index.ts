/**
 * capability-engine (CONV-105)
 *
 * The only module that decides FULL/PARTIAL. Both the terminal status line and
 * the in-browser panel print this report; neither recomputes it.
 *
 * PARTIAL when anything was approximated: an unresolved (stubbed) import, a
 * mocked provider, undetermined styling, or a complex prop. FAILED never comes
 * from here because a missing component throws before this runs.
 *
 * Runtime imports (react, react-dom, react/jsx-runtime) are satisfied by
 * externalization, so they count as neither resolved nor unresolved (errata D2).
 *
 * Known gap: `ComponentManifest` has no JSX/class-name info, so
 * `tailwind-utility-classes` cannot be produced yet.
 */

import type {
  CapabilityReport,
  CapabilityStatus,
  ComponentManifest,
  ProviderKind,
  ProviderRequirement,
  RawImport,
  RuntimeName,
  RuntimeRequirement,
  StyleRequirement,
  StyleRequirementKind,
} from "../types/index.js";

/** Satisfied by externalization; never stubbed and never affects status. */
const RUNTIME_IMPORTS = new Set<string>([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom/client",
  "react-dom/server",
]);

/** The runtime shell must provide exactly these three. */
const RUNTIME_REQUIREMENTS: readonly RuntimeName[] = [
  "react",
  "react-dom",
  "react/jsx-runtime",
];

/** Style files by extension. */
const STYLE_IMPORT = /\.(css|scss|sass|less|styl)$/i;

/** Hooks that live in a store/container and therefore need wrapping. */
const REDUX_LIKE_HOOKS = new Set<string>([
  "useSelector",
  "useDispatch",
  "useStore",
]);

/**
 * React's own hooks: served by the shell, so no provider wrapper is needed.
 * `useContext` is excluded because it maps to a `context` provider.
 */
const REACT_BUILTIN_HOOKS = new Set<string>([
  "useState",
  "useReducer",
  "useEffect",
  "useLayoutEffect",
  "useInsertionEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useImperativeHandle",
  "useDebugValue",
  "useId",
  "useTransition",
  "useDeferredValue",
  "useSyncExternalStore",
  "useOptimistic",
  "useActionState",
]);

export function assessCapability(
  manifest: ComponentManifest
): CapabilityReport {
  const { resolvedImports, unresolvedImports } = partitionImports(
    manifest.imports
  );
  const providerRequirements = detectProviderRequirements(manifest.hookCalls);
  const { requirements: styleRequirements, undetermined } =
    detectStyleRequirements(manifest.imports);
  const runtimeRequirements: RuntimeRequirement[] = RUNTIME_REQUIREMENTS.map(
    (name) => ({ name, mustBeExternalized: true })
  );

  const status = deriveStatus(manifest, {
    unresolvedImports,
    providerRequirements,
    hasUndeterminedStyle: undetermined,
  });

  return {
    status,
    resolvedImports,
    unresolvedImports,
    providerRequirements,
    styleRequirements,
    runtimeRequirements,
  };
}

/**
 * The four triggers for PARTIAL. Styling depends on resolution, not file kind:
 * a resolvable `.scss` is reported but does not downgrade status (errata D4-A).
 */
function deriveStatus(
  manifest: ComponentManifest,
  inputs: {
    unresolvedImports: RawImport[];
    providerRequirements: ProviderRequirement[];
    hasUndeterminedStyle: boolean;
  }
): CapabilityStatus {
  const unresolvedImports = inputs.unresolvedImports.length > 0;
  const mockedProviders = inputs.providerRequirements.length > 0;
  const complexProps = manifest.props.some(
    (prop) => prop.category === "complex"
  );
  const undeterminedStyling = inputs.hasUndeterminedStyle;

  const anyApproximation =
    unresolvedImports ||
    mockedProviders ||
    complexProps ||
    undeterminedStyling;

  // Never return "FULL" when anything was approximated.
  return anyApproximation ? "PARTIAL" : "FULL";
}

/** Splits imports into resolved and unresolved, skipping runtime imports. */
function partitionImports(imports: RawImport[]): {
  resolvedImports: RawImport[];
  unresolvedImports: RawImport[];
} {
  const resolvedImports: RawImport[] = [];
  const unresolvedImports: RawImport[] = [];

  for (const imported of imports) {
    if (RUNTIME_IMPORTS.has(imported.path)) continue;
    if (imported.resolvesToFile) resolvedImports.push(imported);
    else unresolvedImports.push(imported);
  }

  return { resolvedImports, unresolvedImports };
}

/**
 * Hooks that need a provider wrapper: `useContext(X)` -> `context` (argument
 * kept so the panel can name it), store hooks -> `redux-like`. React built-ins
 * and custom hooks are handled elsewhere, so they are not providers.
 */
function detectProviderRequirements(
  hookCalls: string[]
): ProviderRequirement[] {
  const requirements: ProviderRequirement[] = [];
  const seen = new Set<string>();

  for (const call of hookCalls) {
    if (seen.has(call)) continue;

    const inferredKind = providerKindOf(hookNameOf(call));
    if (!inferredKind) continue;

    seen.add(call);
    requirements.push({ hookOrPattern: call, inferredKind });
  }

  return requirements;
}

/** `useContext(ThemeContext)` → `useContext`. */
function hookNameOf(call: string): string {
  const match = /^use[A-Z][A-Za-z0-9_]*/.exec(call);
  return match ? match[0] : call;
}

function providerKindOf(name: string): ProviderKind | undefined {
  if (name === "useContext") return "context";
  if (REDUX_LIKE_HOOKS.has(name)) return "redux-like";
  return undefined;
}

interface StyleDetection {
  requirements: StyleRequirement[];
  /** True when a style import did not resolve; the only styling case that forces PARTIAL. */
  undetermined: boolean;
}

/**
 * Reports every style import, resolved or not. Only an unresolved one sets
 * `undetermined`, so a resolvable `.scss` stays FULL.
 */
function detectStyleRequirements(imports: RawImport[]): StyleDetection {
  const requirements: StyleRequirement[] = [];
  let undetermined = false;

  for (const imported of imports) {
    if (!STYLE_IMPORT.test(imported.path)) continue;

    requirements.push({
      kind: styleKindOf(imported.path),
      sourceFile: imported.path,
    });

    if (!imported.resolvesToFile) undetermined = true;
  }

  return { requirements, undetermined };
}

/**
 * Maps a style path to its kind. `unknown` means "CSS, but not a named kind",
 * not "could not tell".
 */
function styleKindOf(path: string): StyleRequirementKind {
  if (/\.module\.(css|scss|sass|less)$/i.test(path)) return "css-module";
  if (/\.(scss|sass)$/i.test(path)) return "sass";
  return "unknown";
}
