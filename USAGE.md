# Convat — usage guide

Convat previews a React component in your browser without setting up a project. It runs the
component through a local pipeline, stubs missing dependencies, mocks props, serves the preview on
`127.0.0.1`, and gives you a live control panel beside it.

Current release: **0.1.0 pre-release**. Windows is the tested platform.

## Requirements

- Node.js 18 or newer
- npm (comes with Node.js)
- A React 18-compatible component file (`.tsx` or `.jsx`)

No project, bundler, or component dependency install is required for a standalone file. Missing
imports are stubbed rather than treated as fatal.

## Install

### From a shared tarball

Ask the maintainer for `convat-cli-0.1.0.tgz`, then:

```powershell
npm install -g .\convat-cli-0.1.0.tgz
convat --version
```

Without a global install:

```powershell
npm install .\convat-cli-0.1.0.tgz
npx convat .\src\MyComponent.tsx
```

### From npm, once published

```powershell
npx @convat/cli@latest .\src\MyComponent.tsx
```

Or install it globally:

```powershell
npm install -g @convat/cli
convat .\src\MyComponent.tsx
```

## Quick start

From your project directory:

```powershell
convat .\src\MyComponent.tsx
```

The browser opens automatically. A typical component:

```tsx
interface GreetingProps {
  name: string;
  excited: boolean;
}

export default function Greeting({ name, excited }: GreetingProps) {
  return <h1>Hello {name}{excited ? "!" : ""}</h1>;
}
```

Run it with a prop override:

```powershell
convat .\src\Greeting.tsx --props '{"name":"Ada","excited":true}'
```

## What you get

### Coverage panel

The right-hand panel is generated from the same report as the terminal status. It shows:

- `FULL`, `PARTIAL`, or `FAILED`
- generated vs fallback props
- resolved and stubbed dependencies
- mocked providers
- styling compatibility notes

`PARTIAL` is normal for standalone components: it means something was stubbed or needs JSON input,
not that the process failed.

### Prop sidebar

Below the coverage panel:

- text and number inputs for primitive props
- toggles for booleans
- dropdowns for enums
- JSON editors for arrays
- raw JSON editors for complex or fallback props
- a disabled safe no-op for function props

Edits re-render the component immediately through one message channel. Complex fallback fields start
at `null` on purpose: Convat does not guess their shape. Supply valid JSON in the editor.

### Event log

Clicks, double-clicks, submits, changes, and Enter/Escape key presses inside the component append to
the sidebar event log and show a short toast. Submits are prevented from navigating away.

### HMR

For file targets, saving the file reruns the pipeline and refreshes the page. This is a full-page
reload, not module hot-swap, so component state is reset.

If a rebuild fails, the last good preview stays up and the sidebar shows a reload-error toast.

HMR is disabled for stdin and with `--no-watch`.

## CLI options

```text
convat <file-path> | -
```

| Option | Purpose |
|---|---|
| `--port <number>` | Local port. Use `0` for an available port. |
| `--css <file>` | Inline a local CSS file into the preview. |
| `--props <json>` | Override or add mocked props, for example `'{"title":"Hello"}'`. |
| `--no-open` | Do not launch a browser. The URL is still printed. |
| `--watch` / `--no-watch` | Enable or disable file watching. Default: on for files, off for stdin. |
| `--verbose-status` | Print the full status breakdown to the terminal. |
| `--help` | Show all options and the network guarantee. |
| `--version` | Print the version. |

Examples:

```powershell
convat .\src\Dashboard.tsx --verbose-status
convat .\src\Dashboard.tsx --css .\src\styles.css
convat .\src\Dashboard.tsx --port 0 --no-open
convat .\src\Dashboard.tsx --no-watch
Get-Content .\src\Widget.tsx | convat -
```

## Status and exit codes

| Code | Meaning |
|---|---|
| `0` | Preview served. Includes `FULL`, `PARTIAL`, and a bundle error that still produced a preview. |
| `1` | Usage error, unreadable target, or deferred flag such as `--diff` / `--share`. |
| `2` | No React component export was found. |
| `3` | The requested port is already in use. |

## Component requirements

- Export a React component, preferably as the default export.
- Type the props for better controls; untyped or complex props use the JSON editor.
- Run from the project directory if the component imports local files or installed packages.
- Run a standalone file directly if it has no local dependencies; missing imports are stubbed.
- Function props are mocked as safe no-ops and cannot be edited.

## Troubleshooting

### `convat` is not recognized

Open a new terminal after a global install, or use the local form:

```powershell
npx convat .\src\MyComponent.tsx
```

### The preview is PARTIAL

That is expected when imports are missing or props need JSON. Read the coverage panel for the exact
reason. It is not a failure.

### Port already in use

Use another port or let the OS choose one:

```powershell
convat .\src\MyComponent.tsx --port 0
```

### Exit code 2

The file has no detected component export. Add a default or named React component export.

### The panel shows a runtime error

The coverage panel stays visible on purpose. Check the prop JSON editors, especially fallback fields
that start at `null`, and supply valid values.

### HMR does not reload

Use a file target with watch enabled. stdin and `--no-watch` do not open the reload socket.

## Privacy and network

A normal preview makes no outbound network calls: no telemetry, CDN scripts, or remote fetches. It
serves only on `127.0.0.1`. `--share` is not implemented in this release.

## Building a shareable tarball

For the maintainer, from `convat-cli/`:

```powershell
pnpm install
pnpm verify
npm pack
```

Share the generated `convat-cli-0.1.0.tgz`. The recipient only needs Node.js and npm.

## Known limitations in 0.1.0

- Pre-release, not yet published to npm as v1.
- `--diff` and `--share` are unavailable.
- HMR is full-page reload, not module hot-swap.
- Bundle-error presentation is still minimal.
- macOS and Linux are not yet smoke-tested.
