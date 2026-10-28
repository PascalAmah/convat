/**
 * Unit tests for dependency-classifier — Test Plan §4:
 *
 *   "Each heuristic in the TDD §3.5 table produces the expected kind and
 *    confidence on representative fixtures; ambiguous cases correctly fall
 *    through to unknown/low confidence rather than a false-positive."
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { assessCapability } from "../../src/capability-engine/index.js";
import { classifyDependencies } from "../../src/dependency-classifier/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import type {
  DependencyClassification,
  RawImport,
} from "../../src/types/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** classifier slice for one fixture: resolver → extractor → engine → classifier. */
function classifyFixture(relativePath: string): DependencyClassification[] {
  const target = resolveTarget({
    target: join(repoRoot, "fixtures", relativePath),
  });
  const manifest = extractComponent(target);
  const report = assessCapability(manifest);

  return classifyDependencies(report.unresolvedImports, {
    code: target.code,
    hookCalls: manifest.hookCalls,
  });
}

function classificationOf(
  classifications: DependencyClassification[],
  importPath: string
): DependencyClassification {
  const found = classifications.find((one) => one.importPath === importPath);
  if (!found) {
    const paths = classifications.map((one) => one.importPath).join(", ");
    throw new Error(
      `expected a classification for "${importPath}"; found: ${paths || "(none)"}`
    );
  }
  return found;
}

function importOf(names: string[], path = "./dep"): RawImport {
  return { path, resolvesToFile: false, importedNames: names };
}

function classifyOne(
  name: string,
  code: string,
  path = "./dep"
): DependencyClassification {
  const [classification] = classifyDependencies([importOf([name], path)], {
    code,
  });
  if (!classification) throw new Error("expected one classification");
  return classification;
}

describe("dependency-classifier — fixture heuristics", () => {
  it("classifies capitalized JSX imports as ui-component", () => {
    const classifications = classifyFixture("components/05-missing-imports.tsx");

    expect(classificationOf(classifications, "./nonexistent/Avatar")).toMatchObject({
      kind: "ui-component",
      confidence: "high",
      importedNames: ["Avatar"],
    });
    expect(classificationOf(classifications, "./nonexistent/Badge")).toMatchObject({
      kind: "ui-component",
      confidence: "high",
      importedNames: ["Badge"],
    });
  });

  it("classifies a called use-prefixed import as a hook", () => {
    const classifications = classifyFixture("components/10-ai-generated.tsx");

    expect(classificationOf(classifications, "./hooks/useDebounce")).toMatchObject({
      kind: "hook",
      confidence: "high",
      importedNames: ["useDebounce"],
    });
  });

  it("classifies a capitalized JSX import as ui-component", () => {
    const classifications = classifyFixture("components/10-ai-generated.tsx");

    expect(classificationOf(classifications, "./icons/SearchIcon")).toMatchObject({
      kind: "ui-component",
      confidence: "high",
    });
  });

  it("classifies a called lowercase import as a utility", () => {
    const classifications = classifyFixture("components/10-ai-generated.tsx");

    expect(
      classificationOf(classifications, "./utils/formatResultCount")
    ).toMatchObject({
      kind: "utility",
      confidence: "high",
      importedNames: ["formatResultCount"],
    });
  });

  it("classifies a store hook from an unresolved package as a hook", () => {
    const classifications = classifyFixture("components/07-redux.tsx");

    expect(classificationOf(classifications, "react-redux")).toMatchObject({
      kind: "hook",
      confidence: "high",
      importedNames: ["useSelector"],
    });
  });

  it("classifies a style path as an asset", () => {
    const classifications = classifyFixture(
      "components/08b-styling-unresolved.tsx"
    );

    expect(
      classificationOf(
        classifications,
        "./styles/MyMissingPanel.module.css"
      )
    ).toMatchObject({
      kind: "asset",
      confidence: "high",
    });
  });

  it("keeps the monorepo alias as a documented unknown/low gap", () => {
    const classifications = classifyFixture(
      "errors/monorepo-alias-import.tsx"
    );

    expect(classificationOf(classifications, "@myapp/ui/Button")).toMatchObject({
      kind: "unknown",
      confidence: "low",
      importedNames: ["Button"],
    });
  });
});

describe("dependency-classifier — isolated heuristics", () => {
  it("classifies a *Context import as context", () => {
    expect(
      classifyOne("ThemeContext", `import { ThemeContext } from "./dep";`)
    ).toMatchObject({ kind: "context", confidence: "high" });
  });

  it("classifies a name passed to useContext as context", () => {
    expect(
      classifyOne(
        "Theme",
        `import { Theme } from "./dep";
         const value = useContext(Theme);`
      )
    ).toMatchObject({ kind: "context", confidence: "medium" });
  });

  it("classifies a called use-prefixed import as a hook", () => {
    expect(classifyOne("useAuth", `const user = useAuth();`)).toMatchObject({
      kind: "hook",
      confidence: "high",
    });
  });

  it("classifies a capitalized JSX import as ui-component", () => {
    expect(classifyOne("Card", `const el = <Card title="x" />;`)).toMatchObject({
      kind: "ui-component",
      confidence: "high",
    });
  });

  it("classifies a called lowercase import as a utility", () => {
    expect(classifyOne("formatDate", `formatDate(new Date());`)).toMatchObject({
      kind: "utility",
      confidence: "high",
    });
  });

  it("classifies asset extensions without any usage", () => {
    const [classification] = classifyDependencies([importOf([], "./logo.svg")]);

    expect(classification).toMatchObject({
      kind: "asset",
      confidence: "high",
    });
  });

  it("falls through to unknown/low instead of false-positiving", () => {
    expect(
      classifyOne("helper", `const value = helper;`)
    ).toMatchObject({
      kind: "unknown",
      confidence: "low",
    });
  });

  it("does not call a capitalized name a component without JSX usage", () => {
    expect(
      classifyOne("Config", `const value = Config;`)
    ).toMatchObject({
      kind: "unknown",
      confidence: "low",
    });
  });
});
