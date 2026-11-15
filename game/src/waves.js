// Wave composition: what marches in each of the 10 waves, and how the count
// and health scale. Wave 10 is the boss: the Emberlord, escorted by brutes.
// Returns a flat spawn list of { kind, delay } entries, delays in seconds
// from the wave start.

import { ENEMIES, TOTAL_WAVES } from './config.js';

function hpScale(wave) {
  return 1 + (wave - 1) * 0.42;
}

function countFor(wave, base) {
  return base + Math.floor((wave - 1) * 1.6);
}

/** Build the spawn list for `wave` (1-based). */
export function buildWave(wave, random) {
  const list = [];
  let at = 0.4;
  const gap = Math.max(0.3, 0.8 - wave * 0.04);
  function add(kind, n, spacing) {
    for (let i = 0; i < n; i += 1) {
      list.push({ kind, delay: at, hpMul: hpScale(wave) });
      at += spacing ?? gap;
    }
    at += 0.8;
  }

  if (wave === TOTAL_WAVES) {
    add('grunt', 6, 0.5);
    add('brute', 3, 1.1);
    add('runner', 8, 0.4);
    list.push({ kind: 'boss', delay: at + 1.5, hpMul: 1 });
    return list;
  }

  add('grunt', countFor(wave, 5));
  if (wave >= 2) add('runner', countFor(wave, 2));
  if (wave >= 3) add('brute', Math.max(1, Math.floor(wave / 3)));
  if (wave >= 5) add('runner', Math.floor(wave / 2));
  if (wave >= 6) add('grunt', Math.floor(wave / 2));
  if (wave >= 8) add('brute', 2);
  // Shuffle the spawn order so waves never feel identical, then re-lay the
  // delays along the shuffled order (the seed decides the mix).
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random.next() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  let delay = 0.4;
  for (const entry of list) {
    entry.delay = delay;
    delay += gap;
  }
  return list;
}

/** Gold bounty of one kill, before the wave bonus. */
export function bountyOf(kind) {
  return ENEMIES[kind].gold;
}
