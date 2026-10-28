/**
 * prop-mocker (CONV-106)
 *
 * Generates mock prop values from the ast-extractor's descriptors. Import and
 * stub generation happen elsewhere.
 *
 * A value is only produced when the type is understood. Complex props without a
 * safe mock are listed in `fallbackFields` and set to `null`, so the sidebar
 * shows a raw JSON editor instead of a guessed value (Error Handling Spec §3.1).
 */

import type { PropDescriptor, MockedProps } from "../types/index.js";

/** Shared sample values, so every string/number prop mocks predictably. */
const SAMPLE_TEXT = "Sample text";
const SAMPLE_NUMBER = 42;

/** A stable no-op for function props. */
function noop(): void {}

export function mockProps(props: PropDescriptor[]): MockedProps {
  const values: Record<string, unknown> = {};
  const fallbackFields: string[] = [];

  for (const prop of props) {
    const mock = mockValue(prop);

    if (mock.kind === "fallback") {
      fallbackFields.push(prop.name);
      values[prop.name] = null;
      continue;
    }

    values[prop.name] = mock.value;
  }

  return { values, fallbackFields };
}

type MockResult = { kind: "value"; value: unknown } | { kind: "fallback" };

function mockValue(prop: PropDescriptor): MockResult {
  switch (prop.category) {
    case "primitive":
      return { kind: "value", value: primitiveValue(prop.tsType) };
    case "enum":
      return enumValue(prop);
    case "array":
      return { kind: "value", value: [] };
    case "complex":
      // Functions can be mocked safely; everything else is left to the JSON
      // editor rather than guessed.
      return isFunctionType(prop.tsType)
        ? { kind: "value", value: noop }
        : { kind: "fallback" };
  }
}

function primitiveValue(tsType: string): unknown {
  switch (tsType.trim()) {
    case "string":
      return SAMPLE_TEXT;
    case "number":
      return SAMPLE_NUMBER;
    case "boolean":
      return false;
    case "bigint":
      // Kept as a number so the value stays JSON-serializable.
      return SAMPLE_NUMBER;
    default:
      return null;
  }
}

function enumValue(prop: PropDescriptor): MockResult {
  const [first] = prop.enumValues ?? [];
  return first === undefined
    ? { kind: "fallback" }
    : { kind: "value", value: first };
}

/**
 * Recognizes function types and method signatures. Both are categorized
 * `complex` by ast-extractor, but they have a safe no-op mock.
 */
function isFunctionType(tsType: string): boolean {
  const type = tsType.trim();

  return (
    type === "Function" ||
    /^(async\s+)?(<[^>]*>\s*)?\(.*\)\s*=>/s.test(type) ||
    /^new\s*\(/.test(type) ||
    /^[A-Za-z_$][\w$]*\??\s*(<[^>]*>)?\s*\([^)]*\)\s*:/.test(type)
  );
}
