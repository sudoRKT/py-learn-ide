# src/main/tutor

Owner: the **ai** agent (together with `src/main/ai/`).

`index.ts` exports the factory the rest of the main process calls:

| Factory | Returns (see `../services.ts`) |
|---|---|
| `createTutorService(deps)` | `TutorService` |

What is there now is a working stub: one prepared sentence on the first edit, hints read
straight from `hints.json`. **Replace the stub; keep the factory signature.** Split the code
into as many files as you like inside this folder (`prompts.ts`, guards, the engine), as long
as `index.ts` still exports the factory.

- Deps are fixed in `ServiceDeps['tutor']` in `../services.ts`: settings, profiles, lessons
  (`get`, `hints`, `tutorRules`, `ideas`, `solution`), progress, python (`analyse`) and ai
  (`getProvider()`, which is `null` when no model is ready). Do not import `electron`.
- The matcher format for `tutor.json` is `TutorWhen` in `src/shared/lesson-schema.ts`;
  compile its regular expressions with `compileTutorRegex` from the same file.
- Ratings are appended to `deps.paths.tutorRatingsFile(profileId)`.
- Unit tests sit beside the code as `*.test.ts`. Run only yours with `npx vitest run src/main/tutor`.
