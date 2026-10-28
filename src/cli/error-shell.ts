/**
 * In-browser presentation for a `BundleError` (EHS §3.5).
 *
 * Phase 2 keeps this deliberately small: the server must start and the failure
 * must be visible with file/line context. The full Error Boundary treatment
 * (shared with `RuntimeError`) is CONV-401 in Phase 4.
 */

import type {
  BundleError,
  CapabilityReport,
  MockedProps,
  StubManifest,
} from "../types/index.js";

export function generateBundleErrorShell(
  error: BundleError,
  capability: CapabilityReport,
  mockedProps: MockedProps,
  stubs: StubManifest
): string {
  const location =
    error.file !== undefined
      ? `<p class="location">${escapeHtml(error.file)}${
          error.line !== undefined ? `:${error.line}` : ""
        }</p>`
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Convat preview — bundle error</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 0; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .location { font-family: ui-monospace, monospace; opacity: 0.8; }
    pre { white-space: pre-wrap; padding: 16px; border: 1px solid #d33; border-radius: 6px; }
    .summary { margin-top: 24px; opacity: 0.8; }
  </style>
</head>
<body>
  <main>
    <h1>Preview Status: FAILED — bundle error</h1>
    ${location}
    <pre>${escapeHtml(error.message)}</pre>
    <p class="summary">${escapeHtml(summaryLine(capability, mockedProps, stubs))}</p>
  </main>
</body>
</html>
`;
}

function summaryLine(
  capability: CapabilityReport,
  mockedProps: MockedProps,
  stubs: StubManifest
): string {
  const total = Object.keys(mockedProps.values).length;
  return (
    `Capability ${capability.status} · ${total - mockedProps.fallbackFields.length}/${total} props generated · ` +
    `${capability.resolvedImports.length} imports resolved · ${stubs.stubs.length} stubbed · ` +
    `${stubs.providerStubs.length} providers mocked`
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
