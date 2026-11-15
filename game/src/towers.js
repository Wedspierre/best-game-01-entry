// Towers: what stands on a plot, how it aims, and what its shots do.
// A tower targets the enemy furthest along the path inside its range, fires
// on its own cooldown, and fires a projectile the world moves and resolves.
// Upgrading a tower raises damage and range; selling returns part of the cost.

import { TOWERS, UPGRADE_COST, UPGRADE_MULT, SELL_FRACTION } from './config.js';

/** A tower of `type` standing on plot `plotIndex`. */
export function createTower(type, plotIndex) {
  const def = TOWERS[type];
  return {
    type,
    plotIndex,
    level: 1,
    invested: def.cost,
    cooldown: 0,
    angle: -Math.PI / 2,
    flash: 0,
  };
}

/** Effective stats of a tower at its current level. */
export function towerStats(tower) {
  const def = TOWERS[tower.type];
  const mult = Math.pow(UPGRADE_MULT, tower.level - 1);
  return {
    range: def.range * (1 + 0.12 * (tower.level - 1)),
    damage: Math.round(def.damage * mult),
    rate: def.rate,
    projSpeed: def.projSpeed,
    splash: def.splash,
    slow: def.slow,
    colour: def.colour,
    name: def.name,
  };
}

export function upgradeCost(tower) {
  return UPGRADE_COST * tower.level;
}

export function sellValue(tower) {
  return Math.floor(tower.invested * SELL_FRACTION);
}

/** The enemy furthest along the path within range, or null. */
export function pickTarget(tower, stats, plot, enemies) {
  let best = null;
  for (let i = 0; i < enemies.length; i += 1) {
    const enemy = enemies[i];
    if (!enemy.alive) continue;
    const dist = Math.hypot(enemy.x - plot.x, enemy.y - plot.y);
    if (dist > stats.range + enemy.radius) continue;
    if (!best || enemy.travelled > best.travelled) best = enemy;
  }
  return best;
}

/**
 * Tick a tower: cool down, aim, and fire when ready.
 * Returns a projectile object when it fires, else null.
 */
export function stepTower(tower, stats, plot, enemies, dt) {
  tower.cooldown -= dt;
  if (tower.flash > 0) tower.flash -= dt;
  const target = pickTarget(tower, stats, plot, enemies);
  if (!target) return null;
  tower.angle = Math.atan2(target.y - plot.y, target.x - plot.x);
  if (tower.cooldown > 0) return null;
  tower.cooldown = 1 / stats.rate;
  tower.flash = 0.08;
  return {
    x: plot.x,
    y: plot.y,
    targetId: target.id,
    speed: stats.projSpeed,
    damage: stats.damage,
    splash: stats.splash,
    slow: stats.slow,
    colour: stats.colour,
    type: tower.type,
    alive: true,
  };
}
