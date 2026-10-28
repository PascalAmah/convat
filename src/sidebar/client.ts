/// <reference lib="dom" />

/**
 * Browser-side sidebar (CONV-301 – CONV-305, CONV-308).
 *
 * Vanilla DOM, no framework and no imports at runtime (D21). The only state
 * channel is `window.postMessage({ type: "convat:set-props", values })` — the
 * component bundle listens on the other side (CONV-302).
 */

import type {
  CapabilityReport,
  PropDescriptor,
  StubManifest,
} from "../types/index.js";

interface MockedPropsView {
  values: Record<string, unknown>;
  fallbackFields: string[];
}

interface Bootstrap {
  report: CapabilityReport;
  stubs: StubManifest;
  mockedProps: MockedPropsView;
  props: PropDescriptor[];
  hmr: boolean;
}

declare global {
  interface Window {
    __CONVAT__?: Bootstrap;
  }
}

const bootstrap = window.__CONVAT__;

function init(data: Bootstrap): void {
  const panel = document.getElementById("convat-panel");
  const controls = document.getElementById("convat-controls");
  if (!panel || !controls) return;

  const state: Record<string, unknown> = { ...data.mockedProps.values };
  const fallback = new Set(data.mockedProps.fallbackFields);

  panel.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest("[data-scroll-prop]");
    if (!(button instanceof HTMLElement)) return;
    const name = button.dataset.scrollProp;
    if (name) scrollToControl(name);
  });

  const controlsSection = section("Controls");
  controls.appendChild(controlsSection.element);

  if (data.props.length === 0) {
    controlsSection.body.appendChild(muted("No props detected."));
  }

  const rendered = new Set<string>();
  for (const prop of data.props) {
    rendered.add(prop.name);
    controlsSection.body.appendChild(
      propControl(prop, state, fallback, emit)
    );
  }

  for (const name of data.mockedProps.fallbackFields) {
    if (rendered.has(name)) continue;
    controlsSection.body.appendChild(
      propControl(
        {
          name,
          tsType: "unknown",
          category: "complex",
          required: false,
        },
        state,
        fallback,
        emit
      )
    );
  }

  const events = eventLogSection();
  controls.appendChild(events.element);
  wireEvents(events.list, events.empty);

  if (data.hmr) connectHmr();
}

// ─────────────────────────────────────────────────────────────────────────
// State channel (CONV-302)
// ─────────────────────────────────────────────────────────────────────────

function emit(name: string, value: unknown): void {
  window.postMessage(
    { type: "convat:set-props", values: { [name]: value } },
    "*"
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Prop controls (CONV-301 / CONV-303)
// ─────────────────────────────────────────────────────────────────────────

function propControl(
  prop: PropDescriptor,
  state: Record<string, unknown>,
  fallback: Set<string>,
  emitValue: (name: string, value: unknown) => void
): HTMLElement {
  const row = document.createElement("div");
  row.className = "convat-control";
  row.id = controlId(prop.name);

  const label = document.createElement("label");
  label.htmlFor = inputId(prop.name);
  label.textContent = prop.name;
  if (prop.required) {
    const required = document.createElement("span");
    required.className = "convat-required";
    required.textContent = " (required)";
    label.appendChild(required);
  }
  row.appendChild(label);

  if ((fallback.has(prop.name) || prop.category === "complex") && isFunctionType(prop.tsType)) {
    row.appendChild(functionPlaceholder(prop));
    return row;
  }

  if (fallback.has(prop.name) || prop.category === "complex" || prop.category === "array") {
    row.appendChild(
      jsonEditor({
        prop,
        initial: state[prop.name],
        requireArray:
          prop.category === "array" || looksLikeArrayType(prop.tsType),
        onChange: (value) => emitValue(prop.name, value),
        row,
      })
    );
    return row;
  }

  switch (prop.category) {
    case "enum":
      row.appendChild(
        enumControl(prop, state[prop.name], (value) =>
          emitValue(prop.name, value)
        )
      );
      break;
    case "primitive":
      row.appendChild(
        primitiveControl(prop, state[prop.name], (value) =>
          emitValue(prop.name, value)
        )
      );
      row.appendChild(fieldError(row));
      break;
  }

  return row;
}

function primitiveControl(
  prop: PropDescriptor,
  initial: unknown,
  onChange: (value: unknown) => void
): HTMLElement {
  const kind = primitiveKind(prop.tsType);

  if (kind === "boolean") {
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = inputId(prop.name);
    checkbox.checked = initial === true;
    checkbox.addEventListener("change", () => onChange(checkbox.checked));
    return checkbox;
  }

  const input = document.createElement("input");
  input.id = inputId(prop.name);

  if (kind === "number") {
    input.type = "number";
    input.value = typeof initial === "number" ? String(initial) : "";
    const reportError = debounce(() => {
      const raw = input.value.trim();
      if (raw === "") {
        showError(input, "Enter a number.");
        return;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        showError(input, "Enter a valid number.");
        return;
      }
      clearError(input);
      onChange(value);
    }, 120);
    input.addEventListener("input", reportError);
    input.addEventListener("change", () => {
      const value = Number(input.value);
      if (input.value.trim() !== "" && Number.isFinite(value)) {
        clearError(input);
        onChange(value);
      }
    });
    return input;
  }

  input.type = "text";
  input.value = initial === null || initial === undefined ? "" : String(initial);
  input.addEventListener(
    "input",
    debounce(() => onChange(input.value), 120)
  );
  return input;
}

function enumControl(
  prop: PropDescriptor,
  initial: unknown,
  onChange: (value: string) => void
): HTMLElement {
  const select = document.createElement("select");
  select.id = inputId(prop.name);

  const current = initial === null || initial === undefined ? "" : String(initial);
  const values = new Set(prop.enumValues ?? []);
  if (current !== "" && !values.has(current)) values.add(current);

  for (const value of values) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === current;
    select.appendChild(option);
  }

  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function functionPlaceholder(prop: PropDescriptor): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "convat-function-prop";

  const input = document.createElement("input");
  input.type = "text";
  input.id = inputId(prop.name);
  input.value = "function (mocked no-op)";
  input.disabled = true;

  const note = muted("Use --props at launch to replace a function prop.");
  wrapper.append(input, note);
  return wrapper;
}

interface JsonEditorOptions {
  prop: PropDescriptor;
  initial: unknown;
  requireArray: boolean;
  onChange: (value: unknown) => void;
  row: HTMLElement;
}

function jsonEditor(options: JsonEditorOptions): HTMLTextAreaElement {
  const { prop, initial, requireArray, onChange, row } = options;

  const textarea = document.createElement("textarea");
  textarea.id = inputId(prop.name);
  textarea.spellcheck = false;
  textarea.rows = Math.max(3, Math.min(8, JSON.stringify(initial ?? {}).split("\n").length));
  textarea.value = initialJson(prop, initial);

  const apply = (): void => {
    const raw = textarea.value.trim();
    let value: unknown = null;

    if (raw !== "") {
      try {
        value = JSON.parse(raw);
      } catch {
        showError(row, "Invalid JSON.");
        return;
      }
    }

    if (requireArray && !Array.isArray(value)) {
      showError(row, "Expected a JSON array, e.g. [1, 2].");
      return;
    }

    clearError(row);
    onChange(value);
  };

  textarea.addEventListener("input", debounce(apply, 250));
  textarea.addEventListener("change", apply);
  textarea.addEventListener("blur", apply);
  row.appendChild(textarea);
  row.appendChild(fieldError(row));
  return textarea;
}

function initialJson(prop: PropDescriptor, initial: unknown): string {
  if (initial !== null && initial !== undefined) {
    return JSON.stringify(initial, null, 2);
  }

  // EHS §3.1: a fallback field starts as `null` (or `[]` for a real array
  // control), never a guessed shape. The user supplies the JSON.
  if (prop.category === "array") {
    return "[]";
  }
  return "null";
}

function primitiveKind(tsType: string): "boolean" | "number" | "text" {
  const type = tsType.trim();
  if (type === "boolean" || type === "Boolean") return "boolean";
  if (type === "number" || type === "Number" || type === "bigint") {
    return "number";
  }
  return "text";
}

/** Mirrors `prop-mocker`'s function-type recognition so we never render a JSON
 *  editor that would silently replace a safe no-op with data. */
function isFunctionType(tsType: string): boolean {
  const type = tsType.trim();

  return (
    type === "Function" ||
    /^(async\s+)?(<[^>]*>\s*)?\(.*\)\s*=>/s.test(type) ||
    /^new\s*\(/.test(type) ||
    /^[A-Za-z_$][\w$]*\??\s*(<[^>]*>)?\s*\([^)]*\)\s*:/.test(type)
  );
}

function looksLikeArrayType(tsType: string): boolean {
  const type = tsType.trim();
  return (
    /\[\]$/.test(type) ||
    /^Array\s*</.test(type) ||
    /^ReadonlyArray\s*</.test(type)
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Event interceptor log (CONV-304)
// ─────────────────────────────────────────────────────────────────────────

const INTERCEPTED_EVENTS = [
  "click",
  "dblclick",
  "submit",
  "change",
  "keydown",
] as const;

interface EventLog {
  element: HTMLElement;
  list: HTMLUListElement;
  empty: HTMLElement;
}

function eventLogSection(): EventLog {
  const sectionParts = section("Events");
  sectionParts.element.id = "convat-events";

  const list = document.createElement("ul");
  list.id = "convat-event-log";

  const empty = muted("Interact with the preview to see intercepted events.");
  sectionParts.body.append(empty, list);

  return { element: sectionParts.element, list, empty };
}

function wireEvents(list: HTMLUListElement, empty: HTMLElement): void {
  const stage = document.getElementById("convat-stage");
  if (!stage) return;

  for (const type of INTERCEPTED_EVENTS) {
    stage.addEventListener(
      type,
      (event) => {
        if (event.type === "keydown") {
          const key = (event as KeyboardEvent).key;
          if (key !== "Enter" && key !== "Escape") return;
        }
        if (event.type === "submit") {
          // A real form submit would navigate away from the preview; keep the
          // component mounted and log the payload instead.
          event.preventDefault();
        }

        const summary = summarize(event);
        if (!summary) return;
        appendLog(list, empty, event.type, summary);
        toast(event.type, summary);
      },
      true
    );
  }
}

function summarize(event: Event): string {
  const target = event.target;
  if (!(target instanceof Element)) return "";

  const tag = target.tagName.toLowerCase();
  const name = target.getAttribute("name");
  const label = name ? `${tag}[name="${name}"]` : tag;

  if (event.type === "submit") {
    const form = target.closest("form");
    if (!form) return label;
    const fields: Record<string, string> = {};
    new FormData(form).forEach((value, key) => {
      fields[key] = String(value);
    });
    return `${label} ${JSON.stringify(fields)}`;
  }

  if (event.type === "change") {
    if (target instanceof HTMLInputElement) {
      const value = target.type === "checkbox" ? target.checked : target.value;
      return `${label} = ${JSON.stringify(value)}`;
    }
    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      return `${label} = ${JSON.stringify(target.value)}`;
    }
    return label;
  }

  if (event.type === "keydown") {
    return `${label} key=${(event as KeyboardEvent).key}`;
  }

  const text = (target.textContent ?? "").replace(/\s+/g, " ").trim();
  if (text === "") return label;
  return `${label} "${text.slice(0, 60)}"`;
}

function appendLog(
  list: HTMLUListElement,
  empty: HTMLElement,
  type: string,
  summary: string
): void {
  const item = document.createElement("li");
  const time = document.createElement("time");
  time.textContent = new Date().toLocaleTimeString();
  const title = document.createElement("strong");
  title.textContent = type;
  const detail = document.createElement("span");
  detail.textContent = ` ${summary}`;

  item.append(time, document.createTextNode(" "), title, detail);
  list.insertBefore(item, list.firstChild);
  while (list.children.length > 20) list.lastElementChild?.remove();
  empty.hidden = true;
}

function toast(type: string, summary: string): void {
  const host = document.getElementById("convat-toasts");
  if (!host) return;

  const item = document.createElement("div");
  item.className = "convat-toast";
  const title = document.createElement("strong");
  title.textContent = type;
  const detail = document.createElement("span");
  detail.textContent = summary;
  item.append(title, detail);

  host.appendChild(item);
  while (host.children.length > 4) host.firstElementChild?.remove();
  setTimeout(() => item.remove(), 4200);
}

// ─────────────────────────────────────────────────────────────────────────
// HMR (CONV-306)
// ─────────────────────────────────────────────────────────────────────────

function connectHmr(): void {
  if (typeof WebSocket === "undefined") return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}/__convat/hmr`);
  let retries = 0;

  socket.addEventListener("open", () => {
    retries = 0;
  });

  socket.addEventListener("message", (event) => {
    try {
      const message = JSON.parse(String(event.data)) as {
        type?: string;
        message?: string;
      };
      if (message.type === "reload") {
        location.reload();
      } else if (message.type === "reload-error") {
        toast("reload failed", message.message ?? "Rebuild failed.");
      }
    } catch {
      // Ignore malformed server frames.
    }
  });

  socket.addEventListener("close", () => {
    if (retries >= 20) return;
    retries += 1;
    setTimeout(connectHmr, 500 * retries);
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Small DOM helpers
// ─────────────────────────────────────────────────────────────────────────

function section(title: string): {
  element: HTMLElement;
  body: HTMLElement;
} {
  const element = document.createElement("section");
  element.className = "convat-controls-section";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const body = document.createElement("div");
  element.append(heading, body);
  return { element, body };
}

function muted(text: string): HTMLElement {
  const element = document.createElement("p");
  element.className = "convat-muted";
  element.textContent = text;
  return element;
}

function fieldError(row: HTMLElement): HTMLElement {
  const existing = row.querySelector<HTMLElement>(".convat-field-error");
  if (existing) return existing;

  const error = document.createElement("p");
  error.className = "convat-field-error";
  error.setAttribute("role", "alert");
  error.hidden = true;
  return error;
}

function showError(row: HTMLElement, message: string): void {
  const error = fieldError(row);
  error.textContent = message;
  error.hidden = false;
  if (!error.isConnected) row.appendChild(error);
  const input = row.querySelector<HTMLElement>("input, textarea, select");
  input?.setAttribute("aria-invalid", "true");
}

function clearError(row: HTMLElement): void {
  const error = row.querySelector<HTMLElement>(".convat-field-error");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  const input = row.querySelector<HTMLElement>("input, textarea, select");
  input?.removeAttribute("aria-invalid");
}

function scrollToControl(name: string): void {
  const row = document.getElementById(controlId(name));
  if (!row) return;
  if (typeof row.scrollIntoView === "function") {
    row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  const input = row.querySelector<HTMLElement>("input, textarea, select");
  input?.focus({ preventScroll: true });
}

function controlId(name: string): string {
  return `convat-prop-${name}`;
}

function inputId(name: string): string {
  return `convat-input-${name}`;
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

// Run after every module-level constant above is initialized (HMR/event
// listener tables are declared below `init`).
if (bootstrap) {
  init(bootstrap);
}
