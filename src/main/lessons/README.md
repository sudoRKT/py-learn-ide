# src/main/lessons

Owner: the **lessons** agent (together with `lessons/`).

`index.ts` exports the factories the rest of the main process calls:

| Factory | Returns (see `../services.ts`) |
|---|---|
| `createProfileService(deps)` | `ProfileService` |
| `createSettingsService(deps)` | `SettingsService` |
| `createLessonService(deps)` | `LessonService` |
| `createProgressService(deps)` | `ProgressService` |
| `createBackupService(deps)` | `BackupService` |

What is there now is a working stub: plain JSON files, re-read on most calls, no write
batching. **Replace the stub; keep the factory signatures.** Split the code into as many
files as you like inside this folder, as long as `index.ts` still exports the five factories.

- Deps for each factory are fixed in `ServiceDeps` in `../services.ts`. Do not reach for
  anything that is not listed there, and do not import `electron`.
- Every path comes from `deps.paths` (`../paths.ts`). Lesson folders are read-only.
- File formats are the zod schemas in `src/shared/lesson-schema.ts`.
- Unit tests sit beside the code as `*.test.ts`. Use `createTestCore()` from `../testing.ts`
  for a temporary data folder. Run only yours with `npx vitest run src/main/lessons`.
