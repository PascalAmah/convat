/**
 * Sidebar asset builder (CONV-301).
 *
 * The sidebar is vanilla browser code compiled by esbuild at shell-generation
 * time (D21). Keeping it as a TypeScript source means the control code is
 * typechecked like the rest of the repo, and the generated shell still has no
 * runtime dependency on a UI framework.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

let cached: Promise<string> | undefined;

export function generateSidebarScript(): Promise<string> {
  cached ??= buildSidebar();
  return cached;
}

async function buildSidebar(): Promise<string> {
  const source = fileURLToPath(new URL("./client.ts", import.meta.url));
  const compiled = fileURLToPath(new URL("./client.js", import.meta.url));
  const entry = existsSync(source) ? source : compiled;

  const result = await build({
    entryPoints: [entry],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2018",
    logLevel: "silent",
    sourcemap: false,
  });

  const output = result.outputFiles?.[0]?.text;
  if (!output) {
    throw new Error("sidebar: esbuild produced no output");
  }
  return output;
}
