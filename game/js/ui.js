// EMBERLIGHT — HUD and screens: the DOM around the canvas.
// Top bar: level, objective, timer, score, loot, strikes, ghost bonus.
// Right panel: DETECTION, ALARM, VISIBILITY, NOISE, LOOT, SPOTTED, GOAL,
// LEGEND, CONTROLS and FIELD NOTES — the same panels the winning entries
// show, so the game reads at a glance in a screenshot.

function $(id) {
  return document.getElementById(id);
}

const els = {};

export function initUI() {
  for (const id of [
    'level-name', 'objective', 'timer', 'score', 'loot', 'strikes', 'ghost',
    'detection', 'detection-bar', 'alarm', 'alarm-bar', 'visibility', 'noise',
    'loot-panel', 'spotted', 'goal', 'field-notes',
  ]) {
    els[id] = $(id);
  }
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function detectionLabel(suspicion) {
  if (suspicion >= 100) return 'SPOTTED';
  if (suspicion >= 70) return 'SEARCHING';
  if (suspicion >= 30) return 'SUSPICIOUS';
  return 'HIDDEN';
}

// Refresh every HUD value from the live game state. Called every frame.
export function updateHUD(game) {
  const level = game.level;
  els['level-name'].textContent = `${level.def.name} — ${level.def.subtitle}`;
  els['objective'].textContent = level.treasure.taken
    ? `Reach the ${level.exit.name} unseen`
    : `Steal the ${level.treasure.name}`;
  els['timer'].textContent = fmtTime(game.elapsed);
  els['score'].textContent = String(game.score);
  els['loot'].textContent = `${game.loot} / ${level.coins.length + 1}`;
  els['loot-panel'].textContent = String(game.loot);
  els['strikes'].textContent = '✕'.repeat(game.strikes) + '·'.repeat(Math.max(0, 3 - game.strikes));
  els['ghost'].textContent = game.ghostPossible ? 'GHOST +500' : 'ghost lost';

  const label = detectionLabel(game.suspicion);
  els['detection'].textContent = label;
  els['detection'].className = `value ${label.toLowerCase()}`;
  els['detection-bar'].style.width = `${Math.round(game.suspicion)}%`;
  els['detection-bar'].className = `bar-fill ${label.toLowerCase()}`;

  const alarm = Math.max(...game.guards.map((g) => g.alert), ...game.cameras.map((c) => c.alert), 0);
  els['alarm'].textContent = `${Math.round(alarm)}%`;
  els['alarm-bar'].style.width = `${Math.round(alarm)}%`;

  els['visibility'].textContent = `${Math.round(game.visibility)}%`;
  els['noise'].textContent = game.noiseLevel > 0.4 ? 'LOUD' : game.noiseLevel > 0.05 ? 'SOFT' : 'QUIET';
  els['noise'].className = `value ${game.noiseLevel > 0.4 ? 'loud' : ''}`;
  els['spotted'].textContent = String(game.spottedCount);
  els['goal'].textContent = level.treasure.taken
    ? `Exit open: ${level.exit.name}`
    : `Steal the ${level.treasure.name}, then reach the ${level.exit.name}`;
}

// The level's field notes: the in-game tips the top entries annotate with.
export function setFieldNotes(lines) {
  els['field-notes'].innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
}

// Show one overlay screen, hide the rest. Screens: title, pause, level,
// over (game over), win. Pass null to hide all overlays.
export function showScreen(name) {
  for (const screen of ['title', 'pause', 'level', 'over', 'win']) {
    const el = $(`screen-${screen}`);
    if (el) el.classList.toggle('hidden', screen !== name);
  }
}

export function setLevelScreen(title, lines) {
  $('level-title').textContent = title;
  $('level-detail').innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
}

export function setOverScreen(lines) {
  $('over-detail').innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
}

export function setWinScreen(lines) {
  $('win-detail').innerHTML = lines.map((line) => `<p>${line}</p>`).join('');
}
