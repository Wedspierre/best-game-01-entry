// Ember Keep v2 — configuration: the field, the road, the build plots,
// every tower type with its upgrade path, every enemy kind and boss,
// and the wave economy. All numbers live here so tuning is one file.
export const STEP = 1 / 60;
export const FIELD = { width: 1280, height: 720 };
export const HUD_H = 64;
export const BEST_KEY = 'ember-keep-v2-best';
export const SEED_DEFAULT = 20261117;

// The road the ember-beasts march: a serpentine from the west gate
// to the keep at the east end. Enemies leak when they pass the keep.
export const ROAD = [
  { x: -24, y: 170 },
  { x: 300, y: 170 },
  { x: 300, y: 380 },
  { x: 620, y: 380 },
  { x: 620, y: 580 },
  { x: 940, y: 580 },
  { x: 940, y: 380 },
  { x: 1304, y: 380 },
];
export const ROAD_HALF = 23;
export const KEEP = { x: 1228, y: 380, radius: 46 };

// Stone plots where towers may be built. Twelve, flanking the road —
// each about 65 px from the nearest stretch of road, so every tower
// gets a long firing window as beasts march past.
export const PLOTS = [
  { x: 150, y: 235 }, { x: 230, y: 105 }, { x: 370, y: 235 },
  { x: 370, y: 445 }, { x: 230, y: 445 }, { x: 550, y: 315 },
  { x: 690, y: 445 }, { x: 690, y: 315 }, { x: 790, y: 515 },
  { x: 870, y: 645 }, { x: 1010, y: 515 }, { x: 1010, y: 315 },
];

// --- Towers ---------------------------------------------------------------
// damage: per hit. rate: shots per second. splash: radius of the blast.
// slow: fraction of speed removed while chilled, chill: seconds it lasts.
// chain: extra targets a bolt jumps to. dot: damage per second, dotTime: seconds.
// beam: continuous damage per second instead of shots. minRange: dead zone.
export const TOWERS = {
  arrow: {
    name: 'Arrow Spire', short: 'Arrow', key: '1', cost: 60, range: 134, damage: 10, rate: 2.6,
    projSpeed: 560, color: '#ffd166', glow: '#ff9f1c',
    desc: 'Fast arrows. Best against runners.',
    up: [
      { name: 'Longbow Spire', cost: 50, damageMul: 1.6, rangeAdd: 18 },
      { name: 'Stormbow Spire', cost: 85, damageMul: 2.6, rangeAdd: 34, shots: 3 },
    ],
  },
  cannon: {
    name: 'Ember Cannon', short: 'Cannon', key: '2', cost: 110, range: 122, damage: 30, rate: 0.7,
    projSpeed: 300, splash: 55, color: '#ff6b35', glow: '#ff3d00',
    desc: 'Slow shells that splash a crowd.',
    up: [
      { name: 'Bombard Cannon', cost: 90, damageMul: 1.6, rangeAdd: 14, splashAdd: 12 },
      { name: 'Hellfire Cannon', cost: 155, damageMul: 2.6, rangeAdd: 28, splashAdd: 30, burn: 12 },
    ],
  },
  frost: {
    name: 'Frost Obelisk', short: 'Frost', key: '3', cost: 90, range: 122, damage: 4, rate: 1.2,
    projSpeed: 420, slow: 0.5, chill: 1.4, color: '#7fe7ff', glow: '#38b6ff',
    desc: 'Chills enemies to half speed.',
    up: [
      { name: 'Glacier Obelisk', cost: 75, damageMul: 1.8, rangeAdd: 16, slow: 0.58, chill: 1.8 },
      { name: 'Winterheart Obelisk', cost: 130, damageMul: 2.4, rangeAdd: 30, slow: 0.66, chill: 2.2, chain: 2 },
    ],
  },
  storm: {
    name: 'Storm Coil', short: 'Storm', key: '4', cost: 150, range: 152, damage: 16, rate: 0.9,
    projSpeed: 900, chain: 3, color: '#c77dff', glow: '#9d4edd',
    desc: 'Lightning that jumps between foes.',
    up: [
      { name: 'Tempest Coil', cost: 120, damageMul: 1.6, rangeAdd: 16, chain: 4 },
      { name: 'Skywrath Coil', cost: 210, damageMul: 2.5, rangeAdd: 30, chain: 6 },
    ],
  },
  thorn: {
    name: 'Thorn Bramble', short: 'Thorn', key: '5', cost: 100, range: 112, damage: 5, rate: 1.5,
    projSpeed: 380, dot: 7, dotTime: 3, color: '#80ed99', glow: '#38b000',
    desc: 'Thorns that poison for seconds.',
    up: [
      { name: 'Briar Thicket', cost: 80, damageMul: 1.7, rangeAdd: 14, dot: 11, dotTime: 3.5 },
      { name: 'Venomwood Bramble', cost: 140, damageMul: 2.5, rangeAdd: 26, dot: 20, dotTime: 4, slow: 0.2, chill: 1 },
    ],
  },
  lens: {
    name: 'Sun Lens', short: 'Lens', key: '6', cost: 180, range: 162, beam: 48, rate: 10,
    color: '#fff3b0', glow: '#ffd60a', armorBonus: 2,
    desc: 'A burning beam. Melts armoured foes.',
    up: [
      { name: 'Dawn Lens', cost: 145, beamMul: 1.6, rangeAdd: 16 },
      { name: 'Solar Lens', cost: 250, beamMul: 2.6, rangeAdd: 30, beams: 2 },
    ],
  },
  mortar: {
    name: 'Emberheart Mortar', short: 'Mortar', key: '7', cost: 220, range: 224, minRange: 72,
    damage: 62, rate: 0.35, projSpeed: 240, splash: 92, color: '#ff8fa3', glow: '#e53888',
    desc: 'Lobbed shells. Huge splash, long reach.',
    up: [
      { name: 'Grand Mortar', cost: 175, damageMul: 1.6, rangeAdd: 18, splashAdd: 16 },
      { name: 'Doomheart Mortar', cost: 310, damageMul: 2.5, rangeAdd: 30, splashAdd: 30, shots: 2 },
    ],
  },
};
export const TOWER_ORDER = ['arrow', 'cannon', 'frost', 'storm', 'thorn', 'lens', 'mortar'];

// --- Enemies --------------------------------------------------------------
// hp: base hit points (scaled per wave). armor: flat damage shaved off
// every hit (minimum 1). flying: cannon and mortar deal half damage.
// slowResist: fraction of a chill that is ignored. gold: bounty on death.
export const ENEMIES = {
  rat: { name: 'Cinder Rat', hp: 30, speed: 58, gold: 4, radius: 11, color: '#e07a5f', unlock: 1, weight: 5 },
  imp: { name: 'Ash Imp', hp: 56, speed: 50, gold: 6, radius: 12, color: '#f4a261', unlock: 1, weight: 5 },
  runner: { name: 'Ember Runner', hp: 42, speed: 98, gold: 7, radius: 11, color: '#ffd166', unlock: 2, weight: 4 },
  brute: { name: 'Cinder Brute', hp: 230, speed: 33, gold: 12, radius: 17, color: '#bc6c25', unlock: 3, weight: 4 },
  shield: { name: 'Shieldbearer', hp: 300, speed: 30, gold: 14, radius: 16, color: '#8d99ae', armor: 6, unlock: 4, weight: 3 },
  wisp: { name: 'Ash Wisp', hp: 72, speed: 72, gold: 9, radius: 12, color: '#b8f2e6', flying: true, unlock: 4, weight: 3 },
  spitter: { name: 'Ember Spitter', hp: 95, speed: 40, gold: 10, radius: 13, color: '#90be6d', unlock: 5, weight: 3, spits: true },
  mender: { name: 'Cinder Mender', hp: 125, speed: 38, gold: 12, radius: 13, color: '#f9c74f', unlock: 6, weight: 2, heals: 9 },
  burrower: { name: 'Ash Burrower', hp: 165, speed: 62, gold: 13, radius: 13, color: '#6c584c', unlock: 7, weight: 3, burrows: true },
  knight: { name: 'Ember Knight', hp: 520, speed: 36, gold: 25, radius: 18, color: '#e63946', armor: 4, slowResist: 0.5, unlock: 8, weight: 2 },
};
export const BOSSES = {
  golem: { name: 'Ember Golem', hp: 4600, speed: 24, gold: 150, radius: 30, color: '#ff5400', armor: 8, slowResist: 0.6, wave: 10 },
  wyrm: { name: 'Ashen Wyrm', hp: 9500, speed: 34, gold: 320, radius: 32, color: '#7209b7', armor: 10, slowResist: 0.6, flying: true, wave: 15 },
};

// --- Waves & economy ------------------------------------------------------
export const TOTAL_WAVES = 15;
export const START_GOLD = 300;
export const START_LIVES = 20;
export const SELL_RATE = 0.7;
export const COMBO_WINDOW = 1.6; // seconds between kills to keep the combo
export const COMBO_MAX = 4;
export const WAVE_BONUS = (wave) => 25 + wave * 5;
export const EARLY_CALL_BONUS = 20;
export const INTEREST_RATE = 0.05;
export const INTEREST_CAP = 50;

// Hit-point scale per wave: gentle at first, steep at the end.
export function waveHpScale(wave) {
  return 1 + (wave - 1) * 0.2 + (wave - 1) * (wave - 1) * 0.01;
}
export function waveCount(wave) {
  return 8 + wave * 2;
}
export function spawnInterval(wave) {
  return Math.max(0.3, 0.7 - wave * 0.03);
}
