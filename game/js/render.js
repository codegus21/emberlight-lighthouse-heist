// EMBERLIGHT — rendering: everything is drawn in code on one canvas, no
// images. Dark navy floors, warm amber lamplight, amber guard cones and teal
// camera cones, fog banks and bushes as cover, and a visibility ring under
// the player so the screenshots read at a glance: green hidden, amber seen,
// red spotted.

import { TILE, COLS, ROWS, T } from './levels.js';

const W = COLS * TILE;
const H = ROWS * TILE;

const COLORS = {
  floor: '#0e1a2e',
  floorLine: '#132238',
  water: '#0d2b3d',
  wall: '#22304a',
  wallTop: '#31456a',
  crate: '#7a5230',
  crateEdge: '#9c6b3f',
  bush: '#2e5d3a',
  bushLight: '#3f7a4e',
  fog: 'rgba(150, 165, 140, 0.20)',
  fogEdge: 'rgba(180, 195, 170, 0.30)',
  lampPool: 'rgba(255, 179, 71, 0.13)',
  lampCore: 'rgba(255, 205, 110, 0.22)',
  beam: 'rgba(255, 190, 80, 0.10)',
  beamCore: 'rgba(255, 205, 110, 0.16)',
  guardCone: 'rgba(255, 191, 71, 0.20)',
  cameraCone: 'rgba(45, 212, 191, 0.18)',
  smoke: 'rgba(200, 205, 210, 0.35)',
  exitLocked: '#5a6b84',
  exitOpen: '#39d98a',
  gold: '#ffd166',
};

// Pixel sprites: 16x16 maps drawn in code, rendered 2x for crisp 32x32
// characters (exactly one tile). No network at runtime. The thief is a ninja
// in black with a headband and red tie; the guards are police in navy with
// cap, gold badge and black belt. Three directional variants each (DOWN / UP /
// SIDE; SIDE flips horizontally for left). The coin is Kenney's "Tiny Dungeon"
// tile_0120 (gold coin pile), CC0 — source PNG kept at game/assets/
// kenney-coin.png, transcribed pixel-for-pixel into COIN_MAP below.
const NINJA_PALETTE = { K: '#14161d', k: '#2b3040', T: '#aebfd9', S: '#f2c89b', E: '#14161d', R: '#c0392b', H: '#3a4157' };
const POLICE_PALETTE = { N: '#1e3a6e', n: '#152a52', B: '#101318', G: '#ffd166', S: '#f2c89b', W: '#e8ecf2', T: '#7fa0d0' };

const NINJA_DOWN = [
  '................',
  '.....KKKKK......',
  '....KKKKKKK.....',
  '....KHHHHHKRR...',
  '....KSESESKR....',
  '....KKKKKKK.R...',
  '.....KKKKK......',
  '...TKKKKKKKKT...',
  '...TKKKKKkkKT...',
  '...TKkkKKKKKT...',
  '....kkkTTkkk....',
  '....KKKKKKKK....',
  '....KKK..KKK....',
  '....KKK..KKK....',
  '...KKKK..KKKK...',
  '...KKK....KKK...',
];

const NINJA_UP = [
  '................',
  '.....KKKKK......',
  '....KKKKKKK.....',
  '....HHHRRHH.....',
  '....KKKRRKK.....',
  '....KKKKKKK.....',
  '.....KKKKK......',
  '...TKKKKKKKKT...',
  '...TKKKKKkkKT...',
  '...TKkkKKKKKT...',
  '....kkkTTkkk....',
  '....KKKKKKKK....',
  '....KKK..KKK....',
  '....KKK..KKK....',
  '...KKKK..KKKK...',
  '...KKK....KKK...',
];

const NINJA_SIDE = [
  '................',
  '......KKKKK.....',
  '.....KKKKKKK....',
  '.....RRHHHHH....',
  '.....KKKKSEKK...',
  '....RKKKKKKK....',
  '......KKKKK.....',
  '....TKKKKKKKKT..',
  '....TKKKKKKkkT..',
  '....TKkkKKKKKT..',
  '.....kkkTTkk....',
  '.....KKKKKKK....',
  '....KKK..KKK....',
  '....KKK..KKK....',
  '...KKK....KKK...',
  '...KKK....KKK...',
];

const GUARD_DOWN = [
  '.....NNNNNN.....',
  '....NNNNNNNN....',
  '....NNNGGNNN....',
  '...BBBBBBBBBB...',
  '.....SBSSBS.....',
  '.....SSSSSS.....',
  '.....SSWWSS.....',
  '...GNNNNNNNNG...',
  '...NNWWNNNNNN...',
  '...NNNGNNNNNN...',
  '....BBBGGBBB....',
  '....NNNNNNNN....',
  '....nnn..nnn....',
  '....nnn..nnn....',
  '...BBBB..BBBB...',
  '...BBB....BBB...',
];

const GUARD_UP = [
  '.....NNNNNN.....',
  '....NNNNNNNN....',
  '....NNNNNNNN....',
  '....NNNNNNNN....',
  '.....NNNNNN.....',
  '.....NNNNNN.....',
  '.....NNWWNN.....',
  '...GNNNNNNNNG...',
  '...NNNNNNNNNN...',
  '...NNNGNNNNNN...',
  '....BBBGGBBB....',
  '....NNNNNNNN....',
  '....nnn..nnn....',
  '....nnn..nnn....',
  '...BBBB..BBBB...',
  '...BBB....BBB...',
];

const GUARD_SIDE = [
  '......NNNNNN....',
  '.....NNNNNNNN...',
  '.....NNGGNNNN...',
  '.....BBBBBBBBB..',
  '.......SSBSS....',
  '.......SSSSS....',
  '.......SSWWS....',
  '....GNNNNNNNG...',
  '....NNWWNNNNN...',
  '....NNNNGNNNN...',
  '.....BBBGGBBB...',
  '.....NNNNNNNN...',
  '....nnn..nnn....',
  '....nnn..nnn....',
  '...BBBB...BBBB..',
  '...BBB....BBB...',
];

const COIN_PALETTE = { A: '#3f2631', B: '#eaa56c', C: '#bd6c4a', D: '#763b36', E: '#ffffff' };

const COIN_MAP = [
  '................',
  '................',
  '.....AAAAAA.....',
  '..AAAAAAAAAAAA..',
  '.AAAAABAABAAAAA.',
  'AAACAACBBCAACAAA',
  'AACCCDBBBBDCCCAA',
  'AACCCDEBBEDCCCAA',
  'AACCBCBBBBCBCCAA',
  'AACCCABBBBACCCAA',
  'AABABACCCCABABAA',
  'AAAAAABAABAAAAAA',
  '.AAAAAAAAAAAAAA.',
  '.....AAAAAA.....',
  '................',
  '................',
];

function makeSprite(rows, palette) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const g = c.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = rows[y][x];
      if (ch === '.' || ch === undefined) continue;
      g.fillStyle = palette[ch];
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

const SPRITES = {
  ninja: {
    DOWN: makeSprite(NINJA_DOWN, NINJA_PALETTE),
    UP: makeSprite(NINJA_UP, NINJA_PALETTE),
    SIDE: makeSprite(NINJA_SIDE, NINJA_PALETTE),
  },
  police: {
    DOWN: makeSprite(GUARD_DOWN, POLICE_PALETTE),
    UP: makeSprite(GUARD_UP, POLICE_PALETTE),
    SIDE: makeSprite(GUARD_SIDE, POLICE_PALETTE),
  },
  coin: makeSprite(COIN_MAP, COIN_PALETTE),
};

// Direction selection on the dominant axis. Idle keeps the last movement
// direction, so a standing character never snaps to a new pose.
function spriteDir(dx, dy) {
  if (dy > 0.5) return { variant: 'DOWN', flip: false };
  if (dy < -0.5) return { variant: 'UP', flip: false };
  return { variant: 'SIDE', flip: dx < 0 };
}

function drawSprite(ctx, sprite, x, y, flip) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(x), Math.round(y));
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(sprite, -16, -16, 32, 32);
  ctx.restore();
}

function wedge(ctx, x, y, facing, halfAngle, range, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fill();
}

export function drawWorld(ctx, game) {
  ctx.imageSmoothingEnabled = false;
  const { level, player, guards, cameras, beam, time } = game;
  drawFloor(ctx, level);
  drawLampPools(ctx, level);
  drawBeam(ctx, beam);
  drawWallsAndCrates(ctx, level);
  drawCover(ctx, level);
  drawExitAndLoot(ctx, level, time);
  drawSmoke(ctx, player);
  drawCones(ctx, guards, cameras);
  drawCameras(ctx, cameras);
  drawGuards(ctx, guards, time);
  drawPlayer(ctx, player, game);
  drawShell(ctx, player);
  drawVignette(ctx);
}

function drawFloor(ctx, level) {
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLORS.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= COLS; x++) {
    ctx.moveTo(x * TILE, 0);
    ctx.lineTo(x * TILE, H);
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.moveTo(0, y * TILE);
    ctx.lineTo(W, y * TILE);
  }
  ctx.stroke();
  // Shore water: darker blue with a slow shimmer.
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (level.tiles[y][x] === T.WATER) {
        ctx.fillStyle = COLORS.water;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        ctx.strokeStyle = 'rgba(90, 160, 200, 0.25)';
        ctx.beginPath();
        const wob = Math.sin((x * 3 + y * 5) * 1.7) * 3;
        ctx.moveTo(x * TILE + 4, y * TILE + 16 + wob);
        ctx.lineTo(x * TILE + TILE - 4, y * TILE + 16 + wob);
        ctx.stroke();
      }
    }
  }
}

function drawLampPools(ctx, level) {
  for (const lamp of level.lamps) {
    if (!lamp.lit) continue;
    const cx = (lamp.tx + 0.5) * TILE;
    const cy = (lamp.ty + 0.5) * TILE;
    const grad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 92);
    grad.addColorStop(0, COLORS.lampCore);
    grad.addColorStop(1, 'rgba(255, 179, 71, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, 92, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBeam(ctx, beam) {
  // Outer wash, then a brighter core, both rotating with the lamp.
  wedge(ctx, beam.x, beam.y, beam.angle, 0.21, beam.range, COLORS.beam);
  wedge(ctx, beam.x, beam.y, beam.angle, 0.09, beam.range, COLORS.beamCore);
  // The lamp housing itself.
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(beam.x, beam.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(beam.x, beam.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawWallsAndCrates(ctx, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (t === T.WALL) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 5);
      } else if (t === T.CRATE) {
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.beginPath();
        ctx.moveTo(px + 2, py + 2);
        ctx.lineTo(px + TILE - 2, py + TILE - 2);
        ctx.moveTo(px + TILE - 2, py + 2);
        ctx.lineTo(px + 2, py + TILE - 2);
        ctx.stroke();
      } else if (t === T.LAMP) {
        const lamp = level.lamps.find((l) => l.tx === x && l.ty === y);
        ctx.fillStyle = '#3a4a63';
        ctx.fillRect(px + 14, py + 8, 4, 18);
        ctx.fillStyle = lamp && lamp.lit ? '#ffd166' : '#4a5568';
        ctx.beginPath();
        ctx.arc(px + 16, py + 9, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawCover(ctx, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const t = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (t === T.BUSH) {
        ctx.fillStyle = COLORS.bush;
        for (const [ox, oy, r] of [[9, 10, 9], [20, 8, 8], [15, 20, 9], [24, 18, 7]]) {
          ctx.beginPath();
          ctx.arc(px + ox, py + oy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = COLORS.bushLight;
        ctx.beginPath();
        ctx.arc(px + 13, py + 12, 4, 0, Math.PI * 2);
        ctx.arc(px + 21, py + 17, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (t === T.FOG) {
        ctx.fillStyle = COLORS.fog;
        ctx.beginPath();
        ctx.ellipse(px + 16, py + 16, 17, 13, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = COLORS.fogEdge;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

function drawExitAndLoot(ctx, level, time) {
  // Exit door: locked grey, open green with a glow.
  const e = level.exit;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3);
  ctx.fillStyle = e.open ? COLORS.exitOpen : COLORS.exitLocked;
  ctx.fillRect(e.x - 13, e.y - 13, 26, 26);
  ctx.strokeStyle = e.open ? `rgba(57, 217, 138, ${0.5 + pulse * 0.5})` : '#7a8aa5';
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x - 13, e.y - 13, 26, 26);
  ctx.fillStyle = '#0e1a2e';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', e.x, e.y + 1);

  // Treasure: a pulsing gem.
  if (!level.treasure.taken) {
    const tr = level.treasure;
    const glow = 10 + pulse * 6;
    ctx.fillStyle = 'rgba(255, 209, 102, 0.25)';
    ctx.beginPath();
    ctx.arc(tr.x, tr.y, glow + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y - 9);
    ctx.lineTo(tr.x + 7, tr.y);
    ctx.lineTo(tr.x, tr.y + 9);
    ctx.lineTo(tr.x - 7, tr.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.moveTo(tr.x, tr.y - 4);
    ctx.lineTo(tr.x + 3, tr.y);
    ctx.lineTo(tr.x, tr.y + 4);
    ctx.lineTo(tr.x - 3, tr.y);
    ctx.closePath();
    ctx.fill();
  }

  // Coins: Kenney gold coin pile sprite, drawn crisp at 24x24 (3/4 of a tile
  // — clearly smaller than the 32px characters, but big enough to read).
  for (const coin of level.coins) {
    if (coin.taken) continue;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(SPRITES.coin, Math.round(coin.x) - 12, Math.round(coin.y) - 12, 24, 24);
  }
}

function drawSmoke(ctx, player) {
  for (const s of player.smokes) {
    const alpha = Math.min(1, s.t / 2) * 0.85;
    ctx.fillStyle = `rgba(200, 205, 210, ${alpha * 0.35})`;
    for (const [ox, oy, r] of [[-18, -6, 26], [12, 10, 30], [0, -18, 24], [20, -12, 20]]) {
      ctx.beginPath();
      ctx.arc(s.x + ox, s.y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawCones(ctx, guards, cameras) {
  for (const g of guards) {
    wedge(ctx, g.x, g.y, g.facing, 0.61, 175, COLORS.guardCone);
  }
  for (const c of cameras) {
    wedge(ctx, c.x, c.y, c.facing, 0.44, 205, COLORS.cameraCone);
  }
}

function drawCameras(ctx, cameras) {
  for (const c of cameras) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.facing);
    ctx.fillStyle = '#1f3a3a';
    ctx.fillRect(-7, -6, 14, 12);
    ctx.fillStyle = c.alert >= 100 ? '#ff5d5d' : '#2dd4bf';
    ctx.beginPath();
    ctx.arc(7, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (c.alert >= 30) {
      ctx.fillStyle = '#ff5d5d';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', c.x, c.y - 16);
    }
  }
}

function drawGuards(ctx, guards, time) {
  for (const g of guards) {
    // Police officer: navy uniform, cap with a gold badge, black belt.
    // Direction comes from the sprite variant, so the old facing tick is gone.
    const d = spriteDir(Math.cos(g.facing), Math.sin(g.facing));
    drawSprite(ctx, SPRITES.police[d.variant], g.x, g.y, d.flip);
    // Alert mark.
    if (g.state === 'suspicious' || g.state === 'searching') {
      ctx.fillStyle = '#ffd166';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', g.x, g.y - 18);
    } else if (g.state === 'spotted') {
      ctx.fillStyle = '#ff5d5d';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', g.x, g.y - 18);
    }
    // Name tag.
    ctx.fillStyle = 'rgba(232, 220, 192, 0.85)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(g.name, g.x, g.y + 24);
  }
}

function drawPlayer(ctx, player, game) {
  // Visibility ring: green hidden, amber seen, red spotted. The ring and the
  // ninja sprite keep the thief readable against the dark floor at a glance.
  const maxAlert = Math.max(game.suspicion, ...game.guards.map((g) => g.alert));
  const ring = maxAlert >= 100 ? '#ff5d5d' : maxAlert >= 30 ? '#ffb347' : player.hidden ? '#39d98a' : '#dbe7f5';
  ctx.strokeStyle = ring;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 17, 0, Math.PI * 2);
  ctx.stroke();
  // Ninja thief: black outfit, headband with a red tie. Direction comes from
  // the last movement direction, so the sprite never snaps while idle.
  const d = spriteDir(player.dirX, player.dirY);
  drawSprite(ctx, SPRITES.ninja[d.variant], player.x, player.y, d.flip);
}

function drawShell(ctx, player) {
  if (!player.shell) return;
  ctx.fillStyle = '#e8e0d0';
  ctx.beginPath();
  ctx.arc(player.shell.x, player.shell.y, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawVignette(ctx) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.85);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}
