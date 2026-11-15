// The HUD: the top bar (gold, lives, wave, score, kills) and the bottom
// build bar (three tower cards, Start Wave button, upgrade/sell panel).
// It also owns hit-testing: given a click in field coordinates it reports
// which button or plot the player meant, so main.js stays thin.

import {
  FIELD, PALETTE, PLOTS, PLOT_RADIUS, TOWERS, TOWER_ORDER,
} from './config.js';
import { sellValue, towerStats, upgradeCost } from './towers.js';

export const BAR_TOP = 0;
export const BAR_HEIGHT = 56;
export const BAR_BOTTOM_Y = FIELD.height - 96;
export const BAR_BOTTOM_HEIGHT = 96;

// Build cards: three boxes across the bottom bar.
export function buildCards() {
  const width = 210;
  const gap = 12;
  const startX = 24;
  return TOWER_ORDER.map((type, i) => ({
    type,
    x: startX + i * (width + gap),
    y: BAR_BOTTOM_Y + 12,
    width,
    height: 72,
  }));
}

// Start Wave button, right side of the bottom bar.
export function startButton() {
  return { x: FIELD.width - 268, y: BAR_BOTTOM_Y + 12, width: 244, height: 72 };
}

// Upgrade / Sell buttons shown when a tower is selected.
export function towerButtons() {
  return {
    upgrade: { x: 700, y: BAR_BOTTOM_Y + 56, width: 140, height: 32 },
    sell: { x: 848, y: BAR_BOTTOM_Y + 56, width: 140, height: 32 },
  };
}

export function pointInBox(point, box) {
  return point.x >= box.x && point.x <= box.x + box.width
    && point.y >= box.y && point.y <= box.y + box.height;
}

/** Which plot (if any) sits under `point`. */
export function plotAt(point) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    if (Math.hypot(point.x - PLOTS[i].x, point.y - PLOTS[i].y) <= PLOT_RADIUS + 6) return i;
  }
  return -1;
}

/**
 * Interpret a click. Returns one of:
 * { kind: 'card', type } | { kind: 'start' } | { kind: 'upgrade' } |
 * { kind: 'sell' } | { kind: 'plot', index } | { kind: 'none' }
 */
export function clickAction(point, state) {
  for (const card of buildCards()) {
    if (pointInBox(point, card)) return { kind: 'card', type: card.type };
  }
  if (pointInBox(point, startButton())) return { kind: 'start' };
  if (state.selectedTower >= 0) {
    const buttons = towerButtons();
    if (pointInBox(point, buttons.upgrade)) return { kind: 'upgrade' };
    if (pointInBox(point, buttons.sell)) return { kind: 'sell' };
  }
  const plot = plotAt(point);
  if (plot >= 0) return { kind: 'plot', index: plot };
  return { kind: 'none' };
}

/** The one-line summary of the selected tower for the bottom bar. */
export function towerSummary(state) {
  const index = state.selectedTower;
  if (index < 0) return null;
  const tower = state.towers[index];
  if (!tower) return null;
  const stats = towerStats(tower);
  return {
    name: `${stats.name} — Lv ${tower.level}`,
    damage: stats.damage,
    range: Math.round(stats.range),
    rate: stats.rate,
    upgrade: upgradeCost(tower),
    sell: sellValue(tower),
  };
}
