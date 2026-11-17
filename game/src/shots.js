// Screenshot scenes behind ?shot=start|play|late|end, and the autopilot
// that plays them. Every scene runs the real rules forward from a fresh
// world for a fixed number of steps, so each frame is what a short game
// really looks like — and the same seed always gives the same frame.
import { STEP, TOWERS, TOTAL_WAVES } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

// The build order the autopilot follows: a balanced opening, then the
// expensive towers, then upgrades round-robin.
const BUILD_ORDER = [
  [0, 'arrow'], [1, 'cannon'], [2, 'frost'], [4, 'arrow'], [5, 'storm'],
  [3, 'thorn'], [6, 'cannon'], [7, 'lens'], [8, 'mortar'], [9, 'arrow'],
  [10, 'frost'], [11, 'storm'],
];

function cheapestUpgrade(world, level) {
  const s = world.state;
  let best = null;
  for (const t of s.towers) {
    if (t.level !== level) continue;
    const cost = TOWERS[t.type].up[t.level - 1].cost;
    if (s.gold >= cost && (!best || cost < best.cost)) best = { tower: t, cost };
  }
  return best;
}

// One build-phase decision: open with five towers, bring them all to
// level 2, fill the remaining plots, then push everything to level 3 —
// or send the wave when nothing affordable is left.
export function autopilotTick(world) {
  const s = world.state;
  if (s.phase !== 'build') return;
  const built = BUILD_ORDER.filter(([plot]) => s.towers.some((t) => t.plot === plot)).length;
  if (built < 5) {
    for (const [plot, type] of BUILD_ORDER.slice(0, 5)) {
      if (s.towers.some((t) => t.plot === plot)) continue;
      if (s.gold >= TOWERS[type].cost) {
        world.buildTower(plot, type);
        return;
      }
    }
    world.startWave();
    return;
  }
  const up1 = cheapestUpgrade(world, 1);
  if (up1) {
    world.upgradeTower(up1.tower);
    return;
  }
  if (built < BUILD_ORDER.length) {
    for (const [plot, type] of BUILD_ORDER.slice(5)) {
      if (s.towers.some((t) => t.plot === plot)) continue;
      if (s.gold >= TOWERS[type].cost) {
        world.buildTower(plot, type);
        return;
      }
    }
  }
  const up2 = cheapestUpgrade(world, 2);
  if (up2) {
    world.upgradeTower(up2.tower);
    return;
  }
  world.startWave();
}

// Step the world for `seconds` of game time, letting the autopilot build
// between waves. Returns the events of the last step.
export function simulate(world, seconds) {
  const steps = Math.round(seconds / STEP);
  let events = 0;
  for (let i = 0; i < steps; i += 1) {
    autopilotTick(world);
    events = world.step(STEP);
    if (world.state.phase === 'won' || world.state.phase === 'lost') break;
  }
  return events;
}

// Step until `pred` is true or `maxSeconds` pass. Lets a shot catch
// the wave at its busiest instead of at a fixed clock time.
export function simulateUntil(world, pred, maxSeconds) {
  const steps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilotTick(world);
    world.step(STEP);
    if (world.state.phase === 'won' || world.state.phase === 'lost') break;
    if (pred(world.state)) break;
  }
}

// A demo game for the title screen: towers up, wave 1 marching.
function stageDemo(world) {
  world.reset();
  world.state.gold = 900;
  for (let i = 0; i < 5; i += 1) autopilotTick(world);
  world.startWave();
  simulate(world, 5);
}

export function stageShot(name, world) {
  if (name === 'start') {
    stageDemo(world);
    return { screen: SCREEN_TITLE, best: 1250 };
  }
  world.reset();
  world.state.gold = 900;
  if (name === 'play') {
    // Catch wave 4 at its busiest: the road full of beasts.
    simulateUntil(world, (s) => s.phase === 'fighting' && s.wave === 4 && s.enemies.length >= 4, 150);
    const over = world.state.phase === 'won' || world.state.phase === 'lost';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'late') {
    // Catch the wave-10 boss assault: the Ember Golem on the road.
    simulateUntil(world, (s) => s.phase === 'fighting' && s.wave === 10 && s.enemies.some((e) => e.boss) && s.enemies.length >= 4, 300);
    const over = world.state.phase === 'won' || world.state.phase === 'lost';
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // Play to the finish: victory after wave 15, or defeat.
    simulate(world, 900);
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  stageDemo(world);
  return { screen: SCREEN_TITLE, best: 1250 };
}
