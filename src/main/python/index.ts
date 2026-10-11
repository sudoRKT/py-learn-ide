// Owned jointly: the factories live in one file each so two engineers can work in parallel.
//   python-service.ts    createPythonService   (agent: python-run)
//   checks-service.ts    createChecksService   (agent: python-tools)
//   terminal-service.ts  createTerminalService (agent: python-tools)
//   practice-service.ts  createPracticeService (agent: python-tools)
// Keep the factory signatures. Do not add logic to this file.
export { createPythonService } from './python-service';
export { createChecksService } from './checks-service';
export { createTerminalService } from './terminal-service';
export { createPracticeService } from './practice-service';
