/**
 * bundler (CONV-109 / CONV-110)
 *
 * Builds a browser bundle with esbuild.
 *
 * Invariants: React packages are always externalized, and one unresolved import
 * must never fail the bundle — it is routed to its stub instead.
 *
 * Externals are provided as globals (`window.React`, `window.ReactDOM`) by the
 * shell, so the component bundle never contains a second React copy (PRD §1c).
 */

import { dirname, isAbsolute } from "node:path";

import { build } from "esbuild";
import type { Plugin } from "esbuild";
import { createMatchPath, loadConfig } from "tsconfig-paths";

import { BundleError } from "../types/index.js";
import type {
  ComponentManifest,
  MockedProps,
  ResolvedTarget,
  StubContract,
  StubManifest,
} from "../types/index.js";

const RUNTIME_IMPORTS = new Set<string>([
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom/client",
  "react-dom/server",
]);

const STYLE_IMPORT = /\.(css|scss|sass|less|styl)$/i;
const ASSET_IMPORT =
  /\.(svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|eot|mp4|webm)$/i;

const TARGET_NAMESPACE = "convat-target";
const STUB_NAMESPACE = "convat-stub";
const RUNTIME_NAMESPACE = "convat-runtime";
const STYLE_NAMESPACE = "convat-style";
const ASSET_NAMESPACE = "convat-asset";
const MISSING_NAMESPACE = "convat-missing";

const TARGET_SPECIFIER = "convat:target";

export async function bundle(
  target: ResolvedTarget,
  manifest: ComponentManifest,
  mockedProps: MockedProps,
  stubs: StubManifest
): Promise<string> {
  const stubByPath = new Map(stubs.stubs.map((stub) => [stub.importPath, stub]));
  const unresolvedPaths = new Set(
    manifest.imports
      .filter((entry) => !entry.resolvesToFile && !RUNTIME_IMPORTS.has(entry.path))
      .map((entry) => entry.path)
  );

  const tsconfig = loadTsconfig(target);
  const baseDir = target.filePath
    ? dirname(target.filePath)
    : (target.projectRoot ?? process.cwd());

  try {
    const result = await build({
      stdin: {
        contents: entrySource(manifest, mockedProps, stubs),
        resolveDir: baseDir,
        loader: "ts",
      },
      bundle: true,
      write: false,
      format: "iife",
      platform: "browser",
      target: "es2018",
      sourcemap: "inline",
      logLevel: "silent",
      jsx: "automatic",
      preserveSymlinks: true,
      define: {
        "process.env": JSON.stringify({
          NODE_ENV: "development",
          NEXT_PUBLIC_API_BASE: "http://localhost",
        }),
      },
      plugins: [
        targetPlugin(target),
        runtimePlugin(),
        stylePlugin(),
        stubPlugin(stubByPath, unresolvedPaths, tsconfig),
      ],
    });

    const output = result.outputFiles?.[0]?.text;
    if (!output) throw new BundleError("esbuild produced no output");
    return output;
  } catch (error) {
    if (error instanceof BundleError) throw error;
    throw toBundleError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Entry and providers
// ─────────────────────────────────────────────────────────────────────────

function entrySource(
  manifest: ComponentManifest,
  mockedProps: MockedProps,
  stubs: StubManifest
): string {
  const providerFunctions = stubs.providerStubs
    .filter((provider) => provider.wrapStrategy !== "passthrough")
    .map(
      (_, index) => `
        function ConvatProvider${index}({ children }) {
          const context = React.useMemo(() => React.createContext({}), []);
          return React.createElement(context.Provider, { value: {} }, children);
        }
      `
    );

  let tree = "React.createElement(ConvatComponent, ConvatProps)";
  for (let index = 0; index < providerFunctions.length; index += 1) {
    tree = `React.createElement(ConvatProvider${index}, null, ${tree})`;
  }

  const providers = providerFunctions.join("\n");

  return `
    import React from "react";
    import ReactDOM from "react-dom/client";
    import * as ConvatModule from ${JSON.stringify(TARGET_SPECIFIER)};

    const ConvatComponent =
      ConvatModule.default ??
      ConvatModule[${JSON.stringify(manifest.componentName)}] ??
      Object.values(ConvatModule)[0];

    let ConvatProps = ${toLiteral(mockedProps.values)};

    class ConvatErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { error: null, version: props.version };
      }
      static getDerivedStateFromError(error) {
        return { error };
      }
      static getDerivedStateFromProps(props, state) {
        // A new prop update is a fresh chance to render: without this, the
        // first runtime error would permanently hide the component and make
        // the fallback JSON editors look broken (CONV-303).
        if (props.version !== state.version) {
          return { error: null, version: props.version };
        }
        return null;
      }
      componentDidCatch(error) {
        const panel = document.getElementById("convat-error");
        if (panel) {
          panel.style.display = "block";
          panel.textContent = String((error && error.stack) || error);
        }
      }
      render() {
        return this.state.error ? null : this.props.children;
      }
    }

    ${providers}

    if (typeof ConvatComponent !== "function") {
      throw new Error("Convat could not resolve an exported component.");
    }

    const ConvatRoot = ReactDOM.createRoot(document.getElementById("convat-root"));
    let ConvatVersion = 0;

    function ConvatRender() {
      ConvatVersion += 1;
      ConvatRoot.render(
        React.createElement(
          ConvatErrorBoundary,
          { version: ConvatVersion },
          ${tree}
        )
      );
    }

    // CONV-302: the one and only state channel. The sidebar posts partial prop
    // updates; nothing else mutates ConvatProps after launch.
    window.addEventListener("message", (event) => {
      // jsdom reports a null source for same-window messages; browsers report
      // the window itself. Reject only a known foreign source.
      if (event.source !== null && event.source !== window) return;
      const data = event.data;
      if (!data || data.type !== "convat:set-props") return;
      if (!data.values || typeof data.values !== "object") return;
      ConvatProps = Object.assign({}, ConvatProps, data.values);
      const errorPanel = document.getElementById("convat-error");
      if (errorPanel) {
        errorPanel.textContent = "";
        errorPanel.style.display = "none";
      }
      ConvatRender();
    });

    ConvatRender();
  `;
}

/** Emits a JS literal, keeping function props as real no-ops. */
function toLiteral(value: unknown): string {
  if (typeof value === "function") return "function () {}";

  if (Array.isArray(value)) {
    return `[${value.map(toLiteral).join(", ")}]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(
      ([key, entry]) => `${JSON.stringify(key)}: ${toLiteral(entry)}`
    );
    return `{ ${entries.join(", ")} }`;
  }

  return JSON.stringify(value) ?? "null";
}

// ─────────────────────────────────────────────────────────────────────────
// Plugins
// ─────────────────────────────────────────────────────────────────────────

function targetPlugin(target: ResolvedTarget): Plugin {
  return {
    name: "convat-target",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^convat:target$/ }, () => ({
        path: "target",
        namespace: TARGET_NAMESPACE,
      }));

      pluginBuild.onLoad(
        { filter: /.*/, namespace: TARGET_NAMESPACE },
        () => ({
          contents: target.code,
          loader: loaderFor(target.filePath),
          resolveDir: target.filePath
            ? dirname(target.filePath)
            : (target.projectRoot ?? process.cwd()),
        })
      );
    },
  };
}

function runtimePlugin(): Plugin {
  return {
    name: "convat-runtime",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        if (!RUNTIME_IMPORTS.has(args.path)) return undefined;
        return { path: args.path, namespace: RUNTIME_NAMESPACE };
      });

      pluginBuild.onLoad(
        { filter: /.*/, namespace: RUNTIME_NAMESPACE },
        (args) => ({
          contents: runtimeShim(args.path),
          loader: "js",
        })
      );
    },
  };
}

function stylePlugin(): Plugin {
  return {
    name: "convat-style",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: STYLE_IMPORT }, (args) => ({
        path: args.path,
        namespace: STYLE_NAMESPACE,
      }));
      pluginBuild.onResolve({ filter: ASSET_IMPORT }, (args) => ({
        path: args.path,
        namespace: ASSET_NAMESPACE,
      }));

      pluginBuild.onLoad(
        { filter: /.*/, namespace: STYLE_NAMESPACE },
        () => ({ contents: styleShim(), loader: "js" })
      );
      pluginBuild.onLoad(
        { filter: /.*/, namespace: ASSET_NAMESPACE },
        () => ({ contents: "module.exports = \"\";", loader: "js" })
      );
    },
  };
}

function stubPlugin(
  stubByPath: Map<string, StubContract>,
  unresolvedPaths: Set<string>,
  tsconfig: TsconfigMapping | undefined
): Plugin {
  return {
    name: "convat-stubs",
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /.*/ }, (args) => {
        const stub = stubByPath.get(args.path);
        if (stub) return { path: args.path, namespace: STUB_NAMESPACE };

        if (unresolvedPaths.has(args.path)) {
          return { path: args.path, namespace: MISSING_NAMESPACE };
        }

        if (tsconfig && isBareSpecifier(args.path)) {
          const matched = tsconfig.match(args.path);
          if (matched) return { path: matched };
        }

        return undefined;
      });

      pluginBuild.onLoad(
        { filter: /.*/, namespace: STUB_NAMESPACE },
        (args) => ({ contents: stubSource(stubByPath.get(args.path)), loader: "js" })
      );
      pluginBuild.onLoad(
        { filter: /.*/, namespace: MISSING_NAMESPACE },
        () => ({ contents: genericFallbackSource(), loader: "js" })
      );
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Module sources
// ─────────────────────────────────────────────────────────────────────────

function runtimeShim(specifier: string): string {
  switch (specifier) {
    case "react":
      return "module.exports = window.React;";
    case "react-dom":
    case "react-dom/client":
      return "module.exports = window.ReactDOM;";
    case "react-dom/server":
      return "module.exports = window.ReactDOMServer || {};";
    case "react/jsx-runtime":
    case "react/jsx-dev-runtime":
      return `
        const React = window.React;
        function convatCreateElement(type, props, key) {
          const { children, ...rest } = props || {};
          if (key !== undefined) rest.key = key;
          return children === undefined
            ? React.createElement(type, rest)
            : React.createElement(type, rest, children);
        }
        module.exports = {
          Fragment: React.Fragment,
          jsx: convatCreateElement,
          jsxs: convatCreateElement,
          jsxDEV: convatCreateElement,
        };
      `;
    default:
      return "module.exports = {};";
  }
}

function styleShim(): string {
  return `
    const styles = new Proxy({}, {
      get(_target, key) {
        if (key === "__esModule") return false;
        return String(key);
      },
    });
    module.exports = styles;
  `;
}

function stubSource(stub: StubContract | undefined): string {
  if (!stub) return genericFallbackSource();

  const names = stub.exportNames.filter((name) => name !== "default");

  switch (stub.mockStrategy) {
    case "render-children-passthrough":
      return `
        const React = window.React;
        function ConvatStub(props) {
          return React.createElement(React.Fragment, null, props ? props.children : null);
        }
        module.exports = ConvatStub;
        ${names.map((name) => `module.exports[${JSON.stringify(name)}] = ConvatStub;`).join("\n")}
      `;
    case "noop-function":
      return `
        function ConvatNoop() { return []; }
        module.exports = ConvatNoop;
        ${names.map((name) => `module.exports[${JSON.stringify(name)}] = ConvatNoop;`).join("\n")}
      `;
    case "empty-object":
      return `
        const ConvatValue = {};
        module.exports = ConvatValue;
        ${names.map((name) => `module.exports[${JSON.stringify(name)}] = ConvatValue;`).join("\n")}
      `;
    case "placeholder-asset":
      return "module.exports = \"\";";
    case "generic-fallback":
    default:
      return genericFallbackSource(names);
  }
}

function genericFallbackSource(names: string[] = []): string {
  return `
    const generic = new Proxy(function () {}, {
      get(_target, key) {
        if (key === "__esModule") return false;
        if (key === Symbol.toPrimitive) return () => "";
        if (key === "toString") return () => "";
        return generic;
      },
      apply() { return null; },
      construct() { return {}; },
    });
    module.exports = generic;
    ${names.map((name) => `module.exports[${JSON.stringify(name)}] = generic;`).join("\n")}
  `;
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

interface TsconfigMapping {
  match: (specifier: string) => string | undefined;
}

function loadTsconfig(target: ResolvedTarget): TsconfigMapping | undefined {
  if (!target.tsconfigPath) return undefined;

  const loaded = loadConfig(dirname(target.tsconfigPath));
  if (loaded.resultType !== "success") return undefined;

  return {
    match: createMatchPath(loaded.absoluteBaseUrl, loaded.paths),
  };
}

function isBareSpecifier(specifier: string): boolean {
  return !specifier.startsWith(".") && !isAbsolute(specifier);
}

function loaderFor(filePath: string | null): "tsx" | "ts" | "jsx" | "js" {
  if (!filePath) return "tsx";
  if (filePath.endsWith(".tsx")) return "tsx";
  if (filePath.endsWith(".jsx")) return "jsx";
  if (filePath.endsWith(".js")) return "js";
  return "ts";
}

function toBundleError(error: unknown): BundleError {
  const failure = error as {
    errors?: Array<{ text?: string; location?: { file?: string; line?: number } | null }>;
    message?: string;
  };

  const first = failure.errors?.[0];
  if (first) {
    return new BundleError(
      first.text ?? "Bundle failed",
      first.location?.file ?? undefined,
      first.location?.line ?? undefined
    );
  }

  return new BundleError(failure.message ?? String(error));
}
