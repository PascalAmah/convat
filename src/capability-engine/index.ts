/**
 * capability-engine — TDD v1.0 §3.3 / Task Breakdown CONV-105
 *
 * The single authoritative pass: `ComponentManifest` in, `CapabilityReport` out.
 * This module is the ONLY author of the FULL/PARTIAL verdict — the terminal
 * status line (CLI Spec §4) and the in-browser coverage panel (Error Handling
 * Spec §4) both print what it computes, they never recompute it, so the two
 * can never drift apart.
 *
 * Status derivation follows Error Handling Spec §5 (authoritative per errata D3):
 *   PARTIAL — any of: unresolved-but-stubbed imports, mocked providers,
 *             undetermined styling, or `fallbackFields` present (complex props).
 *   FULL    — none of the above, i.e. nothing was substituted behind the
 *             user's back.
 *   FAILED  — never originates here (TDD §3.3 / errata D6): no component means
 *             this function is never called, so it returns FULL | PARTIAL only.
 *
 * Three rules come from errata and are load-bearing for fixture statuses:
 *   D2 — react / react-dom / react/jsx-runtime are satisfied by externalization,
 *        so they appear in NEITHER resolved nor unresolved imports.
 *   D3 — a `complex` prop contributes to PARTIAL (fallbackFields).
 *   D4-A — a style import that RESOLVES does not downgrade status; only
 *        undetermined styling (an unresolvable style import) does. Compatibility
 *        styles are the declared baseline (EHS §3.4), not an approximation, so
 *        FULL stays reachable for styled components.
 *
 * Known gap (errata D10): `ComponentManifest` carries no JSX/class-name signal,
 * so `StyleRequirement.kind: "tailwind-utility-classes"` cannot be produced yet.
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

/**
 * Satisfied by externalization (PRD §1c, errata D2) — never counted as resolved
 * or unresolved, never stubbed, never allowed to affect the status.
 */
const RUNTIME_IMPORTS = new Set<string>([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom/client",
  "react-dom/server",
]);

/** The runtime shell must provide exactly these three (TDD §3.7). */
const RUNTIME_REQUIREMENTS: readonly RuntimeName[] = [
  "react",
  "react-dom",
  "react/jsx-runtime",
];

/** Style files by extension. `module.` is handled first for the `css-module` kind. */
const STYLE_IMPORT = /\.(css|scss|sass|less|styl)$/i;

/** Hooks that live in a store/container and therefore need wrapping. */
const REDUX_LIKE_HOOKS = new Set<string>([
  "useSelector",
  "useDispatch",
  "useStore",
]);

/**
 * React's own hooks. These are NOT provider requirements — the shell supplies
 * React itself, so `useState` on a previewed component needs no wrapper.
 * `useContext` is deliberately absent: it is handled as a `context` provider.
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
 * EHS §5's four triggers. Note the styling trigger is keyed on *resolution*,
 * not on kind: a resolvable `.scss` means the approach WAS determined (errata
 * D4-A), so it reports but does not downgrade.
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

  // Never "FULL" when anything was approximated — the honesty invariant.
  return anyApproximation ? "PARTIAL" : "FULL";
}

/**
 * Every import is classified (TDD §3.3), EXCEPT runtime imports: those are
 * satisfied by the shell's single React instance, so reporting them as
 * unresolved would be a lie that then goes on to get stubbed (errata D2).
 */
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
 * Which hooks mean "this component needs a container it does not have"
 * (EHS §3.3), and therefore a `ProviderStub.wrapStrategy` around it.
 *
 * - `useContext(X)` → `context`, recorded WITH its argument (errata D9) so the
 *   panel can name the provider instead of saying "1 provider mocked (?)".
 * - Store-style hooks → `redux-like`.
 * - Everything else is deliberately not a provider: a React built-in is already
 *   served by the shell, and a custom hook (useAuth, useDebounce) arrives as an
 *   unresolved *dependency* that `dependency-stubber` no-ops — there is nothing
 *   to wrap the component tree in for those.
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
  /**
   * True when a style import did not resolve — the component's styling
   * approach "could not be determined at all", the one styling case that
   * contributes to PARTIAL (EHS §3.4, errata D4-A).
   */
  undetermined: boolean;
}

/**
 * Style imports are reported whether or not they resolve, because the coverage
 * panel shows them either way. Note a resolvable `.scss` (fixture 08) yields a
 * requirement WITHOUT setting `undetermined` — that is D4-A in one line.
 *
 * The `undetermined` flag is deliberately computed here rather than inferred
 * from `unresolvedImports`: the rule in EHS §3.4 stands on its own, so it
 * survives any future change to whether style imports are partitioned as
 * ordinary dependencies.
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
 * `.module.css`/`.module.scss` → `css-module`; Sass extensions → `sass`;
 * anything else → `unknown`, which here means "known to be CSS, just not one of
 * the specific kinds the spec enumerates" — NOT "we could not tell".
 * (`tailwind-utility-classes` needs a class-name signal the manifest does not
 * carry yet — errata D10.)
 */
function styleKindOf(path: string): StyleRequirementKind {
  if (/\.module\.(css|scss|sass|less)$/i.test(path)) return "css-module";
  if (/\.(scss|sass)$/i.test(path)) return "sass";
  return "unknown";
}
