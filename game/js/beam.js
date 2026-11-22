// EMBERLIGHT — the lighthouse beam: one giant vision cone that never sleeps.
// It rotates around its lamp housing, sweeping the map. A player caught inside
// it, with a clear line of sight, is exposed fast — the beam is the fastest
// detector in the game, so crossings must be timed between sweeps.

import { tileAt, isSolid, TILE } from './levels.js';

// The beam's half-angle (radians) and how sharply it exposes the player.
const HALF_ANGLE = 0.21;
const EXPOSURE = 1.6;

export class Beam {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.angle = def.angle;
    this.speed = def.speed;
    this.range = def.range;
  }

  update(dt) {
    this.angle += this.speed * dt;
  }

  // True when a point is inside the wedge and the beam can see it.
  covers(level, x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > this.range) return false;
    if (dist < TILE * 0.5) return true; // standing on the lamp itself
    let diff = Math.atan2(dy, dx) - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > HALF_ANGLE) return false;
    return hasLineOfSight(level, this.x, this.y, x, y);
  }

  exposure() {
    return EXPOSURE;
  }
}

// Bresenham line of sight over tiles: walls and crates block the view.
// Steps in small increments so thin walls are never skipped.
export function hasLineOfSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE * 0.25)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolid(tileAt(level, x0 + dx * t, y0 + dy * t))) return false;
  }
  return true;
}

// True when a point lies inside a cone (origin, facing, half-angle, range)
// with a clear line of sight. Guards and cameras share this test.
export function inCone(level, ox, oy, facing, halfAngle, range, x, y) {
  const dx = x - ox;
  const dy = y - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 6) return true;
  let diff = Math.atan2(dy, dx) - facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  return hasLineOfSight(level, ox, oy, x, y);
}
