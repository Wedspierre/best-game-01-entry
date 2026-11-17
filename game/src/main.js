// Ember Keep v2 — boot and the one loop: input is read every frame, the
// world advances in fixed 1/60 s steps (several per frame at 2x/3x
// speed), and the renderer paints what is there. The game moves between
// five screens: title, play, paused, victory and defeat.
//
// ?seed=N fixes the wave patterns. ?shot=start|play|late|end (with
// &seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP, SEED_DEFAULT, TOTAL_WAVES } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_LEAK, EVENT_WIN, EVENT_LOSE, EVENT_WAVE_START, EVENT_WAVE_CLEAR, EVENT_BOSS } from './world.js';
import {
  ACTION_START, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE, ACTION_SPEED,
  ACTION_UPGRADE, ACTION_SELL, ACTION_DESELECT, ACTION_WAVE, createInput,
} from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, hitTest } from './render.js';
import { stageShot, autopilotTick } from './shots.js';
import { createAudio } from './audio.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : SEED_DEFAULT;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, { x: -1, y: -1 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let demoStaged = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce(`Playing. ${world.state.lives} lives. Hold the keep through ${TOTAL_WAVES} waves.`);
  }

  function endGame(won) {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    if (won) audio.victory();
    else audio.defeat();
    announce(won ? `Victory. Score ${world.state.score}. Best ${best}.` : `The keep has fallen on wave ${world.state.wave}. Score ${world.state.score}.`);
  }

  function handleClick(click) {
    if (!click) return;
    audio.unlock();
    if (screen === SCREEN_TITLE) { startGame(); return; }
    if (screen === SCREEN_OVER) { startGame(); return; }
    if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; return; }
    const s = world.state;
    const hit = hitTest(click.x, click.y, s);
    if (hit) {
      if (hit.kind === 'card') {
        s.buildChoice = hit.type;
        if (s.selectedPlot >= 0) {
          const ev = world.buildTower(s.selectedPlot, hit.type);
          if (ev) audio.build();
          s.buildChoice = null;
        }
        return;
      }
      if (hit.kind === 'upgrade') {
        if (world.upgradeTower(s.selectedTower)) audio.upgrade();
        return;
      }
      if (hit.kind === 'sell') {
        if (world.sellTower(s.selectedTower)) audio.sell();
        return;
      }
      if (hit.kind === 'wave') {
        if (world.startWave()) audio.horn();
        return;
      }
      if (hit.kind === 'mute') { s.muted = audio.toggleMute(); return; }
      if (hit.kind === 'speed') { s.speed = s.speed >= 3 ? 1 : s.speed + 1; return; }
      if (hit.kind === 'pause') { screen = SCREEN_PAUSED; return; }
    }
    // Field click: a tower, a plot, or empty ground.
    const tower = world.towerAt(click.x, click.y);
    if (tower) {
      s.selectedTower = tower;
      s.selectedPlot = -1;
      s.buildChoice = null;
      return;
    }
    const plot = world.plotAt(click.x, click.y);
    if (plot >= 0) {
      s.selectedPlot = plot;
      s.selectedTower = null;
      if (s.buildChoice) {
        const ev = world.buildTower(plot, s.buildChoice);
        if (ev) audio.build();
        s.buildChoice = null;
        s.selectedPlot = -1;
      }
      return;
    }
    s.selectedPlot = -1;
    s.selectedTower = null;
    s.buildChoice = null;
  }

  function handleActions() {
    const actions = input.takeActions();
    const s = world.state;
    if (actions & ACTION_MUTE) s.muted = audio.toggleMute();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & (ACTION_START | ACTION_WAVE)) startGame();
      return;
    }
    if (actions & ACTION_RESTART) { startGame(); return; }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Playing.'); }
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_SPEED) s.speed = s.speed >= 3 ? 1 : s.speed + 1;
    if (actions & ACTION_WAVE) {
      if (world.startWave()) audio.horn();
    }
    if (actions & ACTION_UPGRADE) {
      if (world.upgradeTower(s.selectedTower)) audio.upgrade();
    }
    if (actions & ACTION_SELL) {
      if (world.sellTower(s.selectedTower)) audio.sell();
    }
    if (actions & ACTION_DESELECT) {
      s.selectedPlot = -1;
      s.selectedTower = null;
      s.buildChoice = null;
    }
    const key = input.takeTowerKey();
    if (key) {
      const type = world.towerOrder[key - 1];
      if (type) {
        s.buildChoice = type;
        if (s.selectedPlot >= 0) {
          const ev = world.buildTower(s.selectedPlot, type);
          if (ev) audio.build();
          s.buildChoice = null;
          s.selectedPlot = -1;
        }
      }
    }
  }

  function stepWorld() {
    const s = world.state;
    if (screen === SCREEN_TITLE) {
      // Attract mode: a demo battle plays behind the title.
      if (!demoStaged) {
        const demo = stageShot('start', world);
        void demo;
        demoStaged = true;
      }
      if (s.phase === 'won' || s.phase === 'lost') {
        world.reset();
        demoStaged = false;
        return;
      }
      autopilotTick(world);
      world.step(STEP);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(STEP);
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_LOSE) endGame(false);
    else if (events & EVENT_LEAK) audio.leak();
    else if (events & EVENT_BOSS) audio.boss();
    else if (events & EVENT_WAVE_START) audio.horn();
    else if (events & EVENT_WAVE_CLEAR) audio.coin();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleClick(input.takeClick());
    handleActions();
    const s = world.state;
    // Fixed steps, multiplied by the speed setting (1x/2x/3x).
    const repeats = screen === SCREEN_PLAY ? s.speed : 1;
    let steps = Math.floor(accumulator / STEP);
    accumulator -= steps * STEP;
    if (steps > 10) steps = 10;
    for (let i = 0; i < steps * repeats; i += 1) {
      stepWorld();
      if (screen !== SCREEN_PLAY && screen !== SCREEN_TITLE) break;
    }
    if (screen === SCREEN_PAUSED) accumulator = 0;
    renderer.draw(world.state, screen, best, input.hover());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Keep. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
