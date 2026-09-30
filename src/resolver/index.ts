/**
 * resolver — TDD v1.0 §3.1 / Task Breakdown CONV-102
 *
 * Responsibility: determine what kind of target this is before anything else
 * runs. Given a raw CLI argument (file path or stdin), this module produces
 * the single `mode` flag (`in-project` | `zero-repo`) that every downstream
 * module reads from — no other module re-derives this decision independently.
 *
 * Mode is derived by walking up from the target file looking for the nearest
 * package.json. Found -> "in-project". Not found, or input came from stdin
 * -> "zero-repo".
 */

import { existsSync, readFileSync } from "node:fs";
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
 * Reads all of stdin synchronously as UTF-8 text.
 * Used only when the target argument is the literal "-".
 *
 * Exposed as the default `readStdin` dependency in `ResolveOptions` rather
 * than called directly, so tests can inject a fake reader instead of
 * touching real fd 0 (which would otherwise block waiting for real input).
 */
function readStdinSync(): string {
  try {
    // fd 0 is stdin. This blocks until EOF, matching `cat file | convat -`.
    return readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Walks up from `startDir` looking for the nearest package.json.
 * Returns the directory containing it, or null if none is found before
 * reaching the filesystem root.
 */
function findProjectRoot(startDir: string): string | null {
  let current = startDir;

  // Cap the walk so a pathological filesystem (e.g. a symlink loop) can't
  // hang resolution indefinitely.
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
  /**
   * Raw CLI target argument: an absolute or relative file path, or the
   * literal string "-" for stdin (CLI Interface Spec §2).
   */
  target: string;
  /** Working directory to resolve relative paths against. Defaults to process.cwd(). */
  cwd?: string;
  /**
   * Stdin reader override, used only when target === "-". Defaults to a real
   * synchronous read of fd 0. Tests should inject a fake reader here rather
   * than mocking node:fs, to avoid touching a real blocking stdin read.
   */
  readStdin?: () => string;
}

/**
 * Resolves a raw CLI target into a `ResolvedTarget`, determining mode
 * (in-project vs zero-repo) along the way.
 *
 * Throws `TargetNotFoundError` if a file target does not exist on disk —
 * this is a usage error (CLI Interface Spec §8, exit code 1), not something
 * the pipeline should attempt to gracefully degrade around, since there is
 * no code at all to analyze.
 */
export function resolveTarget(options: ResolveOptions): ResolvedTarget {
  const cwd = options.cwd ?? process.cwd();
  const rawTarget = options.target;

  if (rawTarget === "-") {
    const readStdin = options.readStdin ?? readStdinSync;
    const code = readStdin();
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

  const code = readFileSync(filePath, "utf-8");
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
