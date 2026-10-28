/**
 * Phase 3 integration: the generated shell's sidebar, postMessage state
 * channel, raw JSON fallback editors, coverage links and event log, all driven
 * through jsdom against the real fixture pipeline.
 */

import { afterAll, describe, expect, it } from "vitest";

import { JSDOM, VirtualConsole } from "jsdom";

import {
  cleanupTemporaryDirectories,
  runFixture,
} from "./harness.js";

afterAll(() => {
  cleanupTemporaryDirectories();
});

describe("interactive sidebar", () => {
  it("renders one control per prop category", async () => {
    const basic = render((await runFixture("components/01-basic.tsx")).shell);
    try {
      await waitForControls(basic);

      const label = basic.window.document.getElementById(
        "convat-input-label"
      ) as HTMLInputElement | null;
      const disabled = basic.window.document.getElementById(
        "convat-input-disabled"
      ) as HTMLInputElement | null;

      expect(label?.type).toBe("text");
      expect(disabled?.type).toBe("checkbox");
    } finally {
      basic.window.close();
    }

    const types = render(
      (await runFixture("components/02-typescript.tsx")).shell
    );
    try {
      await waitForControls(types);

      const status = types.window.document.getElementById(
        "convat-input-status"
      ) as HTMLSelectElement | null;
      const tags = types.window.document.getElementById(
        "convat-input-tags"
      ) as HTMLTextAreaElement | null;

      expect(status?.tagName).toBe("SELECT");
      expect(Array.from(status?.options ?? []).map((option) => option.value)).toEqual([
        "active",
        "pending",
        "closed",
      ]);
      expect(tags?.tagName).toBe("TEXTAREA");
    } finally {
      types.window.close();
    }
  });

  it("re-renders primitive props through the postMessage channel", async () => {
    const dom = render((await runFixture("components/01-basic.tsx")).shell);

    try {
      await waitForControls(dom);
      const document = dom.window.document;
      await waitFor(
        () => document.querySelector("#convat-root button")?.textContent,
        (text) => text === "Sample text"
      );

      const label = document.getElementById(
        "convat-input-label"
      ) as HTMLInputElement;
      label.value = "Edited live";
      label.dispatchEvent(new dom.window.Event("input", { bubbles: true }));

      await waitFor(
        () => document.querySelector("#convat-root button")?.textContent,
        (text) => text === "Edited live"
      );

      const disabled = document.getElementById(
        "convat-input-disabled"
      ) as HTMLInputElement;
      disabled.checked = true;
      disabled.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

      await waitFor(
        () =>
          String(
            (document.querySelector("#convat-root button") as HTMLButtonElement | null)
              ?.disabled
          ),
        (value) => value === "true"
      );
    } finally {
      dom.window.close();
    }
  });

  it("updates enum and array props", async () => {
    const dom = render((await runFixture("components/02-typescript.tsx")).shell);

    try {
      await waitForControls(dom);
      const document = dom.window.document;

      const status = document.getElementById(
        "convat-input-status"
      ) as HTMLSelectElement;
      status.value = "closed";
      status.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

      await waitFor(
        () => document.querySelector("#convat-root")?.textContent,
        (text) => text.includes("closed")
      );

      const tags = document.getElementById(
        "convat-input-tags"
      ) as HTMLTextAreaElement;
      tags.value = '["alpha","beta"]';
      tags.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

      await waitFor(
        () => document.querySelector("#convat-root")?.textContent,
        (text) => text.includes("alpha") && text.includes("beta")
      );
    } finally {
      dom.window.close();
    }
  });

  it("renders fallbackFields from the raw JSON editors", async () => {
    const dom = render((await runFixture("components/03-nested-props.tsx")).shell);

    try {
      await waitForControls(dom);
      const document = dom.window.document;

      const columns = document.getElementById(
        "convat-input-columns"
      ) as HTMLTextAreaElement;
      const rows = document.getElementById("convat-input-rows") as HTMLTextAreaElement;

      expect(columns.tagName).toBe("TEXTAREA");
      expect(rows.tagName).toBe("TEXTAREA");

      columns.value = '[{"key":"name","header":"Name"}]';
      columns.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

      rows.value = '[{"name":"Ada"}]';
      rows.dispatchEvent(new dom.window.Event("change", { bubbles: true }));

      await waitFor(
        () => document.querySelector("#convat-root")?.textContent,
        (text) => text.includes("Name") && text.includes("Ada")
      );
    } finally {
      dom.window.close();
    }
  });

  it("logs intercepted events and shows a toast", async () => {
    const dom = render((await runFixture("components/01-basic.tsx")).shell);

    try {
      await waitForControls(dom);
      const document = dom.window.document;
      await waitFor(
        () => document.querySelector("#convat-root button")?.textContent,
        (text) => text === "Sample text"
      );

      const button = document.querySelector(
        "#convat-root button"
      ) as HTMLButtonElement;
      button.dispatchEvent(
        new dom.window.MouseEvent("click", { bubbles: true })
      );

      await waitFor(
        () => document.getElementById("convat-event-log")?.textContent,
        (text) => text.includes("click") && text.includes("button")
      );
      expect(document.getElementById("convat-toasts")?.textContent).toContain(
        "click"
      );
    } finally {
      dom.window.close();
    }
  });

  it("scrolls from a coverage-panel warning to its control", async () => {
    const dom = render((await runFixture("components/03-nested-props.tsx")).shell);

    try {
      await waitForControls(dom);
      const document = dom.window.document;

      const link = document.querySelector(
        'button[data-scroll-prop="columns"]'
      ) as HTMLButtonElement;
      link.click();

      expect(document.activeElement?.id).toBe("convat-input-columns");
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

async function waitForControls(dom: JSDOM): Promise<void> {
  await waitFor(
    () => dom.window.document.getElementById("convat-controls")?.textContent,
    (text) => text.includes("Controls")
  );

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

  throw new Error(`Timed out waiting for change; last value: ${read() ?? ""}`);
}
