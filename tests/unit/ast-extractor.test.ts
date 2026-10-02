/**
 * Unit tests for ast-extractor — Test Plan v1.0 §4:
 *
 *   "Correct `componentName`/`exportType`; correct `category` per prop; `imports`
 *    list includes *every* import with correct `resolvesToFile` flag (not just
 *    unresolved ones, per TDD §3.2); `hookCalls` captures raw hook usage
 *    accurately"
 *
 * Fixture-driven cases run against the real CONV-112 fixture suite through the
 * real resolver, so editing a fixture in a way that changes its manifest is
 * caught here rather than surfacing as a confusing failure at CONV-113.
 * Synthetic stdin targets cover what the fixtures deliberately don't.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import { NoComponentFoundError } from "../../src/types/index.js";
import type {
  ComponentManifest,
  PropDescriptor,
  RawImport,
  ResolvedTarget,
} from "../../src/types/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Extracts from a real fixture file, via the real resolver (in-project mode). */
function extractFixture(relativePath: string): ComponentManifest {
  const target = resolveTarget({
    target: join(repoRoot, "fixtures", relativePath),
  });
  return extractComponent(target);
}

/** Extracts from inline source as a stdin target — no filesystem involved. */
function extractSource(code: string): ComponentManifest {
  const target: ResolvedTarget = {
    mode: "zero-repo",
    source: "stdin",
    filePath: null,
    code,
    projectRoot: null,
    tsconfigPath: null,
  };
  return extractComponent(target);
}

function prop(manifest: ComponentManifest, name: string): PropDescriptor {
  const found = manifest.props.find((candidate) => candidate.name === name);
  if (!found) {
    const names = manifest.props.map((candidate) => candidate.name).join(", ");
    throw new Error(`expected a prop named "${name}"; found: ${names || "(none)"}`);
  }
  return found;
}

function importOf(manifest: ComponentManifest, path: string): RawImport {
  const found = manifest.imports.find((candidate) => candidate.path === path);
  if (!found) {
    const paths = manifest.imports.map((candidate) => candidate.path).join(", ");
    throw new Error(`expected an import of "${path}"; found: ${paths || "(none)"}`);
  }
  return found;
}

// ─────────────────────────────────────────────────────────────────────────
// Component detection
// ─────────────────────────────────────────────────────────────────────────

describe("ast-extractor — component detection", () => {
  it("reads the name and export type of a default-exported component", () => {
    const manifest = extractFixture("components/01-basic.tsx");

    expect(manifest.componentName).toBe("Button");
    expect(manifest.exportType).toBe("default");
  });

  it("throws NoComponentFoundError when the file exports no component", () => {
    expect(() => extractFixture("errors/no-component-export.ts")).toThrow(
      NoComponentFoundError
    );
  });

  it("throws NoComponentFoundError for empty input", () => {
    expect(() => extractSource("")).toThrow(NoComponentFoundError);
  });

  it("detects a named-exported component", () => {
    const manifest = extractSource(`
      export function Widget({ title }: { title: string }) {
        return <h1>{title}</h1>;
      }
    `);

    expect(manifest.componentName).toBe("Widget");
    expect(manifest.exportType).toBe("named");
  });

  it("detects a default-exported arrow component and names it AnonymousComponent", () => {
    const manifest = extractSource("export default () => <div>hi</div>;");

    expect(manifest.componentName).toBe("AnonymousComponent");
    expect(manifest.exportType).toBe("default");
  });

  it("follows `export default Identifier` to its declaration", () => {
    const manifest = extractSource(`
      const Panel = () => <section>panel</section>;
      export default Panel;
    `);

    expect(manifest.componentName).toBe("Panel");
    expect(manifest.exportType).toBe("default");
  });

  it("ignores lowercase helper functions", () => {
    expect(() =>
      extractSource("export const formatThing = (x: string) => x.toUpperCase();")
    ).toThrow(NoComponentFoundError);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Prop contract
// ─────────────────────────────────────────────────────────────────────────

describe("ast-extractor — prop contract", () => {
  it("categorizes primitive props and marks them required", () => {
    const manifest = extractFixture("components/01-basic.tsx");

    expect(prop(manifest, "label")).toMatchObject({
      tsType: "string",
      category: "primitive",
      required: true,
    });
    expect(prop(manifest, "disabled")).toMatchObject({
      tsType: "boolean",
      category: "primitive",
      required: true,
    });
  });

  it("reads enum values from a union of string literals", () => {
    const status = prop(
      extractFixture("components/02-typescript.tsx"),
      "status"
    );

    expect(status.category).toBe("enum");
    expect(status.enumValues).toEqual(["active", "pending", "closed"]);
    // The raw annotation is preserved — the sidebar can show what was declared.
    expect(status.tsType).toBe("BadgeStatus");
  });

  it("categorizes an array of primitives as array", () => {
    expect(
      prop(extractFixture("components/02-typescript.tsx"), "tags")
    ).toMatchObject({ category: "array", required: true });
  });

  it("categorizes generic and object-list props as complex", () => {
    const manifest = extractFixture("components/03-nested-props.tsx");

    expect(prop(manifest, "columns").category).toBe("complex");
    expect(prop(manifest, "rows").category).toBe("complex");
  });

  it("categorizes function-typed props as complex", () => {
    const manifest = extractFixture("components/10-ai-generated.tsx");

    expect(prop(manifest, "onSearch").category).toBe("complex");
    expect(prop(manifest, "placeholder").category).toBe("primitive");
    expect(prop(manifest, "resultCount").category).toBe("primitive");
  });

  it("reads props from a React.FC type argument", () => {
    const manifest = extractSource(`
      interface GreetingProps { name: string; times: number; }
      const Greeting: React.FC<GreetingProps> = ({ name, times }) => <p>{name}{times}</p>;
      export default Greeting;
    `);

    expect(manifest.componentName).toBe("Greeting");
    expect(manifest.props.map((p) => p.name)).toEqual(["name", "times"]);
    expect(prop(manifest, "name").category).toBe("primitive");
  });

  it("treats optional and nullish-union props as not required", () => {
    const manifest = extractSource(`
      interface Options { label?: string; tone: string | undefined; size: number; }
      export default function Chip({ label, tone, size }: Options) {
        return <span>{label}{tone}{size}</span>;
      }
    `);

    expect(prop(manifest, "label").required).toBe(false);
    expect(prop(manifest, "tone").required).toBe(false);
    expect(prop(manifest, "size").required).toBe(true);
  });

  it("returns no props for a component that declares none", () => {
    expect(extractFixture("components/07-redux.tsx").props).toEqual([]);
  });

  it("categorizes method signatures, function types and tuples as complex", () => {
    const manifest = extractSource(`
      interface Api {
        run(input: string): Promise<void>;
        handler: () => void;
        pair: [number, number];
      }
      export default function Widget({ run, handler, pair }: Api) {
        return <div>{String(run)}{String(handler)}{pair.length}</div>;
      }
    `);

    expect(prop(manifest, "run").category).toBe("complex");
    expect(prop(manifest, "handler").category).toBe("complex");
    expect(prop(manifest, "pair").category).toBe("complex");
  });

  it("terminates on a self-referential props type", () => {
    const manifest = extractSource(`
      interface TreeNode { label: string; child: TreeNode; }
      export default function Tree({ label, child }: TreeNode) {
        return <div>{label}{child ? child.label : null}</div>;
      }
    `);

    expect(manifest.props.map((p) => p.name)).toEqual(["label", "child"]);
    expect(prop(manifest, "label").category).toBe("primitive");
    expect(prop(manifest, "child").category).toBe("complex");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Import enumeration
// ─────────────────────────────────────────────────────────────────────────

/** A stdin target that still declares a project root, for resolution tests. */
function extractSourceInProject(
  code: string,
  projectRoot: string
): ComponentManifest {
  const target: ResolvedTarget = {
    mode: "in-project",
    source: "stdin",
    filePath: null,
    code,
    projectRoot,
    tsconfigPath: null,
  };
  return extractComponent(target);
}

describe("ast-extractor — imports", () => {
  it("lists every import, resolved or not, runtime imports included", () => {
    const manifest = extractFixture("components/04-local-imports.tsx");

    expect(manifest.imports.map((entry) => entry.path)).toEqual([
      "react",
      "./support/Avatar",
      "./support/Badge",
    ]);
    // `react` is not installed in this repo, so it is honestly unresolved here.
    // Deciding that externalization satisfies it is capability-engine's job
    // (errata D2) — this module reports the filesystem truth and nothing more.
    expect(manifest.imports.map((entry) => entry.resolvesToFile)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it("probes extensions for an extensionless relative import", () => {
    const manifest = extractFixture("components/04-local-imports.tsx");

    expect(importOf(manifest, "./support/Avatar").resolvesToFile).toBe(true);
  });

  it("reports invalidated relative imports as unresolved", () => {
    const manifest = extractFixture("components/05-missing-imports.tsx");

    expect(importOf(manifest, "./nonexistent/Avatar").resolvesToFile).toBe(false);
    expect(importOf(manifest, "./nonexistent/Badge").resolvesToFile).toBe(false);
  });

  it("resolves a style import that exists on disk", () => {
    const manifest = extractFixture("components/08-styling.tsx");

    expect(
      importOf(manifest, "./styles/StyledPanel.module.scss").resolvesToFile
    ).toBe(true);
  });

  it("leaves monorepo alias imports unresolved (documented v1 gap)", () => {
    const manifest = extractFixture("errors/monorepo-alias-import.tsx");

    expect(importOf(manifest, "@myapp/ui/Button").resolvesToFile).toBe(false);
  });

  it("collects the imported names of each import", () => {
    const manifest = extractFixture("components/06-context.tsx");

    expect(importOf(manifest, "react").importedNames).toEqual([
      "useContext",
      "createContext",
    ]);
  });

  it("treats relative imports as unresolvable for a stdin target", () => {
    const manifest = extractSource(`
      import { Avatar } from "./Avatar";
      export default function C({ name }: { name: string }) {
        return <div>{name}<Avatar /></div>;
      }
    `);

    expect(importOf(manifest, "./Avatar").resolvesToFile).toBe(false);
  });

  it("resolves a bare specifier against the project's node_modules", () => {
    const manifest = extractSourceInProject(
      `
      import { Project } from "ts-morph";
      export default function Widget() {
        return <div>{String(Project)}</div>;
      }
    `,
      repoRoot
    );

    expect(importOf(manifest, "ts-morph").resolvesToFile).toBe(true);
  });

  it("resolves scoped packages at their root", () => {
    const manifest = extractSourceInProject(
      `
      import { node } from "@types/node";
      export default function Widget() {
        return <div>{String(node)}</div>;
      }
    `,
      repoRoot
    );

    expect(importOf(manifest, "@types/node").resolvesToFile).toBe(true);
  });

  it("leaves bare specifiers unresolved when there is no project root", () => {
    const manifest = extractSource(`
      import { useSelector } from "react-redux";
      export default function C() { return <div>{useSelector}</div>; }
    `);

    expect(importOf(manifest, "react-redux").resolvesToFile).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Hook calls
// ─────────────────────────────────────────────────────────────────────────

describe("ast-extractor — hookCalls", () => {
  it("captures a hook call in the component body", () => {
    expect(extractFixture("components/04-local-imports.tsx").hookCalls).toEqual([
      "useState",
    ]);
  });

  it("captures hooks in source order without duplicates", () => {
    expect(
      extractFixture("components/10-ai-generated.tsx").hookCalls
    ).toEqual(["useState", "useDebounce", "useEffect"]);
  });

  it("keeps the context name for a useContext call", () => {
    expect(extractFixture("components/06-context.tsx").hookCalls).toEqual([
      "useContext(ThemeContext)",
    ]);
  });

  it("captures a namespaced hook call by its hook name", () => {
    const manifest = extractSource(`
      export default function C() {
        const [count] = React.useState(0);
        return <div>{count}</div>;
      }
    `);

    expect(manifest.hookCalls).toEqual(["useState"]);
  });

  it("reports only real hook calls, not ordinary calls", () => {
    expect(extractFixture("components/09-env-vars.tsx").hookCalls).toEqual([]);
    expect(extractFixture("components/07-redux.tsx").hookCalls).toEqual([
      "useSelector",
    ]);
  });

  /**
   * Guards the shared-Project decision. Warm calls measure ~8ms; constructing a
   * Project per call measured 2-4s each, so this bound catches a regression to
   * per-call construction without flaking on a slow CI box. PRD §3's actual
   * budget is CONV-113B's to measure — this is only a tripwire.
   */
  it("reuses one Project so repeated calls stay fast", () => {
    const target = resolveTarget({
      target: join(repoRoot, "fixtures/components/04-local-imports.tsx"),
    });
    extractComponent(target); // warm the shared Project

    const start = performance.now();
    for (let call = 0; call < 50; call += 1) extractComponent(target);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(2500);
  });
});
