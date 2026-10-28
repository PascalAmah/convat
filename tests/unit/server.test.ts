/**
 * Unit tests for server (Test Plan §4 server row):
 * serves the shell, reports the real port, maps a busy port to
 * `PortInUseError`, and closes cleanly.
 */

import { once } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";
import { WebSocket } from "ws";

import { startServer } from "../../src/server/index.js";
import type { ServerHandle } from "../../src/server/index.js";
import { PortInUseError } from "../../src/types/index.js";

const HTML = "<!doctype html><html><body><h1>preview</h1></body></html>";

async function withServer(
  run: (handle: ServerHandle) => Promise<void>
): Promise<void> {
  const handle = await startServer({
    port: 0,
    html: HTML,
    watchFilePath: null,
    openBrowser: false,
  });
  try {
    await run(handle);
  } finally {
    await handle.close();
  }
}

describe("server", () => {
  it("serves the generated shell at / with an HTML content type", async () => {
    await withServer(async (handle) => {
      const response = await fetch(`http://127.0.0.1:${handle.port}/`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(await response.text()).toBe(HTML);
    });
  });

  it("reports the actual bound port when asked for port 0", async () => {
    await withServer(async (handle) => {
      expect(handle.port).toBeGreaterThan(0);
      expect(handle.url).toBe(`http://localhost:${handle.port}`);
    });
  });

  it("serves the health endpoint", async () => {
    await withServer(async (handle) => {
      const response = await fetch(
        `http://127.0.0.1:${handle.port}/__convat/health`
      );

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
    });
  });

  it("throws PortInUseError when the port is already bound", async () => {
    await withServer(async (handle) => {
      await expect(
        startServer({
          port: handle.port,
          html: HTML,
          watchFilePath: null,
          openBrowser: false,
        })
      ).rejects.toBeInstanceOf(PortInUseError);
    });
  });
});

describe("server — HMR (CONV-306)", () => {
  it("rebuilds the shell and pushes reload after the watched file changes", async () => {
    const directory = mkdtempSync(join(tmpdir(), "convat-hmr-"));
    const file = join(directory, "component.tsx");
    writeFileSync(file, "export default function A() { return null; }\n");

    let builds = 0;
    const handle = await startServer({
      port: 0,
      html: "<h1>one</h1>",
      watchFilePath: file,
      openBrowser: false,
      rebuildHtml: async () => {
        builds += 1;
        return "<h1>two</h1>";
      },
    });

    const client = new WebSocket(`ws://127.0.0.1:${handle.port}/__convat/hmr`);
    try {
      await once(client, "open");
      const message = once(client, "message");
      writeFileSync(file, "export default function B() { return null; }\n");

      const [payload] = await message;
      expect(JSON.parse(String(payload))).toEqual({ type: "reload" });
      expect(builds).toBeGreaterThanOrEqual(1);

      const response = await fetch(`http://127.0.0.1:${handle.port}/`);
      expect(await response.text()).toBe("<h1>two</h1>");
    } finally {
      client.close();
      await handle.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("keeps the last good shell and reports a failed rebuild", async () => {
    const directory = mkdtempSync(join(tmpdir(), "convat-hmr-error-"));
    const file = join(directory, "component.tsx");
    writeFileSync(file, "export default function A() { return null; }\n");

    const handle = await startServer({
      port: 0,
      html: "<h1>good</h1>",
      watchFilePath: file,
      openBrowser: false,
      rebuildHtml: async () => {
        throw new Error("no component export");
      },
    });

    const client = new WebSocket(`ws://127.0.0.1:${handle.port}/__convat/hmr`);
    try {
      await once(client, "open");
      const message = once(client, "message");
      writeFileSync(file, "export default 1;\n");

      const [payload] = await message;
      expect(JSON.parse(String(payload))).toEqual({
        type: "reload-error",
        message: "no component export",
      });

      const response = await fetch(`http://127.0.0.1:${handle.port}/`);
      expect(await response.text()).toBe("<h1>good</h1>");
    } finally {
      client.close();
      await handle.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
