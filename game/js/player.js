// EMBERLIGHT — the player: a thief in a hooded cloak.
// Walk, sneak (slow, quiet, hides in bushes) or sprint (fast, loud). Three
// gadgets, each with a small stock per level: a shell to throw at a point and
// pull guards to the noise, smoke that blinds every cone around the player,
// and a douse that puts out the nearest lit lamp. The player is hidden while
// sneaking inside a bush or fog bank, or inside a smoke cloud.

import { TILE, tileAt, isSolid, T } from './levels.js';

const RADIUS = 11;
const WALK_SPEED = 145;
const SNEAK_SPEED = 82;
const SPRINT_SPEED = 215;
const SHELL_RANGE = 320;
const SHELL_SPEED = 520;
const DOUSE_RANGE = 95;
const SMOKE_RADIUS = 72;
const SMOKE_TIME = 6;

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.dirX = 0;
    this.dirY = 1; // faces down at the start
    this.sneaking = false;
    this.sprinting = false;
    this.moving = false;
    this.hidden = false;
    this.lit = false;
    this.stepTimer = 0;
    this.shells = 3;
    this.smoke = 2;
    this.douses = 2;
    this.shell = null; // a shell in flight: {x, y, tx, ty}
    this.smokes = []; // {x, y, t} clouds on the floor
  }

  reset(start) {
    this.x = start.x;
    this.y = start.y;
    this.dirX = 0;
    this.dirY = 1;
    this.sneaking = false;
    this.sprinting = false;
    this.moving = false;
    this.hidden = false;
    this.lit = false;
    this.shells = 3;
    this.smoke = 2;
    this.douses = 2;
    this.shell = null;
    this.smokes = [];
  }

  update(dt, input, level, world) {
    // --- Stance from the keys.
    this.sneaking = !!input.sneak;
    this.sprinting = !!input.sprint && !this.sneaking;

    // --- Movement: one axis at a time, so the player slides along walls.
    let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.moving = mx !== 0 || my !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.dirX = mx;
      this.dirY = my;
    }
    const tile = tileAt(level, this.x, this.y);
    let speed = this.sneaking ? SNEAK_SPEED : this.sprinting ? SPRINT_SPEED : WALK_SPEED;
    if (tile === T.WATER) speed *= 0.8;
    if (tile === T.FOG) speed *= 0.85;
    this.moveAxis(level, mx * speed * dt, 0);
    this.moveAxis(level, 0, my * speed * dt);

    // --- Footsteps: sprinting is loud enough for nearby guards to hear.
    if (this.moving) {
      this.stepTimer -= dt;
      const interval = this.sneaking ? 0.55 : this.sprinting ? 0.26 : 0.38;
      if (this.stepTimer <= 0) {
        this.stepTimer = interval;
        world.onStep(this.sprinting);
      }
    }

    // --- Hidden: sneaking in a bush or fog bank, or inside a smoke cloud.
    const onTile = tileAt(level, this.x, this.y);
    const inSmoke = this.smokes.some((s) => Math.hypot(this.x - s.x, this.y - s.y) < SMOKE_RADIUS);
    this.hidden = inSmoke || ((onTile === T.BUSH || onTile === T.FOG) && this.sneaking);

    // --- Lit: standing in a lit lamp's pool, or caught in the beam.
    this.lit = level.lamps.some((lamp) => lamp.lit && Math.hypot(this.x - (lamp.tx + 0.5) * TILE, this.y - (lamp.ty + 0.5) * TILE) < 92)
      || world.beamInPlayer();

    // --- Shell in flight.
    if (this.shell) {
      const s = this.shell;
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      const dist = Math.hypot(dx, dy);
      const step = SHELL_SPEED * dt;
      if (dist <= step) {
        this.shell = null;
        world.onShellLanded(s.tx, s.ty);
      } else {
        s.x += (dx / dist) * step;
        s.y += (dy / dist) * step;
      }
    }

    // --- Smoke clouds fade.
    for (const s of this.smokes) s.t -= dt;
    this.smokes = this.smokes.filter((s) => s.t > 0);
  }

  // Move along one axis, stopping at solid tiles (circle vs tile collision).
  moveAxis(level, dx, dy) {
    if (dx === 0 && dy === 0) return;
    const nx = this.x + dx;
    const ny = this.y + dy;
    const points = [
      [nx - RADIUS, ny - RADIUS], [nx + RADIUS, ny - RADIUS],
      [nx - RADIUS, ny + RADIUS], [nx + RADIUS, ny + RADIUS],
      [nx, ny - RADIUS], [nx, ny + RADIUS],
      [nx - RADIUS, ny], [nx + RADIUS, ny],
    ];
    for (const [px, py] of points) {
      if (isSolid(tileAt(level, px, py))) return;
    }
    this.x = nx;
    this.y = ny;
  }

  // Throw a shell toward a point (clamped to range). Returns false with no stock.
  throwShell(tx, ty, world) {
    if (this.shells <= 0 || this.shell) return false;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const cl = Math.min(dist, SHELL_RANGE);
    const ux = dist > 0 ? dx / dist : 0;
    const uy = dist > 0 ? dy / dist : 1;
    this.shells -= 1;
    this.shell = { x: this.x, y: this.y, tx: this.x + ux * cl, ty: this.y + uy * cl };
    world.onShellThrown();
    return true;
  }

  // Drop a smoke cloud at the player's feet.
  dropSmoke(world) {
    if (this.smoke <= 0) return false;
    this.smoke -= 1;
    this.smokes.push({ x: this.x, y: this.y, t: SMOKE_TIME });
    world.onSmoke();
    return true;
  }

  // Put out the nearest lit lamp in range. Returns false with no stock or no lamp.
  douse(level, world) {
    if (this.douses <= 0) return false;
    let best = null;
    let bestDist = DOUSE_RANGE;
    for (const lamp of level.lamps) {
      if (!lamp.lit) continue;
      const d = Math.hypot(this.x - (lamp.tx + 0.5) * TILE, this.y - (lamp.ty + 0.5) * TILE);
      if (d < bestDist) {
        best = lamp;
        bestDist = d;
      }
    }
    if (!best) return false;
    best.lit = false;
    this.douses -= 1;
    world.onDouse();
    return true;
  }
}
