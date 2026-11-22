// EMBERLIGHT — The Lighthouse Heist: the hand-in program (Node 22, standard library only).
//
// What it does: it takes the game in this repository's game/ folder (plain static
// files a desktop browser loads offline) and the screenshots/ renders, and hands
// them in as /output: game/, screenshots/ and a dossier.json the judge reads,
// written by the vendored make.fun library (vendor/makefun-game.ts).
//
// How to run it locally, outside the grader's container (MAKEFUN_OUTPUT_DIR
// stands in for /output there):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the game itself with `node serve.ts`, then open http://localhost:8080.
//
// One rule shapes this file: on the grader /output is a mounted volume, so the
// program must never remove /output itself (that throws EBUSY and fails the run).
// It removes only the children inside /output, then copies the fresh files in.
// That keeps two runs byte-identical as well, since no stale file survives.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

// The grader hands us /output; locally MAKEFUN_OUTPUT_DIR stands in for it.
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Remove every child of a directory, leaving the directory itself untouched.
function clearChildren(dir) {
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

// The scorer's caps, as the kit's RULES.txt lists them: only text_max_bytes
// shapes the dossier's bytes; the rest refuse an entry the scorer would refuse
// (more than 4 screenshots or one over 256 KiB; game/ over 993 files or 48 MiB,
// or a path under game/ over 1000 bytes; game/ counts beside /output's own
// 1000-entry cap, its screenshots/ and dossier.json).
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
clearChildren(outDir);

mkdirSync(join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });

if (existsSync(join(repoRoot, 'screenshots'))) {
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, dossierCaps));
