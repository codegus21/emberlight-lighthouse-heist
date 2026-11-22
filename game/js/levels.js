// EMBERLIGHT — level data: three heists in one lighthouse.
// Levels are built from placements (walls, crates, bushes, fog, lamps, guards,
// cameras, coins, treasure, exit) instead of ASCII maps, so every tile is
// exactly where the design means it to be. Grid is 30 x 20, tile = 32 px.

export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;

// Tile codes. Walls and crates block movement and sight; bushes and fog hide
// a sneaking player; lamps light a danger pool (douseable); water is walkable
// shore, drawn differently, and slows the player a touch.
export const T = { FLOOR: 0, WALL: 1, CRATE: 2, BUSH: 3, FOG: 4, LAMP: 5, WATER: 6 };

function blankGrid() {
  const tiles = [];
  for (let y = 0; y < ROWS; y++) {
    tiles.push(new Array(COLS).fill(T.FLOOR));
  }
  return tiles;
}

function border(tiles) {
  for (let x = 0; x < COLS; x++) {
    tiles[0][x] = T.WALL;
    tiles[ROWS - 1][x] = T.WALL;
  }
  for (let y = 0; y < ROWS; y++) {
    tiles[y][0] = T.WALL;
    tiles[y][COLS - 1] = T.WALL;
  }
}

function rect(tiles, x, y, w, h, code) {
  for (let j = y; j < y + h; j++) {
    for (let i = x; i < x + w; i++) {
      if (i > 0 && i < COLS - 1 && j > 0 && j < ROWS - 1) tiles[j][i] = code;
    }
  }
}

function wallRect(tiles, x, y, w, h) {
  rect(tiles, x, y, w, h, T.WALL);
}

// A wall segment with a gap (a doorway) at gapX/gapY along its length.
function wallH(tiles, x, y, len, gapAt = -1) {
  for (let i = x; i < x + len; i++) {
    if (i !== gapAt) tiles[y][i] = T.WALL;
  }
}
function wallV(tiles, x, y, len, gapAt = -1) {
  for (let j = y; j < y + len; j++) {
    if (j !== gapAt) tiles[j][x] = T.WALL;
  }
}

function put(tiles, list, code) {
  for (const [x, y] of list) tiles[y][x] = code;
}

// Patrol routes are tile coordinates; guards walk them in order, pausing at
// each corner. Speeds are px per second.
export const LEVELS = [
  {
    name: 'The Shore',
    subtitle: 'Heist 1 of 3 — steal the Brass Key',
    par: 90,
    treasure: { tx: 23, ty: 4, name: 'Brass Key' },
    exit: { tx: 28, ty: 10, name: 'Cliff Path' },
    player: { tx: 3, ty: 10 },
    beam: { tx: 27, ty: 1, angle: Math.PI * 0.75, speed: 0.22, range: 430 },
    notes: [
      'FIELD NOTES — the lighthouse beam sweeps the whole shore. Cross it only when it points away.',
      'Fog banks hide you even standing. Bushes hide you only while you sneak (SHIFT).',
      'Lit lamps make you easy to spot. Douse one with R when no keeper is watching.',
    ],
    build(tiles) {
      border(tiles);
      // Keeper's hut, top right, door gap at the bottom wall.
      wallRect(tiles, 20, 2, 8, 1);
      wallRect(tiles, 20, 7, 8, 1);
      wallV(tiles, 20, 2, 6);
      wallV(tiles, 27, 2, 6);
      tiles[7][23] = T.FLOOR; // hut door
      // Shore water along the bottom.
      rect(tiles, 1, 18, 28, 1, T.WATER);
      put(tiles, [[8, 6], [9, 6], [8, 7], [14, 13], [15, 13]], T.CRATE);
      put(tiles, [[4, 4], [5, 4], [4, 5], [12, 16], [13, 16]], T.BUSH);
      rect(tiles, 3, 15, 3, 2, T.FOG);
      rect(tiles, 24, 14, 3, 2, T.FOG);
      put(tiles, [[19, 3], [10, 14]], T.LAMP);
      return {
        guards: [
          { name: 'Keeper Bram', tx: 16, ty: 4, patrol: [[16, 4], [16, 10], [24, 10]], speed: 55 },
        ],
        cameras: [{ tx: 23, ty: 8, dir: Math.PI / 2, sweep: 0.6, speed: 0.5 }],
        coins: [[6, 10], [26, 3], [17, 16]],
      };
    },
  },
  {
    name: 'The Stairwell',
    subtitle: 'Heist 2 of 3 — steal the Lens Crystal',
    par: 120,
    treasure: { tx: 15, ty: 10, name: 'Lens Crystal' },
    exit: { tx: 28, ty: 2, name: 'Lamp Room Door' },
    player: { tx: 2, ty: 17 },
    beam: { tx: 15, ty: 1, angle: Math.PI * 0.6, speed: 0.3, range: 390 },
    notes: [
      'FIELD NOTES — the stairwell is a maze of half-walls. Crates block sight: use them as moving cover.',
      'Cameras sweep on a fixed rhythm. Watch the teal cone, cross behind it.',
      'A thrown shell (click) pulls a keeper to the noise. Spend it to clear a corridor.',
    ],
    build(tiles) {
      border(tiles);
      // Interior half-walls with door gaps, forming the stairwell route.
      wallV(tiles, 10, 2, 11, 8);
      wallV(tiles, 19, 7, 11, 12);
      wallH(tiles, 12, 5, 7, 15);
      wallH(tiles, 5, 14, 8, 9);
      put(tiles, [[12, 8], [13, 8], [12, 9], [22, 16], [23, 16], [6, 17]], T.CRATE);
      put(tiles, [[3, 3], [28, 17], [28, 3]], T.BUSH);
      rect(tiles, 2, 16, 3, 2, T.FOG);
      rect(tiles, 25, 2, 3, 2, T.FOG);
      put(tiles, [[5, 9], [15, 3], [24, 10]], T.LAMP);
      return {
        guards: [
          { name: 'Warden Odo', tx: 4, ty: 4, patrol: [[4, 4], [4, 12], [8, 12], [8, 4]], speed: 55 },
          { name: 'Keeper Mara', tx: 22, ty: 4, patrol: [[22, 4], [26, 4], [26, 14], [22, 14]], speed: 60 },
        ],
        cameras: [
          { tx: 10, ty: 5, dir: 0, sweep: 0.7, speed: 0.6 },
          { tx: 19, ty: 12, dir: Math.PI, sweep: 0.7, speed: 0.6 },
        ],
        coins: [[16, 11], [27, 8], [4, 12]],
      };
    },
  },
  {
    name: 'The Lamp Room',
    subtitle: 'Heist 3 of 3 — steal the Emberlight Gem',
    par: 150,
    treasure: { tx: 14, ty: 7, name: 'Emberlight Gem' },
    exit: { tx: 4, ty: 2, name: 'Balcony' },
    player: { tx: 15, ty: 17 },
    beam: { tx: 14.5, ty: 9.5, angle: 0, speed: 0.45, range: 470 },
    notes: [
      'FIELD NOTES — the lamp itself is the threat now: its beam is the widest cone on the map.',
      'Three keepers, three cameras, four lamps. Douse lamps to carve a dark road to the gem.',
      'Finish unseen for the +500 ghost bonus. The beam never sleeps — time your crossing.',
    ],
    build(tiles) {
      border(tiles);
      // Cut the room's corners to feel round.
      wallRect(tiles, 1, 1, 3, 3);
      wallRect(tiles, 26, 1, 3, 3);
      wallRect(tiles, 1, 16, 3, 3);
      wallRect(tiles, 26, 16, 3, 3);
      // The lamp housing at the centre.
      wallRect(tiles, 14, 9, 2, 2);
      put(tiles, [[8, 13], [9, 13], [21, 6], [22, 6]], T.CRATE);
      put(tiles, [[4, 9], [25, 9]], T.BUSH);
      rect(tiles, 12, 16, 6, 2, T.FOG);
      put(tiles, [[5, 5], [24, 5], [5, 15], [24, 15]], T.LAMP);
      return {
        guards: [
          { name: 'Keeper Bram', tx: 6, ty: 4, patrol: [[6, 4], [12, 4], [12, 9], [6, 9]], speed: 60 },
          { name: 'Warden Odo', tx: 18, ty: 11, patrol: [[18, 11], [24, 11], [24, 16], [18, 16]], speed: 60 },
          { name: 'Keeper Mara', tx: 24, ty: 4, patrol: [[24, 4], [24, 9], [18, 9], [18, 4]], speed: 65 },
        ],
        cameras: [
          { tx: 2, ty: 10, dir: 0, sweep: 0.8, speed: 0.7 },
          { tx: 27, ty: 10, dir: Math.PI, sweep: 0.8, speed: 0.7 },
          { tx: 15, ty: 18, dir: -Math.PI / 2, sweep: 0.6, speed: 0.6 },
        ],
        coins: [[7, 7], [22, 12], [15, 4]],
      };
    },
  },
];

// Turn a level definition into a playable level: tiles, lamps, guards,
// cameras, coins, treasure, exit, player start and beam, all in pixels.
export function buildLevel(index) {
  const def = LEVELS[index];
  const tiles = blankGrid();
  const extra = def.build(tiles);
  const lamps = [];
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (tiles[y][x] === T.LAMP) lamps.push({ tx: x, ty: y, lit: true });
    }
  }
  const px = (tx) => (tx + 0.5) * TILE;
  return {
    def,
    tiles,
    lamps,
    guards: extra.guards.map((g) => ({
      ...g,
      x: px(g.tx),
      y: px(g.ty),
      patrol: g.patrol.map(([x, y]) => ({ x: px(x), y: px(y) })),
    })),
    cameras: extra.cameras.map((c) => ({ ...c, x: px(c.tx), y: px(c.ty) })),
    coins: extra.coins.map(([x, y]) => ({ x: px(x), y: px(y), taken: false })),
    treasure: { x: px(def.treasure.tx), y: px(def.treasure.ty), name: def.treasure.name, taken: false },
    exit: { x: px(def.exit.tx), y: px(def.exit.ty), name: def.exit.name, open: false },
    playerStart: { x: px(def.player.tx), y: px(def.player.ty) },
    beam: { x: px(def.beam.tx), y: px(def.beam.ty), angle: def.beam.angle, speed: def.beam.speed, range: def.beam.range },
  };
}

// True when a tile blocks movement and sight.
export function isSolid(tile) {
  return tile === T.WALL || tile === T.CRATE;
}

// Tile code at pixel coordinates (outside the map counts as a wall).
export function tileAt(level, x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return T.WALL;
  return level.tiles[ty][tx];
}
