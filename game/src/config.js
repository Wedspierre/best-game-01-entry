// Ember Keep — every tuning number, colour and layout constant in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

// The simulation's fixed step, in seconds: 60 updates a second whatever the rate.
export const STEP = 1 / 60;

// Enemies march along this path (waypoints, in field coordinates). They enter
// at the west gate, snake across the meadow and strike the keep at the east.
export const PATH = [
  { x: -40, y: 120 },
  { x: 1080, y: 120 },
  { x: 1080, y: 320 },
  { x: 200, y: 320 },
  { x: 200, y: 520 },
  { x: 1080, y: 520 },
  { x: 1080, y: 640 },
  { x: 1240, y: 640 },
];

// Build plots: fixed stone circles where a tower may stand.
export const PLOTS = [
  { x: 180, y: 200 }, { x: 420, y: 200 }, { x: 660, y: 200 }, { x: 900, y: 200 },
  { x: 300, y: 400 }, { x: 540, y: 400 }, { x: 780, y: 400 }, { x: 960, y: 400 },
  { x: 120, y: 600 }, { x: 420, y: 600 }, { x: 660, y: 600 }, { x: 900, y: 600 },
  { x: 1020, y: 40 }, { x: 120, y: 40 }, { x: 540, y: 240 }, { x: 780, y: 600 },
];

export const START_GOLD = 180;
export const START_LIVES = 20;
export const TOTAL_WAVES = 10;
export const WAVE_CLEAR_BONUS = 25;
export const INTEREST_PER_WAVE = 0; // no banking: spend it or lose the edge.
export const KILL_GOLD = 3;

export const PLOT_RADIUS = 26;
export const KEEP = { x: 1210, y: 640, radius: 34 };

// Tower catalogue: three kinds, three jobs. Cost, range, damage, fire rate,
// projectile speed and splash radius; frost slows instead of dealing damage.
export const TOWERS = {
  arrow: {
    name: 'Arrow Spire', key: '1', cost: 60, range: 150, damage: 10,
    rate: 2.2, projSpeed: 520, splash: 0, slow: 0, colour: '#f2c94c', dark: '#8a6d1f',
    blurb: 'Fast shots, cheap.',
  },
  cannon: {
    name: 'Ember Cannon', key: '2', cost: 110, range: 130, damage: 30,
    rate: 0.7, projSpeed: 380, splash: 70, slow: 0, colour: '#e5534b', dark: '#7a2a24',
    blurb: 'Slow shells, splash damage.',
  },
  frost: {
    name: 'Frost Obelisk', key: '3', cost: 90, range: 140, damage: 4,
    rate: 1.4, projSpeed: 460, splash: 0, slow: 0.5, colour: '#6fd3f2', dark: '#24586e',
    blurb: 'Chills enemies to half speed.',
  },
};
export const TOWER_ORDER = ['arrow', 'cannon', 'frost'];
export const UPGRADE_COST = 80;
export const UPGRADE_MULT = 1.5; // damage grows per level
export const MAX_LEVEL = 4;
export const SELL_FRACTION = 0.7;

// Enemy kinds: hp, speed (px/s), gold bounty, lives lost on reaching the keep.
export const ENEMIES = {
  grunt: { hp: 70, speed: 62, gold: 6, lives: 1, radius: 13, colour: '#7fb069', dark: '#3e5c33', name: 'Grunt' },
  runner: { hp: 44, speed: 118, gold: 7, lives: 1, radius: 11, colour: '#f2a65a', dark: '#7a4d1f', name: 'Runner' },
  brute: { hp: 320, speed: 40, gold: 14, lives: 2, radius: 18, colour: '#b56576', dark: '#5e2f3c', name: 'Brute' },
  boss: { hp: 4500, speed: 34, gold: 120, lives: 5, radius: 26, colour: '#9b5de5', dark: '#4d2a7a', name: 'Emberlord' },
};
export const ENEMY_ORDER = ['grunt', 'runner', 'brute', 'boss'];

export const PALETTE = {
  backdrop: '#141a12',
  grassA: '#1d2b1a',
  grassB: '#182416',
  path: '#6b5433',
  pathEdge: '#4a3a22',
  plot: '#2c3a2a',
  plotEdge: '#5a7050',
  keep: '#d9a441',
  keepRoof: '#8a4b2a',
  panel: '#20291f',
  panelEdge: '#3a4a38',
  text: '#f0ead8',
  muted: '#9aa78f',
  gold: '#f2c94c',
  heart: '#e5534b',
  wave: '#6fd3f2',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best wave reached is kept between visits (this browser only). */
export const BEST_KEY = 'ember-keep.best-wave';
