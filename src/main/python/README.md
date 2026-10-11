# src/main/python

Owner: the **python** agent (together with `python/`, the Python-side runtime).

`index.ts` exports the factories the rest of the main process calls:

| Factory | Returns (see `../services.ts`) |
|---|---|
| `createPracticeService(deps)` | `PracticeService` |
| `createPythonService(deps)` | `PythonService` (run, analyse, trace, runTests) |
| `createChecksService(deps)` | `ChecksService` |
| `createTerminalService(deps)` | `TerminalService` |

What is there now is a working stub (the header of `index.ts` lists exactly what it does and
does not do). **Replace the stub; keep the factory signatures.** Split the code into as many
files as you like inside this folder, as long as `index.ts` still exports the four factories.

- Deps for each factory are fixed in `ServiceDeps` in `../services.ts`. Do not reach for
  anything that is not listed there, and do not import `electron`.
- Every path comes from `deps.paths` (`../paths.ts`): `pythonExe`, `gitExe`,
  `pythonRuntimeDir`, `scratchDir(profileId, lessonId)`, `lessonDir(id)`. The Python runtime
  folder is `python/` in development and `resources/pyruntime/` in the installed app, so
  never hard-code it.
- Limits that the renderer also relies on are in `LIMITS` in `src/shared/constants.ts`.
- Unit tests sit beside the code as `*.test.ts`; Python tests go in `python/tests/`.
  Run only yours with `npx vitest run src/main/python` and `npm run test:py`.
