// The screenshot scenes behind ?shot=start|play|late|end. Each one plays the
// real rules forward from a fresh world with a fixed seed and a simple
// autopilot (spend gold on a sensible mix of towers, start each wave as soon
// as the last clears, upgrade when rich), so every frame is what real play
// looks like and the same seed always gives the same frame.

import { PLOTS, STEP, TOTAL_WAVES } from './config.js';
import { EVENT_LOSE, EVENT_WIN, PHASE_LOST, PHASE_WON } from './world.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

/** A fixed, sensible build order: plot index -> tower type. */
const BUILD_ORDER = [
  [1, 'arrow'], [5, 'arrow'], [2, 'cannon'], [6, 'frost'],
  [9, 'arrow'], [10, 'cannon'], [3, 'arrow'], [7, 'frost'],
  [13, 'arrow'], [14, 'cannon'], [4, 'frost'], [11, 'arrow'],
  [0, 'cannon'], [8, 'arrow'], [12, 'frost'], [15, 'arrow'],
];

const START_SECONDS = 4;

/** Spend available gold following the build order, upgrading when built out. */
function autopilotBuild(world) {
  const state = world.state;
  for (const [plot, type] of BUILD_ORDER) {
    if (!state.towers[plot]) {
      if (world.build(plot, type) === '') continue;
      return; // out of gold: stop here, keep the rest for later
    }
  }
  // Everything built: upgrade the cheapest tower we can afford.
  for (let i = 0; i < state.towers.length; i += 1) {
    if (state.towers[i] && world.upgrade(i) === '') return;
  }
}

function autopilotStep(world) {
  const state = world.state;
  if (!state.waveActive && state.phase !== PHASE_WON && state.phase !== PHASE_LOST) {
    autopilotBuild(world);
    world.startWave();
  }
  world.step(STEP);
}

/**
 * Set `world` to the named scene and return the screen to draw over it and
 * the best wave to show. Names: start (title over a live map), play (mid
 * wave), late (a late, heavy wave), end (victory or defeat).
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'late' && name !== 'end') {
    autopilotBuild(world);
    for (let i = 0; i < START_SECONDS / STEP; i += 1) world.step(STEP);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const targetWave = name === 'late' ? 8 : name === 'end' ? TOTAL_WAVES : 3;
  const maxSteps = 60 * 60 * 25; // at most 25 simulated minutes
  let events = 0;
  let lateClock = 0; // seconds spent inside the target late wave
  let lastWave = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    events = autopilotStep(world);
    if (events & EVENT_WIN) break;
    if (events & EVENT_LOSE) break;
    if (world.state.wave !== lastWave) {
      lastWave = world.state.wave;
      lateClock = 0;
    } else {
      lateClock += STEP;
    }
    if (name === 'play' && world.state.wave === targetWave && world.state.waveActive
      && world.state.enemies.length >= 5) break;
    // Late wave: capture it ten seconds in, while the road is full.
    if (name === 'late' && world.state.wave === targetWave && world.state.waveActive
      && lateClock >= 10 && world.state.enemies.length >= 2) break;
  }
  const state = world.state;
  if (state.phase === PHASE_WON) return { screen: SCREEN_WON, best: TOTAL_WAVES };
  if (state.phase === PHASE_LOST) return { screen: SCREEN_LOST, best: state.wave };
  return { screen: SCREEN_PLAY, best: Math.max(0, state.wave - 1) };
}
