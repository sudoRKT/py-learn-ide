# src/main/ai

Owner: the **ai** agent (together with `src/main/tutor/` and `resources/models/catalog.json`).

`index.ts` exports the factory the rest of the main process calls:

| Factory | Returns (see `../services.ts`) |
|---|---|
| `createAiService(deps)` | `AiService` |

What is there now is a working stub: status `not-set-up`, an empty catalogue, no provider.
**Replace the stub; keep the factory signature.** Split the code into as many files as you
like inside this folder, as long as `index.ts` still exports the factory.

- Deps are fixed in `ServiceDeps['ai']` in `../services.ts`. Do not import `electron`:
  API keys go through `deps.secrets` (`SecretStore`), the "pick my own .gguf" dialog through
  `deps.dialogs` (`Dialogs`).
- Every path comes from `deps.paths`: `modelCatalogueFile`, `modelsDir`, `modelFile(name)`,
  `llamaServerExe`.
- `getProvider()` returns `null` whenever no model is ready. The app must work that way.
- Network calls are allowed here for exactly two things: the model download and a cloud
  provider the learner has added a key for.
- Unit tests sit beside the code as `*.test.ts`. Run only yours with `npx vitest run src/main/ai`.
