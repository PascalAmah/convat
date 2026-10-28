/**
 * resolver (CONV-102)
 *
 * Resolves the CLI target (file path or stdin) into a `ResolvedTarget` and
 * decides the mode. Mode is "in-project" when a package.json is found walking
 * up from the file, otherwise "zero-repo"; stdin is always "zero-repo".
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve as resolvePath } from "node:path";

import type { ResolvedTarget } from "../types/index.js";

export class TargetNotFoundError extends Error {
  constructor(public readonly filePath: string) {
    super(`Convat could not find a file at: ${filePath}`);
    this.name = "TargetNotFoundError";
  }
}

export class AmbiguousTargetError extends Error {
  constructor() {
    super(
      "Convat received both a file path and stdin ('-') as targets. " +
        "Supply exactly one target form (CLI Interface Spec §2)."
    );
    this.name = "AmbiguousTargetError";
  }
}

/**
 * A target exists but cannot be read: a directory, a permission failure, or a
 * broken stdin pipe. This is a usage error (exit 1), never a missing-component
 * error (exit 2) — the pipeline never saw any code to look for a component in.
 */
export class TargetUnreadableError extends Error {
  readonly code = "TARGET_UNREADABLE" as const;
  constructor(
    public readonly target: string,
    public readonly reason: string
  ) {
    super(`Convat could not read ${target}: ${reason}`);
    this.name = "TargetUnreadableError";
  }
}

function describeFailure(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code} — ${error.message}` : error.message;
  }
  return String(error);
}

/**
 * Reads all of stdin as UTF-8. This is the default `readStdin`; tests inject a
 * fake reader instead of blocking on fd 0.
 *
 * A failed read is surfaced as `TargetUnreadableError` rather than being
 * swallowed into an empty string, which would masquerade as "no component
 * found" (exit 2) instead of the usage error it is (exit 1).
 */
function readStdinSync(): string {
  try {
    // fd 0 is stdin. This blocks until EOF, matching `cat file | convat -`.
    return readFileSync(0, "utf-8");
  } catch (error) {
    throw new TargetUnreadableError("<stdin>", describeFailure(error));
  }
}

/**
 * Walks up from `startDir` to the nearest package.json, returning its directory
 * or null at the filesystem root.
 */
function findProjectRoot(startDir: string): string | null {
  let current = startDir;

  // Cap the walk so a broken filesystem (like a symlink loop) can't hang forever.
  const MAX_HOPS = 100;

  for (let i = 0; i < MAX_HOPS; i++) {
    const candidate = resolvePath(current, "package.json");
    if (existsSync(candidate)) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      // Reached filesystem root without finding one.
      return null;
    }
    current = parent;
  }

  return null;
}

/**
 * Given a project root, finds the nearest tsconfig.json inside it, if any.
 * Zero-repo mode never has a tsconfig, since projectRoot is null.
 */
function findTsconfig(projectRoot: string): string | null {
  const candidate = resolvePath(projectRoot, "tsconfig.json");
  return existsSync(candidate) ? candidate : null;
}

export interface ResolveOptions {
  /** The raw CLI target: an absolute or relative file path, or "-" for stdin. */
  target: string;
  /** Working directory to resolve relative paths against. Defaults to process.cwd(). */
  cwd?: string;
  /**
   * Stdin reader override, used only when target === "-". Defaults to reading
   * fd 0 for real. Tests can inject a fake reader here.
   */
  readStdin?: () => string;
}

/**
 * Turns a raw CLI target into a `ResolvedTarget`. Throws `TargetNotFoundError`
 * when a file target does not exist (a usage error, exit 1).
 */
export function resolveTarget(options: ResolveOptions): ResolvedTarget {
  const cwd = options.cwd ?? process.cwd();
  const rawTarget = options.target;

  if (rawTarget === "-") {
    const readStdin = options.readStdin ?? readStdinSync;
    let code: string;
    try {
      code = readStdin();
    } catch (error) {
      if (error instanceof TargetUnreadableError) {
        throw error;
      }
      throw new TargetUnreadableError("<stdin>", describeFailure(error));
    }
    return {
      mode: "zero-repo",
      source: "stdin",
      filePath: null,
      code,
      projectRoot: null,
      tsconfigPath: null,
    };
  }

  const filePath = isAbsolute(rawTarget) ? rawTarget : resolvePath(cwd, rawTarget);

  if (!existsSync(filePath)) {
    throw new TargetNotFoundError(filePath);
  }

  let isDirectory = false;
  try {
    isDirectory = statSync(filePath).isDirectory();
  } catch (error) {
    throw new TargetUnreadableError(filePath, describeFailure(error));
  }
  if (isDirectory) {
    throw new TargetUnreadableError(filePath, "it is a directory, not a file");
  }

  let code: string;
  try {
    code = readFileSync(filePath, "utf-8");
  } catch (error) {
    throw new TargetUnreadableError(filePath, describeFailure(error));
  }
  const projectRoot = findProjectRoot(dirname(filePath));

  if (projectRoot === null) {
    return {
      mode: "zero-repo",
      source: "file",
      filePath,
      code,
      projectRoot: null,
      tsconfigPath: null,
    };
  }

  return {
    mode: "in-project",
    source: "file",
    filePath,
    code,
    projectRoot,
    tsconfigPath: findTsconfig(projectRoot),
  };
}
