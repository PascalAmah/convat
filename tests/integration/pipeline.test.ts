/**
 * Zero-repo full-pipeline integration harness (CONV-113).
 *
 * Every fixture is copied into a temporary directory with no package.json, run
 * through resolver → ast-extractor → capability-engine → prop-mocker →
 * dependency-classifier → dependency-stubber → bundler → shell-generator, and
 * checked against its documented status. Components 04 and 07 are then rendered
 * in jsdom to prove the single-React-runtime contract (no "Invalid hook call").
 */

import { afterAll, describe, expect, it } from "vitest";

import { JSDOM, VirtualConsole } from "jsdom";

import { extractComponent } from "../../src/ast-extractor/index.js";
import { assessCapability } from "../../src/capability-engine/index.js";
import { resolveTarget } from "../../src/resolver/index.js";
import {
  cleanupTemporaryDirectories,
  copyIntoZeroRepo,
  EXPECTED,
  runFixture,
} from "./harness.js";

afterAll(() => {
  cleanupTemporaryDirectories();
});

describe("zero-repo pipeline", () => {
  for (const expected of EXPECTED) {
    it(`runs ${expected.fixture} to ${expected.status}`, async () => {
      const result = await runFixture(expected.fixture);

      expect(result.target.mode).toBe("zero-repo");
      expect(result.report.status).toBe(expected.status);
      expect(result.shell).toContain(`Preview Status: ${expected.status}`);
      expect(result.shell).not.toMatch(/<script[^>]+src=["']https?:/i);

      if (expected.fallbackFields) {
        expect(result.mockedProps.fallbackFields).toEqual(
          expected.fallbackFields
        );
      }
      if (expected.stubKinds) {
        expect(result.stubs.stubs.map((stub) => stub.kind)).toEqual(
          expected.stubKinds
        );
      }
    });
  }

  it("reports a missing component as a typed pipeline error", () => {
    const filePath = copyIntoZeroRepo("errors/no-component-export.ts");
    const target = resolveTarget({ target: filePath });

    expect(() => extractComponent(target)).toThrowError(
      /No exported React component/i
    );
  });

  it("accepts stdin as a zero-repo target", () => {
    const target = resolveTarget({
      target: "-",
      readStdin: () =>
        `export default function Hello() { return <h1>Hello</h1>; }`,
    });

    expect(target.mode).toBe("zero-repo");
    expect(target.source).toBe("stdin");

    const manifest = extractComponent(target);
    const report = assessCapability(manifest);

    expect(report.status).toBe("FULL");
  });
});

describe("jsdom render", () => {
  it("renders 04 with hooks and no duplicate React instance", async () => {
    const result = await runFixture("components/04-local-imports.tsx");
    const dom = render(result.shell);

    try {
      await waitFor(
        () => dom.window.document.querySelector("#convat-root")?.textContent,
        (text) => text.includes("Show more")
      );

      const body = dom.window.document.body.textContent ?? "";
      expect(body).toContain("Show more");
      expect(body).not.toContain("Invalid hook call");
      expect(
        dom.window.document.getElementById("convat-error")?.textContent
      ).toBe("");
    } finally {
      dom.window.close();
    }
  });

  it("renders 07 through the hook stub without a duplicate React instance", async () => {
    const result = await runFixture("components/07-redux.tsx");
    const dom = render(result.shell);

    try {
      await waitFor(
        () => dom.window.document.querySelector("#convat-root")?.textContent,
        (text) => text.includes("0 items")
      );

      const body = dom.window.document.body.textContent ?? "";
      expect(body).toContain("Total: $0.00");
      expect(body).not.toContain("Invalid hook call");
    } finally {
      dom.window.close();
    }
  });

  it("keeps the coverage panel when the component throws during render", async () => {
    const result = await runFixture("errors/throws-on-render.tsx");
    const dom = render(result.shell);

    try {
      await waitFor(
        () => dom.window.document.getElementById("convat-error")?.textContent,
        (text) => text.length > 0
      );

      const document = dom.window.document;
      expect(document.getElementById("convat-panel")?.textContent).toContain(
        "Preview Status: PARTIAL"
      );
      expect(document.getElementById("convat-error")?.textContent).not.toBe("");
    } finally {
      dom.window.close();
    }
  });
});

function render(shell: string): JSDOM {
  return new JSDOM(shell, {
    runScripts: "dangerously",
    pretendToBeVisual: true,
    url: "http://localhost/",
    virtualConsole: new VirtualConsole(),
  });
}

async function waitFor(
  read: () => string | null | undefined,
  done: (value: string) => boolean,
  timeoutMs = 5000
): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = read() ?? "";
    if (done(value)) return;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 25));
  }

  throw new Error(`Timed out waiting for render; last value: ${read() ?? ""}`);
}
