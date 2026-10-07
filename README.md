# @convat/cli — implementation repo

This is the engineering repo for Convat, scaffolded per Technical Design Document v1.0.

## Structure

Each folder under `src/` is a pipeline module from TDD v1.0 §2/§3, in execution order:

```
resolver -> ast-extractor -> capability-engine -> prop-mocker
         -> dependency-classifier -> dependency-stubber -> bundler
         -> shell-generator -> server -> cli
```

`src/types/index.ts` is the single source of truth for every data contract passed between
modules — no module should redefine these shapes locally.

## Status

| Module | Ticket | Status |
|---|---|---|
| `resolver` | CONV-102 | **Implemented** — see `src/resolver/index.ts`, tested in `tests/unit/resolver.test.ts` |
| `ast-extractor` | CONV-103/104 | Stub only |
| `capability-engine` | CONV-105 | Stub only |
| `prop-mocker` | CONV-106 | Stub only |
| `dependency-classifier` | CONV-107 | Stub only |
| `dependency-stubber` | CONV-108 | Stub only |
| `bundler` | CONV-109/110 | Stub only |
| `shell-generator` | CONV-111 | Stub only |
| `server` | CONV-205/206/306 | Stub only |
| `cli` | CONV-201+ | Stub only |

Every stub module throws a clear "not yet implemented, see ticket X" error rather than silently
no-opping, so nothing downstream can accidentally build on top of an unfinished module without
noticing.

## Fixtures

`fixtures/components/` holds the 10 named regression fixtures from Test Plan v1.0 §3, each with
its documented expected FULL/PARTIAL/FAILED status. `fixtures/errors/` holds the three
additional error-path fixtures (no component export, runtime throw, monorepo alias — the last
one deliberately expected to stay unresolved per PRD v1.0 §7). See `fixtures/README.md` for the
full mapping.

## Commands

```bash
pnpm install
pnpm run typecheck   # tsc across src + tests (tsconfig.json, noEmit)
pnpm test            # vitest run
pnpm run build       # tsc → dist/ (tsconfig.build.json)
pnpm verify          # typecheck + test + build in one shot
```

Package manager is **pnpm** (pinned via `packageManager` in `package.json`); `pnpm-lock.yaml` is the
only lockfile.

> **If your editor shows *"Do you need to install type definitions for node?"*, it is not reading
> this repo's `tsconfig.json`.** The types are installed — do **not** run `npm i --save-dev @types/node`
> (it is already a devDependency, and this package uses pnpm; an npm install would clobber the pnpm
> layout). `tsconfig.json` covers `src/**`, `tests/**` and `vitest.config.ts` with
> `types: ["node"]` pinned, so every file above must resolve. If it still does not, the file you are
> looking at is outside `include` or is a stale buffer for a deleted temp file.
run `pnpm install` before reading anything into a red typecheck.

## Reference docs

The full spec set (PRD, TDD, CLI Interface Spec, Task Breakdown, Error Handling & Fallback Spec,
Test Plan, Security & Privacy Note, README for end users) lives outside this repo as the
project's doc set — this repo implements that spec, it doesn't duplicate it.
