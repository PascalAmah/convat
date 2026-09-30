# Convat Fixture Suite

Reference: Test Plan v1.0 §3, TDD v1.0 §6.

These are the permanent regression fixtures for Milestone 1. Every architectural change to the
pipeline should run against this exact set (CONV-113) before merging.

## `components/` — the 10 named fixtures

| File | Exercises | Expected status |
|---|---|---|
| `01-basic.tsx` | Primitive props, no imports | `FULL` |
| `02-typescript.tsx` | Enum + array prop types | `FULL` |
| `03-nested-props.tsx` | Complex/generic prop types → `fallbackFields` | `PARTIAL` |
| `04-local-imports.tsx` | Relative import chain, in-project resolution. **Primary React-runtime-externalization regression guard — uses hooks, must never throw "Invalid hook call".** | `FULL` |
| `05-missing-imports.tsx` | Same shape as 04, imports invalidated | `PARTIAL` |
| `06-context.tsx` | `useContext` consumer | `PARTIAL` |
| `07-redux.tsx` | `useSelector`-style consumer. **Secondary React-runtime regression guard.** | `PARTIAL` |
| `08-styling.tsx` | Custom CSS/Sass import | `PARTIAL` |
| `09-env-vars.tsx` | `process.env` usage (RESOLVED severity — does not affect status) | `FULL` |
| `10-ai-generated.tsx` | Representative "pasted from AI chat" component — mixed unresolved kinds at once | `PARTIAL` |

`04` and `07` depend on `support/Avatar.tsx` and `support/Badge.tsx` for the in-project
resolution case. `08` depends on `styles/StyledPanel.module.scss`.

## `errors/` — error-path fixtures (not part of the named 10)

| File | Exercises | Expected outcome |
|---|---|---|
| `no-component-export.ts` | `NoComponentFoundError` | exit code 2, no server started |
| `throws-on-render.tsx` | `RuntimeErrorReport` — stub doesn't satisfy a required destructure | server stays up, Error Boundary shown, coverage panel stays visible |
| `monorepo-alias-import.tsx` | Monorepo/workspace-scoped import resolution — **deliberately expected to remain unresolved** in v1.0 (PRD §7, out of scope) | `PARTIAL` via generic-fallback stub, low confidence — regression guard confirming this stays a documented gap, not a silent crash |

Target: grow to 25+ total fixtures by v1.0 ship as real-world edge cases are discovered
(Test Plan §3).
