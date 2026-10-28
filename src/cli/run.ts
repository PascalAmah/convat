/**
 * CLI driver (CONV-201 – CONV-208).
 *
 * Parses the grammar in CLI Spec §2/§3, runs the pipeline once, then starts the
 * preview server. `--diff` and `--share` are rejected with an explicit
 * not-yet-available message (build-plan Phase 2 item 11) rather than silently
 * accepted.
 */

import { statSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

import { Command, CommanderError } from "commander";

import {
  resolveTarget,
  TargetNotFoundError,
  TargetUnreadableError,
} from "../resolver/index.js";
import { startServer } from "../server/index.js";
import type { ServerHandle, ServerOptions } from "../server/index.js";
import { NoComponentFoundError, PortInUseError } from "../types/index.js";
import type { ResolvedTarget } from "../types/index.js";
import { runPipeline } from "./pipeline.js";
import type { PipelineResult } from "./pipeline.js";
import {
  formatBundleErrorStatus,
  formatStatusLine,
  formatVerboseStatus,
} from "./status.js";

export const EXIT = {
  OK: 0,
  USAGE: 1,
  NO_COMPONENT: 2,
  PORT_IN_USE: 3,
  SHARE_FAILED: 4,
} as const;

/** CLI Spec §7, repeated in `--help` so it is discoverable without the spec. */
export const NETWORK_STATEMENT =
  "Normal preview mode (no --share) requires no network access. Component parsing, " +
  "mocking, stubbing, bundling, and serving all happen entirely on the local machine, " +
  "using locally bundled compatibility styles rather than any CDN dependency. The only " +
  "flag that initiates outbound network activity is --share, which is always explicit " +
  "and opt-in.";

export interface RunOptions {
  cwd?: string;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  stdinIsTTY?: boolean;
  readStdin?: () => string;
  startServer?: (options: ServerOptions) => Promise<ServerHandle>;
}

export async function run(
  argv: string[],
  options: RunOptions = {}
): Promise<number> {
  const out = options.stdout ?? ((text: string) => process.stdout.write(text));
  const err = options.stderr ?? ((text: string) => process.stderr.write(text));
  const cwd = options.cwd ?? process.cwd();

  // `pnpm run dev -- <args>` forwards the `--` verbatim on some pnpm versions.
  // Dropping a *leading* separator keeps that invocation working; a `--`
  // between arguments still reaches Commander as the end-of-options marker.
  const args = argv[0] === "--" ? argv.slice(1) : argv;

  const deferred = findDeferredFlag(args);
  if (deferred) {
    err(`${deferred}\n`);
    return EXIT.USAGE;
  }

  const watchFlags = readWatchFlags(args);
  if ("error" in watchFlags) {
    err(`${watchFlags.error}\n`);
    return EXIT.USAGE;
  }

  const program = buildProgram(out, err);
  try {
    program.parse(args, { from: "user" });
  } catch (error) {
    if (error instanceof CommanderError) {
      return error.exitCode === 0 ? EXIT.OK : EXIT.USAGE;
    }
    throw error;
  }

  const opts = program.opts<{
    port: string;
    css?: string;
    props?: string;
    open?: boolean;
    verboseStatus?: boolean;
  }>();

  const rawTarget = program.args[0];
  if (rawTarget === undefined || rawTarget === "") {
    err(
      "error: no target supplied. Pass a component file path, or '-' to read from stdin.\n"
    );
    return EXIT.USAGE;
  }

  const port = Number(opts.port);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    err(`error: invalid --port value '${opts.port}'. Expected 0–65535.\n`);
    return EXIT.USAGE;
  }

  const isStdin = rawTarget === "-";
  if (isStdin && watchFlags.watch === true) {
    err("error: --watch cannot be used with stdin ('-').\n");
    return EXIT.USAGE;
  }
  if (isStdin && (options.stdinIsTTY ?? process.stdin.isTTY === true)) {
    err(
      "error: no stdin input detected. Pipe a component into stdin, e.g. `cat Component.tsx | convat -`.\n"
    );
    return EXIT.USAGE;
  }

  const watch = watchFlags.watch ?? !isStdin;

  let cssPath: string | undefined;
  if (opts.css !== undefined) {
    try {
      cssPath = validateCssPath(opts.css, cwd);
    } catch (error) {
      err(`error: ${(error as Error).message}\n`);
      return EXIT.USAGE;
    }
  }

  let propOverrides: Record<string, unknown> | undefined;
  if (opts.props !== undefined) {
    try {
      propOverrides = parseProps(opts.props);
    } catch (error) {
      err(`error: ${(error as Error).message}\n`);
      return EXIT.USAGE;
    }
  }

  let resolved: ResolvedTarget;
  try {
    resolved = resolveTarget({
      target: rawTarget,
      cwd,
      readStdin: options.readStdin,
    });
  } catch (error) {
    if (
      error instanceof TargetNotFoundError ||
      error instanceof TargetUnreadableError
    ) {
      err(`${error.message}\n`);
      return EXIT.USAGE;
    }
    throw error;
  }

  let result: PipelineResult;
  try {
    result = await runPipeline(resolved, { propOverrides, cssPath, watch });
  } catch (error) {
    if (error instanceof NoComponentFoundError) {
      err(`${error.message}\n`);
      return EXIT.NO_COMPONENT;
    }
    throw error;
  }

  const rebuildHtml =
    watch && resolved.filePath
      ? async (): Promise<string> => {
          const fresh = resolveTarget({
            target: rawTarget,
            cwd,
            readStdin: options.readStdin,
          });
          const next = await runPipeline(fresh, {
            propOverrides,
            cssPath,
            watch: true,
          });
          return next.shell;
        }
      : undefined;

  const launch = options.startServer ?? startServer;
  let handle: ServerHandle;
  try {
    handle = await launch({
      port,
      html: result.shell,
      watchFilePath: watch ? resolved.filePath : null,
      openBrowser: opts.open !== false,
      rebuildHtml,
    });
  } catch (error) {
    if (error instanceof PortInUseError) {
      err(`${error.message}\n`);
      return EXIT.PORT_IN_USE;
    }
    throw error;
  }

  if (result.bundleError) {
    out(`${formatBundleErrorStatus()}\n`);
    out(`Preview running at ${handle.url}\n`);
    err(`BundleError: ${result.bundleError.message}\n`);
    if (result.bundleError.file !== undefined) {
      const line =
        result.bundleError.line !== undefined
          ? `${result.bundleError.file}:${result.bundleError.line}`
          : result.bundleError.file;
      err(`  at ${line}\n`);
    }
  } else if (opts.verboseStatus === true) {
    out(
      `${formatVerboseStatus(
        result.report,
        result.stubs,
        result.mockedProps,
        handle.url
      )}\n`
    );
  } else {
    out(
      `${formatStatusLine(result.report, result.stubs, result.mockedProps)}\n`
    );
    out(`Preview running at ${handle.url}\n`);
  }

  return EXIT.OK;
}

function buildProgram(
  out: (text: string) => void,
  err: (text: string) => void
): Command {
  return new Command()
    .name("convat")
    .usage("[options] <file-path | ->")
    .description(
      "Instant, zero-config component previews — even for code that isn't a project yet."
    )
    .version(readVersion(), "-V, --version", "Print installed Convat version")
    .argument("[target]", "Path to a .tsx/.jsx file, or - to read from stdin")
    .option("--port <number>", "Local port for the preview server", "3000")
    .option("--css <path>", "Load an additional local stylesheet")
    .option("--props <json>", "Override auto-mocked props with a JSON object")
    .option("--no-open", "Skip auto-launching the browser; print the URL instead")
    .option("--watch", "Watch the source file for changes (file targets only)")
    .option("--no-watch", "Disable file watching")
    .option("--verbose-status", "Print the full status breakdown")
    .allowExcessArguments(false)
    .exitOverride()
    .configureOutput({ writeOut: out, writeErr: err })
    .addHelpText("after", `\nNetwork behavior:\n${NETWORK_STATEMENT}\n`);
}

function findDeferredFlag(argv: string[]): string | null {
  for (const token of argv) {
    if (
      token === "--share" ||
      token.startsWith("--share=") ||
      token === "--share-ttl" ||
      token.startsWith("--share-ttl=")
    ) {
      return (
        "error: --share (share mode) is not available yet — planned for product Phase 3. " +
        "See CLI Interface Spec §6."
      );
    }
    if (token === "--diff" || token.startsWith("--diff=")) {
      return (
        "error: --diff (diff mode) is not available yet — planned for product Phase 2. " +
        "See CLI Interface Spec §5."
      );
    }
  }
  return null;
}

function readWatchFlags(
  argv: string[]
): { watch: boolean | undefined } | { error: string } {
  const explicitWatch = argv.includes("--watch");
  const explicitNoWatch = argv.includes("--no-watch");

  if (explicitWatch && explicitNoWatch) {
    return { error: "error: --watch and --no-watch cannot be combined." };
  }
  if (explicitWatch) {
    return { watch: true };
  }
  if (explicitNoWatch) {
    return { watch: false };
  }
  return { watch: undefined };
}

function validateCssPath(rawPath: string, cwd: string): string {
  const cssPath = resolvePath(cwd, rawPath);
  let isFile = false;
  try {
    isFile = statSync(cssPath).isFile();
  } catch {
    throw new Error(`--css path not found: ${rawPath}`);
  }
  if (!isFile) {
    throw new Error(`--css path is not a file: ${rawPath}`);
  }
  return cssPath;
}

function parseProps(raw: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`--props must be valid JSON: ${raw}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--props must be a JSON object, e.g. '{\"title\":\"Hello\"}'.");
  }
  return parsed as Record<string, unknown>;
}

function readVersion(): string {
  try {
    const packageJsonPath = fileURLToPath(
      new URL("../../package.json", import.meta.url)
    );
    const parsed = JSON.parse(readFileSync(packageJsonPath, "utf-8")) as {
      version?: unknown;
    };
    return typeof parsed.version === "string" ? parsed.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
