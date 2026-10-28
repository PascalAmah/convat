/**
 * shell-generator (CONV-111 / CONV-301 / CONV-305)
 *
 * Builds the HTML shell: one React runtime, then the component bundle, then the
 * coverage panel and sidebar. Styles are local; no CDN.
 *
 * The runtime comes from the packaged React dependency (D1), loaded exactly
 * once per page and before the component bundle. The sidebar is plain browser
 * code (D21) and communicates with the component bundle only through the
 * `convat:set-props` postMessage channel (CONV-302).
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import type {
  CapabilityReport,
  MockedProps,
  PropDescriptor,
  StubContract,
  StubManifest,
} from "../types/index.js";

const require = createRequire(import.meta.url);

let reactRuntime: string | undefined;
let reactDomRuntime: string | undefined;

export interface ShellOptions {
  /** Prop descriptors, so the sidebar can pick a control per PropCategory. */
  props: PropDescriptor[];
  /** Prebuilt sidebar bundle from `src/sidebar/index.ts`. */
  sidebarScript: string;
  /** Absolute path to the `--css` stylesheet, already validated by the CLI. */
  cssPath?: string;
  /** Only file targets with watching enabled open the HMR socket. */
  hmr?: boolean;
}

export function generateShell(
  bundleCode: string,
  mockedProps: MockedProps,
  capability: CapabilityReport,
  stubs: StubManifest,
  options: ShellOptions
): string {
  const css =
    compatibilityStyles() +
    (options.cssPath ? readFileSync(options.cssPath, "utf8") : "");
  const bootstrap = JSON.stringify({
    report: capability,
    stubs,
    mockedProps: {
      values: mockedProps.values,
      fallbackFields: mockedProps.fallbackFields,
    },
    props: options.props,
    hmr: options.hmr === true,
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Convat preview</title>
  <style>${css}</style>
</head>
<body>
  <div id="convat-app">
    <aside id="convat-panel" aria-label="Coverage and prop controls">
      ${coveragePanel(mockedProps, capability, stubs)}
      <div id="convat-controls"></div>
    </aside>
    <main id="convat-stage">
      <div id="convat-root"></div>
      <pre id="convat-error" hidden></pre>
    </main>
  </div>
  <div id="convat-toasts" role="status" aria-live="polite"></div>
  <script>${scriptSafe(runtimeScript("react"))}</script>
  <script>${scriptSafe(runtimeScript("react-dom"))}</script>
  <script>window.__CONVAT__ = ${scriptSafe(bootstrap)};</script>
  <script>${scriptSafe(bundleCode)}</script>
  <script>${scriptSafe(options.sidebarScript)}</script>
</body>
</html>
`;
}

// ─────────────────────────────────────────────────────────────────────────
// Runtime assets (D1)
// ─────────────────────────────────────────────────────────────────────────

function runtimeScript(pkg: "react" | "react-dom"): string {
  if (pkg === "react") {
    reactRuntime ??= readUmd("react", "react.production.min.js");
    return reactRuntime;
  }

  reactDomRuntime ??= readUmd("react-dom", "react-dom.production.min.js");
  return reactDomRuntime;
}

function readUmd(pkg: string, file: string): string {
  const packageJson = require.resolve(`${pkg}/package.json`);
  return readFileSync(join(dirname(packageJson), "umd", file), "utf8");
}

// ─────────────────────────────────────────────────────────────────────────
// Coverage panel (Error Handling Spec §4)
// ─────────────────────────────────────────────────────────────────────────

function coveragePanel(
  mockedProps: MockedProps,
  capability: CapabilityReport,
  stubs: StubManifest
): string {
  const totalProps = Object.keys(mockedProps.values).length;
  const cleanProps = totalProps - mockedProps.fallbackFields.length;

  const fallbackLine =
    mockedProps.fallbackFields.length > 0
      ? `<li>⚠ ${mockedProps.fallbackFields.length} need JSON input: ${mockedProps.fallbackFields
          .map(
            (name) =>
              `<button type="button" class="convat-scroll" data-scroll-prop="${escapeHtml(name)}">${escapeHtml(name)}</button>`
          )
          .join(", ")}</li>`
      : "";

  const stubLines = stubs.stubs
    .map(
      (stub) =>
        `<li><details class="convat-stub"><summary>⚠ ${escapeHtml(stub.importPath)} → ${kindLabel(stub)} stub (${confidenceCopy(stub.confidence)})</summary>${
          stub.reason ? `<p>${escapeHtml(stub.reason)}</p>` : ""
        }</details></li>`
    )
    .join("");

  const providerLines = stubs.providerStubs
    .map(
      (provider) =>
        `<li>⚠ ${escapeHtml(provider.providerName)} → ${provider.wrapStrategy}</li>`
    )
    .join("");

  const styleLine =
    capability.styleRequirements.length > 0
      ? `<li>⚠ compatibility mode (project styling not reproduced; does not affect status)</li>`
      : `<li>✓ compatibility styles</li>`;

  const dependencyLines =
    stubs.stubs.length > 0
      ? `<li>⚠ ${stubs.stubs.length} stubbed</li>${stubLines}`
      : `<li>✓ none stubbed</li>`;

  const providerSection =
    stubs.providerStubs.length === 0
      ? "<li>✓ none mocked</li>"
      : `<li>⚠ ${stubs.providerStubs.length} mocked</li>${providerLines}`;

  return `<h1 class="convat-status" data-status="${capability.status}">Preview Status: ${capability.status}</h1>
  <section>
    <h2>Props</h2>
    <ul>
      <li>✓ ${cleanProps}/${totalProps} generated</li>
      ${fallbackLine}
    </ul>
  </section>
  <section>
    <h2>Dependencies</h2>
    <ul>
      <li>✓ ${capability.resolvedImports.length} resolved</li>
      ${dependencyLines}
    </ul>
  </section>
  <section>
    <h2>Providers</h2>
    <ul>${providerSection}</ul>
  </section>
  <section>
    <h2>Styles</h2>
    <ul>${styleLine}</ul>
  </section>`;
}

function kindLabel(stub: StubContract): string {
  switch (stub.kind) {
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

function confidenceCopy(confidence: StubContract["confidence"]): string {
  return `${confidence} confidence — inferred from usage pattern`;
}

// ─────────────────────────────────────────────────────────────────────────
// Styles and escaping
// ─────────────────────────────────────────────────────────────────────────

function compatibilityStyles(): string {
  return `
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    #convat-app { display: flex; min-height: 100vh; }
    #convat-panel {
      width: 360px;
      flex: 0 0 360px;
      padding: 16px;
      border-right: 1px solid #8884;
      max-height: 100vh;
      overflow-y: auto;
      position: sticky;
      top: 0;
    }
    #convat-panel h1 { font-size: 16px; margin: 0 0 16px; }
    #convat-panel h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; opacity: 0.7; margin: 0 0 6px; }
    #convat-panel ul { list-style: none; padding-left: 0; margin: 0 0 16px; }
    #convat-panel li { margin: 4px 0; }
    #convat-panel section { margin-bottom: 16px; }
    .convat-status[data-status="FULL"] { color: #1a7f37; }
    .convat-status[data-status="PARTIAL"] { color: #9a6700; }
    .convat-status[data-status="FAILED"] { color: #b00020; }
    .convat-controls-section { border-top: 1px solid #8884; padding-top: 12px; }
    .convat-control { display: grid; gap: 4px; margin-bottom: 12px; }
    .convat-control label { font-size: 12px; font-weight: 600; overflow-wrap: anywhere; }
    .convat-required { font-weight: 400; opacity: 0.65; }
    .convat-control input[type="text"],
    .convat-control input[type="number"],
    .convat-control select,
    .convat-control textarea {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid #8886;
      border-radius: 4px;
      background: transparent;
      color: inherit;
      font: inherit;
    }
    .convat-control input[type="checkbox"] { width: 18px; height: 18px; }
    .convat-control textarea { min-height: 72px; font-family: ui-monospace, monospace; font-size: 12px; resize: vertical; }
    .convat-control input[aria-invalid="true"],
    .convat-control textarea[aria-invalid="true"] { border-color: #b00020; }
    .convat-field-error { color: #b00020; font-size: 12px; margin: 0; }
    .convat-muted { font-size: 12px; opacity: 0.7; margin: 4px 0; }
    .convat-function-prop { display: grid; gap: 4px; }
    .convat-scroll { background: none; border: 0; padding: 0; color: inherit; text-align: left; cursor: pointer; font: inherit; }
    .convat-scroll:hover { text-decoration: underline; }
    .convat-stub summary { cursor: pointer; overflow-wrap: anywhere; }
    .convat-stub p { margin: 4px 0 0 16px; font-size: 12px; opacity: 0.8; }
    #convat-event-log { max-height: 180px; overflow-y: auto; font-size: 12px; }
    #convat-event-log li { border-bottom: 1px solid #8883; padding: 4px 0; overflow-wrap: anywhere; }
    #convat-event-log time { opacity: 0.6; }
    #convat-stage { flex: 1; padding: 24px; }
    #convat-error { white-space: pre-wrap; color: #b00020; }
    #convat-toasts { position: fixed; right: 16px; bottom: 16px; display: grid; gap: 8px; z-index: 10; max-width: 360px; }
    .convat-toast { padding: 10px 12px; border: 1px solid #8886; border-radius: 6px; background: Canvas; color: CanvasText; box-shadow: 0 4px 16px #0003; font-size: 13px; overflow-wrap: anywhere; }
    .convat-toast strong { display: block; margin-bottom: 2px; }
    .convat-button, button { font: inherit; padding: 6px 12px; }
    input, textarea, select { font: inherit; }
  `;
}

function scriptSafe(source: string): string {
  return source.replace(/<\/script/gi, "<\\/script");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
