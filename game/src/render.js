// Ember Keep v2 — the renderer: every pixel is drawn in code on one
// canvas. Screens: title, play, paused, victory and defeat.
import { FIELD, HUD_H, ROAD, ROAD_HALF, KEEP, PLOTS, TOWERS, TOWER_ORDER, ENEMIES, BOSSES, TOTAL_WAVES } from './config.js';
import { towerStats, previewWave } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const FONT = (px, weight) => `${weight || 700} ${px}px "Trebuchet MS", "Segoe UI", Verdana, sans-serif`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawStar(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawRoad(ctx) {
  // Cobble road with glowing ember seams.
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#3a2f2a';
  ctx.lineWidth = ROAD_HALF * 2;
  ctx.beginPath();
  ctx.moveTo(ROAD[0].x, ROAD[0].y);
  for (let i = 1; i < ROAD.length; i += 1) ctx.lineTo(ROAD[i].x, ROAD[i].y);
  ctx.stroke();
  ctx.strokeStyle = '#54423a';
  ctx.lineWidth = ROAD_HALF * 2 - 8;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 120, 40, 0.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([14, 22]);
  ctx.beginPath();
  ctx.moveTo(ROAD[0].x, ROAD[0].y);
  for (let i = 1; i < ROAD.length; i += 1) ctx.lineTo(ROAD[i].x, ROAD[i].y);
  ctx.stroke();
  ctx.setLineDash([]);
  // Edge stones at every bend.
  for (let i = 1; i < ROAD.length - 1; i += 1) {
    ctx.fillStyle = '#6b5d4f';
    ctx.beginPath();
    ctx.arc(ROAD[i].x, ROAD[i].y, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKeep(ctx, s, time) {
  const x = KEEP.x, y = KEEP.y;
  const flick = 0.75 + Math.sin(time * 3) * 0.15;
  // Warm glow.
  const glow = ctx.createRadialGradient(x, y, 10, x, y, 120);
  glow.addColorStop(0, `rgba(255, 170, 60, ${0.5 * flick})`);
  glow.addColorStop(1, 'rgba(255, 170, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 120, y - 120, 240, 240);
  // Stone keep.
  ctx.fillStyle = '#4a4238';
  roundRect(ctx, x - 34, y - 58, 68, 96, 8);
  ctx.fill();
  ctx.fillStyle = '#5d5346';
  roundRect(ctx, x - 34, y - 58, 68, 22, 8);
  ctx.fill();
  ctx.fillStyle = '#2e2822';
  ctx.fillRect(x - 8, y + 8, 16, 30);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - 24, y - 44, 10, 12);
  ctx.fillRect(x + 14, y - 44, 10, 12);
  // Banner.
  ctx.strokeStyle = '#8d6b3d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 58);
  ctx.lineTo(x, y - 92);
  ctx.stroke();
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(x, y - 92);
  ctx.lineTo(x + 26, y - 84);
  ctx.lineTo(x, y - 74);
  ctx.closePath();
  ctx.fill();
  // Brazier flame.
  ctx.fillStyle = `rgba(255, ${140 + Math.floor(60 * flick)}, 40, 0.9)`;
  ctx.beginPath();
  ctx.ellipse(x, y - 66, 7, 10 + 3 * flick, 0, 0, Math.PI * 2);
  ctx.fill();
  // Health of the keep = lives.
  ctx.fillStyle = '#1b1b22';
  roundRect(ctx, x - 34, y + 46, 68, 9, 4);
  ctx.fill();
  ctx.fillStyle = s.lives > 6 ? '#80ed99' : '#ff5d5d';
  const w = Math.max(0, (68 * s.lives) / 20);
  if (w > 0) {
    roundRect(ctx, x - 34, y + 46, w, 9, 4);
    ctx.fill();
  }
}

function drawPlot(ctx, plot, i, selected, hovered) {
  ctx.fillStyle = '#3d3428';
  ctx.beginPath();
  ctx.arc(plot.x, plot.y, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = selected ? '#ffd166' : hovered ? '#ffe8a3' : '#6b5d4f';
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  ctx.arc(plot.x, plot.y, 26, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#54473a';
  ctx.beginPath();
  ctx.arc(plot.x, plot.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 209, 102, 0.75)';
  ctx.font = FONT(15);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('+', plot.x, plot.y + 1);
}

function drawTower(ctx, t, s, time) {
  const stats = towerStats(t.type, t.level);
  const slowed = s.time < t.slowUntil;
  // Range ring when selected.
  if (s.selectedTower === t) {
    ctx.fillStyle = 'rgba(255, 209, 102, 0.08)';
    ctx.beginPath();
    ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Shadow + base.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(t.x, t.y + 16, 22, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3d3428';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#57503f';
  ctx.beginPath();
  ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
  ctx.fill();
  // Body by type.
  const bob = t.type === 'lens' ? Math.sin(time * 2 + t.x) * 2 : 0;
  ctx.save();
  ctx.translate(t.x, t.y - 6 + bob);
  ctx.rotate(t.type === 'arrow' || t.type === 'cannon' || t.type === 'mortar' ? t.angle : 0);
  ctx.fillStyle = stats.color;
  if (t.type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(-10, -7); ctx.lineTo(-6, 0); ctx.lineTo(-10, 7);
    ctx.closePath(); ctx.fill();
  } else if (t.type === 'cannon' || t.type === 'mortar') {
    roundRect(ctx, -6, -8, 24, 16, 5); ctx.fill();
    ctx.fillStyle = '#2b2620';
    ctx.beginPath(); ctx.arc(18, 0, 5, 0, Math.PI * 2); ctx.fill();
  } else if (t.type === 'frost') {
    ctx.beginPath();
    ctx.moveTo(0, -18); ctx.lineTo(12, 6); ctx.lineTo(-12, 6);
    ctx.closePath(); ctx.fill();
  } else if (t.type === 'storm') {
    ctx.beginPath();
    ctx.moveTo(2, -18); ctx.lineTo(-8, 2); ctx.lineTo(0, 2); ctx.lineTo(-2, 16); ctx.lineTo(10, -4); ctx.lineTo(2, -4);
    ctx.closePath(); ctx.fill();
  } else if (t.type === 'thorn') {
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.lineTo(Math.cos(a + 0.5) * 5, Math.sin(a + 0.5) * 5);
      ctx.lineTo(Math.cos(a - 0.5) * 5, Math.sin(a - 0.5) * 5);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, Math.PI * 2); ctx.fill();
  } else if (t.type === 'lens') {
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff8d6';
    ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (t.flash > 0) {
    ctx.fillStyle = 'rgba(255, 255, 200, 0.8)';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.angle) * 20, t.y - 6 + Math.sin(t.angle) * 20, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Level pips.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < t.level ? '#ffd166' : '#3a332a';
    ctx.beginPath();
    ctx.arc(t.x - 10 + i * 10, t.y + 22, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (slowed) {
    ctx.fillStyle = 'rgba(127, 231, 255, 0.85)';
    ctx.font = FONT(13);
    ctx.textAlign = 'center';
    ctx.fillText('SPIT!', t.x, t.y - 34);
  }
}

function drawEnemy(ctx, e, time) {
  const burrowed = time < e.burrowUntil;
  const chilled = time < e.slowUntil;
  const bob = e.flying ? Math.sin(time * 4 + e.wobble) * 5 : 0;
  const x = e.x, y = e.y + bob;
  if (e.flying) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.radius + 4, e.radius * 0.8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  if (burrowed) ctx.globalAlpha = 0.45;
  // Body.
  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.arc(x, y, e.radius, 0, Math.PI * 2);
  ctx.fill();
  // Kind markers.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  if (e.kind === 'rat' || e.kind === 'runner') {
    ctx.beginPath();
    ctx.arc(x - 7, y - e.radius + 2, 4, 0, Math.PI * 2);
    ctx.arc(x + 7, y - e.radius + 2, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'brute' || e.kind === 'knight') {
    ctx.beginPath();
    ctx.moveTo(x - 10, y - e.radius + 2);
    ctx.lineTo(x - 4, y - e.radius - 8);
    ctx.lineTo(x + 2, y - e.radius + 2);
    ctx.moveTo(x + 2, y - e.radius + 2);
    ctx.lineTo(x + 8, y - e.radius - 8);
    ctx.lineTo(x + 12, y - e.radius + 2);
    ctx.fill();
  } else if (e.kind === 'shield') {
    ctx.strokeStyle = '#e9ecef';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, e.radius - 3, -0.6, 0.6);
    ctx.stroke();
  } else if (e.kind === 'wisp') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.arc(x - 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.arc(x + 4, y - 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'mender') {
    ctx.strokeStyle = '#fff3b0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7);
    ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y);
    ctx.stroke();
  } else if (e.kind === 'spitter') {
    ctx.beginPath();
    ctx.arc(x + e.radius - 2, y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'burrower') {
    ctx.beginPath();
    ctx.moveTo(x - 8, y + e.radius - 2);
    ctx.lineTo(x, y + e.radius - 10);
    ctx.lineTo(x + 8, y + e.radius - 2);
    ctx.fill();
  }
  // Eyes, always facing the keep.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + 4, y - 3, 2.6, 0, Math.PI * 2);
  ctx.arc(x + 11, y - 3, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1b1b22';
  ctx.beginPath();
  ctx.arc(x + 5, y - 3, 1.3, 0, Math.PI * 2);
  ctx.arc(x + 12, y - 3, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (e.boss) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (chilled) {
    ctx.strokeStyle = 'rgba(127, 231, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, e.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (time < e.dotUntil || time < e.burnUntil) {
    ctx.fillStyle = time < e.burnUntil ? '#ff6b35' : '#80ed99';
    ctx.font = FONT(11);
    ctx.textAlign = 'center';
    ctx.fillText(time < e.burnUntil ? 'BURN' : 'POISON', x, y - e.radius - 16);
  }
  // Health bar.
  if (e.hp < e.maxHp) {
    const w = Math.max(24, e.radius * 2);
    const frac = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    roundRect(ctx, x - w / 2, y - e.radius - 10, w, 5, 2);
    ctx.fill();
    ctx.fillStyle = e.boss ? '#ff5400' : frac > 0.5 ? '#80ed99' : frac > 0.25 ? '#ffd166' : '#ff5d5d';
    if (w * frac > 0) {
      roundRect(ctx, x - w / 2, y - e.radius - 10, w * frac, 5, 2);
      ctx.fill();
    }
  }
}

  // --- Layout shared with the input handler -------------------------------
  export const BAR_Y = 644;
  export const CARD_W = 102;
  export const CARD_H = 62;
  export const CARD_GAP = 6;
  export const CARD_X0 = 12;
  export const CARD_Y = 650;
  export const PANEL = { x: 790, y: 648, w: 230, h: 66 };
  export const UPGRADE_BTN = { x: 800, y: 676, w: 100, h: 32 };
  export const SELL_BTN = { x: 910, y: 676, w: 100, h: 32 };
  export const WAVE_BTN = { x: 1040, y: 648, w: 228, h: 66 };
  export const TOP_BTNS = {
    mute: { x: 1120, y: 12, w: 44, h: 40 },
    speed: { x: 1170, y: 12, w: 44, h: 40 },
    pause: { x: 1220, y: 12, w: 44, h: 40 },
  };

  function inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  // What did this click hit? Cards, panel buttons, wave button, top buttons.
  export function hitTest(x, y, s) {
    if (y >= CARD_Y && y <= CARD_Y + CARD_H) {
      for (let i = 0; i < TOWER_ORDER.length; i += 1) {
        const cx = CARD_X0 + i * (CARD_W + CARD_GAP);
        if (x >= cx && x <= cx + CARD_W) return { kind: 'card', type: TOWER_ORDER[i] };
      }
    }
    if (s.selectedTower) {
      if (inRect(x, y, UPGRADE_BTN)) return { kind: 'upgrade' };
      if (inRect(x, y, SELL_BTN)) return { kind: 'sell' };
    }
    if (inRect(x, y, WAVE_BTN)) return { kind: 'wave' };
    if (inRect(x, y, TOP_BTNS.mute)) return { kind: 'mute' };
    if (inRect(x, y, TOP_BTNS.speed)) return { kind: 'speed' };
    if (inRect(x, y, TOP_BTNS.pause)) return { kind: 'pause' };
    return null;
  }

  function drawHud(ctx, s, best) {
    ctx.fillStyle = '#14101d';
    ctx.fillRect(0, 0, FIELD.width, HUD_H);
    ctx.fillStyle = 'rgba(255, 120, 40, 0.25)';
    ctx.fillRect(0, HUD_H - 2, FIELD.width, 2);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    // Gold.
    ctx.fillStyle = '#ffd166';
    ctx.font = FONT(20);
    ctx.fillText('◉', 18, 33);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.floor(s.gold)}`, 44, 33);
    ctx.fillStyle = '#adb5bd';
    ctx.font = FONT(13);
    ctx.fillText('gold', 44, 52);
    // Lives.
    ctx.fillStyle = '#ff5d5d';
    ctx.font = FONT(20);
    ctx.fillText('♥', 140, 33);
    ctx.fillStyle = '#fff';
    ctx.fillText(`${s.lives}`, 166, 33);
    ctx.fillStyle = '#adb5bd';
    ctx.font = FONT(13);
    ctx.fillText('lives', 166, 52);
    // Wave.
    ctx.fillStyle = '#fff';
    ctx.font = FONT(20);
    ctx.fillText(`Wave ${Math.max(1, s.wave)} / ${TOTAL_WAVES}`, 250, 33);
    ctx.fillStyle = '#adb5bd';
    ctx.font = FONT(13);
    const phaseLabel = s.phase === 'fighting' ? `${s.enemies.length + s.spawnQueue.length} beasts left`
      : s.phase === 'build' ? 'build phase'
      : s.phase === 'won' ? 'victory!'
      : 'the keep fell';
    ctx.fillText(phaseLabel, 250, 52);
    // Score.
    ctx.fillStyle = '#fff';
    ctx.font = FONT(20);
    ctx.fillText(`Score ${s.score}`, 470, 33);
    ctx.fillStyle = '#adb5bd';
    ctx.font = FONT(13);
    ctx.fillText(`best ${best}`, 470, 52);
    // Combo.
    if (s.combo >= 2) {
      const mult = s.combo >= 14 ? 'x4' : s.combo >= 8 ? 'x3' : s.combo >= 4 ? 'x2' : 'x1';
      ctx.fillStyle = '#ff6b35';
      ctx.font = FONT(20);
      ctx.fillText(`COMBO ${s.combo} ${mult}`, 660, 33);
      ctx.fillStyle = '#adb5bd';
      ctx.font = FONT(13);
      ctx.fillText('chain kills for bonus gold', 660, 52);
    }
    // Top buttons.
    const btns = [['mute', s.muted ? 'Mx' : 'M'], ['speed', `${s.speed}x`], ['pause', 'II']];
    for (const [key, label] of btns) {
      const r = TOP_BTNS[key];
      ctx.fillStyle = '#2a2438';
      roundRect(ctx, r.x, r.y, r.w, r.h, 8);
      ctx.fill();
      ctx.strokeStyle = '#6b5d7a';
      ctx.lineWidth = 1.5;
      roundRect(ctx, r.x, r.y, r.w, r.h, 8);
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = FONT(15);
      ctx.textAlign = 'center';
      ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2 + 1);
    }
  }

  function drawCards(ctx, s, hover) {
    ctx.fillStyle = '#14101d';
    ctx.fillRect(0, BAR_Y, FIELD.width, FIELD.height - BAR_Y);
    ctx.fillStyle = 'rgba(255, 120, 40, 0.25)';
    ctx.fillRect(0, BAR_Y, FIELD.width, 2);
    for (let i = 0; i < TOWER_ORDER.length; i += 1) {
      const type = TOWER_ORDER[i];
      const def = TOWERS[type];
      const x = CARD_X0 + i * (CARD_W + CARD_GAP);
      const afford = s.gold >= def.cost;
      const chosen = s.buildChoice === type;
      ctx.fillStyle = chosen ? '#3d2f16' : '#241f33';
      roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 8);
      ctx.fill();
      ctx.strokeStyle = chosen ? '#ffd166' : hover && hover.x >= x && hover.x <= x + CARD_W && hover.y >= CARD_Y && hover.y <= CARD_Y + CARD_H ? '#ffe8a3' : '#4a4360';
      ctx.lineWidth = chosen ? 2.5 : 1.5;
      roundRect(ctx, x, CARD_Y, CARD_W, CARD_H, 8);
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x + 16, CARD_Y + 16, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = FONT(13);
      ctx.textAlign = 'left';
      ctx.fillText(def.short, x + 28, CARD_Y + 13);
      ctx.fillStyle = afford ? '#ffd166' : '#ff5d5d';
      ctx.font = FONT(13);
      ctx.fillText(`${def.cost}g  [${def.key}]`, x + 28, CARD_Y + 30);
      ctx.fillStyle = '#adb5bd';
      ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
      const stat = def.beam ? `beam ${def.beam}/s · rng ${def.range}` : `dmg ${def.damage} · rng ${def.range}`;
      ctx.fillText(stat, x + 6, CARD_Y + 50);
    }
    // Selected tower / plot panel.
    ctx.fillStyle = '#241f33';
    roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a4360';
    ctx.lineWidth = 1.5;
    roundRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, 8);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(13);
    ctx.textAlign = 'left';
    if (s.selectedTower) {
      const t = s.selectedTower;
      const stats = towerStats(t.type, t.level);
      ctx.fillText(`${stats.name}  Lv${t.level}`, PANEL.x + 10, PANEL.y + 16);
      const cost = t.level < 3 ? TOWERS[t.type].up[t.level - 1].cost : null;
      ctx.fillStyle = '#adb5bd';
      ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
      ctx.fillText(`dmg ${stats.damage} · rng ${stats.range} · spent ${t.invested}g`, PANEL.x + 10, PANEL.y + 30);
      // Upgrade / sell buttons.
      ctx.fillStyle = cost && s.gold >= cost ? '#2d6a4f' : '#3a3a3a';
      roundRect(ctx, UPGRADE_BTN.x, UPGRADE_BTN.y, UPGRADE_BTN.w, UPGRADE_BTN.h, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = FONT(12);
      ctx.textAlign = 'center';
      ctx.fillText(cost ? `Upgrade ${cost}g [U]` : 'MAX LEVEL', UPGRADE_BTN.x + UPGRADE_BTN.w / 2, UPGRADE_BTN.y + 17);
      ctx.fillStyle = '#6c2b2b';
      roundRect(ctx, SELL_BTN.x, SELL_BTN.y, SELL_BTN.w, SELL_BTN.h, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(`Sell +${Math.round(t.invested * 0.7)}g [X]`, SELL_BTN.x + SELL_BTN.w / 2, SELL_BTN.y + 17);
    } else if (s.selectedPlot >= 0) {
      ctx.fillText('Stone plot — pick a tower', PANEL.x + 10, PANEL.y + 16);
      ctx.fillStyle = '#adb5bd';
      ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
      ctx.fillText('Click a card below or press 1–7.', PANEL.x + 10, PANEL.y + 32);
      ctx.fillText('Click a tower to upgrade or sell it.', PANEL.x + 10, PANEL.y + 48);
    } else {
      ctx.fillText('Click a stone plot to build', PANEL.x + 10, PANEL.y + 16);
      ctx.fillStyle = '#adb5bd';
      ctx.font = '11px "Trebuchet MS", Verdana, sans-serif';
      ctx.fillText('7 tower types · 3 levels each', PANEL.x + 10, PANEL.y + 32);
      ctx.fillText('Space sends the next wave.', PANEL.x + 10, PANEL.y + 48);
    }
    // Wave button.
    const fighting = s.phase === 'fighting';
    ctx.fillStyle = fighting ? '#3a3a3a' : '#9d4edd';
    roundRect(ctx, WAVE_BTN.x, WAVE_BTN.y, WAVE_BTN.w, WAVE_BTN.h, 10);
    ctx.fill();
    ctx.strokeStyle = fighting ? '#555' : '#e0aaff';
    ctx.lineWidth = 2;
    roundRect(ctx, WAVE_BTN.x, WAVE_BTN.y, WAVE_BTN.w, WAVE_BTN.h, 10);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = FONT(18);
    ctx.textAlign = 'center';
    ctx.fillText(fighting ? `WAVE ${s.wave} FIGHTING` : s.wave >= TOTAL_WAVES ? 'FINAL WAVE DONE' : `SEND WAVE ${s.wave + 1}`, WAVE_BTN.x + WAVE_BTN.w / 2, WAVE_BTN.y + 28);
    ctx.font = FONT(13);
    ctx.fillStyle = '#e9ecef';
    ctx.fillText(fighting ? `${s.enemies.length + s.spawnQueue.length} beasts remain` : 'Space · early call +20g', WAVE_BTN.x + WAVE_BTN.w / 2, WAVE_BTN.y + 50);
  }

  function drawPreview(ctx, s) {
    if (s.phase !== 'build' || s.wave >= TOTAL_WAVES) return;
    const counts = previewWave(s.wave + 1);
    if (!counts) return;
    const x = 980, y = 76, w = 288;
    const rows = Object.keys(counts).length;
    const h = 34 + rows * 20;
    ctx.fillStyle = 'rgba(20, 16, 29, 0.92)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = '#6b5d7a';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, w, h, 10);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = FONT(15);
    ctx.textAlign = 'left';
    ctx.fillText(`NEXT WAVE ${s.wave + 1} — SCOUTS REPORT`, x + 12, y + 22);
    let row = 0;
    for (const kind of Object.keys(counts)) {
      const def = ENEMIES[kind] || BOSSES[kind];
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x + 20, y + 42 + row * 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = FONT(13);
      ctx.fillText(`${counts[kind]}x ${def.name}`, x + 32, y + 42 + row * 20);
      row += 1;
    }
  }

  function drawBanner(ctx, s) {
    if (!s.banner || s.bannerTimer <= 0) return;
    if (s.phase === 'won' || s.phase === 'lost') return; // the end screen speaks for itself
    const alpha = Math.min(1, s.bannerTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(20, 16, 29, 0.85)';
    const w = 560;
    roundRect(ctx, FIELD.width / 2 - w / 2, 92, w, 74, 12);
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    roundRect(ctx, FIELD.width / 2 - w / 2, 92, w, 74, 12);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.font = FONT(30);
    ctx.textAlign = 'center';
    ctx.fillText(s.banner, FIELD.width / 2, 124);
    ctx.fillStyle = '#e9ecef';
    ctx.font = FONT(15);
    ctx.fillText(s.bannerSub || '', FIELD.width / 2, 150);
    ctx.restore();
  }

  function drawFx(ctx, s) {
    // Beams.
    for (const b of s.beams) {
      ctx.strokeStyle = b.color;
      ctx.globalAlpha = Math.max(0, b.life / b.maxLife);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Projectiles.
    for (const p of s.projectiles) {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.kind === 'mortar' ? 7 : p.kind === 'cannon' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const pt of s.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Floating text.
    ctx.textAlign = 'center';
    for (const f of s.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      ctx.fillStyle = f.color;
      ctx.font = FONT(14);
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawBackground(ctx, time) {
    const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, '#1a1426');
    grad.addColorStop(0.55, '#241a20');
    grad.addColorStop(1, '#191411');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Stars.
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 70; i += 1) {
      const sx = (i * 173 + 41) % FIELD.width;
      const sy = (i * 97 + 13) % 300;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.7 + i));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    // Distant ember mountains.
    ctx.fillStyle = '#241a2e';
    ctx.beginPath();
    ctx.moveTo(0, 300);
    ctx.lineTo(180, 180); ctx.lineTo(340, 290); ctx.lineTo(520, 200);
    ctx.lineTo(700, 300); ctx.lineTo(900, 190); ctx.lineTo(1080, 290);
    ctx.lineTo(1280, 210); ctx.lineTo(1280, 720); ctx.lineTo(0, 720);
    ctx.closePath();
    ctx.fill();
    // Ground.
    ctx.fillStyle = '#2b2118';
    ctx.fillRect(0, 300, FIELD.width, FIELD.height - 300);
    ctx.fillStyle = '#33291d';
    for (let i = 0; i < 26; i += 1) {
      const gx = (i * 211 + 60) % FIELD.width;
      const gy = 330 + ((i * 131) % 300);
      ctx.beginPath();
      ctx.ellipse(gx, gy, 26 + (i % 3) * 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // Moon.
    ctx.fillStyle = '#ffe8b3';
    ctx.beginPath();
    ctx.arc(1120, 90, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5d78e';
    ctx.beginPath();
    ctx.arc(1108, 82, 8, 0, Math.PI * 2);
    ctx.arc(1132, 100, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTitle(ctx, s, best) {
    ctx.fillStyle = 'rgba(10, 8, 16, 0.58)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd166';
    ctx.font = FONT(72);
    ctx.fillText('EMBER KEEP', FIELD.width / 2, 190);
    ctx.fillStyle = '#ff6b35';
    ctx.font = FONT(24);
    ctx.fillText('Hold the last light through 15 waves of ember-beasts', FIELD.width / 2, 232);
    ctx.fillStyle = '#e9ecef';
    ctx.font = '18px "Trebuchet MS", Verdana, sans-serif';
    ctx.fillText('7 towers · 3 upgrades each · 10 beasts · 2 bosses · combos pay bonus gold', FIELD.width / 2, 292);
    ctx.fillText('Click a stone plot, pick a tower, press SPACE to send the wave.', FIELD.width / 2, 322);
    ctx.fillText('U upgrades · X sells · F speeds time · P pauses · M mutes · R restarts', FIELD.width / 2, 352);
    if (best > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.font = FONT(20);
      ctx.fillText(`Best score: ${best}`, FIELD.width / 2, 396);
    }
    const pulse = 0.7 + 0.3 * Math.sin(s.time * 3);
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.font = FONT(26);
    ctx.fillText('— CLICK OR PRESS SPACE TO BEGIN —', FIELD.width / 2, 452);
  }

  function drawPaused(ctx) {
    ctx.fillStyle = 'rgba(10, 8, 16, 0.65)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff';
    ctx.font = FONT(48);
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.font = FONT(20);
    ctx.fillStyle = '#adb5bd';
    ctx.fillText('Press P or click II to keep fighting', FIELD.width / 2, 372);
  }

  function drawOver(ctx, s, best) {
    const won = s.phase === 'won';
    ctx.fillStyle = won ? 'rgba(20, 26, 12, 0.78)' : 'rgba(26, 10, 10, 0.8)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? '#ffd166' : '#ff5d5d';
    ctx.font = FONT(56);
    ctx.fillText(won ? 'THE KEEP STANDS' : 'THE KEEP HAS FALLEN', FIELD.width / 2, 200);
    if (won) {
      const stars = s.lives >= 18 ? 3 : s.lives >= 10 ? 2 : 1;
      for (let i = 0; i < 3; i += 1) {
        drawStar(ctx, FIELD.width / 2 - 70 + i * 70, 262, 26, i < stars ? '#ffd166' : '#3a332a');
      }
      ctx.fillStyle = '#e9ecef';
      ctx.font = FONT(20);
      ctx.fillText(`${stars} of 3 stars — ${s.lives} lives standing`, FIELD.width / 2, 316);
    } else {
      ctx.fillStyle = '#e9ecef';
      ctx.font = FONT(22);
      ctx.fillText(`The ember-beasts broke through on wave ${s.wave} of ${TOTAL_WAVES}.`, FIELD.width / 2, 262);
    }
    ctx.fillStyle = '#fff';
    ctx.font = FONT(22);
    ctx.fillText(`Score ${s.score}   ·   Best ${Math.max(best, s.score)}`, FIELD.width / 2, 368);
    ctx.fillStyle = '#adb5bd';
    ctx.font = FONT(18);
    ctx.fillText(`Kills ${s.kills}   ·   Leaks ${s.leaks}   ·   Gold earned ${s.earned}   ·   Best combo ${s.comboBest}`, FIELD.width / 2, 404);
    const pulse = 0.7 + 0.3 * Math.sin(s.time * 3);
    ctx.fillStyle = `rgba(255, 209, 102, ${pulse})`;
    ctx.font = FONT(24);
    ctx.fillText('— PRESS R OR CLICK TO PLAY AGAIN —', FIELD.width / 2, 462);
  }

  export function createRenderer(canvas) {
    const ctx = canvas.getContext('2d');
    return {
      draw(state, screen, best, hover) {
        const time = state.time;
        ctx.save();
        // Deterministic screen shake (no wall clock, no Math.random).
        if (state.shake > 0.2) {
          const sx = Math.sin(time * 127.1) * state.shake * 0.6;
          const sy = Math.cos(time * 311.7) * state.shake * 0.6;
          ctx.translate(sx, sy);
        }
        drawBackground(ctx, time);
        drawRoad(ctx);
        for (let i = 0; i < PLOTS.length; i += 1) {
          const taken = state.towers.some((t) => t.plot === i);
          if (!taken) {
            const hovered = hover && Math.hypot(hover.x - PLOTS[i].x, hover.y - PLOTS[i].y) < 34;
            drawPlot(ctx, PLOTS[i], i, state.selectedPlot === i, hovered);
          }
        }
        drawKeep(ctx, state, time);
        for (const t of state.towers) drawTower(ctx, t, state, time);
        const sorted = [...state.enemies].sort((a, b) => a.y - b.y);
        for (const e of sorted) drawEnemy(ctx, e, time);
        drawFx(ctx, state);
        drawPreview(ctx, state);
        drawBanner(ctx, state);
        ctx.restore();
        drawHud(ctx, state, best);
        if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawCards(ctx, state, hover);
        if (screen === SCREEN_TITLE) drawTitle(ctx, state, best);
        if (screen === SCREEN_PAUSED) drawPaused(ctx);
        if (screen === SCREEN_OVER) drawOver(ctx, state, best);
      },
    };
  }
