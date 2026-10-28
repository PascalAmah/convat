import type { IconName } from "./components/Icons";

export const site = {
  name: "Convat",
  version: "1.0.0",
  install: "npm install -g @convat/cli",
  run: "convat ./Component.tsx",
  github: "https://github.com/PascalAmah/convat",
  npm: "https://www.npmjs.com/package/@convat/cli",
  readme: "https://github.com/PascalAmah/convat#readme",
} as const;

export const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Status model", href: "#status" },
  { label: "Privacy", href: "#privacy" },
] as const;

export const trustItems = [
  "No project required",
  "Node 18+",
  "React 18-compatible",
  "No account",
  "Local-first",
  "MIT licensed",
] as const;

export const problems = [
  {
    label: "01 / install",
    icon: "package" as IconName,
    title: "Hundreds of packages for one button",
    copy: "Peer conflicts, lockfile churn, and a full dependency tree just to render a card you already wrote.",
  },
  {
    label: "02 / boot",
    icon: "server" as IconName,
    title: "Boot the app to see one file",
    copy: "Start the dev server, click through three routes, sign in, and recreate the exact state you needed.",
  },
  {
    label: "03 / guess",
    icon: "eye-off" as IconName,
    title: "Find out later what was fake",
    copy: "Most preview tools hide their approximations. You discover the mocked dependency after the preview looked fine.",
  },
] as const;

export const solution =
  "Convat builds the smallest possible runtime around the file you pointed at — then names every approximation instead of hiding it.";

export const features = [
  {
    icon: "file" as IconName,
    title: "A file is enough",
    copy: "No package.json, bundler config, or entry point. Point at a .tsx/.jsx file — or pipe a component through stdin.",
    detail: "zero-repo mode",
  },
  {
    icon: "layers" as IconName,
    title: "Classified stubs",
    copy: "Missing UI, hooks, context, utilities, and assets become the right kind of fake — never one generic placeholder.",
    detail: "5 stub types",
  },
  {
    icon: "sliders" as IconName,
    title: "Props you can touch",
    copy: "Generated controls for text, numbers, booleans, enums, and JSON. Override once in the CLI or keep editing in the panel.",
    detail: "live prop controls",
  },
  {
    icon: "activity" as IconName,
    title: "Coverage you can inspect",
    copy: "FULL, PARTIAL, or FAILED — with every resolved import, stub, and approximation listed beside the preview.",
    detail: "the honest panel",
  },
  {
    icon: "refresh" as IconName,
    title: "Edit. Reload. Repeat.",
    copy: "A filtered watcher refreshes the browser on component changes. A failed rebuild keeps the last good preview alive.",
    detail: "full-page reload",
  },
  {
    icon: "alert" as IconName,
    title: "Errors where you look",
    copy: "Bundle errors get a full-page boundary; runtime errors get an in-preview stack. Both mirror to your terminal.",
    detail: "bundle + runtime",
  },
] as const;

export const steps = [
  {
    number: "01",
    title: "Point",
    copy: "One file, a path with spaces, or stdin. Convat detects whether a project surrounds it.",
    code: "$ convat ./Component.tsx",
  },
  {
    number: "02",
    title: "Build",
    copy: "Resolve, extract, classify, mock, stub, and bundle — in that order, and only for this file.",
    code: "$ resolving 12 imports · 2 stubbed",
  },
  {
    number: "03",
    title: "Inspect",
    copy: "The preview opens on localhost. The coverage panel and terminal agree on how exact it is.",
    code: "$ preview ready · PARTIAL",
  },
] as const;

export const pipeline = [
  "resolver",
  "ast-extractor",
  "capability-engine",
  "prop-mocker",
  "dependency-classifier",
  "dependency-stubber",
  "bundler",
  "preview",
] as const;

export const statuses = [
  {
    status: "FULL",
    tone: "full" as const,
    title: "Exact preview",
    copy: "Every import resolved. Props inferred with confidence. Styles faithful to the project.",
    sample: "12 resolved · 0 stubbed · 8 props",
  },
  {
    status: "PARTIAL",
    tone: "partial" as const,
    title: "Still useful. Still honest.",
    copy: "Something was approximated. Convat names each stub and approximation and keeps rendering.",
    sample: "9 resolved · 3 stubbed · coverage noted",
  },
  {
    status: "FAILED",
    tone: "failed" as const,
    title: "Actionable, not mysterious.",
    copy: "No component found, the bundle failed, or the preview could not start. You get the location and the next step.",
    sample: "bundle error · ./Card.tsx:24:9",
  },
] as const;

export const installs = [
  {
    label: "Global install",
    tag: "recommended",
    copy: "Installs the convat binary once. Node 18 or newer.",
    command: site.install,
    followUp: "convat ./Component.tsx",
  },
  {
    label: "No global install",
    tag: "one-off",
    copy: "Runs the published CLI straight from npm exec, without touching your PATH.",
    command: "npm exec --package @convat/cli -- convat ./Component.tsx",
    followUp: undefined,
  },
] as const;

export const installFlags = [
  { flag: "--port <number>", copy: "Local port for the preview server. Defaults to 3000." },
  { flag: "--props <json>", copy: "Seed prop values at launch. Merged over the auto-mocked ones." },
  { flag: "--css <path>", copy: "Layer an extra local stylesheet into the preview shell." },
  { flag: "--no-open", copy: "Print the URL instead of launching a browser." },
  { flag: "--watch / --no-watch", copy: "Reload on save. On by default for files, off for stdin." },
  { flag: "--verbose-status", copy: "Print the full coverage breakdown instead of one summary line." },
] as const;

export const installNotes = [
  "No package.json, bundler config, or entry point needed.",
  "No account and no network calls — the preview binds to 127.0.0.1.",
  "A PARTIAL preview still exits 0. It is a report, not a failure.",
] as const;

export const errorModes = [
  {
    icon: "file-code" as IconName,
    title: "Bundle error",
    copy: "The component never mounts. Convat serves a full-page boundary with the file, line, message, and stack. The server stays up.",
    code: "BundleError · exit 0",
    tone: "failed" as const,
  },
  {
    icon: "terminal" as IconName,
    title: "Runtime error",
    copy: "The component throws after mount. The coverage panel stays visible, the stack appears in place, and your terminal gets the report.",
    code: "RuntimeError · status PARTIAL",
    tone: "partial" as const,
  },
] as const;

export const privacyPoints = [
  "Served on 127.0.0.1, not a remote host.",
  "No telemetry, analytics, CDN scripts, or remote fetches.",
  "No account, no upload, no project mutation.",
  "The only network path is the local browser-to-server connection.",
] as const;
