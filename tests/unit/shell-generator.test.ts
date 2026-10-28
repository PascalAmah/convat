/**
 * Unit tests for shell-generator — Test Plan §4:
 *
 *   "No unconditional external network request in generated shell (assert no
 *    CDN script src by default); --css content inlined when supplied; single
 *    React runtime load confirmed present exactly once."
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { bundle } from "../../src/bundler/index.js";
import { assessCapability } from "../../src/capability-engine/index.js";
import { classifyDependencies } from "../../src/dependency-classifier/index.js";
import { generateStubs } from "../../src/dependency-stubber/index.js";
import { mockProps } from "../../src/prop-mocker/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import { generateShell } from "../../src/shell-generator/index.js";
import { generateSidebarScript } from "../../src/sidebar/index.js";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function shellFor(
  relativePath: string,
  cssPath?: string
): Promise<string> {
  const target = resolveTarget({
    target: join(repoRoot, "fixtures", relativePath),
  });
  const manifest = extractComponent(target);
  const report = assessCapability(manifest);
  const classifications = classifyDependencies(report.unresolvedImports, {
    code: target.code,
    hookCalls: manifest.hookCalls,
  });
  const mockedProps = mockProps(manifest.props);
  const stubs = generateStubs(classifications, report.providerRequirements);
  const bundleCode = await bundle(target, manifest, mockedProps, stubs);

  return generateShell(bundleCode, mockedProps, report, stubs, {
    props: manifest.props,
    sidebarScript: await generateSidebarScript(),
    cssPath,
  });
}

describe("shell-generator — runtime", () => {
  it("loads React and ReactDOM exactly once each", async () => {
    const shell = await shellFor("components/04-local-imports.tsx");

    expect(shell.match(/react\.production\.min\.js/g)).toHaveLength(1);
    expect(shell.match(/react-dom\.production\.min\.js/g)).toHaveLength(1);
  });

  it("loads the runtime before the component bundle", async () => {
    const shell = await shellFor("components/04-local-imports.tsx");

    const reactIndex = shell.indexOf("react.production.min.js");
    const reactDomIndex = shell.indexOf("react-dom.production.min.js");
    const bundleIndex = shell.indexOf("ConvatRoot");

    expect(reactIndex).toBeGreaterThan(-1);
    expect(reactDomIndex).toBeGreaterThan(reactIndex);
    expect(bundleIndex).toBeGreaterThan(reactDomIndex);
  });

  it("makes no external network request by default", async () => {
    const shell = await shellFor("components/04-local-imports.tsx");

    expect(shell).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(shell).not.toMatch(/<link[^>]+href=["']https?:/i);
    expect(shell).not.toContain("cdn.");
  });
});

describe("shell-generator — coverage panel", () => {
  it("shows the status line for a FULL preview", async () => {
    const shell = await shellFor("components/01-basic.tsx");

    expect(shell).toContain("Preview Status: FULL");
    expect(shell).toContain("✓ 2/2 generated");
  });

  it("lists stubs with kind and honest confidence phrasing", async () => {
    const shell = await shellFor("components/05-missing-imports.tsx");

    expect(shell).toContain("Preview Status: PARTIAL");
    expect(shell).toContain("ui-component stub");
    expect(shell).toContain(
      "high confidence — inferred from usage pattern"
    );
    const panel =
      shell.match(/<aside id="convat-panel"[\s\S]*?<\/aside>/)?.[0] ?? "";
    expect(panel).not.toMatch(/\b\d+%/);
  });

  it("lists mocked providers with their wrap strategy", async () => {
    const shell = await shellFor("components/06-context.tsx");

    expect(shell).toContain("1 mocked");
    expect(shell).toContain("useContext(ThemeContext)");
    expect(shell).toContain("generic-context");
  });

  it("reports fallback props and style approximation", async () => {
    const shell = await shellFor("components/03-nested-props.tsx");
    expect(shell).toContain("need JSON input:");
    expect(shell).toContain('data-scroll-prop="columns"');
    expect(shell).toContain('data-scroll-prop="rows"');

    const styled = await shellFor("components/08-styling.tsx");
    expect(styled).toContain("compatibility mode");
  });
});

describe("shell-generator — --css", () => {
  it("inlines supplied local CSS", async () => {
    const directory = mkdtempSync(join(tmpdir(), "convat-css-"));
    const cssPath = join(directory, "extra.css");
    writeFileSync(cssPath, ".convat-marker { color: rgb(1, 2, 3); }");

    const shell = await shellFor("components/01-basic.tsx", cssPath);

    expect(shell).toContain(".convat-marker { color: rgb(1, 2, 3); }");
  });
});
