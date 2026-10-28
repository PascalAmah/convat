/**
 * Unit tests for prop-mocker — Test Plan §4 and build-plan §1.3:
 *
 *   "Type→mock table: string → sample text, number → 42, boolean → false,
 *    enum → first member, array → [], function → no-op, optional → still
 *    mocked. Complex → fallbackFields plus {} or null, never a guessed value."
 *
 * The fixture table replaces the old, unmeasurable "≥90% prop accuracy" metric
 * with exact `MockedProps` expectations, so a change in the mapping is caught
 * here rather than at integration time.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { mockProps } from "../../src/prop-mocker/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import type { MockedProps, PropDescriptor } from "../../src/types/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Full pipeline slice for one fixture: resolver → extractor → prop-mocker. */
function mockedFixture(relativePath: string): MockedProps {
  const target = resolveTarget({
    target: join(repoRoot, "fixtures", relativePath),
  });
  return mockProps(extractComponent(target).props);
}

function descriptor(overrides: Partial<PropDescriptor>): PropDescriptor {
  return {
    name: "value",
    tsType: "string",
    category: "primitive",
    required: true,
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Fixture snapshots (Test Plan §5 accuracy metric, made machine-checkable)
// ─────────────────────────────────────────────────────────────────────────

const FIXTURE_EXPECTATIONS: ReadonlyArray<
  [string, { values: Record<string, unknown>; fallbackFields: string[] }]
> = [
  [
    "components/01-basic.tsx",
    {
      values: { label: "Sample text", disabled: false },
      fallbackFields: [],
    },
  ],
  [
    "components/02-typescript.tsx",
    {
      values: { status: "active", tags: [] },
      fallbackFields: [],
    },
  ],
  [
    // D3: both generic props are complex → fallback, never a guessed value.
    "components/03-nested-props.tsx",
    {
      values: { columns: null, rows: null },
      fallbackFields: ["columns", "rows"],
    },
  ],
  [
    "components/04-local-imports.tsx",
    {
      values: {
        name: "Sample text",
        avatarUrl: "Sample text",
        status: "active",
      },
      fallbackFields: [],
    },
  ],
  [
    "components/05-missing-imports.tsx",
    {
      values: {
        name: "Sample text",
        avatarUrl: "Sample text",
        status: "active",
      },
      fallbackFields: [],
    },
  ],
  [
    "components/06-context.tsx",
    { values: { title: "Sample text" }, fallbackFields: [] },
  ],
  ["components/07-redux.tsx", { values: {}, fallbackFields: [] }],
  [
    "components/08-styling.tsx",
    { values: { heading: "Sample text" }, fallbackFields: [] },
  ],
  [
    "components/08b-styling-unresolved.tsx",
    { values: { heading: "Sample text" }, fallbackFields: [] },
  ],
  [
    "components/09-env-vars.tsx",
    { values: { message: "Sample text" }, fallbackFields: [] },
  ],
  [
    // onSearch is a function type: a no-op is safe, so it is not a fallback.
    "components/10-ai-generated.tsx",
    {
      values: {
        placeholder: "Sample text",
        onSearch: expect.any(Function),
        resultCount: 42,
      },
      fallbackFields: [],
    },
  ],
  ["errors/throws-on-render.tsx", { values: {}, fallbackFields: [] }],
  [
    "errors/monorepo-alias-import.tsx",
    {
      values: { message: "Sample text", onConfirm: expect.any(Function) },
      fallbackFields: [],
    },
  ],
];

describe("prop-mocker — fixture snapshots", () => {
  it.each(FIXTURE_EXPECTATIONS)("%s", (relativePath, expected) => {
    expect(mockedFixture(relativePath)).toEqual(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Mapping rules
// ─────────────────────────────────────────────────────────────────────────

describe("prop-mocker — mapping rules", () => {
  it("mocks string, number and boolean primitives", () => {
    expect(
      mockProps([
        descriptor({ name: "title", tsType: "string" }),
        descriptor({ name: "count", tsType: "number" }),
        descriptor({ name: "enabled", tsType: "boolean" }),
      ])
    ).toEqual({
      values: { title: "Sample text", count: 42, enabled: false },
      fallbackFields: [],
    });
  });

  it("uses the first enum member", () => {
    expect(
      mockProps([
        descriptor({
          name: "status",
          tsType: '"active" | "pending"',
          category: "enum",
          enumValues: ["active", "pending"],
        }),
      ])
    ).toEqual({ values: { status: "active" }, fallbackFields: [] });
  });

  it("mocks arrays as empty arrays", () => {
    expect(
      mockProps([
        descriptor({ name: "tags", tsType: "string[]", category: "array" }),
      ])
    ).toEqual({ values: { tags: [] }, fallbackFields: [] });
  });

  it("still mocks optional props", () => {
    expect(
      mockProps([
        descriptor({ name: "label", tsType: "string", required: false }),
      ])
    ).toEqual({ values: { label: "Sample text" }, fallbackFields: [] });
  });

  it("mocks function props as a callable no-op", () => {
    const mocked = mockProps([
      descriptor({
        name: "onSearch",
        tsType: "(query: string) => void",
        category: "complex",
      }),
    ]);

    expect(mocked.fallbackFields).toEqual([]);
    expect(typeof mocked.values.onSearch).toBe("function");
    expect((mocked.values.onSearch as () => void)()).toBeUndefined();
  });

  it("mocks method signatures as a no-op too", () => {
    const mocked = mockProps([
      descriptor({
        name: "render",
        tsType: "render?(value: string): React.ReactNode",
        category: "complex",
      }),
    ]);

    expect(mocked.fallbackFields).toEqual([]);
    expect(typeof mocked.values.render).toBe("function");
  });

  it("sends unresolved complex props to fallbackFields with null", () => {
    const mocked = mockProps([
      descriptor({
        name: "config",
        tsType: "Record<string, unknown>",
        category: "complex",
      }),
    ]);

    expect(mocked).toEqual({
      values: { config: null },
      fallbackFields: ["config"],
    });
  });

  it("keeps prop order in both values and fallbackFields", () => {
    const mocked = mockProps([
      descriptor({ name: "first", tsType: "string" }),
      descriptor({ name: "second", tsType: "T", category: "complex" }),
      descriptor({ name: "third", tsType: "number" }),
      descriptor({ name: "fourth", tsType: "U", category: "complex" }),
    ]);

    expect(Object.keys(mocked.values)).toEqual([
      "first",
      "second",
      "third",
      "fourth",
    ]);
    expect(mocked.fallbackFields).toEqual(["second", "fourth"]);
  });
});
