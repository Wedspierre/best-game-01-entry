// Input: mouse and keyboard, translated into game actions.
// Mouse: click a plot to select it, click a tower to select it, click a
// build card (or press 1/2/3) to build, click Start Wave / Upgrade / Sell.
// Keyboard: 1/2/3 pick a tower kind, Space/Enter starts the wave, U upgrades,
// X sells, P pauses, R restarts, M mutes, Esc deselects. Clicks are reported
// in field coordinates (the renderer scales the canvas to the window).

import { FIELD } from './config.js';

export const ACTION_NONE = 0;
export const ACTION_CONFIRM = 1; // Space / Enter / click on a button
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_DESELECT = 16;
export const ACTION_UPGRADE = 32;
export const ACTION_SELL = 64;

export function createInput(canvas) {
  let actions = 0;
  let click = null; // { x, y } in field coordinates, consumed once
  let hover = { x: -1, y: -1 };
  let buildKey = null; // 'arrow' | 'cannon' | 'frost'

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    hover = toField(event);
  });
  canvas.addEventListener('click', (event) => {
    click = toField(event);
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (key === 'p' || key === 'escape') {
      actions |= key === 'p' ? ACTION_PAUSE : ACTION_DESELECT;
    } else if (key === 'r') {
      actions |= ACTION_RESTART;
    } else if (key === 'm') {
      actions |= ACTION_MUTE;
    } else if (key === 'u') {
      actions |= ACTION_UPGRADE;
    } else if (key === 'x') {
      actions |= ACTION_SELL;
    } else if (key === '1') {
      buildKey = 'arrow';
    } else if (key === '2') {
      buildKey = 'cannon';
    } else if (key === '3') {
      buildKey = 'frost';
    }
  });

  return {
    takeActions() {
      const taken = actions;
      actions = ACTION_NONE;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    takeBuildKey() {
      const taken = buildKey;
      buildKey = null;
      return taken;
    },
    hover() {
      return hover;
    },
  };
}
