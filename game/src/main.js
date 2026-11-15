// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, won and lost.
//
// ?seed=N fixes the wave shuffles. ?shot=start|play|late|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_BOOM, EVENT_FROST, EVENT_KILL, EVENT_LEAK, EVENT_LOSE, EVENT_SHOOT, EVENT_WAVE_DONE, EVENT_WIN, PHASE_LOST, PHASE_WON } from './world.js';
import {
  ACTION_CONFIRM, ACTION_DESELECT, ACTION_MUTE, ACTION_PAUSE,
  ACTION_RESTART, ACTION_SELL, ACTION_UPGRADE, createInput,
} from './input.js';
import { clickAction } from './hud.js';
import {
  createRenderer, SCREEN_LOST, SCREEN_PAUSED, SCREEN_PLAY,
  SCREEN_TITLE, SCREEN_WON,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

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
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, null);
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

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Defending the keep. Build towers, then start wave 1.');
  }

  function finishGame(won) {
    screen = won ? SCREEN_WON : SCREEN_LOST;
    best = Math.max(best, world.state.wave);
    saveBest(best);
    if (won) {
      audio.win();
      announce(`Victory! All waves broken. Score ${world.state.score}.`);
    } else {
      audio.lose();
      announce(`The keep has fallen on wave ${world.state.wave}. Score ${world.state.score}.`);
    }
  }

  function playSounds(events) {
    if (events & EVENT_SHOOT) audio.shoot();
    if (events & EVENT_BOOM) audio.boom();
    if (events & EVENT_FROST) audio.frost();
    if (events & EVENT_KILL) audio.coin();
    if (events & EVENT_LEAK) audio.leak();
    if (events & EVENT_WAVE_DONE) audio.waveHorn();
  }

  function handleClick() {
    const click = input.takeClick();
    if (!click) return;
    audio.unlock();
    if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const action = clickAction(click, world.state);
    if (action.kind === 'card') {
      world.state.buildType = action.type;
      if (world.state.selectedPlot >= 0) {
        const error = world.build(world.state.selectedPlot, action.type);
        if (error === '') audio.build();
        else announce(error);
      }
    } else if (action.kind === 'start') {
      if (world.startWave()) audio.waveHorn();
    } else if (action.kind === 'upgrade') {
      const error = world.upgrade(world.state.selectedTower);
      if (error === '') audio.build();
      else announce(error);
    } else if (action.kind === 'sell') {
      world.sell(world.state.selectedTower);
      audio.coin();
    } else if (action.kind === 'plot') {
      const state = world.state;
      if (state.towers[action.index]) {
        state.selectedTower = action.index;
        state.selectedPlot = -1;
      } else {
        state.selectedPlot = action.index;
        state.selectedTower = -1;
        const error = world.build(action.index, state.buildType);
        if (error === '') audio.build();
        else if (error !== 'Not enough gold.') announce(error);
      }
    } else {
      world.state.selectedPlot = -1;
      world.state.selectedTower = -1;
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const buildKey = input.takeBuildKey();
    if (buildKey) {
      world.state.buildType = buildKey;
      if (screen === SCREEN_PLAY && world.state.selectedPlot >= 0) {
        if (world.build(world.state.selectedPlot, buildKey) === '') audio.build();
      }
    }
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART) {
      startGame();
      return;
    }
    if (actions & ACTION_DESELECT) {
      world.state.selectedPlot = -1;
      world.state.selectedTower = -1;
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WON || screen === SCREEN_LOST) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
      else if (screen === SCREEN_PLAY) {
        if (world.startWave()) audio.waveHorn();
      }
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_UPGRADE && screen === SCREEN_PLAY && world.state.selectedTower >= 0) {
      if (world.upgrade(world.state.selectedTower) === '') audio.build();
    }
    if (actions & ACTION_SELL && screen === SCREEN_PLAY && world.state.selectedTower >= 0) {
      world.sell(world.state.selectedTower);
      audio.coin();
    }
  }

  function step() {
    const events = world.step(STEP);
    playSounds(events);
    if (events & EVENT_WIN) finishGame(true);
    else if (events & EVENT_LOSE) finishGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    handleClick();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, input.hover());
  }

  // Leaving the tab pauses a running game rather than letting beasts march unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Ember Keep. Press Space or click to defend the keep.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
