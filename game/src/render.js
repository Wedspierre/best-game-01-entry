// The renderer: everything the player sees, painted on one 2D canvas.
// The field is 1280x720 logical pixels, scaled to fit the window. Screens:
// title, play, paused, won, lost. Towers, enemies and the keep are drawn
// in code — circles, polygons and arcs, no image files.

import {
  BAR_BOTTOM_HEIGHT, BAR_BOTTOM_Y, BAR_HEIGHT, buildCards, startButton,
  towerButtons, towerSummary,
} from './hud.js';
import {
  FIELD, FONT, KEEP, PALETTE, PATH, PLOTS, PLOT_RADIUS,
  TOTAL_WAVES, TOWERS, TOWER_ORDER,
} from './config.js';
import { towerStats } from './towers.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.floor(FIELD.width * scale * (window.devicePixelRatio || 1));
    canvas.height = Math.floor(FIELD.height * scale * (window.devicePixelRatio || 1));
    canvas.style.width = `${Math.floor(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.floor(FIELD.height * scale)}px`;
  }
  resize();
  window.addEventListener('resize', resize);

  function circle(x, y, radius, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function text(str, x, y, size, colour, align = 'left', bold = false) {
    ctx.fillStyle = colour;
    ctx.font = `${bold ? '700 ' : ''}${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawGrass() {
    ctx.fillStyle = PALETTE.grassA;
    ctx.fillRect(0, BAR_HEIGHT, FIELD.width, FIELD.height - BAR_HEIGHT - BAR_BOTTOM_HEIGHT);
    ctx.fillStyle = PALETTE.grassB;
    for (let x = 0; x < FIELD.width; x += 96) {
      for (let y = BAR_HEIGHT; y < FIELD.height - BAR_BOTTOM_HEIGHT; y += 96) {
        if (((x + y) / 96) % 2 === 0) ctx.fillRect(x, y, 96, 96);
      }
    }
    // Tufts of grass for texture.
    ctx.strokeStyle = '#2c4427';
    ctx.lineWidth = 2;
    for (let i = 0; i < 90; i += 1) {
      const x = (i * 137) % FIELD.width;
      const y = BAR_HEIGHT + 20 + ((i * 89) % (FIELD.height - BAR_HEIGHT - BAR_BOTTOM_HEIGHT - 40));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y - 8);
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 7, y - 9);
      ctx.stroke();
    }
  }

  function drawPath() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PALETTE.pathEdge;
    ctx.lineWidth = 56;
    ctx.beginPath();
    PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = PALETTE.path;
    ctx.lineWidth = 46;
    ctx.beginPath();
    PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    // Dashes down the middle of the road.
    ctx.strokeStyle = 'rgba(240, 234, 216, 0.25)';
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 18]);
    ctx.beginPath();
    PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPlots(state, hover) {
    for (let i = 0; i < PLOTS.length; i += 1) {
      const plot = PLOTS[i];
      const selected = state.selectedPlot === i || state.selectedTower === i;
      const hovered = hover && Math.hypot(hover.x - plot.x, hover.y - plot.y) <= PLOT_RADIUS + 6;
      circle(plot.x, plot.y, PLOT_RADIUS, PALETTE.plot, selected ? '#f2c94c' : hovered ? '#8aa078' : PALETTE.plotEdge);
      circle(plot.x, plot.y, PLOT_RADIUS - 8, '#243020');
      if (!state.towers[i]) {
        ctx.strokeStyle = 'rgba(154, 167, 143, 0.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plot.x - 7, plot.y);
        ctx.lineTo(plot.x + 7, plot.y);
        ctx.moveTo(plot.x, plot.y - 7);
        ctx.lineTo(plot.x, plot.y + 7);
        ctx.stroke();
      }
      if (selected) {
        ctx.strokeStyle = 'rgba(242, 201, 76, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(plot.x, plot.y, PLOT_RADIUS + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawKeep(state) {
    const { x, y } = KEEP;
    // Stone keep with a banner roof and a glowing hearth window.
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(x - 26, y - 30, 52, 42);
    ctx.fillStyle = PALETTE.keepRoof;
    ctx.beginPath();
    ctx.moveTo(x - 32, y - 28);
    ctx.lineTo(x, y - 58);
    ctx.lineTo(x + 32, y - 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(x - 6, y - 12, 12, 14);
    ctx.fillStyle = '#3a2f1d';
    ctx.fillRect(x - 9, y + 8, 18, 16);
    if (state.lives <= 5) {
      ctx.strokeStyle = 'rgba(229, 83, 75, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y - 8, 40, 0, Math.PI * 2);
      ctx.stroke();
    }
    text('KEEP', x, y + 34, 13, PALETTE.text, 'center', true);
  }

  function drawTower(tower, plot) {
    const stats = towerStats(tower);
    const def = TOWERS[tower.type];
    const { x, y } = plot;
    // Range ring while selected is drawn by the caller; here the tower itself.
    ctx.fillStyle = def.dark;
    ctx.fillRect(x - 12, y - 6, 24, 18);
    if (tower.type === 'arrow') {
      ctx.fillStyle = '#5a4630';
      ctx.fillRect(x - 3, y - 26, 6, 26);
      ctx.fillStyle = def.colour;
      ctx.beginPath();
      ctx.moveTo(x, y - 40);
      ctx.lineTo(x - 9, y - 24);
      ctx.lineTo(x + 9, y - 24);
      ctx.closePath();
      ctx.fill();
    } else if (tower.type === 'cannon') {
      circle(x, y - 8, 14, def.colour, def.dark);
      ctx.strokeStyle = '#2a1c12';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(x, y - 8);
      ctx.lineTo(x + Math.cos(tower.angle) * 26, y - 8 + Math.sin(tower.angle) * 26);
      ctx.stroke();
      circle(x, y - 8, 5, '#2a1c12');
    } else {
      // Frost obelisk: a tall crystal.
      ctx.fillStyle = def.colour;
      ctx.beginPath();
      ctx.moveTo(x, y - 42);
      ctx.lineTo(x - 10, y - 8);
      ctx.lineTo(x + 10, y - 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.beginPath();
      ctx.moveTo(x, y - 42);
      ctx.lineTo(x - 4, y - 10);
      ctx.lineTo(x + 2, y - 10);
      ctx.closePath();
      ctx.fill();
    }
    if (tower.flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.beginPath();
      ctx.arc(x, y - 12, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    if (tower.level > 1) {
      for (let i = 0; i < tower.level; i += 1) {
        ctx.fillStyle = '#f2c94c';
        ctx.beginPath();
        ctx.arc(x - 12 + i * 12, y + 18, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawEnemy(enemy) {
    const def = { grunt: '#7fb069', runner: '#f2a65a', brute: '#b56576', boss: '#9b5de5' }[enemy.kind];
    const dark = { grunt: '#3e5c33', runner: '#7a4d1f', brute: '#5e2f3c', boss: '#4d2a7a' }[enemy.kind];
    const slowed = enemy.slowUntil > 0;
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(enemy.x, enemy.y + enemy.radius * 0.8, enemy.radius, enemy.radius * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    circle(enemy.x, enemy.y, enemy.radius, slowed ? '#8fd8f2' : def, dark);
    // Eyes, marching toward the keep.
    ctx.fillStyle = '#141a12';
    ctx.beginPath();
    ctx.arc(enemy.x + 5, enemy.y - 4, 2.5, 0, Math.PI * 2);
    ctx.arc(enemy.x + 5, enemy.y + 4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (enemy.kind === 'boss') {
      ctx.strokeStyle = '#e9d5ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(enemy.x - 16, enemy.y - enemy.radius - 2);
      ctx.lineTo(enemy.x - 6, enemy.y - enemy.radius - 14);
      ctx.lineTo(enemy.x + 4, enemy.y - enemy.radius - 2);
      ctx.lineTo(enemy.x + 14, enemy.y - enemy.radius - 14);
      ctx.stroke();
    }
    if (enemy.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    // Health bar.
    const width = enemy.radius * 2;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width, 5);
    ctx.fillStyle = ratio > 0.5 ? '#7fb069' : ratio > 0.25 ? '#f2c94c' : '#e5534b';
    ctx.fillRect(enemy.x - width / 2, enemy.y - enemy.radius - 10, width * ratio, 5);
  }

  function drawProjectiles(state) {
    for (const proj of state.projectiles) {
      if (proj.type === 'cannon') {
        circle(proj.x, proj.y, 7, '#2a1c12');
        circle(proj.x, proj.y, 4, '#ff9d5c');
      } else if (proj.type === 'frost') {
        ctx.fillStyle = '#bfe9f7';
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#6fd3f2';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(proj.x - 8, proj.y);
        ctx.lineTo(proj.x + 8, proj.y);
        ctx.moveTo(proj.x, proj.y - 8);
        ctx.lineTo(proj.x, proj.y + 8);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#f2c94c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(proj.x - 7, proj.y - 7);
        ctx.lineTo(proj.x + 7, proj.y + 7);
        ctx.stroke();
      }
    }
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.colour;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTopBar(state, best) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, BAR_HEIGHT);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, BAR_HEIGHT - 2, FIELD.width, 2);
    text('EMBER KEEP', 24, BAR_HEIGHT / 2, 24, PALETTE.text, 'left', true);
    text(`Gold  ${state.gold}`, 300, BAR_HEIGHT / 2, 20, PALETTE.gold, 'left', true);
    text(`Lives  ${state.lives}`, 470, BAR_HEIGHT / 2, 20, state.lives <= 5 ? PALETTE.danger : PALETTE.heart, 'left', true);
    text(`Wave  ${state.wave} / ${TOTAL_WAVES}`, 620, BAR_HEIGHT / 2, 20, PALETTE.wave, 'left', true);
    text(`Score  ${state.score}`, 800, BAR_HEIGHT / 2, 20, PALETTE.text, 'left', true);
    text(`Kills  ${state.kills}`, 980, BAR_HEIGHT / 2, 20, PALETTE.muted, 'left', true);
    text(`Best wave  ${best}`, 1140, BAR_HEIGHT / 2, 18, PALETTE.muted, 'left', true);
  }

  function drawBottomBar(state) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, BAR_BOTTOM_Y, FIELD.width, BAR_BOTTOM_HEIGHT);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, BAR_BOTTOM_Y, FIELD.width, 2);
    for (const card of buildCards()) {
      const def = TOWERS[card.type];
      const selected = state.buildType === card.type;
      const afford = state.gold >= def.cost;
      ctx.fillStyle = selected ? '#31402e' : '#28332a';
      ctx.fillRect(card.x, card.y, card.width, card.height);
      ctx.strokeStyle = selected ? '#f2c94c' : afford ? PALETTE.panelEdge : '#552222';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeRect(card.x, card.y, card.width, card.height);
      circle(card.x + 26, card.y + 36, 13, def.colour, def.dark);
      text(`${def.key}  ${def.name}`, card.x + 48, card.y + 18, 16, PALETTE.text, 'left', true);
      text(def.blurb, card.x + 48, card.y + 40, 12, PALETTE.muted, 'left');
      text(`${def.cost} gold`, card.x + 48, card.y + 58, 14, afford ? PALETTE.gold : PALETTE.danger, 'left', true);
    }
    const start = startButton();
    const waveRunning = state.waveActive;
    ctx.fillStyle = waveRunning ? '#3a4a38' : '#b8860b';
    ctx.fillRect(start.x, start.y, start.width, start.height);
    ctx.strokeStyle = waveRunning ? PALETTE.panelEdge : '#f2c94c';
    ctx.lineWidth = 2;
    ctx.strokeRect(start.x, start.y, start.width, start.height);
    text(
      waveRunning ? 'WAVE RUNNING…' : state.wave >= TOTAL_WAVES ? 'FINAL WAVE DONE' : `START WAVE ${state.wave + 1}  (Space)`,
      start.x + start.width / 2, start.y + start.height / 2, 17,
      waveRunning ? PALETTE.muted : '#141a12', 'center', true,
    );
    const summary = towerSummary(state);
    if (summary) {
      const buttons = towerButtons();
      text(summary.name, 700, BAR_BOTTOM_Y + 18, 15, PALETTE.text, 'left', true);
      text(`DMG ${summary.damage}  RNG ${summary.range}  ${summary.rate}/s`, 700, BAR_BOTTOM_Y + 40, 13, PALETTE.muted, 'left');
      ctx.fillStyle = '#31402e';
      ctx.fillRect(buttons.upgrade.x, buttons.upgrade.y, buttons.upgrade.width, buttons.upgrade.height);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.strokeRect(buttons.upgrade.x, buttons.upgrade.y, buttons.upgrade.width, buttons.upgrade.height);
      text(`Upgrade (U) ${summary.upgrade}g`, buttons.upgrade.x + 8, buttons.upgrade.y + 16, 13, PALETTE.gold, 'left', true);
      ctx.fillStyle = '#31402e';
      ctx.fillRect(buttons.sell.x, buttons.sell.y, buttons.sell.width, buttons.sell.height);
      ctx.strokeStyle = PALETTE.panelEdge;
      ctx.strokeRect(buttons.sell.x, buttons.sell.y, buttons.sell.width, buttons.sell.height);
      text(`Sell (X) +${summary.sell}g`, buttons.sell.x + 8, buttons.sell.y + 16, 13, PALETTE.text, 'left', true);
    } else {
      text('Click a plot, pick a tower (1/2/3), then Start Wave.', 700, BAR_BOTTOM_Y + 30, 14, PALETTE.muted, 'left');
      text('U upgrades, X sells, P pauses, R restarts, M mutes.', 700, BAR_BOTTOM_Y + 54, 13, PALETTE.muted, 'left');
    }
  }

  function drawBanner(state) {
    if (state.message && state.time < state.messageUntil) {
      ctx.globalAlpha = 0.95;
      text(state.message, FIELD.width / 2, BAR_HEIGHT + 30, 26, '#f0ead8', 'center', true);
      ctx.globalAlpha = 1;
    }
    if (state.phase === 'wave' && state.enemies.length === 0 && state.spawnQueue.length > 0) {
      text(`Incoming: ${state.spawnQueue.length} more`, FIELD.width / 2, BAR_HEIGHT + 62, 15, PALETTE.muted, 'center');
    }
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 14, 9, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(FIELD.width / 2 - 380, 150, 760, 380);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect(FIELD.width / 2 - 380, 150, 760, 380);
    text(title, FIELD.width / 2, 210, 44, accent, 'center', true);
    lines.forEach((line, i) => {
      text(line, FIELD.width / 2, 280 + i * 34, 20, PALETTE.text, 'center');
    });
  }

  return {
    draw(state, screen, best, hover) {
      ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.fillStyle = PALETTE.backdrop;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      drawGrass();
      drawPath();
      // Selected tower's range ring, under the towers.
      if (state.selectedTower >= 0 && state.towers[state.selectedTower]) {
        const tower = state.towers[state.selectedTower];
        const stats = towerStats(tower);
        ctx.fillStyle = 'rgba(242, 201, 76, 0.08)';
        ctx.beginPath();
        ctx.arc(PLOTS[state.selectedTower].x, PLOTS[state.selectedTower].y, stats.range, 0, Math.PI * 2);
        ctx.fill();
      }
      drawPlots(state, hover);
      drawKeep(state);
      for (let i = 0; i < state.towers.length; i += 1) {
        if (state.towers[i]) drawTower(state.towers[i], PLOTS[i]);
      }
      for (const enemy of state.enemies) drawEnemy(enemy);
      drawProjectiles(state);
      drawTopBar(state, best);
      drawBottomBar(state);
      drawBanner(state);

      if (screen === SCREEN_TITLE) {
        overlay('EMBER KEEP', [
          'Hold the keep against 10 waves of ember-beasts.',
          'Build towers on the stone plots. Spend gold, earn gold per kill.',
          'If a beast reaches the keep you lose lives. Lose all 20 and the keep falls.',
          'Click a plot, pick a tower (1 / 2 / 3), press Space to start a wave.',
          'Press Space or click to defend the keep.',
        ], '#f2c94c');
      } else if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['Press P or Space to keep defending.', 'R restarts the whole defence.'], '#6fd3f2');
      } else if (screen === SCREEN_WON) {
        overlay('THE KEEP STANDS!', [
          `All ${TOTAL_WAVES} waves broken. Score ${state.score} — ${state.kills} beasts slain.`,
          `Best wave ${Math.max(best, TOTAL_WAVES)} · Gold left ${state.gold}`,
          'Press R or Space to defend it all over again.',
        ], '#7fb069');
      } else if (screen === SCREEN_LOST) {
        overlay('THE KEEP HAS FALLEN', [
          `The beasts broke through on wave ${state.wave}. Score ${state.score} — ${state.kills} slain.`,
          `Best wave ${best} · Press R or Space to try again.`,
        ], '#e5534b');
      }
    },
  };
}
