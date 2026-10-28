/**
 * server (CONV-205 / CONV-206 / CONV-306)
 *
 * Serves the generated shell over Fastify, reports the real listening port,
 * launches the browser only after `listen` confirms the bind, and pushes a
 * `reload` frame when the watched source file changes.
 *
 * HMR is deliberately a full-page reload, not module hot-swap: the pipeline is
 * cheap enough to regenerate the shell, and a reload keeps the single React
 * runtime invariant intact (D22).
 */

import { watch } from "node:fs";
import type { FSWatcher } from "node:fs";
import { basename, dirname } from "node:path";

import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import open from "open";
import { WebSocket, WebSocketServer } from "ws";

import { PortInUseError } from "../types/index.js";

export interface ServerOptions {
  port: number;
  html: string;
  watchFilePath: string | null;
  openBrowser: boolean;
  /**
   * Called after a watched file changes. Returning the freshly generated shell
   * lets `/` serve new code before the browser reloads. Errors keep the last
   * good shell and are pushed to the client instead of taking the server down.
   */
  rebuildHtml?: () => Promise<string>;
}

export interface ServerHandle {
  /** Human-facing URL, always `localhost` per CLI Spec §4. */
  url: string;
  /** The actual bound port (differs from `options.port` when it was 0). */
  port: number;
  close(): Promise<void>;
}

export async function startServer(options: ServerOptions): Promise<ServerHandle> {
  const app: FastifyInstance = Fastify({ logger: false });
  let currentHtml = options.html;

  app.get("/", async (_request, reply) => {
    reply.header("cache-control", "no-store");
    return reply.type("text/html; charset=utf-8").send(currentHtml);
  });

  app.get("/__convat/health", async () => ({ ok: true }));

  try {
    await app.listen({ port: options.port, host: "127.0.0.1" });
  } catch (error) {
    await app.close().catch(() => undefined);
    if ((error as NodeJS.ErrnoException).code === "EADDRINUSE") {
      throw new PortInUseError(options.port);
    }
    throw error;
  }

  const port = boundPort(app, options.port);
  const url = `http://localhost:${port}`;

  const sockets = new WebSocketServer({
    server: app.server,
    path: "/__convat/hmr",
  });

  let watcher: FSWatcher | undefined;
  let rebuildTimer: ReturnType<typeof setTimeout> | undefined;
  let rebuilding = false;
  let pending = false;

  function broadcast(payload: unknown): void {
    const text = JSON.stringify(payload);
    for (const client of sockets.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(text);
      }
    }
  }

  async function rebuild(): Promise<void> {
    if (!options.rebuildHtml) return;
    if (rebuilding) {
      pending = true;
      return;
    }

    rebuilding = true;
    try {
      currentHtml = await options.rebuildHtml();
      broadcast({ type: "reload" });
    } catch (error) {
      broadcast({
        type: "reload-error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      rebuilding = false;
      if (pending) {
        pending = false;
        void rebuild();
      }
    }
  }

  if (options.watchFilePath) {
    const fileName = basename(options.watchFilePath);
    // Watch the directory, not the file: atomic-save editors replace the file
    // (rename), which can silently detach a watch registered on the inode.
    watcher = watch(dirname(options.watchFilePath), (_event, changed) => {
      if (changed && String(changed) !== fileName) return;
      if (rebuildTimer) clearTimeout(rebuildTimer);
      // Editors often emit two events for one save; debounce so one save is
      // one rebuild and one reload.
      rebuildTimer = setTimeout(() => {
        void rebuild();
      }, 100);
    });
    watcher.on("error", () => undefined);
  }

  if (options.openBrowser) {
    // Fire-and-forget: a machine with no default browser must not take the
    // preview down. The URL is already printed by the CLI either way.
    void open(url).catch(() => undefined);
  }

  return {
    url,
    port,
    close: async () => {
      if (rebuildTimer) clearTimeout(rebuildTimer);
      watcher?.close();
      for (const client of sockets.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve) => sockets.close(() => resolve()));
      await app.close();
    },
  };
}

function boundPort(app: FastifyInstance, requested: number): number {
  const address = app.server.address();
  if (address && typeof address === "object") {
    return address.port;
  }
  return requested;
}
