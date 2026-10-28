/**
 * Status output (CONV-204, CLI Spec §4).
 *
 * Everything here is derived from `CapabilityReport` + `StubManifest` +
 * `MockedProps`. The CLI never recomputes status — a second author of status is
 * exactly the drift the spec forbids.
 */

import type {
  CapabilityReport,
  MockedProps,
  StubContract,
  StubManifest,
} from "../types/index.js";

/** Single-line form printed by default (CLI Spec §4). */
export function formatStatusLine(
  report: CapabilityReport,
  stubs: StubManifest,
  mockedProps: MockedProps
): string {
  const icon = report.status === "FULL" ? "✓" : "⚠";
  const details = detailSegments(report, stubs, mockedProps);
  const suffix = details.length > 0 ? ` (${details.join(", ")})` : "";
  return `${icon} Preview ready — ${report.status}${suffix}`;
}

/** Preview-level status when esbuild could not produce a bundle (EHS §3.5). */
export function formatBundleErrorStatus(): string {
  return "✗ Preview ready — FAILED (bundle error)";
}

/** Full breakdown printed with `--verbose-status` (CLI Spec §4). */
export function formatVerboseStatus(
  report: CapabilityReport,
  stubs: StubManifest,
  mockedProps: MockedProps,
  url: string
): string {
  const totalProps = Object.keys(mockedProps.values).length;
  const cleanProps = totalProps - mockedProps.fallbackFields.length;

  const propsLines = [`✓ ${cleanProps}/${totalProps} generated`];
  if (mockedProps.fallbackFields.length > 0) {
    propsLines.push(
      `⚠ ${mockedProps.fallbackFields.length} need JSON input: ${mockedProps.fallbackFields.join(", ")}`
    );
  }

  const dependencyLines = [`✓ ${report.resolvedImports.length} resolved`];
  if (stubs.stubs.length > 0) {
    dependencyLines.push(`⚠ ${stubs.stubs.length} stubbed`);
    for (const stub of stubs.stubs) {
      dependencyLines.push(`   ⚠ ${stubLabel(stub)}`);
    }
  }

  const providers =
    stubs.providerStubs.length === 0
      ? ["✓ none"]
      : [
          `⚠ ${stubs.providerStubs.length} mocked (${stubs.providerStubs
            .map((provider) => provider.providerName)
            .join(", ")})`,
        ];

  const styles =
    report.styleRequirements.length > 0
      ? ["⚠ compatibility mode"]
      : ["✓ compatibility styles"];

  return [
    `Preview Status: ${report.status}`,
    "",
    "Props",
    ...propsLines,
    "",
    "Dependencies",
    ...dependencyLines,
    "",
    "Providers",
    ...providers,
    "",
    "Styles",
    ...styles,
    "",
    `Preview running at ${url}`,
  ].join("\n");
}

function detailSegments(
  report: CapabilityReport,
  stubs: StubManifest,
  mockedProps: MockedProps
): string[] {
  const segments: string[] = [];
  const stubCount = stubs.stubs.length;
  const providerCount = stubs.providerStubs.length;
  const fallbackCount = mockedProps.fallbackFields.length;
  const styleCount = report.styleRequirements.length;

  if (stubCount > 0) {
    segments.push(`${stubCount} ${plural(stubCount, "dependency", "dependencies")} stubbed`);
  }
  if (providerCount > 0) {
    segments.push(`${providerCount} ${plural(providerCount, "provider")} mocked`);
  }
  if (fallbackCount > 0) {
    segments.push(`${fallbackCount} ${plural(fallbackCount, "prop")} need JSON input`);
  }
  if (styleCount > 0) {
    segments.push(`${styleCount} ${plural(styleCount, "style requirement")} approximated`);
  }

  return segments;
}

function stubLabel(stub: StubContract): string {
  const confidence = `${stub.confidence} confidence — inferred from usage pattern`;
  return `${stub.importPath} → ${kindLabel(stub.kind)} stub (${confidence})`;
}

function kindLabel(kind: StubContract["kind"]): string {
  switch (kind) {
    case "ui-component":
      return "ui-component";
    case "hook":
      return "hook";
    case "utility":
      return "utility";
    case "asset":
      return "asset";
    case "context":
      return "context";
    case "unknown":
      return "generic";
  }
}

function plural(count: number, singular: string, pluralForm?: string): string {
  return count === 1 ? singular : (pluralForm ?? `${singular}s`);
}
