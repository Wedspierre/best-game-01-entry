// Enemies: one marching thing. Each has a kind (grunt/runner/brute/boss),
// a position on the path, hit points, a slow timer from frost, and the
// distance it has travelled (used to pick targets: furthest along wins).

import { ENEMIES, PATH } from './config.js';

let nextId = 1;

/** Create an enemy of `kind` at the path start with `hpMul` health scaling. */
export function createEnemy(kind, hpMul) {
  const def = ENEMIES[kind];
  return {
    id: nextId,
    kind,
    x: PATH[0].x,
    y: PATH[0].y,
    waypoint: 1,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    speed: def.speed,
    radius: def.radius,
    gold: def.gold,
    lives: def.lives,
    slowUntil: 0,
    slowFactor: 1,
    travelled: 0,
    alive: true,
    flash: 0,
  };
}

export function resetEnemyIds() {
  nextId = 1;
}

/**
 * Advance one enemy by `dt` seconds along the path.
 * Returns true when it reached the keep.
 */
export function stepEnemy(enemy, dt, now) {
  let remaining = dt * enemy.speed * (now < enemy.slowUntil ? enemy.slowFactor : 1);
  while (remaining > 0 && enemy.waypoint < PATH.length) {
    const target = PATH[enemy.waypoint];
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= remaining) {
      enemy.x = target.x;
      enemy.y = target.y;
      enemy.travelled += dist;
      remaining -= dist;
      enemy.waypoint += 1;
    } else {
      enemy.x += (dx / dist) * remaining;
      enemy.y += (dy / dist) * remaining;
      enemy.travelled += remaining;
      remaining = 0;
    }
  }
  if (enemy.flash > 0) enemy.flash -= dt;
  return enemy.waypoint >= PATH.length;
}

/** Apply damage; returns true when the enemy dies. */
export function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.12;
  if (enemy.hp <= 0) {
    enemy.alive = false;
    return true;
  }
  return false;
}

/** Chill the enemy: half speed for `seconds` from `now`. */
export function slowEnemy(enemy, factor, seconds, now) {
  enemy.slowFactor = factor;
  enemy.slowUntil = now + seconds;
}
