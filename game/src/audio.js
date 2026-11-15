// All sound is synthesised with WebAudio: short oscillator blips, no audio
// files, no network. The mixer starts on the first user gesture (browsers
// block audio before one) and stays silent until then.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      return null;
    }
    return context;
  }

  function tone(freq, duration, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(880, 0.07, 'square', 0.05, 440);
    },
    boom() {
      tone(160, 0.22, 'sine', 0.12, 50);
    },
    frost() {
      tone(1400, 0.12, 'sine', 0.04, 900);
    },
    build() {
      tone(330, 0.1, 'triangle', 0.09, 520);
      tone(520, 0.12, 'triangle', 0.07, 660);
    },
    coin() {
      tone(990, 0.06, 'sine', 0.06, 1320);
    },
    leak() {
      tone(220, 0.3, 'sawtooth', 0.1, 70);
    },
    waveHorn() {
      tone(196, 0.35, 'triangle', 0.1, 262);
    },
    win() {
      [523, 659, 784, 1047].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.25, 'triangle', 0.1), index * 130);
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((freq, index) => {
        setTimeout(() => tone(freq, 0.3, 'sawtooth', 0.07), index * 160);
      });
    },
  };
}
