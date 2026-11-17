// Synthesised sound: every effect and the music loop are built from
// WebAudio oscillators and filtered noise — no audio files, no network.
export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq, type = 'lowpass') {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t0);
  }

  // A slow ember-minor arpeggio: A2, C3, E3, G3, A3, E3, C3, G2.
  const MELODY = [110, 130.81, 164.81, 196, 220, 164.81, 130.81, 98];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    if (ctx.state === 'suspended') ctx.resume();
    musicTimer = setInterval(() => {
      if (muted) return;
      const note = MELODY[musicStep % MELODY.length];
      musicStep += 1;
      tone(note, 0.5, 'triangle', 0.05);
      if (musicStep % 4 === 1) tone(note / 2, 0.9, 'sine', 0.07);
    }, 300);
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  }

  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); startMusic(); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
    shoot() { tone(880, 0.07, 'square', 0.05, 440); },
    cannon() { noise(0.25, 0.22, 500); tone(120, 0.2, 'sine', 0.18, 50); },
    zap() { tone(1400, 0.12, 'sawtooth', 0.06, 200); },
    frost() { tone(1200, 0.18, 'sine', 0.05, 1800); },
    thorn() { tone(300, 0.09, 'triangle', 0.06, 180); },
    mortar() { noise(0.4, 0.28, 320); tone(90, 0.35, 'sine', 0.22, 38); },
    coin() { tone(1320, 0.08, 'sine', 0.07); setTimeout(() => tone(1760, 0.12, 'sine', 0.07), 60); },
    build() { tone(220, 0.12, 'triangle', 0.12, 440); noise(0.12, 0.1, 2000, 'highpass'); },
    upgrade() { tone(523, 0.1, 'triangle', 0.1); setTimeout(() => tone(784, 0.14, 'triangle', 0.1), 90); },
    sell() { tone(660, 0.1, 'sine', 0.08, 330); },
    leak() { tone(160, 0.4, 'sawtooth', 0.2, 55); noise(0.3, 0.18, 300); },
    horn() { tone(196, 0.5, 'sawtooth', 0.1, 196); setTimeout(() => tone(294, 0.5, 'sawtooth', 0.08), 120); },
    boss() { tone(98, 0.8, 'sawtooth', 0.16, 65); tone(147, 0.8, 'sawtooth', 0.1, 98); },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.35, 'triangle', 0.12), i * 160));
    },
    defeat() {
      [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.4, 'sawtooth', 0.09), i * 200));
    },
    stopMusic,
  };
}
