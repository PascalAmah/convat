/**
 * CLI / E2E tests (Test Plan §2, §6): invoke the real entry point in a child
 * process, so exit codes, stdin and stdout/stderr are the binary's real ones.
 */

import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));
const cliEntry = join(repoRoot, "src", "cli", "index.ts");
const fixtures = join(repoRoot, "fixtures");

interface Spawned {
  child: ChildProcess;
  exited: Promise<number | null>;
  stdout: () => string;
  stderr: () => string;
}

function spawnCli(args: string[], input?: string): Spawned {
  const child = spawn(
    process.execPath,
    ["--import", "tsx", cliEntry, ...args],
    {
      cwd: repoRoot,
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    }
  );

  let stdout = "";
  let stderr = "";
  child.stdout?.on("data", (chunk: Buffer) => {
    stdout += chunk.toString();
  });
  child.stderr?.on("data", (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  child.stdin?.end(input ?? "");

  const exited = new Promise<number | null>((resolve) => {
    child.on("exit", (code) => resolve(code));
  });

  return { child, exited, stdout: () => stdout, stderr: () => stderr };
}

async function waitFor<T>(
  read: () => T | undefined,
  timeoutMs = 20_000
): Promise<T> {
  const started = Date.now();
  for (;;) {
    const value = read();
    if (value !== undefined) {
      return value;
    }
    if (Date.now() - started > timeoutMs) {
      throw new Error("timed out waiting for CLI output");
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function stop(child: ChildProcess, exited: Promise<number | null>): Promise<void> {
  if (child.exitCode === null) {
    child.kill();
  }
  await Promise.race([
    exited,
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (child.exitCode === null) {
    child.kill("SIGKILL");
  }
}

describe("convat binary", () => {
  it("--help exits 0 and documents the network guarantee", async () => {
    const cli = spawnCli(["--help"]);
    const code = await cli.exited;

    expect(code).toBe(0);
    expect(cli.stdout()).toContain("Normal preview mode (no --share) requires no network access.");
  }, 30_000);

  it("--version exits 0", async () => {
    const cli = spawnCli(["--version"]);
    const code = await cli.exited;

    expect(code).toBe(0);
    expect(cli.stdout().trim()).toBe("0.1.0");
  }, 30_000);

  it("exits 2 for a file with no component export", async () => {
    const cli = spawnCli([
      join(fixtures, "errors", "no-component-export.ts"),
    ]);
    const code = await cli.exited;

    expect(code).toBe(2);
    expect(cli.stderr()).toContain("No exported React component found");
  }, 30_000);

  it("serves a real preview and prints status to stdout only", async () => {
    const cli = spawnCli([
      join(fixtures, "components", "01-basic.tsx"),
      "--port",
      "0",
      "--no-open",
    ]);

    try {
      const url = await waitFor(() => {
        const match = /Preview running at (http:\/\/localhost:\d+)/.exec(
          cli.stdout()
        );
        return match?.[1];
      });
      const port = Number(new URL(url).port);

      const response = await fetch(`http://127.0.0.1:${port}/`);
      const html = await response.text();

      expect(response.status).toBe(200);
      expect(html).toContain("Preview Status: FULL");
      expect(cli.stdout()).toContain("✓ Preview ready — FULL");
      expect(cli.stderr()).toBe("");
    } finally {
      await stop(cli.child, cli.exited);
    }
  }, 30_000);

  it("reads a component from stdin and exits 0", async () => {
    const cli = spawnCli(
      ["-", "--no-open", "--port", "0"],
      "export default function Hello() { return <p>hi</p>; }"
    );

    try {
      await waitFor(() => {
        const match = /Preview running at http:\/\/localhost:\d+/.exec(
          cli.stdout()
        );
        return match?.[0];
      });

      expect(cli.stdout()).toContain("Preview ready — FULL");
    } finally {
      await stop(cli.child, cli.exited);
    }
  }, 30_000);
});
