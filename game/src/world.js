// The world: the whole game state and the rules that move it.
// One fixed-step update per call: spawn the wave, march enemies, fire towers,
// move projectiles, resolve hits, pay bounties, leak lives, end the wave,
// win after wave 10 or lose at 0 lives. Pure logic — no drawing, no sound.

import {
  KEEP, KILL_GOLD, MAX_LEVEL, PLOTS, START_GOLD, START_LIVES, TOTAL_WAVES,
  TOWERS, WAVE_CLEAR_BONUS,
} from './config.js';
import { createEnemy, damageEnemy, resetEnemyIds, slowEnemy, stepEnemy } from './enemies.js';
import { createTower, sellValue, stepTower, towerStats, upgradeCost } from './towers.js';
import { buildWave } from './waves.js';

export const EVENT_NONE = 0;
export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_DONE = 4;
export const EVENT_WIN = 8;
export const EVENT_LOSE = 16;
export const EVENT_SHOOT = 32;
export const EVENT_BOOM = 64;
export const EVENT_FROST = 128;

export const PHASE_BUILD = 'build';
export const PHASE_WAVE = 'wave';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

/** A fresh game state. `random` drives wave shuffles. */
export function createWorld(random) {
  const state = {
    random,
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    wave: 0,
    phase: PHASE_BUILD,
    kills: 0,
    leaked: 0,
    time: 0,
    towers: new Array(PLOTS.length).fill(null),
    enemies: [],
    projectiles: [],
    particles: [],
    spawnQueue: [],
    spawnClock: 0,
    waveActive: false,
    selectedPlot: -1,
    selectedTower: -1,
    buildType: 'arrow',
    message: '',
    messageUntil: 0,
    waveClearedAt: 0,
  };
  return {
    state,
    reset() {
      resetEnemyIds();
      state.gold = START_GOLD;
      state.lives = START_LIVES;
      state.score = 0;
      state.wave = 0;
      state.phase = PHASE_BUILD;
      state.kills = 0;
      state.leaked = 0;
      state.time = 0;
      state.towers = new Array(PLOTS.length).fill(null);
      state.enemies = [];
      state.projectiles = [];
      state.particles = [];
      state.spawnQueue = [];
      state.spawnClock = 0;
      state.waveActive = false;
      state.selectedPlot = -1;
      state.selectedTower = -1;
      state.buildType = 'arrow';
      state.message = '';
      state.messageUntil = 0;
    },

    /** Begin the next wave; returns false when no wave is left. */
    startWave() {
      if (state.phase === PHASE_WON || state.phase === PHASE_LOST) return false;
      if (state.waveActive || state.wave >= TOTAL_WAVES) return false;
      state.wave += 1;
      state.spawnQueue = buildWave(state.wave, state.random);
      state.spawnClock = 0;
      state.waveActive = true;
      state.phase = PHASE_WAVE;
      state.message = `Wave ${state.wave} of ${TOTAL_WAVES}`;
      state.messageUntil = state.time + 2.5;
      return true;
    },

    /** Try to build a tower of `type` on plot `index`. Returns a reason or ''. */
    build(index, type) {
      const def = TOWERS[type];
      if (!def) return 'Unknown tower.';
      if (index < 0 || index >= PLOTS.length) return 'No plot there.';
      if (state.towers[index]) return 'A tower already stands there.';
      if (state.gold < def.cost) return 'Not enough gold.';
      state.gold -= def.cost;
      state.towers[index] = createTower(type, index);
      state.selectedTower = index;
      state.selectedPlot = -1;
      burst(state, PLOTS[index].x, PLOTS[index].y, def.colour, 14);
      return '';
    },

    /** Upgrade the tower on plot `index`. Returns a reason or ''. */
    upgrade(index) {
      const tower = state.towers[index];
      if (!tower) return 'No tower there.';
      if (tower.level >= MAX_LEVEL) return 'Fully upgraded.';
      const cost = upgradeCost(tower);
      if (state.gold < cost) return 'Not enough gold to upgrade.';
      state.gold -= cost;
      tower.invested += cost;
      tower.level += 1;
      burst(state, PLOTS[index].x, PLOTS[index].y, '#f2c94c', 18);
      return '';
    },

    /** Sell the tower on plot `index`, refunding part of its cost. */
    sell(index) {
      const tower = state.towers[index];
      if (!tower) return 0;
      const refund = sellValue(tower);
      state.gold += refund;
      state.towers[index] = null;
      if (state.selectedTower === index) state.selectedTower = -1;
      burst(state, PLOTS[index].x, PLOTS[index].y, '#9aa78f', 10);
      return refund;
    },

    /** Advance the simulation by `dt` seconds. Returns an event bitmask. */
    step(dt) {
      let events = EVENT_NONE;
      state.time += dt;

      if (state.waveActive) {
        state.spawnClock += dt;
        while (state.spawnQueue.length > 0 && state.spawnQueue[0].delay <= state.spawnClock) {
          const entry = state.spawnQueue.shift();
          state.enemies.push(createEnemy(entry.kind, entry.hpMul));
        }
      }

      // Towers fire.
      for (let i = 0; i < state.towers.length; i += 1) {
        const tower = state.towers[i];
        if (!tower) continue;
        const stats = towerStats(tower);
        const shot = stepTower(tower, stats, PLOTS[i], state.enemies, dt);
        if (shot) {
          state.projectiles.push(shot);
          events |= EVENT_SHOOT;
          if (shot.type === 'frost') events |= EVENT_FROST;
        }
      }

      // Projectiles chase their target and hit.
      for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
        const proj = state.projectiles[i];
        const target = state.enemies.find((e) => e.id === proj.targetId && e.alive);
        if (!target) {
          state.projectiles.splice(i, 1);
          continue;
        }
        const dx = target.x - proj.x;
        const dy = target.y - proj.y;
        const dist = Math.hypot(dx, dy);
        const step = proj.speed * dt;
        if (dist <= step + target.radius) {
          if (proj.splash > 0) {
            events |= EVENT_BOOM;
            burst(state, target.x, target.y, '#e5534b', 16);
            for (const enemy of state.enemies) {
              if (!enemy.alive) continue;
              if (Math.hypot(enemy.x - target.x, enemy.y - target.y) <= proj.splash + enemy.radius) {
                if (damageEnemy(enemy, proj.damage)) events |= killEnemy(state, enemy);
              }
            }
          } else {
            if (proj.slow > 0) slowEnemy(target, 1 - proj.slow, 1.6, state.time);
            if (damageEnemy(target, proj.damage)) events |= killEnemy(state, target);
          }
          state.projectiles.splice(i, 1);
        } else {
          proj.x += (dx / dist) * step;
          proj.y += (dy / dist) * step;
        }
      }

      // Enemies march; leaks cost lives.
      for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
        const enemy = state.enemies[i];
        if (!enemy.alive) {
          state.enemies.splice(i, 1);
          continue;
        }
        if (stepEnemy(enemy, dt, state.time)) {
          state.enemies.splice(i, 1);
          state.lives -= enemy.lives;
          state.leaked += 1;
          events |= EVENT_LEAK;
          burst(state, KEEP.x, KEEP.y, '#e5534b', 20);
          if (state.lives <= 0) {
            state.lives = 0;
            state.phase = PHASE_LOST;
            state.waveActive = false;
            events |= EVENT_LOSE;
          }
        }
      }

      // Particles fade.
      for (let i = state.particles.length - 1; i >= 0; i -= 1) {
        const p = state.particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) state.particles.splice(i, 1);
      }

      // Wave cleared?
      if (state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0) {
        state.waveActive = false;
        const bonus = WAVE_CLEAR_BONUS + state.wave * 5;
        state.gold += bonus;
        state.score += 100 * state.wave;
        events |= EVENT_WAVE_DONE;
        if (state.wave >= TOTAL_WAVES) {
          state.phase = PHASE_WON;
          events |= EVENT_WIN;
        } else {
          state.phase = PHASE_BUILD;
          state.message = `Wave ${state.wave} cleared! +${bonus} gold`;
          state.messageUntil = state.time + 3;
        }
      }
      return events;
    },
  };
}

function killEnemy(state, enemy) {
  state.kills += 1;
  state.gold += enemy.gold + KILL_GOLD;
  state.score += 10 + enemy.gold;
  burst(state, enemy.x, enemy.y, '#f2c94c', 8);
  return EVENT_KILL;
}

function burst(state, x, y, colour, n) {
  for (let i = 0; i < n; i += 1) {
    const angle = state.random.next() * Math.PI * 2;
    const speed = 40 + state.random.next() * 120;
    state.particles.push({
      x, y, colour,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.35 + state.random.next() * 0.35,
      maxLife: 0.7,
      size: 2 + state.random.next() * 3,
    });
  }
}
