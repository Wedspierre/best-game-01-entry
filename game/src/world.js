// Ember Keep v2 — the simulation: towers, enemies, waves, gold, combo.
// Pure logic, no DOM: it advances in fixed 1/60 s steps from one seeded
// random stream, so the same seed always plays the same game.
import {
  STEP, ROAD, ROAD_HALF, KEEP, PLOTS, TOWERS, TOWER_ORDER, ENEMIES, BOSSES,
  TOTAL_WAVES, START_GOLD, START_LIVES, SELL_RATE, COMBO_WINDOW, COMBO_MAX,
  WAVE_BONUS, EARLY_CALL_BONUS, INTEREST_RATE, INTEREST_CAP,
  waveHpScale, waveCount, spawnInterval,
} from './config.js';

export const EVENT_NONE = 0;
export const EVENT_KILL = 1;
export const EVENT_LEAK = 2;
export const EVENT_WAVE_START = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_WIN = 16;
export const EVENT_LOSE = 32;
export const EVENT_BOSS = 64;
export const EVENT_BUILD = 128;
export const EVENT_UPGRADE = 256;
export const EVENT_SELL = 512;
export const EVENT_SHOOT = 1024;

// Length of each road segment, for distance-along-road targeting.
const SEG_LEN = [];
let ROAD_TOTAL = 0;
for (let i = 0; i < ROAD.length - 1; i += 1) {
  const dx = ROAD[i + 1].x - ROAD[i].x;
  const dy = ROAD[i + 1].y - ROAD[i].y;
  const len = Math.hypot(dx, dy);
  SEG_LEN.push(len);
  ROAD_TOTAL += len;
}

function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Merged stats of a tower type at a level (1..3), with its upgrade name.
export function towerStats(type, level) {
  const def = TOWERS[type];
  const stats = {
    type, level, name: def.name, key: def.key, color: def.color, glow: def.glow,
    desc: def.desc, cost: def.cost, range: def.range, damage: def.damage,
    rate: def.rate, projSpeed: def.projSpeed || 0, splash: def.splash || 0,
    slow: def.slow || 0, chill: def.chill || 0, chain: def.chain || 0,
    dot: def.dot || 0, dotTime: def.dotTime || 0, beam: def.beam || 0,
    armorBonus: def.armorBonus || 1, minRange: def.minRange || 0,
    shots: 1, beams: 1, burn: 0,
  };
  for (let i = 0; i < level - 1; i += 1) {
    const up = def.up[i];
    stats.name = up.name;
    stats.cost = up.cost;
    if (up.damageMul) stats.damage *= up.damageMul;
    if (up.beamMul) stats.beam *= up.beamMul;
    if (up.rangeAdd) stats.range += up.rangeAdd;
    if (up.splashAdd) stats.splash += up.splashAdd;
    if (up.slow) stats.slow = up.slow;
    if (up.chill) stats.chill = up.chill;
    if (up.chain) stats.chain = up.chain;
    if (up.dot) stats.dot = up.dot;
    if (up.dotTime) stats.dotTime = up.dotTime;
    if (up.shots) stats.shots = up.shots;
    if (up.beams) stats.beams = up.beams;
    if (up.burn) stats.burn = up.burn;
  }
  stats.damage = Math.round(stats.damage);
  stats.beam = Math.round(stats.beam);
  return stats;
}

export function upgradeCost(type, level) {
  if (level >= 3) return null;
  return TOWERS[type].up[level - 1].cost;
}

function enemyStats(kind, wave, bossDef) {
  if (bossDef) {
    return {
      kind, name: bossDef.name, hp: Math.round(bossDef.hp * (1 + (wave - 1) * 0.03)),
      speed: bossDef.speed, gold: bossDef.gold, radius: bossDef.radius,
      color: bossDef.color, armor: bossDef.armor || 0, flying: !!bossDef.flying,
      slowResist: bossDef.slowResist || 0, boss: true,
    };
  }
  const def = ENEMIES[kind];
  return {
    kind, name: def.name, hp: Math.round(def.hp * waveHpScale(wave)),
    speed: def.speed, gold: def.gold, radius: def.radius, color: def.color,
    armor: def.armor || 0, flying: !!def.flying, slowResist: def.slowResist || 0,
    spits: !!def.spits, heals: def.heals || 0, burrows: !!def.burrows, boss: false,
  };
}

// The wave's roster, as { kind: count } — shown in the wave preview.
export function previewWave(wave) {
  const counts = {};
  const unlocked = Object.keys(ENEMIES).filter((k) => ENEMIES[k].unlock <= wave);
  let total = 0;
  for (const kind of unlocked) total += ENEMIES[kind].weight;
  const n = waveCount(wave);
  // Deterministic split by weight, no RNG: the preview never lies.
  let assigned = 0;
  for (const kind of unlocked) {
    const c = Math.floor((n * ENEMIES[kind].weight) / total);
    if (c > 0) { counts[kind] = c; assigned += c; }
  }
  let i = 0;
  while (assigned < n) {
    const kind = unlocked[i % unlocked.length];
    counts[kind] = (counts[kind] || 0) + 1;
    assigned += 1;
    i += 1;
  }
  if (wave === 10) counts.golem = 1;
  if (wave === 15) counts.wyrm = 1;
  return counts;
}

export function createWorld(rng) {
  const state = {
    gold: START_GOLD, lives: START_LIVES, score: 0, wave: 0,
    kills: 0, leaks: 0, earned: 0, time: 0, speed: 1,
    phase: 'build', // build | fighting | won | lost
    towers: [], enemies: [], projectiles: [], particles: [], floaters: [], beams: [],
    spawnQueue: [], spawnTimer: 0, spawnGap: 1,
    combo: 0, comboTimer: 0, comboBest: 0,
    shake: 0, restTimer: 0, banner: null, bannerTimer: 0,
    selectedPlot: -1, selectedTower: null, buildChoice: null,
    muted: false, announced: false,
  };

  function addParticles(x, y, color, n, speed, life, size) {
    for (let i = 0; i < n; i += 1) {
      if (state.particles.length > 420) return;
      const a = rng.next() * Math.PI * 2;
      const v = speed * (0.3 + rng.next() * 0.7);
      state.particles.push({
        x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.25,
        life: life * (0.6 + rng.next() * 0.6), maxLife: life,
        color, size: size * (0.6 + rng.next() * 0.8),
      });
    }
  }

  function addFloater(x, y, text, color) {
    if (state.floaters.length > 60) state.floaters.shift();
    state.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  }

  function setBanner(text, sub) {
    state.banner = text;
    state.bannerSub = sub || '';
    state.bannerTimer = 2.2;
  }

  function reset() {
    state.gold = START_GOLD; state.lives = START_LIVES; state.score = 0;
    state.wave = 0; state.kills = 0; state.leaks = 0; state.earned = 0;
    state.time = 0; state.phase = 'build';
    state.towers = []; state.enemies = []; state.projectiles = [];
    state.particles = []; state.floaters = []; state.beams = [];
    state.spawnQueue = []; state.spawnTimer = 0;
    state.combo = 0; state.comboTimer = 0; state.comboBest = 0;
    state.shake = 0; state.restTimer = 0; state.banner = null; state.bannerTimer = 0;
    state.selectedPlot = -1; state.selectedTower = null; state.buildChoice = null;
    setBanner('EMBER KEEP', 'Hold the keep through 15 waves');
  }

  function buildSpawnQueue(wave) {
    const counts = previewWave(wave);
    const queue = [];
    for (const kind of Object.keys(counts)) {
      for (let i = 0; i < counts[kind]; i += 1) queue.push(kind);
    }
    // Seeded shuffle: the same seed always sends the same order.
    for (let i = queue.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      const tmp = queue[i]; queue[i] = queue[j]; queue[j] = tmp;
    }
    // Bosses march last, so the wave builds to them.
    const boss = queue.indexOf('golem') >= 0 ? 'golem' : queue.indexOf('wyrm') >= 0 ? 'wyrm' : null;
    if (boss) {
      const at = queue.indexOf(boss);
      queue.splice(at, 1);
      queue.push(boss);
    }
    return queue;
  }

  function spawnEnemy(kind) {
    const bossDef = kind === 'golem' ? BOSSES.golem : kind === 'wyrm' ? BOSSES.wyrm : null;
    const s = enemyStats(kind, state.wave, bossDef);
    const e = {
      ...s, maxHp: s.hp, x: ROAD[0].x, y: ROAD[0].y, seg: 0, along: 0,
      slowUntil: 0, slowFactor: 0, dotDps: 0, dotUntil: 0, burnDps: 0, burnUntil: 0,
      burrowUntil: 0, burrowCd: 4 + rng.next() * 4, spitCd: 2 + rng.next() * 2,
      healCd: 0, dead: false, leaked: false, wobble: rng.next() * Math.PI * 2,
    };
    state.enemies.push(e);
    if (bossDef) {
      setBanner(`${bossDef.name.toUpperCase()} APPROACHES`, 'Focus fire — it will not stop');
    }
    return e;
  }

  function startWave() {
    if (state.phase !== 'build' || state.wave >= TOTAL_WAVES) return 0;
    let events = EVENT_WAVE_START;
    if (state.restTimer < 8 && state.wave > 0) {
      state.gold += EARLY_CALL_BONUS;
      addFloater(640, 120, `+${EARLY_CALL_BONUS} early call`, '#ffd166');
    }
    state.wave += 1;
    state.phase = 'fighting';
    state.spawnQueue = buildSpawnQueue(state.wave);
    state.spawnGap = spawnInterval(state.wave);
    state.spawnTimer = 0.6;
    state.restTimer = 0;
    if (state.wave === 10 || state.wave === 15) events |= EVENT_BOSS;
    setBanner(`WAVE ${state.wave}`, state.wave === TOTAL_WAVES ? 'The Ashen Wyrm comes' : `${state.spawnQueue.length} beasts on the road`);
    return events;
  }

  function damageEnemy(e, amount, opts) {
    if (e.dead || e.leaked) return false;
    const o = opts || {};
    let dmg = amount;
    if (!o.pure) dmg = Math.max(1, Math.round(dmg - (e.armor || 0)));
    if (e.flying && o.groundHalf) dmg = Math.max(1, Math.round(dmg / 2));
    e.hp -= dmg;
    if (!o.quiet && dmg >= 20) {
      addFloater(e.x + (rng.next() * 16 - 8), e.y - e.radius - 4, String(dmg), o.crit ? '#ffe66d' : '#ffffff');
    }
    if (e.hp <= 0) {
      killEnemy(e);
      return true;
    }
    return false;
  }

  function killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    state.kills += 1;
    if (state.comboTimer > 0) state.combo += 1;
    else state.combo = 1;
    state.comboTimer = COMBO_WINDOW;
    const realMult = state.combo >= 14 ? 4 : state.combo >= 8 ? 3 : state.combo >= 4 ? 2 : 1;
    const bounty = Math.round(e.gold * realMult);
    state.gold += bounty;
    state.earned += bounty;
    state.score += 10 * e.gold + (e.boss ? 500 : 0);
    if (state.combo > state.comboBest) state.comboBest = state.combo;
    addParticles(e.x, e.y, e.color, e.boss ? 46 : 12, e.boss ? 260 : 140, 0.7, e.boss ? 5 : 3);
    addParticles(e.x, e.y, '#ffd166', e.boss ? 20 : 5, 120, 0.5, 3);
    addFloater(e.x, e.y - e.radius - 12, `+${bounty}g`, '#ffd166');
    if (e.boss) {
      state.shake = 14;
      setBanner(`${e.name.toUpperCase()} SLAIN`, `+${bounty} gold — the road holds`);
      state.score += 500;
    }
    if (state.combo === 4 || state.combo === 8 || state.combo === 14) {
      addFloater(640, 150, state.combo === 4 ? 'RAMPAGE x2!' : state.combo === 8 ? 'INFERNO x3!' : 'EMBERSTORM x4!', '#ff6b35');
    }
  }

  function leakEnemy(e) {
    e.leaked = true;
    state.leaks += 1;
    state.lives -= e.boss ? 5 : 1;
    state.shake = Math.max(state.shake, e.boss ? 16 : 8);
    addParticles(KEEP.x, KEEP.y, '#ff3d00', 26, 220, 0.8, 4);
    addFloater(KEEP.x - 40, KEEP.y - 60, e.boss ? '-5 lives!' : '-1 life', '#ff5d5d');
    if (state.lives <= 0) {
      state.lives = 0;
      state.phase = 'lost';
    }
  }

  // --- Building -----------------------------------------------------------
  function plotAt(x, y) {
    for (let i = 0; i < PLOTS.length; i += 1) {
      if (dist(x, y, PLOTS[i].x, PLOTS[i].y) < 34) return i;
    }
    return -1;
  }

  function towerAt(x, y) {
    for (const t of state.towers) {
      if (dist(x, y, t.x, t.y) < 30) return t;
    }
    return null;
  }

  function buildTower(plotIndex, type) {
    if (state.towers.some((t) => t.plot === plotIndex)) return 0;
    const def = TOWERS[type];
    if (!def || state.gold < def.cost) return 0;
    state.gold -= def.cost;
    const plot = PLOTS[plotIndex];
    state.towers.push({
      type, level: 1, x: plot.x, y: plot.y, plot: plotIndex,
      cooldown: 0, invested: def.cost, angle: -Math.PI / 2, slowUntil: 0,
      beamTarget: null, flash: 0,
    });
    addParticles(plot.x, plot.y, '#ffd166', 18, 130, 0.6, 3);
    state.selectedTower = state.towers[state.towers.length - 1];
    state.selectedPlot = -1;
    return EVENT_BUILD;
  }

  function upgradeTower(t) {
    if (!t || t.level >= 3) return 0;
    const cost = upgradeCost(t.type, t.level);
    if (state.gold < cost) return 0;
    state.gold -= cost;
    t.invested += cost;
    t.level += 1;
    t.cooldown = 0;
    addParticles(t.x, t.y, TOWERS[t.type].color, 22, 160, 0.7, 3);
    addFloater(t.x, t.y - 34, towerStats(t.type, t.level).name, '#7fe7ff');
    return EVENT_UPGRADE;
  }

  function sellTower(t) {
    if (!t) return 0;
    const refund = Math.round(t.invested * SELL_RATE);
    state.gold += refund;
    state.towers.splice(state.towers.indexOf(t), 1);
    addParticles(t.x, t.y, '#adb5bd', 14, 110, 0.5, 3);
    addFloater(t.x, t.y - 30, `+${refund}g`, '#adb5bd');
    if (state.selectedTower === t) state.selectedTower = null;
    return EVENT_SELL;
  }

  // --- Combat -------------------------------------------------------------
  function slowedSpeed(e) {
    if (state.time < e.slowUntil) {
      const resist = e.slowResist || 0;
      return e.speed * (1 - e.slowFactor * (1 - resist));
    }
    return e.speed;
  }

  function furthestInRange(t, stats) {
    let best = null;
    for (const e of state.enemies) {
      if (e.dead || e.leaked) continue;
      if (state.time < e.burrowUntil) continue;
      const d = dist(t.x, t.y, e.x, e.y);
      if (d > stats.range || d < stats.minRange) continue;
      if (!best || e.along > best.along) best = e;
    }
    return best;
  }

  function fireTower(t, stats) {
    const target = furthestInRange(t, stats);
    if (!target) { t.beamTarget = null; return 0; }
    t.angle = Math.atan2(target.y - t.y, target.x - t.x);
    t.flash = 0.12;
    if (stats.beam) {
      // Sun Lens: continuous beam, no projectile.
      t.beamTarget = target;
      return EVENT_SHOOT;
    }
    t.cooldown = 1 / stats.rate;
    if (t.type === 'storm') {
      // Chain lightning: instant, jumps to the nearest foes.
      let from = target;
      let hit = new Set([target]);
      let dmg = stats.damage;
      damageEnemy(target, dmg, {});
      state.beams.push({ x1: t.x, y1: t.y - 14, x2: target.x, y2: target.y, life: 0.16, maxLife: 0.16, color: '#c77dff' });
      addParticles(target.x, target.y, '#e0aaff', 8, 140, 0.4, 3);
      for (let jump = 0; jump < stats.chain - 1; jump += 1) {
        let next = null;
        let nextD = 110;
        for (const e of state.enemies) {
          if (e.dead || e.leaked || hit.has(e)) continue;
          if (state.time < e.burrowUntil) continue;
          const d = dist(from.x, from.y, e.x, e.y);
          if (d < nextD) { nextD = d; next = e; }
        }
        if (!next) break;
        hit.add(next);
        dmg = Math.round(dmg * 0.85);
        damageEnemy(next, dmg, {});
        state.beams.push({ x1: from.x, y1: from.y, x2: next.x, y2: next.y, life: 0.16, maxLife: 0.16, color: '#c77dff' });
        from = next;
      }
      return EVENT_SHOOT;
    }
    const shots = stats.shots || 1;
    for (let s = 0; s < shots; s += 1) {
      const spread = shots > 1 ? (s - (shots - 1) / 2) * 0.22 : 0;
      state.projectiles.push({
        x: t.x, y: t.y - 12, target, lastX: target.x, lastY: target.y,
        speed: stats.projSpeed, damage: stats.damage, splash: stats.splash,
        slow: stats.slow, chill: stats.chill, chain: stats.chain,
        dot: stats.dot, dotTime: stats.dotTime, burn: stats.burn,
        kind: t.type, spread, groundHalf: t.type === 'cannon' || t.type === 'mortar',
        color: stats.color, dead: false,
      });
    }
    return EVENT_SHOOT;
  }

  function applyHit(p, e) {
    const dmg = p.damage;
    if (p.splash > 0) {
      addParticles(p.lastX, p.lastY, '#ff9f1c', 16, 200, 0.5, 4);
      for (const other of state.enemies) {
        if (other.dead || other.leaked) continue;
        if (dist(p.lastX, p.lastY, other.x, other.y) <= p.splash + other.radius) {
          damageEnemy(other, dmg, { groundHalf: p.groundHalf });
          if (p.burn) { other.burnDps = Math.max(other.burnDps, p.burn); other.burnUntil = state.time + 3; }
        }
      }
      state.shake = Math.max(state.shake, p.kind === 'mortar' ? 3 : 1.5);
    } else {
      damageEnemy(e, dmg, { groundHalf: p.groundHalf });
      addParticles(p.lastX, p.lastY, p.color, 5, 110, 0.35, 2);
      if (p.slow > 0) {
        e.slowFactor = Math.max(e.slowFactor, p.slow);
        e.slowUntil = Math.max(e.slowUntil, state.time + p.chill);
        if (p.chain) {
          let chained = 0;
          for (const other of state.enemies) {
            if (chained >= p.chain - 1 || other === e || other.dead || other.leaked) continue;
            if (dist(e.x, e.y, other.x, other.y) < 100) {
              other.slowFactor = Math.max(other.slowFactor, p.slow);
              other.slowUntil = Math.max(other.slowUntil, state.time + p.chill);
              chained += 1;
            }
          }
        }
      }
      if (p.dot > 0) {
        e.dotDps = Math.max(e.dotDps, p.dot);
        e.dotUntil = Math.max(e.dotUntil, state.time + p.dotTime);
      }
      if (p.burn > 0) { e.burnDps = Math.max(e.burnDps, p.burn); e.burnUntil = state.time + 3; }
    }
  }

  function stepEnemies(dt) {
    for (const e of state.enemies) {
      if (e.dead || e.leaked) continue;
      // Damage over time.
      if (state.time < e.dotUntil) damageEnemy(e, e.dotDps * dt, { pure: true, quiet: true });
      if (state.time < e.burnUntil) damageEnemy(e, e.burnDps * dt, { pure: true, quiet: true });
      if (e.dead) continue;
      // Burrower: dives underground and cannot be targeted for a while.
      e.burrowCd -= dt;
      if (e.burrows && e.burrowCd <= 0 && state.time >= e.burrowUntil) {
        e.burrowUntil = state.time + 1.6;
        e.burrowCd = 5 + rng.next() * 3;
        addParticles(e.x, e.y, '#6c584c', 10, 90, 0.5, 3);
      }
      // Spitter: slows the nearest tower for a moment.
      if (e.spits) {
        e.spitCd -= dt;
        if (e.spitCd <= 0) {
          e.spitCd = 3.5 + rng.next() * 2;
          let near = null;
          let nearD = 150;
          for (const t of state.towers) {
            const d = dist(e.x, e.y, t.x, t.y);
            if (d < nearD) { nearD = d; near = t; }
          }
          if (near) {
            near.slowUntil = state.time + 2;
            addParticles(near.x, near.y, '#90be6d', 8, 80, 0.5, 3);
          }
        }
      }
      // Mender: heals wounded neighbours.
      if (e.heals) {
        e.healCd -= dt;
        if (e.healCd <= 0) {
          e.healCd = 1;
          for (const other of state.enemies) {
            if (other === e || other.dead || other.leaked) continue;
            if (other.hp < other.maxHp && dist(e.x, e.y, other.x, other.y) < 80) {
              other.hp = Math.min(other.maxHp, other.hp + e.heals);
            }
          }
        }
      }
      // March along the road.
      const speed = slowedSpeed(e);
      let move = speed * dt;
      while (move > 0 && e.seg < ROAD.length - 1) {
        const ax = ROAD[e.seg].x, ay = ROAD[e.seg].y;
        const bx = ROAD[e.seg + 1].x, by = ROAD[e.seg + 1].y;
        const segLen = SEG_LEN[e.seg];
        const segDone = Math.hypot(e.x - ax, e.y - ay);
        const left = segLen - segDone;
        if (move < left) {
          const nx = (bx - ax) / segLen, ny = (by - ay) / segLen;
          e.x += nx * move; e.y += ny * move;
          e.along += move;
          move = 0;
        } else {
          e.x = bx; e.y = by;
          e.along += left;
          move -= left;
          e.seg += 1;
        }
      }
      if (e.seg >= ROAD.length - 1 || e.x >= KEEP.x - 6) leakEnemy(e);
    }
    state.enemies = state.enemies.filter((e) => !e.dead && !e.leaked);
  }

  function stepTowers(dt) {
    for (const t of state.towers) {
      if (t.flash > 0) t.flash -= dt;
      const stats = towerStats(t.type, t.level);
      const towerSlow = state.time < t.slowUntil;
      if (stats.beam) {
        // Lens: lock a target and burn it every step.
        const targets = [];
        for (const e of state.enemies) {
          if (e.dead || e.leaked || state.time < e.burrowUntil) continue;
          const d = dist(t.x, t.y, e.x, e.y);
          if (d <= stats.range && d >= stats.minRange) targets.push(e);
        }
        targets.sort((a, b) => b.along - a.along);
        t.beamTarget = targets[0] || null;
        const beams = Math.min(stats.beams, targets.length);
        for (let i = 0; i < beams; i += 1) {
          const e = targets[i];
          let dps = stats.beam;
          if (e.armor > 0) dps *= stats.armorBonus;
          damageEnemy(e, dps * dt, { pure: true, quiet: true });
          state.beams.push({ x1: t.x, y1: t.y - 14, x2: e.x, y2: e.y, life: 0.05, maxLife: 0.05, color: '#fff3b0' });
          if (rng.next() < 0.3) addParticles(e.x, e.y, '#ffd60a', 1, 60, 0.3, 2);
        }
        continue;
      }
      t.cooldown -= towerSlow ? dt * 0.5 : dt;
      if (t.cooldown <= 0) fireTower(t, stats);
    }
  }

  function stepProjectiles(dt) {
    for (const p of state.projectiles) {
      if (p.dead) continue;
      if (p.target && !p.target.dead && !p.target.leaked) {
        p.lastX = p.target.x;
        p.lastY = p.target.y;
      }
      const dx = p.lastX - p.x, dy = p.lastY - p.y;
      const d = Math.hypot(dx, dy);
      const move = p.speed * dt;
      if (d <= Math.max(10, move)) {
        p.dead = true;
        const hit = p.target && !p.target.dead && !p.target.leaked
          ? p.target
          : null;
        if (p.splash > 0 || hit) applyHit(p, hit);
        continue;
      }
      // Spread shots arc slightly off the direct line.
      const ang = Math.atan2(dy, dx) + (p.spread || 0);
      p.x += Math.cos(ang) * move;
      p.y += Math.sin(ang) * move;
    }
    state.projectiles = state.projectiles.filter((p) => !p.dead);
  }

  function step(dt) {
    if (state.phase === 'won' || state.phase === 'lost') {
      updateFx(dt);
      return EVENT_NONE;
    }
    state.time += dt;
    let events = EVENT_NONE;
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 0;
    }
    if (state.phase === 'build') state.restTimer += dt;
    // Spawn the wave.
    if (state.phase === 'fighting' && state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.spawnTimer = state.spawnGap;
        spawnEnemy(state.spawnQueue.shift());
      }
    }
    stepTowers(dt);
    stepProjectiles(dt);
    stepEnemies(dt);
    updateFx(dt);
    // Wave cleared?
    if (state.phase === 'fighting' && state.spawnQueue.length === 0 && state.enemies.length === 0) {
      const bonus = WAVE_BONUS(state.wave);
      const interest = Math.min(INTEREST_CAP, Math.floor(state.gold * INTEREST_RATE));
      state.gold += bonus + interest;
      state.score += 50 * state.wave;
      if (state.wave >= TOTAL_WAVES) {
        state.phase = 'won';
        setBanner('THE KEEP STANDS', `All 15 waves broken — score ${state.score}`);
        return events | EVENT_WIN;
      }
      state.phase = 'build';
      state.restTimer = 0;
      setBanner(`WAVE ${state.wave} CLEARED`, `+${bonus} bonus  ·  +${interest} interest`);
      events |= EVENT_WAVE_CLEAR;
    }
    if (state.phase === 'lost') events |= EVENT_LOSE;
    return events;
  }

  function updateFx(dt) {
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    for (const pt of state.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += 160 * dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const f of state.floaters) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    state.floaters = state.floaters.filter((f) => f.life > 0);
    for (const b of state.beams) b.life -= dt;
    state.beams = state.beams.filter((b) => b.life > 0);
  }

  return {
    state, reset, startWave, buildTower, upgradeTower, sellTower,
    plotAt, towerAt, step, towerStats, previewWave: () => previewWave(state.wave + 1),
    nextWavePreview: () => previewWave(Math.min(TOTAL_WAVES, state.wave + 1)),
    towerOrder: TOWER_ORDER,
  };
}
