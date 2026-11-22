// EMBERLIGHT — cameras: fixed sentries that sweep a teal cone back and forth
// on a steady rhythm. A camera that reaches full alertness sounds the alarm
// and sends every guard to the player's last seen position. Cameras never
// move; the player beats them by timing the sweep.

import { inCone } from './beam.js';

const CONE_HALF = 0.44; // ~50 degrees of vision
const CONE_RANGE = 205;
const RISE_RATE = 70;
const FALL_RATE = 26;

export class Camera {
  constructor(def) {
    this.x = def.x;
    this.y = def.y;
    this.baseDir = def.dir;
    this.sweep = def.sweep; // half-amplitude of the sweep, radians
    this.speed = def.speed; // sweep speed
    this.phase = Math.random() * Math.PI * 2;
    this.facing = def.dir;
    this.alert = 0;
    this.alarmed = false;
  }

  update(dt, level, player, world) {
    this.phase += this.speed * dt;
    this.facing = this.baseDir + Math.sin(this.phase) * this.sweep;

    const seen = this.canSee(level, player);
    if (seen) {
      this.alert = Math.min(100, this.alert + RISE_RATE * this.exposureOf(player) * dt);
    } else {
      this.alert = Math.max(0, this.alert - FALL_RATE * dt);
    }

    if (this.alert >= 100 && !this.alarmed) {
      this.alarmed = true;
      world.onCameraAlarm(this);
    } else if (this.alert < 40) {
      this.alarmed = false;
    }
  }

  canSee(level, player) {
    if (player.hidden) return false;
    return inCone(level, this.x, this.y, this.facing, CONE_HALF, CONE_RANGE, player.x, player.y);
  }

  exposureOf(player) {
    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    let rate = 1.2 - dist / (CONE_RANGE * 1.7);
    if (player.sneaking) rate *= 0.6;
    if (player.sprinting) rate *= 1.4;
    if (player.lit) rate *= 1.5;
    else rate *= 0.7;
    return Math.max(0.15, rate);
  }
}
