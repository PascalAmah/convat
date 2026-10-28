/**
 * dependency-classifier (CONV-107)
 *
 * Assigns each unresolved import a kind using heuristics, not type analysis.
 * A classification can be wrong; its confidence says how sure we are.
 *
 * Rules (TDD §3.5):
 *   asset       — the path has a style/asset extension
 *   context     — the name ends in `Context` or is passed to `useContext`
 *   hook        — the name matches /^use[A-Z]/ and is called
 *   ui-component— the name is capitalized and used in JSX
 *   utility     — the name is lowercase and called
 *   unknown     — nothing matched confidently; always low confidence
 */

import type {
  ConfidenceLevel,
  DependencyClassification,
  DependencyKind,
  RawImport,
} from "../types/index.js";

/** Optional usage context from the source file. */
export interface ClassificationUsage {
  /** Raw source, used to see whether a name is called or used as JSX. */
  code?: string;
  /** Hook calls already extracted from the component body. */
  hookCalls?: string[];
}

const ASSET_PATH =
  /\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|mp4|webm)$/i;

const HOOK_NAME = /^use[A-Z]/;
const CONTEXT_NAME = /Context$/;
const CAPITALIZED = /^_?[A-Z]/;
const LOWERCASE = /^[a-z]/;

interface Candidate {
  kind: DependencyKind;
  confidence: ConfidenceLevel;
  evidence: string;
}

export function classifyDependencies(
  unresolvedImports: RawImport[],
  usage: ClassificationUsage = {}
): DependencyClassification[] {
  return unresolvedImports.map((imported) => {
    const best = classifyImport(imported, usage);
    return {
      importPath: imported.path,
      kind: best.kind,
      confidence: best.confidence,
      importedNames: imported.importedNames,
      evidence: best.evidence,
    };
  });
}

function classifyImport(
  imported: RawImport,
  usage: ClassificationUsage
): Candidate {
  if (ASSET_PATH.test(imported.path)) {
    return {
      kind: "asset",
      confidence: "high",
      evidence: `import path ends with a style or asset extension`,
    };
  }

  // A scoped import that did not resolve is as likely a workspace alias as a
  // real package, so it is the documented monorepo gap (errata D15).
  if (imported.path.startsWith("@")) {
    return {
      kind: "unknown",
      confidence: "low",
      evidence: `scoped import did not resolve; it may be a workspace alias`,
    };
  }

  const names = importedNamesToCheck(imported);
  const candidates = names.map((name) => classifyName(name, usage));

  return candidates.reduce(
    (best, candidate) =>
      candidateScore(candidate) > candidateScore(best) ? candidate : best,
    unknown()
  );
}

function importedNamesToCheck(imported: RawImport): string[] {
  if (imported.importedNames.length > 0) return imported.importedNames;

  // A side-effect import has no bound names; use the last path segment.
  const segment = imported.path.split("/").pop() ?? imported.path;
  const stem = segment.replace(/\.[^.]+$/, "");
  return stem.length > 0 ? [stem] : [];
}

function classifyName(name: string, usage: ClassificationUsage): Candidate {
  const called = isCalled(name, usage);
  const usedInJsx = isUsedInJsx(name, usage);
  const passedToUseContext = isPassedToUseContext(name, usage);

  if (CONTEXT_NAME.test(name) || passedToUseContext) {
    const fromName = CONTEXT_NAME.test(name);
    return {
      kind: "context",
      confidence: fromName ? "high" : "medium",
      evidence: fromName
        ? `name ends with "Context"`
        : `name is passed to useContext`,
    };
  }

  if (HOOK_NAME.test(name)) {
    return {
      kind: "hook",
      confidence: called ? "high" : "medium",
      evidence: called
        ? `name matches /^use[A-Z]/ and is called like a function`
        : `name matches /^use[A-Z]/`,
    };
  }

  if (CAPITALIZED.test(name) && usedInJsx) {
    return {
      kind: "ui-component",
      confidence: "high",
      evidence: `name is capitalized and used as a JSX element`,
    };
  }

  if (LOWERCASE.test(name) && called) {
    return {
      kind: "utility",
      confidence: "high",
      evidence: `name is lowercase and called like a function`,
    };
  }

  return unknown();
}

function unknown(): Candidate {
  return {
    kind: "unknown",
    confidence: "low",
    evidence: `no confident usage pattern matched`,
  };
}

function candidateScore(candidate: Candidate): number {
  const confidence =
    candidate.confidence === "high"
      ? 3
      : candidate.confidence === "medium"
        ? 2
        : 1;

  const kind =
    candidate.kind === "context"
      ? 6
      : candidate.kind === "hook"
        ? 5
        : candidate.kind === "ui-component"
          ? 4
          : candidate.kind === "asset"
            ? 3
            : candidate.kind === "utility"
              ? 2
              : 0;

  return confidence * 10 + kind;
}

function isCalled(name: string, usage: ClassificationUsage): boolean {
  if (usage.hookCalls?.some((call) => call.startsWith(`${name}(`))) {
    return true;
  }

  if (!usage.code) return false;

  return new RegExp(`\\b${escape(name)}\\s*(?:<[^>]*>\\s*)?\\(`).test(
    usage.code
  );
}

function isUsedInJsx(name: string, usage: ClassificationUsage): boolean {
  if (!usage.code) return false;

  return new RegExp(`<\\s*${escape(name)}(?:[\\s/>]|$)`).test(usage.code);
}

function isPassedToUseContext(
  name: string,
  usage: ClassificationUsage
): boolean {
  if (!usage.code) return false;

  return new RegExp(`useContext\\s*\\(\\s*${escape(name)}\\b`).test(usage.code);
}

function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
