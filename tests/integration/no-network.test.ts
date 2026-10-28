/**
 * Test Plan §6 / build-plan Phase 2 item 12: a normal (non-`--share`) preview
 * must never make an outbound network call.
 *
 * The preview server is injected, so binding a local port (inbound) is out of
 * scope here; the guards below catch outbound sockets, HTTP clients, DNS and
 * fetch. Any hit fails the test.
 */

import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { run } from "../../src/cli/run.js";
import type { ServerOptions } from "../../src/server/index.js";

const fixture = fileURLToPath(
  new URL("../../fixtures/components/01-basic.tsx", import.meta.url)
);

const outbound: string[] = [];

let restore: Array<() => void> = [];

beforeEach(() => {
  outbound.length = 0;
  restore = [];

  const originalConnect = net.Socket.prototype.connect;
  net.Socket.prototype.connect = function (
    this: net.Socket,
    ...args: unknown[]
  ) {
    outbound.push("net.Socket.connect");
    return (originalConnect as (...rest: unknown[]) => net.Socket).apply(
      this,
      args
    );
  } as typeof net.Socket.prototype.connect;
  restore.push(() => {
    net.Socket.prototype.connect = originalConnect;
  });

  const originalHttpRequest = http.request;
  http.request = ((...args: unknown[]) => {
    outbound.push("http.request");
    return (originalHttpRequest as (...rest: unknown[]) => unknown).apply(
      http,
      args
    );
  }) as typeof http.request;
  restore.push(() => {
    http.request = originalHttpRequest;
  });

  const originalHttpsRequest = https.request;
  https.request = ((...args: unknown[]) => {
    outbound.push("https.request");
    return (originalHttpsRequest as (...rest: unknown[]) => unknown).apply(
      https,
      args
    );
  }) as typeof https.request;
  restore.push(() => {
    https.request = originalHttpsRequest;
  });

  const originalLookup = dns.lookup;
  dns.lookup = ((...args: unknown[]) => {
    outbound.push("dns.lookup");
    return (originalLookup as (...rest: unknown[]) => unknown).apply(
      dns,
      args
    );
  }) as typeof dns.lookup;
  restore.push(() => {
    dns.lookup = originalLookup;
  });

  const originalPromisesLookup = dns.promises.lookup;
  dns.promises.lookup = ((...args: unknown[]) => {
    outbound.push("dns.promises.lookup");
    return (originalPromisesLookup as (...rest: unknown[]) => unknown).apply(
      dns.promises,
      args
    );
  }) as typeof dns.promises.lookup;
  restore.push(() => {
    dns.promises.lookup = originalPromisesLookup;
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    outbound.push("fetch");
    throw new Error("network access blocked by the Convat no-network guard");
  }) as typeof fetch;
  restore.push(() => {
    globalThis.fetch = originalFetch;
  });
});

afterEach(() => {
  for (const undo of restore.reverse()) {
    undo();
  }
});

describe("no-network guarantee", () => {
  it("runs a normal preview without any outbound network call", async () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const servers: ServerOptions[] = [];

    const code = await run([fixture, "--no-open"], {
      stdinIsTTY: false,
      stdout: (text) => stdout.push(text),
      stderr: (text) => stderr.push(text),
      startServer: async (options) => {
        servers.push(options);
        return {
          url: `http://localhost:${options.port}`,
          port: options.port,
          close: async () => undefined,
        };
      },
    });

    expect(code).toBe(0);
    expect(outbound).toEqual([]);
    expect(stderr.join("")).toBe("");

    const html = servers[0]?.html ?? "";
    expect(html).not.toMatch(/<script[^>]+src=["']https?:\/\//i);
    expect(html).not.toMatch(/<link[^>]+href=["']https?:\/\//i);
  });
});
