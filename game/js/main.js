// EMBERLIGHT — the game itself: state, loop, input, alarms and screens.
// One Game object holds the level, the player, the keepers, the cameras and
// the beam. Detection is one meter fed by every watcher: guards, cameras and
// the lighthouse beam. The loop runs in every screen so the title shows the
// lighthouse grounds alive behind it; only the playing state takes input.

import { TILE, buildLevel, tileAt, isSolid } from './levels.js';
import { Guard } from './guard.js';
import { Camera } from './camera.js';
import { Beam } from './beam.js';
import { Player } from './player.js';
import { drawWorld } from './render.js';
import { initUI, updateHUD, setFieldNotes, showScreen, setLevelScreen, setOverScreen, setWinScreen } from './ui.js';
import * as audio from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const input = { up: false, down: false, left: false, right: false, sneak: false, sprint: false };

const game = {
  state: 'title', // title | playing | paused | leveldone | gameover | win
  levelIndex: 0,
  level: null,
  player: null,
  guards: [],
  cameras: [],
  beam: null,
  suspicion: 0, // beam-driven suspicion, 0..100
  beamSuspicion: 0,
  staged: false, // ?shot= scenes freeze the simulation so the shot is exact
  alarmArmed: true,
  spottedCount: 0,
  ghostPossible: true,
  score: 0,
  loot: 0,
  strikes: 0,
  elapsed: 0,
  visibility: 0,
  noiseLevel: 0,
  time: 0,
};

// --- World callbacks the entities call back into ---------------------------

const world = {
  onStep(sprinting) {
    audio.playStep(false);
    if (sprinting) {
      game.noiseLevel = 1;
      for (const g of game.guards) {
        if (Math.hypot(g.x - game.player.x, g.y - game.player.y) < 130) {
          g.hear(game.player.x, game.player.y);
        }
      }
    } else {
      game.noiseLevel = Math.max(game.noiseLevel, 0.25);
    }
  },
  onShellThrown() {
    audio.playShell();
  },
  onShellLanded(x, y) {
    audio.playShell();
    game.noiseLevel = 1;
    for (const g of game.guards) {
      if (Math.hypot(g.x - x, g.y - y) < 200) g.hear(x, y);
    }
  },
  onSmoke() {
    audio.playSmoke();
  },
  onDouse() {
    audio.playPickup();
  },
  onSpotted() {
    triggerAlarm();
  },
  onCameraAlarm() {
    for (const g of game.guards) {
      g.alert = Math.max(g.alert, 80);
      g.lastSeen = { x: game.player.x, y: game.player.y };
    }
    triggerAlarm();
  },
  beamInPlayer() {
    return game.beam ? game.beam.covers(game.level, game.player.x, game.player.y) : false;
  },
};

// One alarm episode counts once: crossing 100 suspicion raises it, and it
// re-arms only after suspicion falls back under 60.
function triggerAlarm() {
  if (!game.alarmArmed) return;
  game.alarmArmed = false;
  game.spottedCount += 1;
  game.ghostPossible = false;
  audio.playAlarm();
}

// --- Level lifecycle --------------------------------------------------------

function loadLevel(index) {
  game.levelIndex = index;
  game.level = buildLevel(index);
  game.player = new Player(game.level.playerStart);
  game.guards = game.level.guards.map((g) => new Guard(g));
  game.cameras = game.level.cameras.map((c) => new Camera(c));
  game.beam = new Beam(game.level.beam);
  game.suspicion = 0;
  game.beamSuspicion = 0;
  game.alarmArmed = true;
  game.spottedCount = 0;
  game.ghostPossible = true;
  game.loot = 0;
  game.strikes = 0;
  game.elapsed = 0;
  game.visibility = 0;
  game.noiseLevel = 0;
  setFieldNotes(game.level.def.notes);
}

function startGame() {
  game.score = 0;
  loadLevel(0);
  game.state = 'playing';
  showScreen(null);
  audio.ensureAudio();
}

function nextLevel() {
  if (game.levelIndex + 1 >= 3) {
    game.state = 'win';
    setWinScreen([
      `Final score: ${game.score}.`,
      'The Brass Key, the Lens Crystal and the Emberlight Gem — all three heists, complete.',
      'Thank you for playing EMBERLIGHT.',
    ]);
    showScreen('win');
    audio.playWin();
    return;
  }
  loadLevel(game.levelIndex + 1);
  game.state = 'playing';
  showScreen(null);
}

function levelComplete() {
  const par = game.level.def.par;
  const timeBonus = Math.max(0, Math.round(par - game.elapsed)) * 10;
  const ghost = game.ghostPossible ? 500 : 0;
  game.score += 1000 + timeBonus + ghost;
  audio.playWin();
  game.state = 'leveldone';
  setLevelScreen(`${game.level.def.name} — CLEAR`, [
    `Stole the ${game.level.treasure.name} and reached the ${game.level.exit.name}.`,
    `Heist bonus +1000 · time bonus +${timeBonus} · ghost bonus +${ghost}.`,
    `Score: ${game.score} · Spotted: ${game.spottedCount} time(s).`,
  ]);
  showScreen('level');
}

function caught() {
  game.strikes += 1;
  audio.playCaught();
  if (game.strikes >= 3) {
    game.state = 'gameover';
    setOverScreen([`Score: ${game.score} · reached ${game.level.def.name}.`]);
    showScreen('over');
    return;
  }
  // Caught: the night resets to the level start, strikes kept.
  const start = game.level.playerStart;
  game.player.reset(start);
  for (const g of game.guards) {
    g.x = g.patrol[0].x;
    g.y = g.patrol[0].y;
    g.alert = 0;
    g.state = 'patrol';
    g.investigate = null;
    g.wpIndex = 1;
    g.wpDir = 1;
    g.pause = 0;
  }
  for (const c of game.cameras) c.alert = 0;
  game.suspicion = 0;
  game.beamSuspicion = 0;
  game.alarmArmed = true;
}

// --- Update -----------------------------------------------------------------

function update(dt) {
  game.time += dt;
  // A staged screenshot scene is frozen: only the pulse animations advance,
  // so the shot is exactly the scene that was staged.
  if (game.staged) return;
  game.beam.update(dt);

  // Title backdrop: the grounds live, but nobody is watching.
  if (game.state === 'title') {
    for (const g of game.guards) g.update(dt, game.level, { ...game.player, hidden: true, sneaking: true, sprinting: false, lit: false, x: game.player.x, y: game.player.y }, world);
    for (const c of game.cameras) c.update(dt, game.level, { ...game.player, hidden: true }, world);
    return;
  }
  if (game.state !== 'playing') return;

  game.elapsed += dt;
  game.noiseLevel = Math.max(0, game.noiseLevel - dt * 1.5);

  game.player.update(dt, input, game.level, world);
  for (const g of game.guards) g.update(dt, game.level, game.player, world);
  for (const c of game.cameras) c.update(dt, game.level, game.player, world);

  // The beam's own suspicion: standing in it, seen, exposes fast.
  const inBeam = world.beamInPlayer() && !game.player.hidden;
  if (inBeam) {
    game.beamSuspicion = Math.min(100, game.beamSuspicion + 90 * dt);
  } else {
    game.beamSuspicion = Math.max(0, game.beamSuspicion - 30 * dt);
  }
  if (game.beamSuspicion >= 100) {
    // The beam gives the player away: the nearest keeper comes running.
    let nearest = null;
    let best = Infinity;
    for (const g of game.guards) {
      const d = Math.hypot(g.x - game.player.x, g.y - game.player.y);
      if (d < best) {
        best = d;
        nearest = g;
      }
    }
    if (nearest) {
      nearest.alert = 100;
      nearest.lastSeen = { x: game.player.x, y: game.player.y };
    }
    triggerAlarm();
  }
  if (game.suspicion < 60) game.alarmArmed = true;

  // One displayed suspicion: the worst of every watcher.
  game.suspicion = Math.max(
    game.beamSuspicion,
    ...game.guards.map((g) => g.alert),
    ...game.cameras.map((c) => c.alert),
  );

  // Visibility: what the HUD shows — hidden, lit, or caught in the beam.
  const visTarget = game.player.hidden ? 4 : inBeam ? 95 : game.player.lit ? 70 : 30;
  game.visibility += (visTarget - game.visibility) * Math.min(1, dt * 6);

  // Pickups: coins and the treasure, by touch.
  for (const coin of game.level.coins) {
    if (!coin.taken && Math.hypot(coin.x - game.player.x, coin.y - game.player.y) < 20) {
      coin.taken = true;
      game.loot += 1;
      game.score += 100;
      audio.playPickup();
    }
  }
  const tr = game.level.treasure;
  if (!tr.taken && Math.hypot(tr.x - game.player.x, tr.y - game.player.y) < 22) {
    tr.taken = true;
    game.loot += 1;
    game.score += 250;
    game.level.exit.open = true;
    audio.playPickup();
  }

  // Exit, once open.
  const ex = game.level.exit;
  if (ex.open && Math.hypot(ex.x - game.player.x, ex.y - game.player.y) < 24) {
    levelComplete();
    return;
  }

  // Caught: a chasing keeper touches the player.
  for (const g of game.guards) {
    if (g.state === 'spotted' && Math.hypot(g.x - game.player.x, g.y - game.player.y) < 18) {
      caught();
      return;
    }
  }
}

// --- Loop -------------------------------------------------------------------

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  drawWorld(ctx, game);
  updateHUD(game);
  requestAnimationFrame(frame);
}

// --- Input ------------------------------------------------------------------

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
  Space: 'sprint',
};

window.addEventListener('keydown', (e) => {
  audio.ensureAudio();
  if (e.code in KEYMAP) {
    input[KEYMAP[e.code]] = true;
    e.preventDefault();
  }
  if (e.repeat) return;
  if (e.code === 'KeyQ' && game.state === 'playing') game.player.dropSmoke(world);
  if (e.code === 'KeyR' && game.state === 'playing') game.player.douse(game.level, world);
  if (e.code === 'KeyM') audio.setMuted(!audio.isMuted());
  if (e.code === 'KeyP') {
    if (game.state === 'playing') {
      game.state = 'paused';
      showScreen('pause');
    } else if (game.state === 'paused') {
      game.state = 'playing';
      showScreen(null);
    }
  }
  if (e.code === 'Enter') {
    if (game.state === 'title') startGame();
    else if (game.state === 'leveldone') nextLevel();
    else if (game.state === 'gameover') startGame();
    else if (game.state === 'win') startGame();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code in KEYMAP) input[KEYMAP[e.code]] = false;
});

// Click (or tap) throws a shell toward that point on the map.
canvas.addEventListener('pointerdown', (e) => {
  audio.ensureAudio();
  if (game.state !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
  game.player.throwShell(x, y, world);
});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-resume').addEventListener('click', () => {
  game.state = 'playing';
  showScreen(null);
});
document.getElementById('btn-next').addEventListener('click', nextLevel);
document.getElementById('btn-retry').addEventListener('click', startGame);
document.getElementById('btn-again').addEventListener('click', startGame);

// --- Screenshot staging -----------------------------------------------------
// ?shot=N stages a scene for the maker's screenshots: the game is real code
// running, the player and guards are placed mid-action, and the HUD is live.

function stageShot(n) {
  const P = (tx, ty) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
  if (n === 1) {
    loadLevel(0);
    const p = P(13, 12);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.sneaking = true;
    game.beam.angle = Math.PI * 0.55;
    game.beam.speed = 0;
    game.suspicion = 18;
    game.visibility = 12;
  } else if (n === 2) {
    loadLevel(0);
    // Close enough for the keeper's cone to actually reach the player.
    const p = P(13, 8);
    game.player.x = p.x;
    game.player.y = p.y;
    // Aim the beam at the player so the wedge crosses them.
    game.beam.angle = Math.atan2(p.y - game.beam.y, p.x - game.beam.x);
    game.beam.speed = 0;
    const g = game.guards[0];
    g.x = P(16, 7).x;
    g.y = P(16, 7).y;
    g.facing = Math.atan2(p.y - g.y, p.x - g.x);
    g.alert = 55;
    g.state = 'suspicious';
    g.lastSeen = { x: p.x, y: p.y };
    game.suspicion = 55;
    game.visibility = 88;
  } else if (n === 3) {
    loadLevel(1);
    const p = P(8, 10);
    game.player.x = p.x;
    game.player.y = p.y;
    game.player.smokes.push({ x: p.x, y: p.y, t: 5 });
    game.player.shell = { x: p.x, y: p.y, tx: P(14, 10).x, ty: P(14, 10).y };
    const g = game.guards[0];
    g.x = P(11, 10).x;
    g.y = P(11, 10).y;
    g.alert = 78;
    g.state = 'searching';
    g.lastSeen = { x: P(12, 10).x, y: P(12, 10).y };
    game.suspicion = 78;
    game.visibility = 40;
    game.beam.speed = 0;
  } else if (n === 4) {
    loadLevel(2);
    const p = P(14, 5);
    game.player.x = p.x;
    game.player.y = p.y;
    game.level.exit.open = true; // staged: gem still visible, exit already open
    game.loot = 2;
    game.score = 350;
    game.beam.angle = Math.PI * 1.2;
    game.beam.speed = 0;
    game.suspicion = 12;
    game.visibility = 25;
  } else {
    return false;
  }
  game.staged = true;
  game.state = 'playing';
  showScreen(null);
  return true;
}

// --- Boot -------------------------------------------------------------------

initUI();
loadLevel(0);
showScreen('title');

const params = new URLSearchParams(window.location.search);
const shot = Number(params.get('shot') || 0);
if (shot > 0) {
  stageShot(shot);
  // Let a few frames render (beam sweep, cones, HUD) before signalling ready.
  setTimeout(() => {
    window.__shotReady = true;
  }, 900);
} else {
  window.__shotReady = true;
}

// Debug handle for play-testing: state snapshots and level jumps.
window.EMBERLIGHT = {
  game,
  start: startGame,
  loadLevel,
  snapshot() {
    return {
      state: game.state,
      level: game.levelIndex,
      suspicion: Math.round(game.suspicion),
      score: game.score,
      loot: game.loot,
      strikes: game.strikes,
      ghostPossible: game.ghostPossible,
      treasureTaken: game.level.treasure.taken,
      exitOpen: game.level.exit.open,
      player: { x: Math.round(game.player.x), y: Math.round(game.player.y), hidden: game.player.hidden, lit: game.player.lit },
      guards: game.guards.map((g) => ({ name: g.name, state: g.state, alert: Math.round(g.alert), x: Math.round(g.x), y: Math.round(g.y) })),
      cameras: game.cameras.map((c) => ({ alert: Math.round(c.alert) })),
    };
  },
};

requestAnimationFrame(frame);
