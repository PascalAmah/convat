#!/usr/bin/env node
/**
 * CLI entry point.
 *
 * Thin wrapper: `run` owns parsing, pipeline execution and exit codes so it can
 * be tested without spawning a process.
 */

import { run } from "./run.js";

run(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
