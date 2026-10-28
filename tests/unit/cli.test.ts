/**
 * Unit tests for the CLI driver (CLI Spec §2–§4, §8; Test Plan §6).
 *
 * The server is injected so exit codes and stdout/stderr can be asserted
 * without binding a port. Real binary invocations live in
 * tests/integration/cli.e2e.test.ts.
 */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, describe, expect, it } from "vitest";

import { run } from "../../src/cli/run.js";
import type { RunOptions } from "../../src/cli/run.js";
import type { ServerHandle, ServerOptions } from "../../src/server/index.js";
import { PortInUseError } from "../../src/types/index.js";

const fixtures = fileURLToPath(new URL("../../fixtures/", import.meta.url));

function fixture(name: string): string {
  return join(fixtures, name);
}

interface Harness {
  options: RunOptions;
  servers: ServerOptions[];
  stdout: () => string;
  stderr: () => string;
}

function harness(
  startServer?: (options: ServerOptions) => Promise<ServerHandle>
): Harness {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const servers: ServerOptions[] = [];

  return {
    servers,
    stdout: () => stdout.join(""),
    stderr: () => stderr.join(""),
    options: {
      stdinIsTTY: false,
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
      startServer:
        startServer ??
        (async (options) => {
          servers.push(options);
          return {
            url: `http://localhost:${options.port}`,
            port: options.port,
            close: async () => undefined,
          };
        }),
    },
  };
}

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { recursive: true, force: true });
  }
  temporaryDirectories.length = 0;
});

describe("CLI grammar and flags", () => {
  it("--help exits 0 and includes the network statement", async () => {
    const h = harness();
    const code = await run(["--help"], h.options);

    expect(code).toBe(0);
    expect(h.stdout()).toContain("--verbose-status");
    expect(h.stdout()).toContain("Normal preview mode (no --share) requires no network access.");
  });

  it("tolerates a leading '--' forwarded by pnpm run", async () => {
    const h = harness();
    const code = await run(
      ["--", fixture("components/01-basic.tsx"), "--no-open"],
      h.options
    );

    expect(code).toBe(0);
    expect(h.stdout()).toContain("Preview ready — FULL");
    expect(h.servers).toHaveLength(1);
  });

  it("--version exits 0 and prints the package version", async () => {
    const h = harness();
    const code = await run(["--version"], h.options);

    expect(code).toBe(0);
    expect(h.stdout().trim()).toBe("0.1.0");
  });

  it("exits 1 when no target is supplied", async () => {
    const h = harness();
    const code = await run([], h.options);

    expect(code).toBe(1);
    expect(h.stderr()).toContain("no target supplied");
    expect(h.servers).toHaveLength(0);
  });

  it("rejects --diff with an explicit not-yet-available message", async () => {
    const h = harness();
    const code = await run(["--diff", "HEAD~1", fixture("components/01-basic.tsx")], h.options);

    expect(code).toBe(1);
    expect(h.stderr()).toContain("--diff");
    expect(h.stderr()).toContain("not available yet");
  });

  it("rejects --share with an explicit not-yet-available message", async () => {
    const h = harness();
    const code = await run([fixture("components/01-basic.tsx"), "--share"], h.options);

    expect(code).toBe(1);
    expect(h.stderr()).toContain("--share");
    expect(h.stderr()).toContain("not available yet");
  });

  it("rejects --watch with stdin", async () => {
    const h = harness();
    const code = await run(["-", "--watch"], h.options);

    expect(code).toBe(1);
    expect(h.stderr()).toContain("--watch cannot be used with stdin");
  });

  it("rejects --watch and --no-watch together", async () => {
    const h = harness();
    const code = await run(
      [fixture("components/01-basic.tsx"), "--watch", "--no-watch"],
      h.options
    );

    expect(code).toBe(1);
    expect(h.stderr()).toContain("cannot be combined");
  });

  it("rejects an invalid --port", async () => {
    const h = harness();
    const code = await run(
      [fixture("components/01-basic.tsx"), "--port", "not-a-number"],
      h.options
    );

    expect(code).toBe(1);
    expect(h.stderr()).toContain("invalid --port");
  });

  it("exits 1 when --css points at a missing file", async () => {
    const h = harness();
    const code = await run(
      [fixture("components/01-basic.tsx"), "--css", "./missing.css"],
      h.options
    );

    expect(code).toBe(1);
    expect(h.stderr()).toContain("--css path not found");
  });

  it("exits 1 when --props is not a JSON object", async () => {
    const h = harness();
    const code = await run(
      [fixture("components/01-basic.tsx"), "--props", "[1,2]"],
      h.options
    );

    expect(code).toBe(1);
    expect(h.stderr()).toContain("--props must be a JSON object");
  });
});

describe("CLI pipeline outcomes and exit codes", () => {
  it("exits 2 when no component export is found", async () => {
    const h = harness();
    const code = await run([fixture("errors/no-component-export.ts")], h.options);

    expect(code).toBe(2);
    expect(h.stderr()).toContain("No exported React component found");
    expect(h.servers).toHaveLength(0);
  });

  it("exits 0 for PARTIAL and prints the counted status line", async () => {
    const h = harness();
    const code = await run([fixture("components/05-missing-imports.tsx")], h.options);

    expect(code).toBe(0);
    expect(h.stdout()).toContain("Preview ready — PARTIAL");
    expect(h.stdout()).toContain("2 dependencies stubbed");
    expect(h.stdout()).toContain("Preview running at http://localhost:3000");
    expect(h.servers).toHaveLength(1);
  });

  it("renders the verbose breakdown from the report", async () => {
    const h = harness();
    const code = await run(
      [fixture("components/05-missing-imports.tsx"), "--verbose-status"],
      h.options
    );

    expect(code).toBe(0);
    expect(h.stdout()).toContain("Preview Status: PARTIAL");
    expect(h.stdout()).toContain("Dependencies");
    expect(h.stdout()).toContain("⚠ 2 stubbed");
    expect(h.stdout()).toContain("Avatar");
    expect(h.stdout()).toContain("inferred from usage pattern");
    expect(h.stdout()).toContain("Preview running at http://localhost:3000");
  });

  it("applies --props as an override merged over auto-mocked values", async () => {
    const h = harness();
    const code = await run(
      [
        fixture("components/01-basic.tsx"),
        "--props",
        '{"label":"Overridden label"}',
      ],
      h.options
    );

    expect(code).toBe(0);
    expect(h.servers[0]?.html).toContain("Overridden label");
    expect(h.servers[0]?.html).toContain("disabled");
    expect(h.servers[0]?.html).toContain('"disabled": false');
  });

  it("honours --no-open", async () => {
    const h = harness();
    const code = await run(
      [fixture("components/01-basic.tsx"), "--no-open"],
      h.options
    );

    expect(code).toBe(0);
    expect(h.servers[0]?.openBrowser).toBe(false);
  });

  it("opens the browser by default", async () => {
    const h = harness();
    await run([fixture("components/01-basic.tsx")], h.options);

    expect(h.servers[0]?.openBrowser).toBe(true);
  });

  it("passes the watched file only for file targets with watch enabled", async () => {
    const h = harness();
    await run([fixture("components/01-basic.tsx")], h.options);

    expect(h.servers[0]?.watchFilePath).toBe(
      fixture("components/01-basic.tsx")
    );
    expect(typeof h.servers[0]?.rebuildHtml).toBe("function");
    expect(h.servers[0]?.html).toContain('"hmr":true');
  });

  it("does not watch or rebuild when --no-watch is set", async () => {
    const h = harness();
    await run([fixture("components/01-basic.tsx"), "--no-watch"], h.options);

    expect(h.servers[0]?.watchFilePath).toBeNull();
    expect(h.servers[0]?.rebuildHtml).toBeUndefined();
    expect(h.servers[0]?.html).toContain('"hmr":false');
  });

  it("rebuilds the shell from a changed file for HMR", async () => {
    const directory = mkdtempSync(join(tmpdir(), "convat-cli-rebuild-"));
    temporaryDirectories.push(directory);
    const componentPath = join(directory, "Live.tsx");
    writeFileSync(
      componentPath,
      'interface P { label: string }\nexport default function Live({ label }: P) { return <span data-version="one">{label}</span>; }\n'
    );

    const h = harness();
    const code = await run([componentPath, "--no-open"], h.options);
    expect(code).toBe(0);
    expect(h.servers[0]?.html).toContain("Sample text");

    writeFileSync(
      componentPath,
      'interface P { label: string }\nexport default function Live({ label }: P) { return <strong data-version="two">{label}</strong>; }\n'
    );
    const rebuilt = await h.servers[0]?.rebuildHtml?.();

    expect(rebuilt).toContain('"data-version": "two"');
    expect(rebuilt).not.toContain('"data-version": "one"');
  });

  it("exits 3 when the port is in use", async () => {
    const h = harness(async () => {
      throw new PortInUseError(3000);
    });
    const code = await run([fixture("components/01-basic.tsx")], h.options);

    expect(code).toBe(3);
    expect(h.stderr()).toContain("Port 3000 is already in use");
  });

  it("exits 0 on a BundleError and still serves the error shell", async () => {
    const directory = mkdtempSync(join(tmpdir(), "convat-cli-bundle-"));
    temporaryDirectories.push(directory);
    const brokenPath = join(directory, "Broken.tsx");
    writeFileSync(
      brokenPath,
      [
        "export default function Broken() {",
        "  return <div>oops</div>;",
        "}",
        "const broken = ;",
      ].join("\n")
    );

    const h = harness();
    const code = await run([brokenPath], h.options);

    expect(code).toBe(0);
    expect(h.stdout()).toContain("FAILED (bundle error)");
    expect(h.stderr()).toContain("BundleError");
    expect(h.servers[0]?.html).toContain("bundle error");
  });

  it("reads a component from stdin and exits 0", async () => {
    const h = harness();
    const code = await run(["-", "--no-open"], {
      ...h.options,
      readStdin: () =>
        "interface P { label: string }\nexport default function S({ label }: P) { return <span>{label}</span>; }",
    });

    expect(code).toBe(0);
    expect(h.stdout()).toContain("Preview ready — FULL");
    expect(h.servers[0]?.watchFilePath).toBeNull();
    expect(h.servers[0]?.rebuildHtml).toBeUndefined();
    expect(h.servers[0]?.html).toContain('"hmr":false');
  });
});
