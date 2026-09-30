/**
 * server — TDD v1.0 §3.9
 *
 * Responsibility: serve the shell (Fastify), watch the source file, push
 * HMR updates over WebSocket, and launch the browser only once the server
 * is confirmed listening.
 *
 * Ticket: CONV-205 (boot + exit codes), CONV-206 (browser launch),
 *         CONV-306 (HMR)
 * Status: not yet implemented
 */

export interface ServerOptions {
  port: number;
  html: string;
  watchFilePath: string | null;
  openBrowser: boolean;
}

export async function startServer(options: ServerOptions): Promise<void> {
  throw new Error("server.startServer: not yet implemented (CONV-205/206/306)");
}
