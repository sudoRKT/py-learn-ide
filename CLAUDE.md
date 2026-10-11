# Working in this repo

Py Learn teaches Python to beginners (Electron + TypeScript + React). **Read `docs/SPEC.md` first: it is the contract.**

## Who owns what (do not edit outside your area; ask for changes in your final report)

| Area | Owner |
|---|---|
| `docs/`, `src/shared/`, `src/preload/`, root config files, `package.json`, `src/main/*.ts` | lead (frozen during the parallel build) |
| `src/main/python/`, `python/` | python agent |
| `src/main/lessons/`, `lessons/` | lessons agent |
| `src/main/ai/`, `src/main/tutor/`, `resources/models/catalog.json` | ai agent |
| `src/renderer/` (keep `api.ts`, `mockApi.ts`, `mockData.ts`, `env.d.ts`, `monaco-setup.ts` working) | ui agent |
| `build/`, `scripts/`, `.github/` | packaging agent |
| `tests/` | cross-cutting tests only; unit tests sit beside the code as `*.test.ts` |

Each `src/main/<area>/index.ts` exports factories that return working stubs. Replace the
stub; keep the factory signatures. The interfaces are in `src/main/services.ts`.

## Rules

- The renderer talks only to `api` from `src/renderer/src/api.ts`. Never import `src/main`,
  `electron` or `node:*` from `src/renderer` (`tests/architecture.test.ts` enforces this).
- Services never import `electron`; what they need from it arrives through `deps`
  (`SecretStore`, `Dialogs`). Only the lead's start-up files in `src/main` import it.
- All paths come from `src/main/paths.ts` (`deps.paths`). The app writes only inside its
  data folder (`./.devdata` in development).
- New IPC: add the method to `Api` and `API_SHAPE` (`src/shared/ipc.ts`), to `buildApi`
  (`src/main/ipc.ts`) and to `mockApi.ts`. The preload needs no edit.
- No new npm dependencies, no `npm install`, no `playwright install`: ask the lead.
- Sub-agents do not `git commit` or `git push`. Leave the working tree for the lead.
- TypeScript strict. No `any` in `src/shared`; elsewhere prefer `unknown` and narrowing.
- British spelling in user-facing text (colour, licence, catalogue). No brand names, real
  people or copyrighted material in lesson content: invent everything.
- No network calls except the model download, a cloud AI provider with the learner's own
  key, and lessons 91 and 92. The app must work with no AI model (`getProvider()` is `null`).

## Commands

| What | All of it | Only your part |
|---|---|---|
| Type check | `npm run typecheck` | `npm run typecheck:node` or `typecheck:web` |
| Unit tests (Vitest) | `npm test` | `npx vitest run src/main/python` (any folder or file) |
| Python tests | `npm run test:py` | `python3 -m pytest python/tests/test_x.py -q` |
| UI tests (Playwright, mock bridge) | `npm run test:ui` | `npx playwright test tests/ui/x.spec.ts` |
| Build, then boot the built app headless | `npm run build`, `npm run smoke` | |
| Run it | `npm run dev:web` (browser, mock bridge, http://127.0.0.1:5179) or `npm run dev` (Electron; as root on Linux: `xvfb-run -a npm run dev -- --noSandbox`) | |

UI tests use `openApp()` and `shot()` from `tests/ui/helpers.ts` (screenshots go to
`tests/screenshots/`). Service tests use `createTestCore()` from `src/main/testing.ts`.
