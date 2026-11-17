// Keyboard and mouse input. The game reads clicks as canvas
// coordinates and keys as named actions; nothing here knows the rules.
export const ACTION_START = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_SPEED = 16;
export const ACTION_UPGRADE = 32;
export const ACTION_SELL = 64;
export const ACTION_DESELECT = 128;
export const ACTION_WAVE = 256;

const KEY_ACTIONS = {
  Space: ACTION_WAVE, Enter: ACTION_START, KeyP: ACTION_PAUSE,
  KeyR: ACTION_RESTART, KeyM: ACTION_MUTE, KeyF: ACTION_SPEED,
  KeyU: ACTION_UPGRADE, KeyX: ACTION_SELL, Escape: ACTION_DESELECT,
};

export function createInput(canvas) {
  let actions = 0;
  let click = null;
  let hover = { x: -1, y: -1 };
  let towerKey = null;

  function scaleEvent(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    click = scaleEvent(event);
    event.preventDefault();
  });
  canvas.addEventListener('pointermove', (event) => { hover = scaleEvent(event); });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const action = KEY_ACTIONS[event.code];
    if (action) {
      actions |= action;
      event.preventDefault();
    }
    if (/^Digit[1-7]$/.test(event.code)) towerKey = Number(event.code.slice(5));
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    takeTowerKey() {
      const taken = towerKey;
      towerKey = null;
      return taken;
    },
    hover() { return hover; },
  };
}
