// EMBERLIGHT — sound: everything is synthesized with WebAudio, no files.
// Footsteps, alert stings, pickups and the win fanfare are short oscillator
// and noise envelopes. The context is created on the first user gesture, so
// the game stays silent (and error-free) until the player interacts.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

// Lazily create the context; call from any keydown / pointerdown handler.
export function ensureAudio() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    } catch (e) {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

function tone(freq, dur, type, gain, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  amp.gain.setValueAtTime(0, t0);
  amp.gain.linearRampToValueAtTime(gain, t0 + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, gain, lowpass) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const amp = ctx.createGain();
  amp.gain.value = gain;
  src.connect(filter);
  filter.connect(amp);
  amp.connect(ctx.destination);
  src.start(t0);
}

// A soft footstep tick; pitch varies a little so steps do not sound identical.
export function playStep(sneaking) {
  noiseBurst(0.05, sneaking ? 0.03 : 0.07, sneaking ? 500 : 900);
}

// Two rising notes: a guard growing suspicious.
export function playSuspicious() {
  tone(392, 0.12, 'sine', 0.12);
  tone(523, 0.16, 'sine', 0.12, 0.11);
}

// A sharp sting when the alarm goes off.
export function playAlarm() {
  tone(660, 0.14, 'square', 0.08);
  tone(880, 0.14, 'square', 0.08, 0.12);
  tone(660, 0.2, 'square', 0.08, 0.24);
}

// A bright arpeggio for loot and treasure.
export function playPickup() {
  tone(523, 0.1, 'triangle', 0.14);
  tone(659, 0.1, 'triangle', 0.14, 0.08);
  tone(784, 0.18, 'triangle', 0.14, 0.16);
}

// A low descending note for being caught.
export function playCaught() {
  tone(330, 0.35, 'sawtooth', 0.1, 0, 110);
}

// The level-clear fanfare.
export function playWin() {
  tone(523, 0.12, 'triangle', 0.14);
  tone(659, 0.12, 'triangle', 0.14, 0.1);
  tone(784, 0.12, 'triangle', 0.14, 0.2);
  tone(1047, 0.3, 'triangle', 0.16, 0.3);
}

// A soft pop for a thrown shell landing.
export function playShell() {
  noiseBurst(0.09, 0.1, 1400);
  tone(180, 0.1, 'sine', 0.1, 0, 90);
}

// A breathy hush for the smoke gadget.
export function playSmoke() {
  noiseBurst(0.4, 0.08, 600);
}
