/**
 * Unit tests for resolver — Test Plan v1.0 §4:
 * "Correct mode detection (in-project vs zero-repo) across: nested
 * package.json, no package.json anywhere, stdin input always -> zero-repo"
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveTarget,
  TargetNotFoundError,
  TargetUnreadableError,
} from "../../src/resolver/index.js";

describe("resolver", () => {
  let tmpRoot: string;

  beforeEach(() => {
    tmpRoot = mkdtempSync(join(tmpdir(), "convat-resolver-test-"));
  });

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("detects in-project mode when package.json exists in the same directory", () => {
    writeFileSync(join(tmpRoot, "package.json"), "{}");
    const componentPath = join(tmpRoot, "Component.tsx");
    writeFileSync(componentPath, "export default function C() { return null; }");

    const result = resolveTarget({ target: componentPath });

    expect(result.mode).toBe("in-project");
    expect(result.source).toBe("file");
    expect(result.projectRoot).toBe(tmpRoot);
    expect(result.filePath).toBe(componentPath);
  });

  it("detects in-project mode when package.json exists in a nested ancestor directory", () => {
    writeFileSync(join(tmpRoot, "package.json"), "{}");
    const nestedDir = join(tmpRoot, "src", "components", "deeply", "nested");
    mkdirSync(nestedDir, { recursive: true });
    const componentPath = join(nestedDir, "Component.tsx");
    writeFileSync(componentPath, "export default function C() { return null; }");

    const result = resolveTarget({ target: componentPath });

    expect(result.mode).toBe("in-project");
    expect(result.projectRoot).toBe(tmpRoot);
  });

  it("detects zero-repo mode when no package.json exists anywhere above the file", () => {
    const nestedDir = join(tmpRoot, "some", "random", "path");
    mkdirSync(nestedDir, { recursive: true });
    const componentPath = join(nestedDir, "pasted-component.tsx");
    writeFileSync(componentPath, "export default function C() { return null; }");

    const result = resolveTarget({ target: componentPath });

    expect(result.mode).toBe("zero-repo");
    expect(result.projectRoot).toBeNull();
    expect(result.tsconfigPath).toBeNull();
  });

  it("finds tsconfig.json alongside package.json in in-project mode", () => {
    writeFileSync(join(tmpRoot, "package.json"), "{}");
    writeFileSync(join(tmpRoot, "tsconfig.json"), "{}");
    const componentPath = join(tmpRoot, "Component.tsx");
    writeFileSync(componentPath, "export default function C() { return null; }");

    const result = resolveTarget({ target: componentPath });

    expect(result.tsconfigPath).toBe(join(tmpRoot, "tsconfig.json"));
  });

  it("returns null tsconfigPath when package.json exists but tsconfig.json does not", () => {
    writeFileSync(join(tmpRoot, "package.json"), "{}");
    const componentPath = join(tmpRoot, "Component.tsx");
    writeFileSync(componentPath, "export default function C() { return null; }");

    const result = resolveTarget({ target: componentPath });

    expect(result.mode).toBe("in-project");
    expect(result.tsconfigPath).toBeNull();
  });

  it("always resolves stdin ('-') target to zero-repo mode, regardless of cwd", () => {
    // A package.json exists at cwd on purpose: stdin mode must ignore it
    // entirely, since there is no file path to walk up from.
    writeFileSync(join(tmpRoot, "package.json"), "{}");

    const fakeStdin = () => "export default function C() { return null; }";
    const result = resolveTarget({ target: "-", cwd: tmpRoot, readStdin: fakeStdin });

    expect(result.mode).toBe("zero-repo");
    expect(result.source).toBe("stdin");
    expect(result.filePath).toBeNull();
    expect(result.projectRoot).toBeNull();
    expect(result.code).toBe("export default function C() { return null; }");
  });

  it("throws TargetNotFoundError for a nonexistent file path", () => {
    const missingPath = join(tmpRoot, "does-not-exist.tsx");

    expect(() => resolveTarget({ target: missingPath })).toThrow(
      TargetNotFoundError
    );
  });

  it("throws TargetUnreadableError for a directory target (usage error, not EISDIR)", () => {
    const directory = join(tmpRoot, "components");
    mkdirSync(directory);

    expect(() => resolveTarget({ target: directory })).toThrow(
      TargetUnreadableError
    );
  });

  it("throws TargetUnreadableError when stdin cannot be read", () => {
    const brokenStdin = () => {
      throw new TargetUnreadableError("<stdin>", "EAGAIN — resource unavailable");
    };

    expect(() =>
      resolveTarget({ target: "-", readStdin: brokenStdin })
    ).toThrow(TargetUnreadableError);
  });

  it("wraps an unknown stdin read failure as TargetUnreadableError", () => {
    const brokenStdin = () => {
      throw new Error("pipe closed");
    };

    expect(() =>
      resolveTarget({ target: "-", readStdin: brokenStdin })
    ).toThrow(TargetUnreadableError);
  });

  it("resolves relative paths against the provided cwd", () => {
    writeFileSync(join(tmpRoot, "package.json"), "{}");
    writeFileSync(
      join(tmpRoot, "Component.tsx"),
      "export default function C() { return null; }"
    );

    const result = resolveTarget({ target: "./Component.tsx", cwd: tmpRoot });

    expect(result.filePath).toBe(join(tmpRoot, "Component.tsx"));
    expect(result.mode).toBe("in-project");
  });
});
