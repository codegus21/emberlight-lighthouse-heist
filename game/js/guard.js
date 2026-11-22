// EMBERLIGHT — guards: keepers who walk a patrol, watch a vision cone, and
// react in stages. Alertness runs 0..100 per guard:
//   < 30  PATROL    — walks the route, pauses at each corner
//   30-70 SUSPICIOUS — stops, faces the player, "?" overhead
//   70-99 SEARCHING — walks to the last place the player was seen, "?"
//   100 SPOTTED     — the alarm: chases the player, "!"
// A guard that touches the player catches them. Noise (a sprinting step, a
// thrown shell) sends the nearest guards to investigate the sound instead.

import { TILE, tileAt, isSolid } from './levels.js';
import { inCone } from './beam.js';

const CONE_HALF = 0.61; // ~70 degrees of vision
const CONE_RANGE = 175;
const PAUSE_AT_CORNER = 1.0;

// How fast alertness rises or falls per second, before multipliers.
const RISE_RATE = 55;
const FALL_RATE = 22;

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.x = def.x;
    this.y = def.y;
    this.patrol = def.patrol;
    this.speed = def.speed;
    this.wpIndex = 1;
    this.wpDir = 1; // ping-pong: 1 forward, -1 back
    this.pause = 0;
    this.facing = 0;
    this.alert = 0;
    this.state = 'patrol';
    this.lastSeen = null; // {x, y} of the player, when last clearly seen
    this.investigate = null; // {x, y} noise point under investigation
    this.lookTimer = 0;
    this.wasSpotted = false;
  }

  // Move toward a point at a speed; returns true when arrived. Axis-separated
  // with wall collision, so a chasing keeper slides along walls instead of
  // clipping through them (patrol legs are axis-aligned and clear by design).
  stepToward(tx, ty, speed, dt, level) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 4) return true;
    const step = Math.min(dist, speed * dt);
    const mx = (dx / dist) * step;
    const my = (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    if (this.freeAt(level, this.x + mx, this.y)) this.x += mx;
    if (this.freeAt(level, this.x, this.y + my)) this.y += my;
    return step >= dist;
  }

  // True when a 10px-radius circle at (x, y) touches no solid tile.
  freeAt(level, x, y) {
    const r = 10;
    const points = [
      [x - r, y - r], [x + r, y - r],
      [x - r, y + r], [x + r, y + r],
      [x, y - r], [x, y + r],
      [x - r, y], [x + r, y],
    ];
    for (const [px, py] of points) {
      if (isSolid(tileAt(level, px, py))) return false;
    }
    return true;
  }

  update(dt, level, player, world) {
    const prevState = this.state;

    // --- Seeing: does this guard's cone hold the player right now?
    const seen = this.canSee(level, player);
    const exposure = this.exposureOf(player, seen);
    if (seen) {
      this.alert = Math.min(100, this.alert + RISE_RATE * exposure * dt);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.alert = Math.max(0, this.alert - FALL_RATE * dt);
    }

    // --- State from alertness.
    if (this.alert >= 100) this.state = 'spotted';
    else if (this.alert >= 70) this.state = 'searching';
    else if (this.alert >= 30) this.state = 'suspicious';
    else this.state = 'patrol';

    if (this.state === 'spotted' && prevState !== 'spotted') {
      world.onSpotted(this);
    }

    // --- Behaviour per state.
    if (this.state === 'patrol') {
      if (this.investigate) {
        // Walk to the noise, look around, then go back to the route.
        const arrived = this.stepToward(this.investigate.x, this.investigate.y, this.speed * 1.3, dt, level);
        if (arrived) {
          this.lookTimer += dt;
          this.facing += dt * 1.5;
          if (this.lookTimer > 2.2) {
            this.investigate = null;
            this.lookTimer = 0;
          }
        }
        return;
      }
      if (this.pause > 0) {
        this.pause -= dt;
        return;
      }
      const wp = this.patrol[this.wpIndex];
      if (this.stepToward(wp.x, wp.y, this.speed, dt, level)) {
        this.pause = PAUSE_AT_CORNER;
        this.wpIndex += this.wpDir;
        if (this.wpIndex >= this.patrol.length) {
          this.wpIndex = this.patrol.length - 2;
          this.wpDir = -1;
        } else if (this.wpIndex < 0) {
          this.wpIndex = 1;
          this.wpDir = 1;
        }
      }
    } else if (this.state === 'suspicious') {
      // Freeze and stare at the player; the cone follows them.
      if (this.lastSeen) this.facing = Math.atan2(this.lastSeen.y - this.y, this.lastSeen.x - this.x);
    } else if (this.state === 'searching') {
      if (this.lastSeen) {
        this.stepToward(this.lastSeen.x, this.lastSeen.y, this.speed * 1.5, dt, level);
      }
    } else {
      // Spotted: run the player down.
      this.stepToward(player.x, player.y, this.speed * 1.9, dt, level);
    }
  }

  // Can this guard see the player at all (cone + line of sight + not hidden)?
  canSee(level, player) {
    if (player.hidden) return false;
    return inCone(level, this.x, this.y, this.facing, CONE_HALF, CONE_RANGE, player.x, player.y);
  }

  // How fast the guard's alertness rises while the player is in view:
  // closer, lit and sprinting players are spotted faster; sneaking in the
  // dark is slow to notice.
  exposureOf(player, seen) {
    if (!seen) return 0;
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    let rate = 1.15 - dist / (CONE_RANGE * 1.6);
    if (player.sneaking) rate *= 0.55;
    if (player.sprinting) rate *= 1.5;
    if (player.lit) rate *= 1.6;
    else rate *= 0.65;
    return Math.max(0.15, rate);
  }

  // A noise point: walk over and look. Only the closest guards answer.
  hear(x, y) {
    if (this.state === 'spotted') return;
    if (!this.investigate) {
      this.investigate = { x, y };
      this.lookTimer = 0;
    }
  }
}
